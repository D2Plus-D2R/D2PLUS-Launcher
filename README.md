# D2PLUS — Alpha v0.5

D2PLUS expands **offline single-player Diablo II: Resurrected** with equipment, Cube crafting, skill changes, mercenaries and endgame progression. You need your own installed copy of the game. The project is unofficial and is not affiliated with Blizzard Entertainment.

[Alpha v0.5 downloads](https://github.com/D2Plus-D2R/D2PLUS-Launcher/releases/tag/v0.5-alpha) · [Release notes](release-notes/v0.5-alpha.md) · [Report a problem](https://github.com/D2Plus-D2R/D2PLUS-Launcher/issues)

## What changed in v0.5

| Act | Mercenary appearance | Specializations |
| --- | --- | --- |
| I | Reskinned Blood Raven with visible bow | Native Fire and Cold variants |
| II | Cow King | Native auras and Jab |
| III | Summoner with Diablo I-inspired robe | Fire, Lightning and Cold |
| V | Fixed-sword Doom Knights | Dreadguard and red Doom Reaver, each with three custom skills |

- **Hell Alchemy:** six expensive level-60 buff potions, each lasting **10 minutes**. Sold by Akara, Lysander, Alkor, Jamella and Malah in Hell. Target prices: 500,000–650,000 gold before discounts.
- **Sovereign Warden:** distinguished escorts configured for all five act bosses, using the Countess parent drop table of the corresponding difficulty. Andariel and Mephisto were explicitly confirmed in playtesting. Rune outcomes remain random.
- **Worldstone Shard:** new transparent inventory artwork, still **1×1**, with existing Cube recipes preserved.
- Custom rune-name and numeric passive-tooltip presentation fixes are included in the working prototype.
- Launcher, offline wiki, news and patch notes now describe Alpha v0.5. All 135 hireling records were refreshed from the installed working tables.

The Summoner mercenary's robe also changes the Summoner boss because they share texture assets. The failed private Sorcerer, horn-removal and wizard-hat experiments are excluded. Astral Reliquary and Sovereign Dunes remain experimental and are **not enabled in this working snapshot**; their portal-entry crashes are unresolved. Existing Furnace of Storms content is retained.

## Choose a download

| File | Purpose |
| --- | --- |
| `D2PLUS_Alpha_v0.5_Working_Shard.zip` | Complete installed gameplay snapshot, based on the user-tested prototype plus the Shard art replacement |
| `D2PLUS_Worldstone_Shard_Only.zip` | Small D2RMM addon for an already working v0.5 setup; load after D2PLUS and other item-art mods |
| `D2PLUS_Launcher_Setup_0.5.0-alpha.exe` | Windows x64 installer with the refreshed offline wiki and existing hero editor |
| `D2PLUS_Launcher_Portable_0.5.0-alpha.zip` | Portable launcher; extract all files together |
| `D2PLUS_Offline_Wiki_Alpha_v0.5.zip` | Standalone offline reference; extract and open `docs/wiki/index.html` |
| `D2PLUS_GitHub_Alpha_v0.5.zip` | Launcher source and bundled companion assets; not the gameplay mod's D2RMM source |

The gameplay snapshot is **installed output**, not a configurable D2RMM source package. It preserves the tested data supplied by the mod author. The previously assembled replacement source bundle is not used for this release.

## Install the working gameplay snapshot

1. Close D2R. Back up your installed mod output and offline saves.
2. Merge the ZIP's `data` folder and `modinfo.json` into your game's `mods/D2RMM/D2RMM.mpq` folder, replacing matching files. Follow the enclosed `READ_ME.txt`.
3. Keep your working launch arguments and save location. The supplied metadata uses the `D2RMM` name and save path. If your output uses another name, preserve your matching metadata instead.
4. Launch through your working D2RMM shortcut or configure the launcher to use that output.

**Clicking Install Mods in D2RMM regenerates its output.** Older source packages can overwrite v0.5. The Shard-only addon preserves the new artwork across reinstalls of a matching v0.5 source setup; it does not add the other v0.5 gameplay features.

## Launcher and wiki

Install the Windows launcher or extract the portable ZIP. Existing paths, launch arguments and damage-companion preferences are retained. The Install & Updates screen downloads the v0.5 gameplay snapshot with SHA-256 verification; applying that snapshot is a separate, manual step. Installing the launcher alone does not replace gameplay data or saves.

The offline wiki includes the item and recipe catalog, runeword finder, build archive, current mercenary records, Hell potion effects and prices, Warden information, and v0.5 news. Earlier news and build guides retain their historical context; gear recommendations have not been re-optimized for the new mercenaries. The hero editor remains the existing version and has not received a new save-format implementation in this release.

Damage numbers are optional and default off for fresh settings. They measure monster health loss, which can include mercenary and summon damage. The existing compatibility checks remain in place.

## Continuing D2PLUS features

- Original uniques, 32 four-piece sets, eight custom runes and 64 runewords.
- Legacy uniques, Diablo I-inspired items and 32 unique trinkets from Nightmare/Hell cows.
- Level 100 progression, 21 class passives and optional Barbarian/Druid skill changes.
- Sovereign Seals, Artisan's Embers, Elder Gems and Worldstone Shards.
- Smelting eligible uniques and set items into runes through Cube recipes.
- Season I contracts for Andariel, the Countess, Mephisto, Pindleskin and Baal.
- Expanded 13×8 inventory, themed interface and Practical HUD integration.

## Status and troubleshooting

This is an alpha. Working gameplay behavior was reported by the author; file and automated checks do not replace live Windows or D2R testing. The installer is unsigned. For a bug report, include your game version, launcher version, installation method, enabled source mods if applicable, and reproduction steps.

Do not use this offline mod on Battle.net. Keep character backups before changing content or using the optional editor.

## Building

`python3 build/unpack-suite.py` restores bundled offline assets. Run `npm install --ignore-scripts`, `npm test` and `npm run test:ui`. Build Windows packages with `python3 build/package.py --makensis /path/to/makensis`. See [PUBLISHING.md](PUBLISHING.md) for the release workflow. Third-party credits and licenses are retained in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
