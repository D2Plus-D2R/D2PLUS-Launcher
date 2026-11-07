# Alpha V2.0 publication

The `Publish Alpha V2.0` workflow builds the complete D2RMM package, the Windows
launcher and the offline wiki before publishing the release. Pages deployment
depends on the package job and runs only after verified assets are available.
The separate Pages workflow ignores commits carrying `[publish-v20]`.

The source snapshot is complete. Players do not need an earlier D2PLUS release.
The legacy V1.2.2 base and V1.3/V1.4 overlays remain pinned for reproducible build
history; the V2.0 gameplay payload and reference suite are applied last.

The final editor/wiki input is `release-inputs/alpha-v20-suite.json` and its
SHA-256-verified parts. `build/site.py` applies this suite after the historical
reference migrations. `build/generate-reference-v20.py --data-root <snapshot/data>`
is the source-authoring step used before packing that suite; CI never reads an
installed game. Its source fingerprints and 51 point-plan checks are recorded
in `release-inputs/reference-v20-report.json`.

Keep save version 105, native row identities, output folder names and existing
save paths. `*ID` in ItemStatCost is a comment annotation, not a request to
renumber saved stats. The native 212/368/369/370 entries and retained compatibility
entries are intentionally distinct. Four synthetic item-byte round trips cover
those native identities in `test/release-v20.test.cjs`.

Before publication, run the workflow's unit, interface, ritual and release tests,
validate full D2RMM output against the snapshot manifest, and verify the signed
Android package's certificate, version and embedded reference manifest. Retain
the signing identity from the existing compatible Android app. Signing keys and
game executables are not release inputs.

Do not change an existing published asset in place. The publisher must verify
uploaded sizes and digests before making a draft visible. Keep every individual
GitHub release asset below the service's 2 GiB limit. Historical release pages
and assets remain available.

The public article is `site/news-alpha-v20.html`. Gameplay screenshots include
captions describing retouched views. Automated checks do not establish measured
clear times, live encounter balance or Android device acceptance.
