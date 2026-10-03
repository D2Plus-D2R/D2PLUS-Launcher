# Alpha v0.5 release workflow

The current release tag is `v0.5-alpha`. Launcher package version is `0.5.0-alpha`; the user-facing name is Alpha v0.5.

The Build alpha packages workflow runs on a main-branch commit containing `[build-alpha]`, or a manual dispatch. It restores the checked offline suite, runs launcher/setup/wiki tests, verifies staged gameplay ZIPs, builds the Windows installer and portable package, creates the standalone offline wiki and source ZIPs, then publishes a prerelease with SHA-256 checksums. The workflow refuses to replace an existing release.

The Pages workflow runs after a successful release build or by manual dispatch. It publishes the landing page, using tag-specific release links. Prereleases do not use `/releases/latest`.

Gameplay ZIPs are installed snapshots, not D2RMM source mods. `release-inputs/alpha-v05.json` records their exact sizes and hashes. Initial transfer uses GitHub blob objects without adding the game-data ZIPs to the source tree; after publication, the release assets are the durable source for rebuilds. Preserve the attached ZIPs. The source repository contains the launcher and offline reference assets.

To update the wiki from an extracted working snapshot, run `python3 build/update-wiki.py /path/to/data`. Review the generated records, then `python3 build/repack-suite.py` to refresh the vendor bundle and checksum. Keep user saves, settings, downloaded runtimes and built packages out of commits.

Windows installation, display scaling, live D2R launching and in-game sprite checks remain separate validation steps. Existing third-party license notices accompany the launcher.
