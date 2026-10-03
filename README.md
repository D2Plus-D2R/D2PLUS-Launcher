# D2PLUS — Alpha v0.7

D2PLUS expands offline Diablo II: Resurrected with new equipment, Cube crafting, mercenaries and endgame progression. Requires your own copy of D2R. An unofficial fan project.

[Download Alpha v0.7](https://github.com/D2Plus-D2R/D2PLUS-Launcher/releases/tag/v0.7-alpha) · [Launcher website](https://d2plus-d2r.github.io/D2PLUS-Launcher/) · [Release notes](release-notes/v0.7-alpha.md)

## Alpha v0.7

- Token of Regret: full allocated stat and skill reset, 1×1 item. Sold in every act and difficulty for 250,000 gold before native discounts.
- 32 unique trinkets: 1 in 2,000 selection chance from eligible Nightmare and Hell cows; equal weights.
- Lower-level set smelting rewards reduced; unique smelting unchanged.
- Custom crafting shard renamed Worldforge Shard, preserving code `wss` and all eight recipes.
- Existing mercenary models, equipment options, portraits and names carried forward; Sovereign Wardens retain +30% health and reduced rune-bonus frequency.
- Alpha v0.7 loading screen, refreshed wiki and Android companion, updated hero-editor data and file picker.
- Launcher option to reset offline maps. It adds the native game argument and requires relaunching D2R; no save files are deleted.
- Classic Diablo II-inspired website with stone panels, gold borders and a compact download archive.

## Downloads

| Asset | Purpose |
| --- | --- |
| `D2PLUS_Alpha_v0.7_Complete_D2RMM.zip` | Complete configurable D2RMM mod, not an addon |
| `D2PLUS_Launcher_Setup_0.7.0-alpha.exe` | Windows x64 launcher installer, wiki and hero editor |
| `D2PLUS_Launcher_Portable_0.7.0-alpha.zip` | Portable launcher; extract all files together |
| `D2PLUS_Offline_Wiki_Alpha_v0.7.zip` | Standalone offline wiki |
| `D2PLUS_Companion_Alpha_v0.7.apk` | Android reference companion, same package and signing identity |
| `D2PLUS_GitHub_Alpha_v0.7.zip` | Launcher source and bundled offline assets |

## Install the complete mod

1. Close D2R and back up offline characters.
2. Extract the complete archive into D2RMM's `mods` folder. Keep the stable `D2PLUS_Alpha_v05_Complete` folder name; merge files when updating.
3. Disable older overlapping D2PLUS modules, choose the combined mod's options, then click **Install Mods**.
4. Launch with your existing D2RMM shortcut or the optional launcher. Follow `README_INSTALL.txt` inside the archive.

Existing configuration files are excluded from the archive so your saved choices are retained. New options default on. The separate Act V portrait option defaults off. Dungeon experiments retain their previous state; this release does not resolve their portal crashes.

## Companion tools

Launcher settings and extra arguments persist. Its setup panel downloads the complete mod with SHA-256 verification; installation remains an explicit D2RMM step. The wiki follows the final v0.7 tables. Historical guides retain their original context. Hero-editor save-format IDs and existing item codes are preserved.

The Android update retains favourites and notes through the existing application identity and storage keys. Device testing is still needed. The optional damage overlay retains its compatibility checks and measures monster health loss, including potential mercenary and summon damage.

Automated installation, data, launcher and content checks accompany the release. Windows, Android-device and live D2R testing are not claimed.

## Continuing D2PLUS features

- Original uniques, 32 four-piece sets, eight custom runes and 64 runewords.
- Legacy uniques, Diablo I-inspired items and 32 unique trinkets from Nightmare/Hell cows.
- Level 100 progression, 21 class passives and optional Barbarian/Druid skill changes.
- Sovereign Seals, Artisan's Embers, Elder Gems and Worldforge Shards.
- Smelting eligible uniques and set items into runes through Cube recipes.
- Season I contracts for Andariel, the Countess, Mephisto, Pindleskin and Baal.
- Expanded 13×8 inventory, themed interface and Practical HUD integration.

## Status and troubleshooting

This is an alpha. Working gameplay behavior was reported by the author; file and automated checks do not replace live Windows or D2R testing. The installer is unsigned. For a bug report, include your game version, launcher version, installation method, enabled source mods if applicable, and reproduction steps.

Do not use this offline mod on Battle.net. Keep character backups before changing content or using the optional editor.

## Building

`python3 build/unpack-suite.py` restores bundled offline assets. Run `npm install --ignore-scripts`, `npm test` and `npm run test:ui`. Build Windows packages with `python3 build/package.py --makensis /path/to/makensis`. See [PUBLISHING.md](PUBLISHING.md) for the release workflow. Third-party credits and licenses are retained in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
