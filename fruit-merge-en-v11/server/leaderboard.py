#!/usr/bin/env python3
"""Shared Fruit Merge Game leaderboard.

Stdlib only. Listens on 127.0.0.1 so Caddy (or another local reverse proxy)
can expose same-origin GET/POST /api/leaderboard. No accounts, secrets, or
payments.

Score cap is 10_000_000. A merge scores round(20 * 1.7**tier) for tier 0..7,
so the richest merge is round(20 * 1.7**7) = 821 points. Drops cannot be
faster than the 0.48s cooldown, and a merge consumes two fruits, so the
theoretical ceiling is about 821 / 2 / 0.48 ≈ 855 points per second — roughly
3.1 million points an hour — and only if every drop is a watermelon that
pairs instantly. 10_000_000 is a little over three hours of that impossible
pace, far above a real run, and rejects junk posts.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import threading
import time
import unicodedata
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

MAX_SCORE = 10_000_000
MAX_NAME = 20
MAX_BODY = 2048
POST_LIMIT = 8
POST_WINDOW = 60.0
GET_LIMIT = 90
GET_WINDOW = 60.0
TOP_N = 15
DEFAULT_HOST = '127.0.0.1'
DEFAULT_PORT = 43124
DEFAULT_DB = '/var/lib/fruitmergegame/scores.sqlite'
API_PATHS = {'/api/leaderboard', '/api/leaderboard/'}
_CONTROL = re.compile(r'[\x00-\x1f\x7f]')

STATIC_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml',
    '.json': 'application/json; charset=utf-8',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
}


def clean_name(value):
    """Trim, drop control characters, cap length, and default blanks to You."""
    if value is None:
        text = ''
    elif not isinstance(value, str):
        return None
    else:
        text = value
    text = _CONTROL.sub('', text).strip()
    if len(text) > MAX_NAME:
        text = text[:MAX_NAME].strip()
    return text or 'You'


def name_key(name):
    return unicodedata.normalize('NFKC', name).casefold()


def parse_score(value):
    """Non-negative integer up to MAX_SCORE. Rejects bools and fractional numbers."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if isinstance(value, float) and not value.is_integer():
        return None
    score = int(value)
    if score < 0 or score > MAX_SCORE:
        return None
    return score


def now_iso():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def check_host(host):
    if host not in ('127.0.0.1', 'localhost', '::1'):
        raise SystemExit('Refusing to listen on %s. Bind 127.0.0.1 only.' % host)


class RateLimiter:
    def __init__(self, limit, window):
        self.limit = limit
        self.window = window
        self.hits = {}
        self.lock = threading.Lock()

    def allow(self, key):
        now = time.monotonic()
        with self.lock:
            fresh = [stamp for stamp in self.hits.get(key, ()) if now - stamp < self.window]
            if len(fresh) >= self.limit:
                self.hits[key] = fresh
                return False
            fresh.append(now)
            self.hits[key] = fresh
            if len(self.hits) > 5000:
                self.hits = {item: stamps for item, stamps in self.hits.items() if stamps}
            return True


class ScoreDB:
    def __init__(self, path):
        self.path = str(path)
        parent = os.path.dirname(self.path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        self.lock = threading.Lock()
        self.conn = sqlite3.connect(self.path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute('PRAGMA journal_mode=WAL')
        self.conn.execute('PRAGMA busy_timeout=3000')
        self.conn.execute(
            '''CREATE TABLE IF NOT EXISTS scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                name_key TEXT NOT NULL UNIQUE,
                score INTEGER NOT NULL CHECK (score >= 0),
                created_at TEXT NOT NULL
            )'''
        )
        self.conn.commit()

    def top(self):
        with self.lock:
            rows = self.conn.execute(
                'SELECT name, score, created_at FROM scores ORDER BY score DESC, name_key ASC LIMIT ?',
                (TOP_N,),
            ).fetchall()
        return [{'name': row['name'], 'score': row['score'], 'at': row['created_at']} for row in rows]

    def submit(self, name, score):
        """Keep one best score per display name. Returns (stored, top scores)."""
        key = name_key(name)
        stamp = now_iso()
        with self.lock:
            row = self.conn.execute('SELECT score FROM scores WHERE name_key = ?', (key,)).fetchone()
            if row is None:
                self.conn.execute(
                    'INSERT INTO scores (name, name_key, score, created_at) VALUES (?, ?, ?, ?)',
                    (name, key, score, stamp),
                )
                stored = True
            elif score > row['score']:
                self.conn.execute(
                    'UPDATE scores SET name = ?, score = ?, created_at = ? WHERE name_key = ?',
                    (name, score, stamp, key),
                )
                stored = True
            else:
                stored = False
            self.conn.commit()
            rows = self.conn.execute(
                'SELECT name, score, created_at FROM scores ORDER BY score DESC, name_key ASC LIMIT ?',
                (TOP_N,),
            ).fetchall()
        scores = [{'name': row['name'], 'score': row['score'], 'at': row['created_at']} for row in rows]
        return stored, scores

    def close(self):
        with self.lock:
            self.conn.close()


def client_key(handler):
    """Last X-Forwarded-For hop. Caddy appends the real peer, so a spoofed prefix is ignored."""
    forwarded = handler.headers.get('X-Forwarded-For', '')
    if forwarded:
        parts = [part.strip() for part in forwarded.split(',') if part.strip()]
        if parts:
            return parts[-1][:64]
    real = handler.headers.get('X-Real-IP', '').strip()
    if real:
        return real[:64]
    return handler.client_address[0]


def static_file(root, url_path):
    if root is None:
        return None
    path = unquote(url_path.split('?', 1)[0])
    if path in ('', '/'):
        path = '/index.html'
    if not path.startswith('/') or '\\' in path:
        return None
    root = root.resolve()
    candidate = (root / path.lstrip('/')).resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        return None
    if candidate.is_dir():
        candidate = candidate / 'index.html'
    if candidate.is_file():
        return candidate
    return None


class LeaderboardServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address, db, static_root=None, post_limit=POST_LIMIT, get_limit=GET_LIMIT):
        super().__init__(address, LeaderboardHandler)
        self.db = db
        self.static_root = Path(static_root).resolve() if static_root else None
        self.post_limiter = RateLimiter(post_limit, POST_WINDOW)
        self.get_limiter = RateLimiter(get_limit, GET_WINDOW)


class LeaderboardHandler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, fmt, *args):
        return

    def do_GET(self):
        path = self.path.split('?', 1)[0]
        if path in API_PATHS:
            self._leaderboard_get()
            return
        if path.startswith('/api/'):
            self._json(404, {'ok': False, 'error': 'Not found.'})
            return
        target = static_file(self.server.static_root, path)
        if target is None:
            self._json(404, {'ok': False, 'error': 'Not found.'})
            return
        body = target.read_bytes()
        kind = STATIC_TYPES.get(target.suffix.lower(), 'application/octet-stream')
        self._bytes(200, body, kind)

    def do_POST(self):
        path = self.path.split('?', 1)[0]
        if path not in API_PATHS:
            self._json(404, {'ok': False, 'error': 'Not found.'})
            return
        if not self.server.post_limiter.allow(client_key(self)):
            self._json(429, {'ok': False, 'error': 'Too many scores from this network. Try again in a minute.'}, {'Retry-After': '60'})
            return
        payload, error = self._read_json()
        if error:
            self._json(400, {'ok': False, 'error': error})
            return
        if not isinstance(payload, dict):
            self._json(400, {'ok': False, 'error': 'Score body must be a JSON object.'})
            return
        name = clean_name(payload.get('name', ''))
        if name is None:
            self._json(400, {'ok': False, 'error': 'Name must be text.'})
            return
        score = parse_score(payload.get('score'))
        if score is None:
            self._json(400, {'ok': False, 'error': 'Score must be an integer from 0 to %d.' % MAX_SCORE})
            return
        stored, scores = self.server.db.submit(name, score)
        self._json(200, {'ok': True, 'stored': stored, 'scores': scores})

    def do_PUT(self):
        self._method_not_allowed()

    def do_DELETE(self):
        self._method_not_allowed()

    def _method_not_allowed(self):
        self._json(405, {'ok': False, 'error': 'Method not allowed.'}, {'Allow': 'GET, POST'})

    def _leaderboard_get(self):
        if not self.server.get_limiter.allow(client_key(self)):
            self._json(429, {'ok': False, 'error': 'Too many leaderboard requests. Try again in a minute.'}, {'Retry-After': '60'})
            return
        self._json(200, {'ok': True, 'scores': self.server.db.top()})

    def _read_json(self):
        raw_length = self.headers.get('Content-Length', '')
        if not raw_length:
            return None, 'Content-Length is required.'
        try:
            length = int(raw_length)
        except ValueError:
            return None, 'Content-Length must be an integer.'
        if length < 0 or length > MAX_BODY:
            return None, 'Score body is too large.'
        content_type = self.headers.get('Content-Type', '')
        if 'application/json' not in content_type.lower():
            return None, 'Content-Type must be application/json.'
        try:
            body = self.rfile.read(length)
            return json.loads(body.decode('utf-8')), None
        except (UnicodeError, json.JSONDecodeError):
            return None, 'Body must be JSON.'

    def _json(self, status, payload, extra_headers=None):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        headers = {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}
        if extra_headers:
            headers.update(extra_headers)
        self._bytes(status, body, 'application/json; charset=utf-8', headers)

    def _bytes(self, status, body, content_type, extra_headers=None):
        try:
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(body)))
            if extra_headers:
                for key, value in extra_headers.items():
                    self.send_header(key, value)
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            return


def serve(host, port, db_path, static_root=None):
    check_host(host)
    db = ScoreDB(db_path)
    server = LeaderboardServer((host, port), db, static_root)
    bound_host, bound_port = server.server_address[:2]
    print('Fruit Merge leaderboard on http://%s:%s/api/leaderboard' % (bound_host, bound_port), flush=True)
    print('Database: %s' % db.path, flush=True)
    if static_root:
        print('Static files: %s' % static_root, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        db.close()
    return server


def main(argv=None):
    parser = argparse.ArgumentParser(description='Fruit Merge Game shared leaderboard')
    parser.add_argument('--host', default=os.environ.get('FRUITMERGE_HOST', DEFAULT_HOST))
    parser.add_argument('--port', type=int, default=int(os.environ.get('FRUITMERGE_PORT', DEFAULT_PORT)))
    parser.add_argument('--db', default=os.environ.get('FRUITMERGE_DB', DEFAULT_DB))
    parser.add_argument('--static', default=os.environ.get('FRUITMERGE_STATIC') or None, help='Also serve the static game from this directory')
    args = parser.parse_args(argv)
    if args.port == 43123:
        raise SystemExit('Port 43123 is reserved. Use 43124.')
    if not (0 <= args.port <= 65535):
        raise SystemExit('Port must be between 0 and 65535.')
    serve(args.host, args.port, args.db, args.static)


if __name__ == '__main__':
    main()
