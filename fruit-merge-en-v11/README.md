# Fruit Merge Game — Sunny edition (v11)

Open **Fruit-Merge-Game-English.html** to play the self-contained offline preview. It includes fruit art, music, sounds, share poster and QR code. No dependencies or network are required for gameplay. Click/tap once to enable audio.

## Layout and score rules
- Score and time above the game; settings, music, share and fullscreen icons at top right.
- Name above the left live Top 15 ranking; no decorative fruit collage.
- Fullscreen hides the entire ranking/name sidebar and keeps the top controls visible.
- Each normalized name has one highest score (case-insensitive, surrounding whitespace ignored). A lower result never replaces a higher one. Legacy duplicate names collapse automatically.
- Current runs are shown live only when they reach the Top 15 and meet/exceed the same name’s stored best. Finished runs are saved; restarting an unfinished run removes its temporary entry.

## Included
- Original yellow/orange interface; 25 approved fruits with live blinks, gaze, grumpy/teary faces, impact expressions and happy merge reactions.
- Existing rotating, weighted collision physics, sloped bowl, juice particles, changing cup colour, danger line and progressive automatic drops.
- Large fruit frequency remains 39%; bowl dimensions and fruit sizes remain from the approved v7 balance.
- One Juice Boost, Hammer and Bomb per run. Boost doubles the next three merge juice yields.
- Original procedural Web Audio melody and effects. Music and sound have independent saved preferences; pause/guide/share/ranking suspend music scheduling.
- Editable player name. Scores ranked by points, top fifteen best scores by name, stored locally under `fruit-merge-score-records-v1`. Old juice/time records are not reinterpreted as points.
- Share PNG with current player, actual score, QR and https://fruitmergegame.net/. Press and hold the native image to save it on supported phones; right-click to save on desktop. Copy URL and X/Facebook/WhatsApp links are above/beside the image. Attach the saved image manually to a social post.
- Supplied share poster used as an edited background; no invented percentile or global ranking.

## Ranking / website introduction separation
`rankings/index.html` and `rankings/rankings.js` own the ranking document. Its robots meta is `noindex,nofollow`. Home contains no score table or player rows; the independent iframe is visible beside the game and receives updates when scores or names change. `leaderboard.js` is the separate local data store. Records are delivered to the ranking iframe by a source-checked message.

The single-file offline preview embeds the ranking document as a data URL inside its own iframe. The publish version uses a separate URL. Introduction and article text stay below the game, with article/FAQ content under `content/`. This is content separation, not a promise of improved search rankings.

## Publish
Upload **the contents of `site/`** to the root of your host at **fruitmergegame.net**, using HTTPS. The directory includes home, strategy, unblocked, separate rankings, scripts and images. Strategy and unblocked pages have body links back to `/`. Site metadata has the confirmed canonical URL and share image path.

This delivery does not deploy the domain. Social preview crawling, live HTTPS clipboard/system sharing and cross-device access require an actual hosted site. Long-press save menus depend on the browser/device. Rankings are local, not a global/server leaderboard.

## Edit & rebuild
- `fruits.js`: fruit definitions, body sprite atlas, animated faces.
- `engine.js`: physics, drops, merges, juice, game difficulty.
- `game.js`: input, canvas rendering, game UI.
- `audio.js`: original melody and event sounds.
- `share.js`: share card fields, URL and platform links.
- `index.template.html`, `style.css`: interface.
- `content/`: introduction guides, article and structured data.
- `rankings/`, `leaderboard.js`: standalone ranking presentation and store.
- `assets/`: fruit body art, edited share poster, real QR, static social preview.

Run `python3 build.py` to build all previews and `site/`. The production game has no runtime library dependencies. The single-file preview is the recommended file:// entry point: it embeds assets as data URLs to avoid local-file canvas security differences.

## Validation
See `TEST-REPORT.md` for test scope, results and remaining real-browser verification. Test runners use Node and Python; raster checks optionally use `@napi-rs/canvas`, Pillow and ReportLab in the bundled tool runtime.

## v10 icon update
Fullscreen changes to a collapse icon while active, including the expanded-layout fallback. Both share controls use the same upload-from-tray outline. Music uses action icons requested by the user: the crossed speaker offers mute while music is on, and the speaker with waves offers enable while off. Tooltips and accessible labels report the actual state.

## v11 playback and fullscreen fixes
Music starts disabled for new visitors. A saved-on preference is shown as inactive until playback is running; the first explicit click starts/resumes audio instead of muting an unstarted context. Interrupted contexts are resumed and closed contexts recreated. Explicit music enable reports initialization failure instead of silently claiming playback.
Fullscreen now expands within the browser viewport, avoiding the host Fullscreen API. Click the collapse button or press Escape to exit. The leaderboard remains hidden while expanded.
