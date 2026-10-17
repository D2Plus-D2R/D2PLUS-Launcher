# Publishing Alpha V1.0

Source: user-confirmed D2PLUSAlphaV1.0.zip, SHA-256 75e8005ce03d050397753d23ffcf5de5a442d72643d7ab552e370384737244fe.
The release preserves game content and updates only three UI branding layouts and the two loading splash sprites. The complete standalone D2RMM output is verified against all 2241 data files.

The guarded [publish-v10] workflow reconstructs hash-pinned packages, tests the launcher and references, builds Windows installer/portable packages, validates the signed Android APK and publishes v1.0-alpha. Pages deploys after successful publication, so download links are not switched early. Older releases remain available.

Android package com.d2plus.companion uses versionCode 100 / 1.0.0-alpha and the same signing certificate as earlier signed releases. Private keys are never included in this repository or CI.

The fixed-settings D2RMM mod needs no previous D2PLUS install. Disable older complete bundles and included addons before installing it. Preserve output/save paths. Existing game saves are never included in distribution.
