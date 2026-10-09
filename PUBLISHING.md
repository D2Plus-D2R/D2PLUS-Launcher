# Publishing AlphaV0.8.2

The release is based on the user-supplied Alphav0.8.2.zip. The compiled gameplay
payload is preserved byte-for-byte. Exact input hashes are recorded in
release-inputs/alpha-v082.json; the reconstruction recipe checks every file and ZIP.

For a local build, unpack the offline suite, run npm ci --ignore-scripts, supply
the gameplay packages with build/fetch-release-inputs.py --input-dir, run npm test
and npm run test:ui, then build/package.py with NSIS 3.11 on Windows x64.
Use Python 3.14.3 for reproducible ZIP compression. The content sync and guide
scripts document how the catalogs and recommendations were generated; they are
not required to rebuild the already-reviewed vendor bundle.

A main-branch commit containing [publish-v082] starts the guarded release build.
CI reconstructs gameplay, builds the launcher, rebuilds the unsigned Android kit,
verifies the already-signed APK and every reference asset, then publishes a draft
as the new v0.8.2-alpha prerelease after all upload hashes match. Older public
releases cannot be overwritten. Pages deploys only after the build succeeds.

The signed APK keeps the private v0.8 identity and uses versionCode 82.
Signing keys and passwords are held outside this repository and never reach CI.
The data includes 33 existing unsupported item-template cases; their editor
safety rejection is retained. All 33 build plans pass native save round-trips.
Game and physical Android behavior are not certified by automated checks.
