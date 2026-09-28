# Third-party notices

## d2s-editor

D2PLUS Hero Editor is derived from [`dschu012/d2s-editor`](https://github.com/dschu012/d2s-editor), used under the MIT License. The upstream license is preserved in [`LICENSE`](LICENSE).

## @dschu012/d2s

Save parsing and writing are provided by the `@dschu012/d2s` package. Its upstream project is [`dschu012/d2s`](https://github.com/dschu012/d2s).

## d2r-saver

The v105 backend uses TrayHard's [`d2r-saver`](https://github.com/TrayHard/d2r-saver), under the MIT License. D2PLUS modifications are recorded in `patches/d2r-saver+0.2.0.patch`. Its original copyright and license are included in the release's `licenses` folder.

## Offline UI dependencies

Bootstrap 4.6.2, Bootswatch 4.6.2, jQuery 3.7.1, and Popper.js 1.x are bundled locally for the inherited Bootstrap 4 interface. Their MIT licenses are included under `licenses/`. These legacy UI dependencies are retained for compatibility; do not expose the development editor as a public multi-user service. Analytics and external font requests have been removed.

Diablo II and Diablo II: Resurrected are trademarks of Blizzard Entertainment. D2PLUS Hero Editor is an unofficial fan project and is not affiliated with or endorsed by Blizzard Entertainment.

## Inventory artwork

Classic item graphics were obtained from [D2Cube](https://github.com/d2cube/d2cube) by Chris Zhou and [GoMule D2R](https://github.com/pairofdocs/gomule-d2r). Repository commit IDs are recorded in `public/d2plus/art/manifest.json`. Diablo artwork remains the work of Blizzard Entertainment; the editor's software license does not confer ownership of those assets. No separate artwork license was found in D2Cube's root. Attribution does not establish permission for a future public redistribution.

GoMule's upstream repository license notices are retained in `licenses/gomule-*`; only image/palette resources were used, not its application source. The included DC6/PNG conversion code was written for this editor. Custom D2PLUS art and the inventory background came from the supplied mod files. This build uses classic vanilla sprites rather than claiming a complete HD D2R asset pack.

## Wiki and save-format references

Preset source: the supplied D2PLUS Offline Wiki, Codex 2.2.0 Beta 3. Its existing credits and source-guide text are preserved in the bundled copy. The wiki credits Sappho, the original Single Player Trading Market creator for the smelting-system source material.

Engineering references consulted alongside the actual game fixture and bundled parser source: https://github.com/TrayHard/d2r-saver ; https://github.com/crabsmadethis/d2r-horadric-tools/blob/main/docs/d2s_format.md ; https://d2r-tools.com/data/setitems ; https://d2r-tools.com/data/uniqueitems . The supplied native v105 fixture and final D2RMM data take precedence where third-party descriptions differ.
