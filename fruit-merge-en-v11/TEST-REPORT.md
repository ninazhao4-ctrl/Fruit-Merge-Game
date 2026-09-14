# v11 verification

- 66 passing engine / local-score storage / UI handler tests (`tests/results.json`). Includes all 25 merge routes, mass and rotation, sloped contact, juice timing and colour, all three tools, restart, pause, touch input, current-name settlement and separate live ranking iframe, settings transitions and fullscreen fallback.
- 9 passing feature tests (`tests/features-results.json`). Audio user-gesture initialization, note scheduling, independent mute, duplicate scheduler prevention, pause/resume, social link parameters, expression states and separation of home/ranking content.
- 4 passing share flow tests (`tests/share-results.json`). PNG blob creation, actual name/score snapshot, native image generation for long-press saving, revised action order, clipboard and pause-state restoration. These tests use API mocks and do not post anything.
- 24 passing HTML, structured data and internal link checks.
- Actual Canvas renderer run with `@napi-rs/canvas`: all 25 fruit bodies extracted, face visuals reviewed in `tests/fruits-render.png`; simulated game bodies reviewed in `tests/game-canvas.png`; completed share card reviewed in `tests/share-render.png`.
- QR sampled from the final share PNG, format bits unmasked, byte-mode payload decoded: **https://fruitmergegame.net/**. This verifies the composited pixels, not just the source QR configuration.

## Limits
This is not a real-browser end-to-end test. Earlier in this task the browser tool rejected local-file navigation; no alternate browser or localhost workaround was used. Canvas renders and DOM/API harnesses do not verify actual browser layout, audible speaker output, native long-press save menus or mobile touch ergonomics or real browser fullscreen layout. Please open the standalone preview to play/listen. The live domain has not been deployed or tested by this task. No social post was sent.

The icon-only update reran all 66 engine/UI/storage checks and 24 content checks successfully. Native fullscreen and phone audio remain subject to the browser verification limits above.

V11 reran 66 engine/UI checks and 9 audio/feature checks. Checked page build with 24 content checks. Actual audible output in the user browser remains unverified. Fullscreen is now in-page expansion, not operating-system/browser-chrome fullscreen.
