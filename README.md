# D2PLUS

D2PLUS is a Diablo II: Resurrected mod designed for offline single-player. It adds items, crafting recipes, skill changes and endgame content, with progression based on equipment you find yourself. Its smelting system converts eligible uniques and set items into runes through Horadric Cube recipes that require crafting currencies.

## About the project

D2PLUS is a passion project developed by a father of three with a busy life and a vision for an enhanced single-player version of Diablo II: Resurrected. The developer makes no profit whatsoever from the project. You MUST own the game through Blizzard to play.

## Downloads

[Download packages and installation notes](https://github.com/D2Plus-D2R/D2PLUS-Launcher/releases)

The Alpha 0.0.2 release is currently a private draft. These links will become available to viewers after the release is published and the repository is made public.

- Full gameplay mod: `D2PLUS_Mod_Alpha_0.0.2_Level95.zip`.
- Small update for the existing working mod: `D2PLUS_Level95_Defaults_UPDATE_Alpha_0.0.2.zip`.
- Optional Windows launcher: installer or portable ZIP in the same release.


## Features

### Items and progression

- 200 original uniques, 32 four-piece sets, eight custom runes and 64 runewords.
- Restored legacy uniques, Diablo I-inspired equipment and 32 unique trinkets.
- A level cap of 100.
- Seven endgame class sets containing 28 pieces, with level requirements reduced to 95.

### Smelting and crafting

Eligible uniques and set items can be combined with Artisan's Ember and Sovereign Seal to recover a rune. The smelting catalog lists the supported items and their outputs.

The crafting system also includes 64 new recipes, Elder Gems and three currencies: Artisan's Ember, Sovereign Seal and Worldstone Shard.

### Skills and mercenaries

D2PLUS adds 21 passives, three for each of the seven original classes, alongside skill and synergy adjustments. Optional experimental modules include elemental Barbarian warcries, revised Barbarian masteries and a four-skill Druid overhaul.

Mercenary changes include stat improvements and progression sets.

### Boss contracts and dungeon

Season I includes contracts for Andariel, the Countess, Mephisto, Pindleskin and Baal. Each difficulty has separate contracts and rune rewards. An in-game journal tracks progress.

The Furnace of Storms is a four-floor Hell dungeon using Worldstone-style areas. Entry is available through a Cube recipe.

### Interface and companion tools

The interface includes a 13-by-8 backpack, themed menus and HUD, custom item artwork and boss icons.

A separate Windows launcher provides access to the configured game launch, offline wiki, hero editor and optional damage display.

## Configuration and status

The mod uses D2RMM and has 71 configurable options. The supplied preset uses standard monster density and disables extra dungeon rooms.

This is an alpha release. Some features are experimental. Package validation is complete; Windows installation and gameplay testing of this exact release remain pending. Installation instructions and validation details are below.

## FAQ

### Is this for Diablo II: Resurrected or classic Lord of Destruction?

This package is for **Diablo II: Resurrected on Windows**, installed through D2RMM. It is not the classic Lord of Destruction mod.

### Can I use it on Battle.net or ladder?

D2PLUS is built for **offline single-player**. This release does not provide a multiplayer realm or Battle.net support.

### Do I need to own Diablo II: Resurrected?

Yes. You MUST own Diablo II: Resurrected through Blizzard and have it installed. D2RMM is also required. The downloads contain the mod and companion tools, not the game.

### Which download should I choose?

For the complete gameplay mod, use **D2PLUS_Mod_Alpha_0.0.2_Level95.zip**.

If you already have the working D2PLUS build used for this update, **D2PLUS_Level95_Defaults_UPDATE_Alpha_0.0.2.zip** contains the changed files. Merge it into your existing source mod folder. It does not include the artwork or other required assets.

The launcher installer and portable ZIP are separate downloads. Installing the launcher does not install the gameplay mod for you.

### Do I have to use the launcher or hero editor?

No. You can keep launching through your working D2RMM setup or shortcut. The launcher brings the companion tools together, and using the hero editor is entirely optional.

### Can I keep my existing character?

Keep a backup and test with a copy first. This update preserves the existing set IDs, bonuses and artwork references, but live character compatibility still needs to be checked in game. Keep your current mod name, launch arguments and save path.

### Can I turn features off?

Many features have individual D2RMM options. Review them, then click **Install Mods** to apply a change.

Be careful with features that add items or inventory space. Back up your saves, remove affected custom items before disabling their content, and clear the extra backpack cells before turning off the expanded inventory.

### Is level 95 the new level cap?

No. The cap is still **100**. Level 95 is the new requirement for the 28 pieces in the seven endgame class sets.

### Are damage numbers required?

No. The optional damage companion is off by default in fresh launcher settings. It measures monster health loss, which can include mercenary and summon damage. It is not a player-only damage meter.

### Does it work with other D2RMM mods?

Compatibility depends on what the other mods change. Mods that replace the same tables, inventory layouts or UI files can conflict. Start with D2PLUS on its own, then add other mods one at a time and check the result.

### What should I include in a bug report?

Include your game and D2RMM versions, enabled options, the steps that caused the problem, and any relevant screenshots or diagnostic ZIP. Say whether it happens with a new character, an existing character, or both.


---

# Launcher setup and technical notes

## What it does

- Opens a D2PLUS-themed desktop window based on the supplied reference artwork.
- Guides you through game, mod and companion paths on first use.
- Imports your working Windows shortcut and preserves extra launch arguments.
- Uses the mod files already installed by D2RMM; it does not silently reinstall mods.
- Opens the offline wiki and hero editor in their own application windows.
- Offers damage numbers as a persistent option, off by default for new settings.
- Matches the configured D2R installation, prevents duplicate managed launches and handles game exit.
- Provides a verified D2RMM download option and clear component status.

This launcher bundle does **not** include the full D2PLUS D2RMM mod or the game. Use your existing working mod installation. A public D2PLUS mod update feed is not yet configured.

## First setup

1. Close the old Offline Suite console; both launchers use local port 8080.
2. Run the installer and open the **D2PLUS Launcher** desktop shortcut.
3. Import your known-working `.lnk` shortcut, or select `D2R.exe`, the installed mod output folder and complete launch arguments.
4. Verify the mod output name and arguments. Keeping the correct output name matters for finding your existing saves.
5. If you changed D2RMM options, click **Install Mods** in D2RMM before launching.
6. Test offline D2PLUS with damage numbers off first. Enable them after confirming the game works.

The installer uses `%LOCALAPPDATA%\Programs\D2PLUS Launcher`. Launcher settings remain at `%LOCALAPPDATA%\D2PLUS\OfflineSuite\settings.json`.

## Damage numbers

The bundled source-built companion is based on [Fr4nsson/D2RDamageNumbers](https://github.com/Fr4nsson/D2RDamageNumbers). Original memory/compatibility checks remain active; no offsets were invented. Exact D2R compatibility has not been verified here.

Use offline single-player in windowed or borderless mode. First-run positioning can require hovering over several monsters. Configure the optional DPS display so it avoids the Practical HUD.

The overlay measures **monster health loss**. Rapid hits, mercenaries and summons may be combined. It is not a precise player-only DPS meter or a confirmed critical-strike detector. A companion error does not prevent the wiki, editor or game from opening.

## Testing and limitations

- 22 automated launcher, setup, persistence and desktop-shell tests passed for this renamed release. Page navigation, draft download buttons and published tag-specific links were also checked.
- Windows executable structure and package integrity are checked during packaging.
- No live Windows installer, D2R, overlay accuracy or display-scaling test has been performed in this environment.
- Installer is unsigned.
- Browser-based wiki notes/favorites do not automatically migrate to the desktop app's separate profile; use the wiki's backup export/import.
- The installer preserves game files, saves and launcher settings. Export editor changes before closing the launcher.

See [release notes](release-notes/v0.0.2-alpha.md), [full setup instructions](README-DESKTOP.txt) and [publishing instructions](PUBLISHING.md).

## Source and development

`desktop/` contains the Electron shell; `scripts/` the Windows launcher backend; `docs/launcher/` the launcher interface. The unchanged compiled wiki/editor are stored in `vendor/offline-suite.zip.part*` and unpacked into `docs/` for development and packaging. `companion/` contains the companion binary, source, patch and notices.

The GitHub Pages marketing page is isolated under `site/`; the publishing workflow uploads only the generated `_site/` folder. It does not expose the backend or your settings.

```sh
python3 build/unpack-suite.py
npm install
npm test
npm run test:ui
python3 build/site.py
```

To package Windows x64 files, use `python3 build/package.py --makensis /path/to/makensis`. It downloads the pinned Electron archive, verifies its recorded SHA-256 and builds the portable package and installer. Python 3 and NSIS are build requirements. Electron is needed separately only when using `npm start` for development.

## Credits and rights

Thanks to Fr4nsson for D2RDamageNumbers; dschu012 for d2s-editor and d2s; TrayHard for d2r-saver; Sappho for Trading Market source material credited by the wiki; and the Electron, Bootstrap, Bootswatch, jQuery and Popper projects.

Existing MIT/OFL and other notices are retained in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), `licenses/`, and `companion/notices/`. The root MIT license originates from the inherited hero editor. It is **not** a blanket license for Blizzard artwork or every bundled asset. See [public release review](PUBLIC-RELEASE-REVIEW.md) before publishing the full bundle.

D2PLUS is an unofficial fan project, not affiliated with or endorsed by Blizzard Entertainment. Diablo II and Diablo II: Resurrected belong to their respective owners.

## Repository setup

The repository is private. The page is prepared but not deployed. Run the manual **Build alpha packages** workflow to create a draft prerelease with installer, portable ZIP and checksums. It does not publish the draft. Keep the page download buttons disabled until a public release exists.
