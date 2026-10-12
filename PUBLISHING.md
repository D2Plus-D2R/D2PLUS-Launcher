# Publishing the Alpha V0.9 stash hotfix (0.9.1-alpha)

Only the two Act V preset 154 ObjectClass cells change from the published V0.9 game data. Build from the public SHA-256-pinned inputs in release-inputs/stash-hotfix-baseline.json; never read a live game installation for this release.

Use Python 3.12.10 on Windows. Run build/stash-hotfix.py, build/verify-stash-output.py and build/fetch-release-inputs.py --input-dir dist. The pinned output hashes must match. The verifier executes the standalone mod and compares all 1663 emitted game files to the installed snapshot.

Run build/unpack-suite.py, npm ci --ignore-scripts, npm test and npm run test:ui. Build the Windows launcher with build/package.py and NSIS 3.11.

A main-branch commit containing [publish-v09] triggers the guarded build, verifies inputs and signed APK, publishes v0.9.1-alpha, then deploys GitHub Pages. Older public releases remain intact. Do not deploy changed download links before release assets exist.

Android stays at versionCode 90 and versionName 0.9.0-alpha with its original signing identity. Companion reference data is unchanged. No private keys or local experimental files are included.
