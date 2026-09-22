# Fruit Merge Game: corrected two-page implementation package

This archive contains both `/fruit-merge-game-unblocked/index.html` and `/fruit-merge-game-strategy/index.html`, each with the supplied homepage `#gameShell` markup and all three full dialogs. The visible developer placeholders and their dashed-border/hidden-iframe CSS are removed. The six scripts use site-root paths in the required order. The two `#shareURL` fields point to their own pages.

**Deployment requirements:** These pages depend on the existing site's `/style.css`, `/fruits.js`, `/engine.js`, `/leaderboard.js`, `/audio.js`, `/share.js`, `/game.js`, assets and `/rankings/index.html`; none are included or fabricated here. Publish the page folders into the site's root. Check `/share.js`: if its social or card URLs are hardcoded to `https://fruitmergegame.net/`, make them use the dialog's `#shareURL` value or the current canonical URL. Test both pages on the actual site: drop fruit, scores, tools, settings, guide, local leaderboard, share card and social links.

The strategy score section explains personal benchmarks without inventing cross-player median/top-decile numbers. Add those only after measuring real data. The FAQPage JSON-LD answers match the visible FAQ on each page. No GSC export or upload is bundled; those analytics data have to come from the account owner.
