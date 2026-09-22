# Two-page Fruit Merge Game implementation package

This ZIP contains **both requested pages**: `/fruit-merge-game-unblocked/index.html` and `/fruit-merge-game-strategy/index.html`, plus their local styles. It does not include the site's source or game engine, so it is not a standalone playable site.

For **both** pages, replace the visible `#gameShell` placeholder with the complete homepage section and replace all three dialog placeholders (`#settingsDialog`, `#guide`, `#shareDialog`) with the complete homepage markup. Preserve nested IDs and controls. Check every copied asset URL is root-relative, especially the leaderboard iframe `data-src="/rankings/index.html"`. The six root-path scripts are already referenced in order. Update the share script's hardcoded homepage URL so it shares the current page. Test gameplay, buttons, guide, sharing and local leaderboard before publishing.

The strategy page retains the six existing advice sections verbatim from the live page as read on 2026-09-22. It adds the four-route table, route warning, level explanation and six FAQs with matching FAQPage JSON-LD. The score-benchmark panel remains visibly pending: the site's leaderboard is browser-local, so verified cross-player median and top-decile values were unavailable. Replace that panel only with actual sourced measurements.

The unblocked page is the previously delivered page package, included here so the two requested pages are in **one** archive. Replace its old page in full rather than appending to it. Neither page copies the homepage's general How to Play, Fruit List & Sizes, or Tips & Strategies sections.
