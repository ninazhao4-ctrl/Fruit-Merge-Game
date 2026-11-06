#!/usr/bin/env python3
"""HTTP checks for the shared leaderboard. No third-party packages."""
import importlib.util
import json
import tempfile
import threading
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('fruitmerge_leaderboard', ROOT / 'server' / 'leaderboard.py')
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)


def start(db_path, post_limit=8, get_limit=90):
    db = api.ScoreDB(db_path)
    server = api.LeaderboardServer(('127.0.0.1', 0), db, post_limit=post_limit, get_limit=get_limit)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, db


def request(server, method, path, payload=None, headers=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request('http://127.0.0.1:%s%s' % (server.server_address[1], path), data=data, method=method)
    if payload is not None:
        req.add_header('Content-Type', 'application/json')
    for key, value in (headers or {}).items():
        req.add_header(key, value)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            body = response.read().decode()
            return response.status, json.loads(body) if body else {}, dict(response.headers)
    except urllib.error.HTTPError as error:
        raw = error.read().decode()
        parsed = json.loads(raw) if raw else {}
        return error.code, parsed, dict(error.headers)


def expect(condition, message):
    if not condition:
        raise SystemExit(message)


def main():
    checks = 0
    with tempfile.TemporaryDirectory() as tmp:
        server, db = start(str(Path(tmp) / 'scores.sqlite'), post_limit=100, get_limit=200)
        try:
            status, body, _headers = request(server, 'GET', '/api/leaderboard')
            expect(status == 200 and body['scores'] == [], 'empty board')
            checks += 1

            status, body, _headers = request(server, 'POST', '/api/leaderboard', {'name': '  ', 'score': 0})
            expect(status == 200 and body['stored'] and body['scores'][0]['name'] == 'You' and body['scores'][0]['score'] == 0, 'blank name')
            checks += 1

            status, body, _headers = request(server, 'POST', '/api/leaderboard', {'name': '  Nina  ', 'score': 1500})
            expect(status == 200 and body['stored'] and body['scores'][0] == {'name': 'Nina', 'score': 1500, 'at': body['scores'][0]['at']}, 'trimmed name')
            expect(body['scores'][0]['at'].endswith('Z') and 'T' in body['scores'][0]['at'], 'timestamp')
            checks += 1

            status, body, _headers = request(server, 'POST', '/api/leaderboard', {'name': 'nina', 'score': 1400})
            expect(status == 200 and body['stored'] is False and body['scores'][0]['score'] == 1500 and body['scores'][0]['name'] == 'Nina', 'lower score kept')
            checks += 1

            status, body, _headers = request(server, 'POST', '/api/leaderboard', {'name': 'NINA', 'score': 2200})
            expect(status == 200 and body['stored'] and body['scores'][0]['name'] == 'NINA' and body['scores'][0]['score'] == 2200, 'higher score replaces')
            checks += 1

            status, body, _headers = request(server, 'POST', '/api/leaderboard', {'name': 'A' * 25, 'score': 10})
            stored_name = next(row['name'] for row in body['scores'] if row['score'] == 10)
            expect(status == 200 and stored_name == 'A' * 20, 'name length')
            checks += 1

            status, body, _headers = request(server, 'POST', '/api/leaderboard', {'name': 'Bad\nName', 'score': 11})
            expect(status == 200 and any(row['name'] == 'BadName' and row['score'] == 11 for row in body['scores']), 'control characters')
            checks += 1

            for score in (-1, 1.5, True, '12', None, api.MAX_SCORE + 1):
                status, body, _headers = request(server, 'POST', '/api/leaderboard', {'name': 'Nope', 'score': score})
                expect(status == 400 and body['ok'] is False, 'rejected score %r' % (score,))
                checks += 1

            status, body, _headers = request(server, 'POST', '/api/leaderboard', {'name': 12, 'score': 12})
            expect(status == 400, 'non-text name')
            checks += 1

            status, _body, _headers = request(server, 'POST', '/api/leaderboard', {'name': "You'; DROP TABLE scores;--", 'score': 3})
            expect(status == 200, 'name stored as text')
            status, body, _headers = request(server, 'GET', '/api/leaderboard')
            expect(status == 200 and any(row['score'] == 2200 for row in body['scores']), 'table survived')
            checks += 1

            for index in range(20):
                status, _body, _headers = request(server, 'POST', '/api/leaderboard', {'name': 'P%02d' % index, 'score': 100 + index})
                expect(status == 200, 'seed %s' % index)
            status, body, headers = request(server, 'GET', '/api/leaderboard')
            scores = [row['score'] for row in body['scores']]
            expect(status == 200 and len(body['scores']) == 15 and scores == sorted(scores, reverse=True) and scores[0] == 2200, 'top 15 order')
            expect(headers.get('Cache-Control') == 'no-store', 'not cached')
            checks += 1

            status, _body, _headers = request(server, 'PUT', '/api/leaderboard', {'name': 'You', 'score': 1})
            expect(status == 405, 'put rejected')
            checks += 1

            status, _body, _headers = request(server, 'GET', '/api/other')
            expect(status == 404, 'unknown api')
            checks += 1
        finally:
            server.shutdown()
            db.close()

        limited, limited_db = start(str(Path(tmp) / 'limited.sqlite'), post_limit=3)
        try:
            for _ in range(3):
                status, _body, _headers = request(limited, 'POST', '/api/leaderboard/', {'name': 'Rate', 'score': 5}, {'X-Forwarded-For': 'spoof, 203.0.113.9'})
                expect(status == 200, 'under limit')
            status, body, headers = request(limited, 'POST', '/api/leaderboard', {'name': 'Rate', 'score': 6}, {'X-Forwarded-For': 'spoof, 203.0.113.9'})
            expect(status == 429 and 'minute' in body['error'] and headers.get('Retry-After') == '60', 'rate limited')
            status, _body, _headers = request(limited, 'POST', '/api/leaderboard', {'name': 'Other', 'score': 7}, {'X-Forwarded-For': '198.51.100.4'})
            expect(status == 200, 'other network still allowed')
            checks += 1
        finally:
            limited.shutdown()
            limited_db.close()

    try:
        api.check_host('0.0.0.0')
        raise SystemExit('public bind was allowed')
    except SystemExit as error:
        expect('127.0.0.1' in str(error), 'host check message')
        checks += 1
    expect(api.parse_score(api.MAX_SCORE) == api.MAX_SCORE and api.parse_score(True) is None, 'cap parser')
    checks += 1
    print('%s leaderboard API checks passed' % checks)


if __name__ == '__main__':
    main()
