D2PLUS Launcher Alpha v0.7 — Windows x64 desktop build

INSTALLER (recommended)
Run D2PLUS_Launcher_Setup_0.7.0-alpha.exe. It installs to:
%LOCALAPPDATA%\Programs\D2PLUS Launcher
It creates desktop and Start-menu shortcuts. No administrator access is requested.
The installer is not code-signed; no D2PLUS signing certificate is configured.

PORTABLE
Extract the entire portable ZIP to a new folder. Double-click D2PLUS Launcher.exe.
Keep its DLLs, resource files, companion and documentation together. The EXE needs
those adjacent files; it is not a single-file, self-contained executable.
No separate Node.js, Edge, npm, or command console is needed for normal use.

FIRST RUN
Close the previous Offline Suite console before starting: both use local port 8080.
The native app opens the same five-step setup wizard and reuses existing paths.
Import your working .lnk shortcut or select D2R.exe, the installed mod output folder,
and your complete arguments. D2RMM.exe is optional if the mod is already installed.
The mod output name is never assumed. Preserve the working name for your saves.
After changing D2RMM options, apply them with Install Mods before launching.

D2RMM can be downloaded as the official Windows 1.9.1 ZIP with SHA-256 verification.
Extract the verified download and select D2RMM.exe. Existing working versions are
not replaced. Download Alpha v0.7 from Install & Updates for the complete D2RMM
source mod. Follow its README_INSTALL.txt and install through D2RMM. Updating the
launcher alone does not overwrite your mod, source settings or saves.

ARTWORK
The main screen uses the actual supplied 31366.png reference (JPEG encoded), with
live controls aligned to the reference and scaled together at its original aspect
ratio. The angel, demon, castle, D2PLUS logo, ornate borders and button art remain.
Release/version/status text is replaced with actual launcher values. The decorative
image is static; this release does not invent animated assets. Setup windows use
readable matching dark panels. Minimize and close controls work as native controls.

WIKI / EDITOR
Open in separate desktop application windows. The wiki covers Alpha v0.7; the existing
compiled hero editor and its data are unchanged from the working suite.
Export character edits before closing. If tool windows are open, the launcher asks
before closing them. The native app uses its own browser-data profile; favorites,
notes or rune counts previously saved in an external browser are not automatically
copied. Use the wiki's backup export/import to transfer them if needed.

GAME / DAMAGE NUMBERS
Damage numbers remain optional and default off. Existing preferences are retained.
Launch uses your exact configured executable, output and additional arguments.
Duplicate game/companion prevention, installed-path matching, multiple-game refusal,
game-exit cleanup and original companion memory checks remain unchanged.
The companion is the existing D2PLUS source build from Fr4nsson's MIT repository,
not a Nexus archive. Source, commit, build hash and license notices are included.
No offsets have changed. Compatibility is unverified until its own startup checks
pass; successful startup checks do not certify damage accuracy.

Use offline single-player, windowed or borderless mode. The launcher cannot enforce
the game's menu selection. Initial overlay positioning may require hovering over
3–7 monsters. Damage measures monster-health loss, including rapid combined hits,
mercenaries and summons; it is not precise player-only DPS or critical detection.
DPS position/font settings remain available. Stop/disable affects the owned overlay.
Closing the launcher stops its managed companion. D2R itself is left running.

SETTINGS / UNINSTALL
Settings stay at %LOCALAPPDATA%\D2PLUS\OfflineSuite\settings.json.
The existing first-write backup is retained. Companion calibration and downloads
remain there too. Uninstall removes package-listed application files and shortcuts;
it preserves settings, saves, game/mod files, and any unlisted files you placed in
the app directory. It does not recursively delete arbitrary installation folders.

SOURCE AND CHECKS
resources/app contains the complete launcher UI, backend and native-shell source.
The companion's separate source and notices are in resources/app/companion.
The source ZIP additionally includes the installer script and packaging script.
Electron runtime license, Chromium notices and download provenance are included.

22 automated tests pass: launcher policy/API, setup persistence and failure handling,
download verification/cancellation, DOM interactions, origin checks, native window
configuration and application cleanup with mocked Windows/Electron interfaces.
The Windows PE executable and installer are packaged and their archives verified.
No live Windows/D2R/companion or installer execution was performed here. Browser
rendering is blocked by this environment, so visual alignment remains to be checked
on your Windows display, particularly at non-default scaling.

FIRST WINDOWS CHECK
1. Launch the EXE and check that the picture fits and buttons align at your DPI.
2. Reopen Settings; verify imported paths and extra arguments survived.
3. Open wiki/editor in native windows and export a disposable test character.
4. Launch offline D2PLUS with damage numbers OFF first.
5. Enable the overlay; read its own compatibility result and calibrate if needed.
6. Close D2R and check companion cleanup; close/reopen launcher to check persistence.

Reset offline maps: rerolls offline maps each new game while enabled. Relaunch D2R after changing this option. No character files are deleted.
