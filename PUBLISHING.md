# Publishing Alpha v0.8

The reviewed gameplay packages are identified by exact SHA-256 hashes in
release-inputs/alpha-v08.json. The reconstruction recipe combines unchanged files
from the existing public v0.7 package with verified staged Git blobs. Every input
file and final gameplay ZIP is checked before the launcher build begins.

The source bundle already contains the migrated companions. Do not run the
one-time v0.7 migration again against the updated data. For a local rebuild:

1. Run `python build/unpack-suite.py` and `npm ci --ignore-scripts`.
2. Run `python build/fetch-release-inputs.py --input-dir PATH_TO_RELEASE_PACKAGES`.
3. Run `npm test` and `npm run test:ui`.
4. Run `python build/package.py --makensis PATH_TO_MAKENSIS` on Windows x64.

Use Python 3.14.3 and NSIS 3.11. The GitHub build workflow performs these checks,
then builds installer/portable, wiki and source packages. A main-branch commit
containing [publish-v08], or manual workflow dispatch, starts the release build.
The publisher creates a draft v0.8-alpha prerelease, verifies uploaded checksums,
then publishes it. It refuses to overwrite an existing public release or a draft
from another commit. Older tags/releases are preserved.

Pages deploys only after the release workflow succeeds for the release commit.
Normal later website edits retain their push-based deployment. The Android APK
was signed locally with a new release identity because the v0.7 key was unavailable.
Its manifest records the public certificate fingerprint and verified signed APK
hash. The signed-Android workflow uploads that already-signed APK; it never receives
a private key or password. Existing users must uninstall the older companion first.
Never put private keys or signing passwords in this repository.
