# D2PLUS companion integration · 1.0.0-beta.1

The EXE in this directory was built from the MIT-licensed GitHub source, with the supplied D2PLUS integration changes. It is not the Nexus download and is not an official Fr4nsson release.

Source: https://github.com/Fr4nsson/D2RDamageNumbers
Pinned commit: `f0f832bd3096c1c185c0a04c4f756928ce3320d5`
Original mod page: https://www.nexusmods.com/diablo2resurrected/mods/1085
License review date: 2026-09-26.

GitHub's LICENSE grants modification and redistribution under MIT, retaining the copyright and license notice. The source font `diablo4.ttf` is unchanged PT Serif by ParaType, distributed under SIL OFL 1.1. Both notices are included in `notices/` and `source/`. The compiler/runtime notices are also included. D2PLUS integration additions are MIT licensed, copyright 2026 D2PLUS contributors; the terms in `notices/Fr4nsson-MIT.txt` apply with that additional copyright attribution.

Nexus permissions prohibit uploading the packaged download elsewhere and require permission for modification/assets under that listing. No Nexus archive or assets obtained from it were used. The GitHub repository's independently supplied MIT source and OFL font are the inputs to this source build.

## Compatibility evidence, not a guarantee

At review time GitHub README identified Steam Infernal Edition file/product version **3.0.92198**. Nexus's compatibility section identified Steam Infernal Edition **3.2.92777** and optional D2RMM **1.9.0**, but its limitations still named **3.0.92198**. These claims differ and do not establish compatibility with this user's installation or this modified build.

The suite's Inspect button reads the selected executable's Windows file/product version and SHA-256. It does not turn a version match into a compatibility claim. Only the bundled companion's authenticated per-launch status, written after the original startup memory validation and overlay creation, allows “startup memory checks passed.” That still does not certify gameplay accuracy. The original hash-change warning, pattern validation, and failure returns remain. No game offsets or memory layout definitions were changed.

Windowed or borderless is required. First-run position learning may need hovering around 3–7 monsters at different screen positions. Calibration is stored per matching window size. Test with an offline character. The suite cannot read or enforce the game's online/offline menu choice.

Numbers represent observed monster HP loss, including combined ticks, mercenary and summon damage. They are not confirmed critical strikes. DPS is an estimate of observed health loss, not precise player-only DPS.

## Source changes

- `SuiteIntegration.h`: game PID + full executable path + process creation time validation; suite parent lifetime; nonce-tagged startup status.
- `MemoryScanner.cpp`: explicit target selection and refusal of ambiguous standalone process discovery. Original scanning algorithms, offsets and validation logic preserved.
- `D2RDamageNumbers.cpp`: selects only the target process's window; reports startup validation result; stops when backend exits.
- `OverlayConfig.cpp`: optional per-user INI path; original INI parsing retained.
- `SuitePortable.h` and SDK filename case: portable equivalents for Windows min/max value comparisons, for compiling the same code with llvm-mingw.
- `SuiteResources.rc`: existing repository icons plus beta version information.
- `D2PLUS-CHANGES.patch`: reviewable differences to existing upstream source files. New files are included in `source/`.

The suite styles only visual INI keys and disables synthetic Test Mode at automatic startup. It preserves `[Compatibility]`, `[ProjectionCalibration]` and memory configuration. An existing user-supplied EXE uses its own INI beside that EXE; that directory must be writable. Bundled EXE configuration is under `%LOCALAPPDATA%\D2PLUS\OfflineSuite\companion`.

## Build

The included EXE is an unsigned Windows x64 PE, cross-compiled on Linux using llvm-mingw 20260922 (UCRT, static C++ runtime). No Windows or live D2R runtime test was performed here. `BUILD.json` records its hash and provenance.

Linux: set `LLVM_MINGW` to an extracted llvm-mingw directory; run `sh source/build-cross.sh`.
Windows: open an **x64 Native Tools Command Prompt for Visual Studio 2022**, with C++ desktop tools installed; run `source\build.cmd`. Node.js is used to stamp the rebuilt binary hash. Native VS rebuilding is supplied but was not tested here.

Rebuilding through these scripts refreshes `BUILD.json`. A changed EXE without a matching manifest is treated as user-supplied and its startup checks are not reported as verified.

## User-supplied alternative

Obtain the original executable yourself from the Nexus Files tab (respect the author's terms), or build the original GitHub source. Select its EXE in Suite setup. The suite starts it only when exactly one D2R process exists and that game matches the configured installation/mod. The original binary has no suite identity/status protocol, so the suite reports its process as Running with compatibility **unverified**; read its own dialogs. A manually running companion is never taken over or killed. Use the integrated bundled EXE for stronger target binding and automatic parent-exit cleanup.
