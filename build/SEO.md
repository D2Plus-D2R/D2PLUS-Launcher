# Public search metadata

`python build/site.py` runs `seo.py` **after** the final Alpha V2.0a reference
overlay. It changes only `_site`, so the accepted offline wiki, native data,
Android content bindings and release archives keep their existing bytes.

For a new public page, provide a unique `<title>`, a meaningful
`<meta name="description">` and a visible heading in `site/`. The final pass
preserves those titles/descriptions. An article can opt in with
`<meta name="seo:type" content="article">`; accurate ISO dates can be supplied
as `article:published_time` and `article:modified_time`. Dates are not inferred
from build time. Existing release dates and explicitly revised build guides are
mapped in `seo.py`.

The pass supplies canonical URLs on `https://d2-plus.net`, social metadata using
the approved V2.0 splash, and conservative JSON-LD. It does not fabricate reviews,
ratings, download counts, a search endpoint or online-play features. Software
metadata describes the free mod and its licensed base-game requirement; it does
not claim eligibility for Google's software-app rich results.

The sitemap includes only canonical, indexable HTML. The root Accursed guide and
V1.4 news article are the preferred URLs for their duplicate wiki routes. Mobile,
editor/practice HTML and the custom 404 carry `noindex`. The practice fragment is
an input include and is removed from the public output. Assets, data files and
fragment-based wiki screens are not sitemap entries. Rendering resources remain
crawlable: robots.txt is not an indexing-removal mechanism, and this GitHub Pages
build does not invent unsupported per-file HTTP headers for JSON or images.

The retained static reward-bag guide is corrected in the public output to the
current V2.0a flat 10% eligible-boss base rule. Historical V1.4 news retains its
historical description. Neither operation changes the pinned reference suite.

The Google Search Console ownership tag in the homepage is preserved by the
metadata pass. The V2.0a article has its own canonical URL and publication date;
the V2.0 article remains historical. Software metadata uses `2.0.1-alpha`, while
public copy uses `Alpha V2.0a`.

The public screenshot section is `site/screenshots.html`, linked from the
homepage and guide navigation. Its reviewed image list is
`site/assets/updates/v20/gallery.json`. Add an approved image in that directory
and an entry with its filename, title, descriptive alt text, dimensions and
accurate caption; then run `python build/screenshots.py`. The normal site build
also regenerates this page. Keep retouched/development captions accurate and
exclude rejected images. The generator checks filenames, missing images,
duplicate anchors and the required captions before publication.

`404.html` has a clear error heading, links to real destinations and no redirect.
GitHub Pages serves that file with HTTP 404 for missing paths. After deployment,
check an invented URL on the live domain returns 404; a local preview server's
fallback policy is not evidence of the hosting status.

Validation:

```sh
python -m unittest discover -s test -p test_seo.py -v
python build/seo.py --check --output _site
```

The checks reject duplicate metadata, missing artwork, canonical/sitemap drift,
tool or fragment sitemap leaks, unsupported social-proof schema and soft-404
redirects. `_site/SEO-REPORT.json` records the resulting page inventory. Ranking,
indexing and rich-result appearance remain search-engine decisions; submit the
canonical sitemap in Search Console and inspect representative live URLs there.

Primary guidance used:

- [Canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Build a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [JavaScript SEO and HTTP status codes](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Allow crawling so noindex can be read](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Software application structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Breadcrumb structured data](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)
