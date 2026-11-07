# D2PLUS Alpha V2.0a — Reward bags roll again

Alpha V2.0a fixes the reward-bag problem reported after the V2.0 release. Eligible bosses should have one independent **10% base chance** to drop a Dungeon Reward Bag. A table-loading error could instead make that bag appear every time.

## Why the bags kept dropping

The drop table defined the empty result after the bag selectors that referenced it. The native loader reads those definitions from top to bottom, so it skipped the unresolved empty-result reference. That left the bag as the only valid choice.

The corrected order defines the empty result first. Each of the five selectors can now choose between a bag at weight 1 and no bag at weight 9: exactly **1 in 10**. This chance stays fixed across offline Players 1 through 8. It is a fresh roll each time, so ten kills can still produce no bags or more than one.

All 1,909 treasure-class rows and their field values are retained. The fix changes their order, while keeping the regular boss loot definitions, existing bag tiers, opening recipes and bag contents. Existing saved bags retain their preparation state.

## Matching castle gates

The Alpha V2 castle splash and its opening doors now share matched artwork. The lit inner hall is revealed as the gates open, with high-resolution and low-end sprite versions, the existing opening timing and the final open-door hold.

## One current release across the suite

The complete D2RMM mod, Windows installer and portable launcher, Hero Editor, online and offline wiki, and signed Android reference move to Alpha V2.0a together. This hotfix keeps the V2.0 dungeons, custom bosses, finished skill roles, gem colors and wider enemy health bar. It adds no further skill balance changes.

The website's [Screenshots section](https://d2-plus.net/screenshots.html) keeps the seven approved images, with captions identifying retouched views and development captures. The [installation](https://d2-plus.net/download.html), [dungeon](https://d2-plus.net/dungeons.html) and [skill](https://d2-plus.net/skill-changes.html) guides remain available alongside the wiki.

## Install or update

This is a **complete release**; no older D2PLUS download is needed.

1. Close D2R and back up your offline characters and shared stash.
2. Launcher users: install the updated launcher, select your D2R.exe, then use **Install Alpha V2.0a**. Updating the launcher application alone does not replace the installed gameplay.
3. D2RMM users: extract the Complete D2RMM package into D2RMM's `mods` folder, disable older complete packages and overlapping D2PLUS add-ons, enable the new package, and click **Install Mods**.
4. Keep the same installed output mod name and save path, then start a fresh game session so the corrected drop table is loaded.

The mod requires your own compatible, Warlock-capable Diablo II: Resurrected installation. Saves and game executables are not distributed. The Android companion contains an offline reference; it does not run the game.

## Validation and limits

The regression check reproduces the old 100% selector result and the corrected exact 1/10 result. It checks all five selectors, row order, all 1,909 retained rows, fixed Players 1–8 shares and the absence of duplicate bag-roll paths. Sprite headers, all eight door poses, both resolution variants, layout references and package integrity are checked as well.

These are source-backed and structural checks. They are not a measured live-game drop sample or a claim that every encounter and device has completed gameplay testing. When reporting a problem, include the installed version, boss, difficulty, Players setting and whether the game was restarted after updating.

[Full Alpha V2.0 changes](https://d2-plus.net/news-alpha-v20.html) · [Online wiki](https://d2-plus.net/wiki/)
