# Public release review

This document records a specific issue already disclosed by the inherited suite's THIRD_PARTY_NOTICES.md. It is not a new finding that prevents local alpha testing.

The editor bundles classic item artwork sourced from D2Cube and GoMule. Existing notices say that D2Cube had no separate root artwork license and that attribution does not establish public redistribution permission. The inherited software MIT license does not license Blizzard artwork. Confirm the distribution basis for those files, or replace/omit affected images, before making the full suite and source bundle public.

The launcher reference artwork came from the supplied D2PLUS project. Confirm you want that reference and other supplied art distributed publicly. Preserve all existing third-party notices; do not describe the entire bundle as exclusively original D2PLUS artwork or wholly MIT-licensed.

The damage companion is the existing source build, with its recorded MIT source and font/runtime notices. It is not a repackaged Nexus download. The companion source, patch and BUILD.json stay included. Electron's runtime license and Chromium notices remain in the installer/portable package.

The page, release notes and download packages are prepared locally. Source and the project page are staged in the private GitHub repository; no public website or release has been published. A private draft repository/release is a suitable next review step while these inherited artwork details are settled.
