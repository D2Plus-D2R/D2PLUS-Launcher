# Getting Started with D2PLUS

D2PLUS is an offline Diablo II: Resurrected mod. You need your own copy of the game. Start with the current complete package; you do not need to install older releases first.

## Install or update

**Launcher:** Install the current Windows launcher, choose your D2R.exe in Setup, and install its bundled gameplay files. Then click **Launch D2PLUS** and choose an offline character.

**D2RMM:** Extract the **Complete D2RMM** download into the D2RMM application's `mods` folder. Enable the new complete D2PLUS package, disable the older complete package and overlapping D2PLUS addons, and click **Install Mods**.

For either method, close D2R before installing. Keep your existing output mod name and save path when updating. Changing them can make your characters appear missing because the game looks in a different folder. The installed snapshot ZIP is for the launcher; use the Complete D2RMM ZIP with D2RMM.

## Find and protect your characters

Launcher Alpha V1.2.2 shows the full save-folder path under **Character saves**. It reads the installed mod's savepath, so your folder may still be called D2RMM.

- **Open Saves** opens that exact folder.
- **Back Up Saves** copies its contents, including characters and the shared stash, into a separate timestamped folder. Close D2R and finish any hero-editor exports first.
- **Open Backups** opens your most recent verified backup for the selected save folder. Each backup contains a `files` folder and simple restore instructions.

Backups are kept under `%LOCALAPPDATA%\D2PLUS\OfflineSuite\save-backups`. Copy important backups to another drive as well. No saves are moved or renamed. If you have not saved a character yet, the launcher may show the expected path with the buttons disabled until that folder exists.

To restore, close the game and editor, keep a copy of the current saves, then copy the contents of the backup's `files` folder into its original save folder. Restore related character and shared-stash files together. Do not mix shared stashes from unrelated mods.

## A few things worth knowing

**Optional melee splash:** Gheed sells the melee-splash charm. Keep it in your character inventory to enable the effect. Putting it in the stash does not enable it.

**Magic find:** D2PLUS applies a magic-find penalty of **-20 on Normal, -50 on Nightmare, and -75 on Hell**. These subtract from your magic-find stat; they are not a flat percentage reduction to every drop chance.

**Material storage:** Use the Gems, Materials, and Runes stash tabs for eligible stackable items. The Accursed Ritual Sigil has a Materials slot. Mouse-and-keyboard players can use Ctrl + left click where the item's tooltip offers “Move to Stack Tab.”

**Accursed rituals:** Cube one of each of the seven Elder Gems to make an Accursed Ritual Sigil. Cube the sigil with one eligible unique, then transmute a second time to resolve the ritual. It consumes the sigil: **75%** grants one or two bonuses; **25%** turns the unique into a random rare of the same base item type. Each item gets one ritual attempt. Use an item you can afford to lose.

The purple Accursed lines identify the added bonuses and their roll ranges. The ordinary stat list includes those same bonuses; they do not apply twice.

## Need a reference?

Visit the [online wiki](https://d2-plus.net/wiki/) for items, recipes, farming and builds, or the [Accursed guide](https://d2-plus.net/accursed.html) for the full ritual rules. The launcher also includes an offline wiki and hero editor.

If characters seem missing, check the displayed save path before moving anything. If installation or joining a game fails, keep your saves and share the exact error and installation method when asking for help.
