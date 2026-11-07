"""Output-level SEO tests use an isolated static fixture, without a mod build."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

SPEC = importlib.util.spec_from_file_location('seo', Path(__file__).resolve().parents[1] / 'build/seo.py')
seo = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(seo)


class SearchMetadataTests(unittest.TestCase):
    def setUp(self):
        cache = Path(__file__).resolve().parents[1] / 'build-cache'
        cache.mkdir(exist_ok=True)
        self.tmp = tempfile.TemporaryDirectory(prefix='seo-test-', dir=cache)
        self.root = Path(self.tmp.name)
        for asset in ['d2plus-alpha-v20a-splash.png', 'd2plus-icon.png']:
            self.write('assets/' + asset, 'fixture image')
        self.write('index.html', self.page('D2PLUS offline mod', 'Download the D2PLUS offline mod and read its installation guide.'))
        self.write('getting-started.html', self.page('Install D2PLUS', 'Install the offline D2RMM package and preserve your existing save path.'))
        self.write('news-alpha-v20.html', self.page('Alpha V2.0 release notes', 'Explore the new D2PLUS dungeons, boss improvements and finished skill roles.'))
        self.write('accursed.html', self.page('Accursed rituals', 'Learn the Accursed recipe, eligible equipment and possible outcomes.'))
        self.write('wiki/accursed.html', self.page('Accursed rituals', 'Learn the Accursed recipe, eligible equipment and possible outcomes.'))
        self.write('mobile/index.html', self.page('Companion', 'The offline companion tools for D2PLUS.'))
        self.write('editor/index.html', self.page('Hero Editor', 'A browser-based offline hero editor.'))
        self.write('practice/index.html', self.page('Practice', 'A browser-based practice tool.'))
        self.write('ritual-lab-fragment.html', '<section>Practice include</section>')

    def tearDown(self): self.tmp.cleanup()

    def write(self, name, text):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')

    @staticmethod
    def page(title, description):
        return f'<!doctype html><html lang="en"><head><title>{title}</title><meta name="description" content="{description}"></head><body><h1>{title}</h1><p>{description}</p><script src="app.js"></script></body></html>'

    def parsed(self, name): return seo.Page((self.root / name).read_text(encoding='utf-8'))

    def test_static_metadata_and_structured_data(self):
        seo.generate(self.root)
        home = self.parsed('index.html')
        self.assertEqual(home.meta('og:url'), ['https://d2-plus.net/'])
        self.assertEqual(home.meta('og:image'), ['https://d2-plus.net/assets/d2plus-alpha-v20a-splash.png'])
        schema = next(json.loads(s['text']) for s in home.scripts if s['attrs'].get('type') == 'application/ld+json')
        self.assertEqual({n['@type'] for n in schema['@graph']}, {'WebPage', 'Organization', 'WebSite', 'SoftwareApplication'})
        self.assertFalse(any('aggregateRating' in n or 'review' in n for n in schema['@graph']))
        news = self.parsed('news-alpha-v20.html')
        article = next(n for s in news.scripts if s['attrs'].get('type') == 'application/ld+json' for n in json.loads(s['text'])['@graph'] if n['@type'] == 'Article')
        self.assertEqual(article['datePublished'], '2026-11-07')
        self.assertEqual(article['mainEntityOfPage'], 'https://d2-plus.net/news-alpha-v20.html')

    def test_sitemap_only_canonical_html_and_crawlable_noindex_tools(self):
        seo.generate(self.root)
        ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = {n.text for n in ET.parse(self.root / 'sitemap.xml').findall('s:url/s:loc', ns)}
        self.assertEqual(urls, {'https://d2-plus.net/', 'https://d2-plus.net/getting-started.html', 'https://d2-plus.net/news-alpha-v20.html', 'https://d2-plus.net/accursed.html'})
        alias = self.parsed('wiki/accursed.html')
        self.assertEqual([l['href'] for l in alias.links if l.get('rel') == 'canonical'], ['https://d2-plus.net/accursed.html'])
        for name in ['mobile/index.html', 'editor/index.html', 'practice/index.html', '404.html']:
            self.assertEqual(self.parsed(name).meta('robots'), ['noindex, follow'])
        self.assertNotIn('Disallow:', (self.root / 'robots.txt').read_text())
        self.assertFalse((self.root / 'ritual-lab-fragment.html').exists())

    def test_idempotent_preserves_page_body_and_original_scripts(self):
        original = (self.root / 'getting-started.html').read_text().split('<body>')[1]
        seo.generate(self.root)
        first = {p.relative_to(self.root): p.read_bytes() for p in self.root.rglob('*') if p.is_file()}
        seo.generate(self.root)
        second = {p.relative_to(self.root): p.read_bytes() for p in self.root.rglob('*') if p.is_file()}
        self.assertEqual(first, second)
        self.assertEqual((self.root / 'getting-started.html').read_text().split('<body>')[1], original)

    def test_validator_rejects_sitemap_leaks_and_soft_404(self):
        seo.generate(self.root)
        sitemap = self.root / 'sitemap.xml'
        original = sitemap.read_text()
        sitemap.write_text(original.replace('</urlset>', '<url><loc>https://d2-plus.net/mobile/</loc></url></urlset>'))
        with self.assertRaisesRegex(ValueError, 'Sitemap'): seo.validate(self.root)
        sitemap.write_text(original)
        missing = self.root / '404.html'
        missing.write_text(missing.read_text().replace('</body>', '<script>location.replace("/")</script></body>'))
        with self.assertRaisesRegex(ValueError, '404'): seo.validate(self.root)

    def test_rejects_duplicate_metadata_and_missing_social_asset(self):
        seo.generate(self.root)
        page = self.root / 'getting-started.html'
        original = page.read_text()
        page.write_text(original.replace('</head>', '<meta name="description" content="duplicate"></head>'))
        with self.assertRaisesRegex(ValueError, 'duplicate description'): seo.validate(self.root)
        page.write_text(original)
        (self.root / 'assets/d2plus-alpha-v20a-splash.png').unlink()
        with self.assertRaisesRegex(ValueError, 'Missing social artwork'): seo.validate(self.root)

    def test_validator_rejects_indexable_tools_even_when_excluded_from_sitemap(self):
        seo.generate(self.root)
        page = self.root / 'mobile/index.html'
        page.write_text(page.read_text().replace('noindex, follow', 'index, follow'))
        with self.assertRaisesRegex(ValueError, 'must remain noindex'): seo.validate(self.root)

    def test_current_reward_guide_corrected_without_rewriting_historical_news(self):
        old = 'Bag chance starts at 1% on Players 1–2 on every difficulty, scaling to 2% on Players 3–4, about 3.03% on Players 5–6 and 4% on Players 7–8. Native drop limits still apply.'
        self.write('wiki/dungeon-rewards.html', self.page('Dungeon Reward Bags · D2PLUS Alpha V1.4', old))
        self.write('news-alpha-v14.html', self.page('Alpha V1.4 history', old))
        seo.generate(self.root)
        current = (self.root / 'wiki/dungeon-rewards.html').read_text()
        self.assertIn('flat 10% base', current)
        self.assertIn('Alpha V2.0', self.parsed('wiki/dungeon-rewards.html').title)
        self.assertIn(old, (self.root / 'news-alpha-v14.html').read_text())

    def test_current_reference_reward_guide_preserves_reviewed_encounter_tiers(self):
        body = 'Eligible bosses have a flat 10% base Dungeon Reward Bag roll. Existing encounter reward tiers are retained.'
        current = self.page('Reward bags · Alpha V2.0a', body).replace('</head>', '<meta name="d2plus-reference-version" content="Alpha V2.0a"></head>')
        self.assertEqual(seo.refresh_reward_guide(current), current)


if __name__ == '__main__': unittest.main()
