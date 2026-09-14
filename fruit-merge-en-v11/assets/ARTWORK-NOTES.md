# Artwork provenance

Mode: built-in `image_gen` (no fallback CLI). User-approved art is the style reference.

## fruit-bodies.png
Workspace asset: `assets/fruit-bodies.png`.
Generated from the approved 25-fruit character sheet as a 5×5 faceless atlas, preserving bright colour, heavy brown outlines, front-facing fruit identity and soft highlights. Runtime code adds all eyes, mouths, tears and expressions.

Final image-edit prompt:
> Edit sprite atlas background ONLY. Remove the checkerboard completely. Output actual alpha transparency (RGBA PNG), NOT a drawn checkerboard. All background pixels around and between fruit must be transparent with alpha 0, and all fruit fully opaque. Preserve exactly the same 25 faceless fruit sprites in their present positions, 5x5 equal grid, colors, outlines, highlights and size. Do not change or add anything on fruits. Transparent game sprite atlas, no checkerboard, no white or gray background.

The image generator returned RGB preview pixels despite that request. The game's one-time sprite loader clears only neutral background-connected pixels and detects individual sprite bounds; the white fruit flesh remains opaque. 25 components were verified. Original generated source is preserved in this file.

## share-template.png
Workspace asset: `assets/share-template.png`. Based on the specific promotional image the user supplied and selected for sharing.

Final image-edit prompt:
> Edit this exact square game share poster into a reusable background template. Preserve faithfully ALL fruits, crowned watermelon, wooden FRUIT MERGE GAME title sign, sky scenery, warm lighting, right top 'Can You Beat My Score?', bottom domain fruitmergegame.net and lower right wooden message. Change ONLY these data regions: erase ALEX leaving clean blank cream plaque at same location; erase SCORE and 18,420 leaving perfectly clean cream central panel; erase 'You Beat 93% of Players!' leaving plain pink ribbon with no text; remove QR code including center watermelon icon, leaving clean pure white square INSIDE its existing green rounded frame at lower left, so valid QR code can be overlaid. Preserve original positions and blank panel sizes. No new text, no placeholder words. Exact same 1:1 image composition and alignment, usable layered-style poster background for programmatically inserting real player name, real score, real QR, and invitation text.

## qr.png / share.png
QR is generated with ReportLab's QR encoder, with four-module white quiet zone. It encodes https://fruitmergegame.net/ and is verified in the final composite. `share.png` is a static social-preview card; dynamic cards are generated locally by the game's Canvas renderer with the user's actual score.
