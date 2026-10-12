# Publishing Alpha V0.9

The complete release comes from D2RMMAlphaV0.9.zip, the user-confirmed working snapshot. Gameplay bytes are retained; splash/UI branding changes are listed in the release validation report. The D2RMM source is one fixed-settings mod and does not need older bundles or add-ons.

Run build/unpack-suite.py, npm ci --ignore-scripts, npm test and npm run test:ui. Supply the reviewed gameplay packages with build/fetch-release-inputs.py --input-dir, or reconstruct the checksum-verified inputs. Build the Windows launcher with build/package.py and NSIS 3.11. Python 3.12.14 matches the packaged ZIP inputs.

A main-branch commit containing [publish-v09] triggers the guarded build, verifies the input and signed APK hashes, publishes the new v0.9-alpha prerelease, and then deploys GitHub Pages. Existing public releases are retained. Do not deploy the V0.9 website before its release downloads exist.

Android versionCode 90 and versionName 0.9.0-alpha retain the V0.8/V0.8.2 signing identity. Private signing files remain outside the repository and are never uploaded to CI.
