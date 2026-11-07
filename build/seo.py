#!/usr/bin/env python3
"""Add search metadata to the final public output, after reference overlays.

The pinned offline/reference sources are deliberately left unchanged. No search
route is invented for the wiki's fragment-based navigation.
"""
from __future__ import annotations

import argparse
from html import escape, unescape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import quote, unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET

ORIGIN = 'https://d2-plus.net'
START, END = '<!-- D2PLUS SEO: start -->', '<!-- D2PLUS SEO: end -->'
DEFAULT_IMAGE = '/assets/d2plus-alpha-v20-splash.png'
ALIASES = {'wiki/accursed.html': 'accursed.html',
           'wiki/alpha-v14.html': 'news-alpha-v14.html'}
TITLES = {'getting-started.html': 'How to Install D2PLUS — D2RMM, Launcher & Save Backups',
          'news-alpha-v20.html': 'D2PLUS Alpha V2.0 — New Dungeons, Bosses & Skills for D2R',
          'wiki/index.html': 'D2PLUS Wiki — Items, Skills, Recipes & Builds',
          'wiki/dungeon-rewards.html': 'Dungeon Reward Bags · D2PLUS Alpha V2.0'}
DESCRIPTIONS = {
    'wiki/index.html': 'Explore D2PLUS Alpha V2.0 items, skills, recipes, runewords and build guides for the offline Diablo II: Resurrected mod.',
    'wiki/charms.html': 'Learn D2PLUS charm weight, the 50-point limit, overburden penalties and the recipes and equipment rules for crafted Oaths.',
    'wiki/dungeon-rewards.html': 'Learn the D2PLUS flat 10% eligible-boss Dungeon Reward Bag rule, difficulty tiers, opening materials and upgrade recipes.',
    'wiki/runeword-changes.html': 'Compare D2PLUS custom runeword roles and socket limits, including legal bases and the difference between new crafts and saved rolls.',
    'wiki/seasonal.html': 'Follow The Ashen Oath contracts in D2PLUS: named targets, matching difficulty trophies, Cube recipes and repeatable seasonal rewards.',
    'wiki/specialist-builds.html': 'Browse eight D2PLUS specialist builds with progression, equipment comparisons, skill budgets and clearly identified theorycraft.',
    'wiki/builds/bear-union.html': 'Plan a D2PLUS Maul, Grizzly and Blight Druid with skill allocations, equipment comparisons and a data-checked testing checklist.',
    'wiki/builds/corpse-courier.html': 'Explore The Corpse Courier, a D2PLUS Assassin theorycraft guide with skill budgets, weapon choices and progression decisions.',
    'wiki/builds/gravel-accountant.html': 'Plan a D2PLUS Nova Sorceress for Nightmare Cows and Elder Gems, with reviewed drop-table arithmetic and unmeasured gameplay benchmarks.',
    'wiki/builds/health-inspector.html': 'Build a D2PLUS Poison Dagger and Bone Wall Necromancer with Stormcaller’s Oath, reviewed skill allocations and equipment alternatives.',
    'wiki/builds/hostile-takeover.html': 'Plan a D2PLUS Echoing Strike and Hex Warlock with skill budgets, equipment comparisons and an honest gameplay testing checklist.',
    'wiki/builds/live-wire.html': 'Explore a D2PLUS Enchant and Arcane Tempest Sorceress, with mixed-damage weapon comparisons and data-reviewed skill allocations.',
    'wiki/builds/repossession-agent.html': 'Plan a D2PLUS Ribcracker, Sacrifice and Judgment Paladin with legal equipment options, skill budgets and theorycraft limitations.',
    'wiki/builds/weather-complaints.html': 'Explore a D2PLUS Storm Cry and Find Item Barbarian, comparing caster equipment, corpse preservation and a practical testing plan.',
}
NEWS_DATES = {'news-alpha-v13.html': '2026-10-26',
              'news-alpha-v14.html': '2026-10-31',
              'news-alpha-v20.html': '2026-11-07'}


def plain(value: str) -> str:
    return re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]*>', ' ', value))).strip()


class Page(HTMLParser):
    def __init__(self, text: str):
        super().__init__(convert_charrefs=True)
        self.metas, self.links, self.scripts = [], [], []
        self.title, self.h1, self.paragraphs = '', '', []
        self._capture, self._text, self._script = None, [], None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta': self.metas.append(attrs)
        if tag == 'link': self.links.append(attrs)
        if tag == 'script': self._script = {'attrs': attrs, 'text': ''}
        if tag in ('title', 'h1', 'p') and self._capture is None:
            self._capture, self._text = tag, []

    def handle_data(self, text):
        if self._capture: self._text.append(text)
        if self._script is not None: self._script['text'] += text

    def handle_endtag(self, tag):
        if tag == self._capture:
            text = plain(' '.join(self._text))
            if tag == 'title': self.title = text
            elif tag == 'h1': self.h1 = text
            else: self.paragraphs.append(text)
            self._capture, self._text = None, []
        if tag == 'script' and self._script is not None:
            self.scripts.append(self._script)
            self._script = None

    def meta(self, key):
        return [m.get('content', '') for m in self.metas
                if (m.get('name') or m.get('property') or '').lower() == key.lower()]


def public_url(relative: str) -> str:
    if relative.endswith('index.html'): relative = relative[:-10]
    return ORIGIN + '/' + quote(relative, safe='/.-_')


def requires_noindex(relative: str) -> bool:
    return relative == '404.html' or relative.split('/')[0] in ('mobile', 'launcher', 'editor', 'practice', 'd2plus')


def noindex(relative: str, page: Page) -> bool:
    return requires_noindex(relative) or 'noindex' in ','.join(page.meta('robots')).lower()


def clean_head(text: str) -> str:
    text = re.sub(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', '', text, flags=re.S)
    text = re.sub(r'<title\b[^>]*>.*?</title>', '', text, flags=re.I | re.S)

    def keep(match):
        tag = Page(match.group())
        if tag.metas:
            key = (tag.metas[0].get('name') or tag.metas[0].get('property') or '').lower()
            if key in ('description', 'robots') or key.startswith(('og:', 'twitter:')): return ''
        if tag.links and 'canonical' in tag.links[0].get('rel', '').lower().split(): return ''
        return match.group()
    return re.sub(r'<(?:meta|link)\b[^>]*>', keep, text, flags=re.I)


def local_asset(output: Path, value: str) -> str:
    parsed = urlsplit(urljoin(ORIGIN + '/', value))
    if parsed.scheme != 'https' or parsed.netloc != 'd2-plus.net' or parsed.query or parsed.fragment:
        raise ValueError('Social artwork must be an existing local approved asset: ' + value)
    path = (output / parsed.path.lstrip('/')).resolve()
    if not path.is_relative_to(output.resolve()) or not path.is_file():
        raise ValueError('Missing social artwork: ' + value)
    return ORIGIN + parsed.path


def article_dates(relative: str, page: Page) -> dict:
    dates = {}
    for meta, prop in [('article:published_time', 'datePublished'), ('article:modified_time', 'dateModified')]:
        if page.meta(meta):
            value = page.meta(meta)[0]
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}(?:T[^\s]+)?', value):
                raise ValueError('Invalid article date: ' + relative)
            dates[prop] = value
    if relative in NEWS_DATES: dates.setdefault('datePublished', NEWS_DATES[relative])
    if relative.startswith('wiki/builds/'): dates.setdefault('dateModified', '2026-11-07')
    return dates


def breadcrumb(relative: str, title: str) -> dict:
    trail = [('D2PLUS', ORIGIN + '/')]
    if relative.startswith('wiki/'):
        trail.append(('Wiki', ORIGIN + '/wiki/'))
        if relative.startswith('wiki/builds/'):
            trail.append(('Build guides', ORIGIN + '/wiki/specialist-builds.html'))
    if relative != 'wiki/index.html': trail.append((title, public_url(relative)))
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': n, 'name': name, 'item': url}
        for n, (name, url) in enumerate(trail, 1)]}


def make_metadata(relative: str, page: Page, output: Path) -> tuple[str, dict]:
    title = TITLES.get(relative) or page.title or (page.h1 + ' · D2PLUS')
    if not title.strip(): raise ValueError('Page needs a meaningful title: ' + relative)
    description = (page.meta('description') or [DESCRIPTIONS.get(relative)])[0]
    if not description:
        paragraph = next((p for p in page.paragraphs if len(p) > 65), '')
        description = paragraph[:180].rsplit(' ', 1)[0] if len(paragraph) > 180 else paragraph
    if not description: description = title + ' — D2PLUS offline tools.'
    canonical = public_url(ALIASES.get(relative, relative))
    excluded = noindex(relative, page)
    image = local_asset(output, (page.meta('og:image') or [DEFAULT_IMAGE])[0])
    image_alt = (page.meta('og:image:alt') or ['D2PLUS Alpha V2.0 castle gates with warm light beyond the opening doors'])[0]
    article = relative in NEWS_DATES or relative.startswith('wiki/builds/') or page.meta('seo:type') == ['article']
    entries = [f'<title>{escape(title)}</title>',
               f'<meta name="description" content="{escape(description, quote=True)}">',
               f'<link rel="canonical" href="{canonical}">',
               '<meta name="robots" content="' + ('noindex, follow' if excluded else 'index, follow, max-image-preview:large') + '">']
    for key, value in {'og:site_name': 'D2PLUS', 'og:locale': 'en_US',
                       'og:type': 'article' if article else 'website',
                       'og:title': title, 'og:description': description, 'og:url': canonical,
                       'og:image': image, 'og:image:alt': image_alt}.items():
        entries.append(f'<meta property="{key}" content="{escape(value, quote=True)}">')
    for key, value in {'twitter:card': 'summary_large_image', 'twitter:title': title,
                       'twitter:description': description, 'twitter:image': image,
                       'twitter:image:alt': image_alt}.items():
        entries.append(f'<meta name="{key}" content="{escape(value, quote=True)}">')
    graph = []
    if not excluded and relative not in ALIASES:
        entity = {'@type': 'Article' if article else 'WebPage', '@id': canonical + '#page',
                  'url': canonical, 'name': title, 'description': description,
                  'inLanguage': 'en', 'isPartOf': {'@id': ORIGIN + '/#website'}}
        if article:
            entity.update({'headline': page.h1 or title, 'image': [image],
                           'mainEntityOfPage': canonical,
                           'publisher': {'@id': ORIGIN + '/#publisher'},
                           **article_dates(relative, page)})
        graph.append(entity)
        if relative == 'index.html':
            graph += [
                {'@type': 'Organization', '@id': ORIGIN + '/#publisher', 'name': 'D2PLUS',
                 'url': ORIGIN + '/', 'logo': ORIGIN + '/assets/d2plus-icon.png'},
                {'@type': 'WebSite', '@id': ORIGIN + '/#website', 'url': ORIGIN + '/',
                 'name': 'D2PLUS', 'inLanguage': 'en', 'publisher': {'@id': ORIGIN + '/#publisher'}},
                {'@type': 'SoftwareApplication', '@id': ORIGIN + '/#mod', 'name': 'D2PLUS',
                 'url': ORIGIN + '/', 'applicationCategory': 'GameApplication',
                 'operatingSystem': 'Windows', 'softwareVersion': '2.0.0-alpha',
                 'description': 'An offline mod for Diablo II: Resurrected. Requires the licensed base game; the mod is a separate download.',
                 'isAccessibleForFree': True,
                 'softwareRequirements': 'A licensed, compatible Warlock-capable Diablo II: Resurrected installation. Install through D2RMM or D2PLUS Launcher.',
                 'publisher': {'@id': ORIGIN + '/#publisher'}}]
        else: graph.append(breadcrumb(relative, page.h1 or title))
    if graph:
        encoded = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
        entries.append('<script type="application/ld+json">' + encoded + '</script>')
    return '\n'.join([START, *entries, END]), {'path': relative, 'canonical': canonical,
        'indexable': not excluded and relative not in ALIASES, 'title': title,
        'description': description, 'structuredTypes': [v['@type'] for v in graph]}


NOT_FOUND = '''<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Page not found · D2PLUS</title><meta name="robots" content="noindex, follow">
<meta name="description" content="This D2PLUS page could not be found. Return to the homepage, installation guide or online wiki.">
<style>body{margin:0;background:#101110;color:#ddd4c3;font:18px/1.7 Georgia,serif}main{max-width:760px;margin:8vh auto;padding:32px}a,h1{color:#c7b377}nav{display:flex;gap:24px;flex-wrap:wrap}</style>
</head><body><main><p>404 · D2PLUS</p><h1>Page not found</h1>
<p>The address may have changed. Choose a destination below or check the URL.</p>
<nav><a href="/">D2PLUS home</a><a href="/getting-started.html">Installation guide</a><a href="/wiki/">Online wiki</a></nav>
</main></body></html>'''


def refresh_reward_guide(text: str) -> str:
    """Correct the old static companion page in public output only.

    This guide is retained inside the pinned V1.4 reference. The current V2
    database and news establish the flat base rule; historical news stays intact.
    """
    old = 'Bag chance starts at 1% on Players 1–2 on every difficulty, scaling to 2% on Players 3–4, about 3.03% on Players 5–6 and 4% on Players 7–8. Native drop limits still apply.'
    new = 'Eligible bosses have a flat 10% base Dungeon Reward Bag roll on every difficulty. Normal, Nightmare and Hell select the matching bag tier. This base chance does not scale with the Players setting; native drop limits still apply.'
    if old in text:
        return text.replace(old, new).replace('Dungeon Reward Bags · D2PLUS Alpha V1.4', 'Dungeon Reward Bags · D2PLUS Alpha V2.0')
    if new not in text: raise ValueError('Unrecognized reward guide; review against current V2 data')
    return text


def generate(output: Path) -> dict:
    output = output.resolve()
    if not (output / 'index.html').is_file(): raise ValueError('Public output is missing index.html')
    # This is an input include, not a standalone page or searchable practice route.
    fragment = output / 'ritual-lab-fragment.html'
    if fragment.exists(): fragment.unlink()
    (output / '404.html').write_text(NOT_FOUND, encoding='utf-8')
    pages = []
    for path in sorted(output.rglob('*.html')):
        relative = path.relative_to(output).as_posix()
        text = path.read_text(encoding='utf-8')
        if relative == 'wiki/dungeon-rewards.html': text = refresh_reward_guide(text)
        if not re.search(r'</head\s*>', text, re.I):
            raise ValueError('Unclassified HTML fragment in public output: ' + relative)
        metadata, record = make_metadata(relative, Page(text), output)
        text = clean_head(text)
        text = re.sub(r'</head\s*>', lambda _: metadata + '\n</head>', text, count=1, flags=re.I)
        path.write_text(text, encoding='utf-8')
        pages.append(record)
    ET.register_namespace('', 'http://www.sitemaps.org/schemas/sitemap/0.9')
    ns = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
    sitemap = ET.Element(ns + 'urlset')
    for row in pages:
        if row['indexable']: ET.SubElement(ET.SubElement(sitemap, ns + 'url'), ns + 'loc').text = row['canonical']
    ET.ElementTree(sitemap).write(output / 'sitemap.xml', encoding='utf-8', xml_declaration=True)
    # Do not block rendering assets or noindex pages: crawlers must see their tags.
    (output / 'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: ' + ORIGIN + '/sitemap.xml\n', encoding='utf-8')
    report = {'origin': ORIGIN, 'pages': pages, 'sitemapUrls': sum(p['indexable'] for p in pages),
              'offlineSourcesModified': False, 'hashRoutesInSitemap': False,
              'publicGuideCorrections': ['wiki/dungeon-rewards.html: current V2 flat 10% base rule; historical release news preserved'],
              'custom404': 'GitHub Pages serves 404.html with HTTP 404 for missing paths; no client-side redirect.'}
    (output / 'SEO-REPORT.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    validate(output)
    return report


def validate(output: Path) -> dict:
    output = output.resolve()
    expected, titles, descriptions = set(), {}, {}
    count = 0
    for path in sorted(output.rglob('*.html')):
        relative = path.relative_to(output).as_posix()
        text = path.read_text(encoding='utf-8')
        page = Page(text)
        if len(re.findall(r'<title\b', text, re.I)) != 1 or not page.title:
            raise ValueError('Expected one meaningful title: ' + relative)
        canonical = [l['href'] for l in page.links if 'canonical' in l.get('rel', '').split()]
        if canonical != [public_url(ALIASES.get(relative, relative))]:
            raise ValueError('Canonical mismatch: ' + relative)
        canonical_path = unquote(urlsplit(canonical[0]).path).lstrip('/')
        target = output / (canonical_path + 'index.html' if canonical_path.endswith('/') or not canonical_path else canonical_path)
        if not target.is_file(): raise ValueError('Canonical target is missing: ' + relative)
        for key in ('description', 'robots', 'og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'):
            if len(page.meta(key)) != 1 or not page.meta(key)[0].strip():
                raise ValueError('Missing or duplicate ' + key + ': ' + relative)
        if page.meta('og:url') != canonical: raise ValueError('Social URL mismatch: ' + relative)
        if requires_noindex(relative) and 'noindex' not in page.meta('robots')[0].lower():
            raise ValueError('Tool or error page must remain noindex: ' + relative)
        local_asset(output, page.meta('og:image')[0])
        for script in page.scripts:
            if script['attrs'].get('type') == 'application/ld+json':
                data = json.loads(script['text'])
                if data.get('@context') != 'https://schema.org': raise ValueError('Unexpected schema context')
                for node in data.get('@graph', []):
                    if any(k in node for k in ('aggregateRating', 'review', 'interactionStatistic')):
                        raise ValueError('Unsupported social proof in structured data: ' + relative)
        if not noindex(relative, page) and relative not in ALIASES:
            expected.add(canonical[0])
            for values, value, label in [(titles, page.title, 'title'), (descriptions, page.meta('description')[0], 'description')]:
                if value in values: raise ValueError('Duplicate indexable ' + label + ': ' + relative + ' and ' + values[value])
                values[value] = relative
        count += 1
    ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    urls = [n.text for n in ET.parse(output / 'sitemap.xml').findall('s:url/s:loc', ns)]
    if len(urls) != len(set(urls)) or set(urls) != expected:
        raise ValueError('Sitemap must contain exactly the indexable canonical HTML URLs')
    if any('#' in u or '?' in u or not u.startswith(ORIGIN + '/') for u in urls):
        raise ValueError('Sitemap URL is not canonical')
    robots = (output / 'robots.txt').read_text(encoding='utf-8')
    if 'Disallow:' in robots or 'Sitemap: ' + ORIGIN + '/sitemap.xml' not in robots:
        raise ValueError('Robots must allow rendering resources and advertise the canonical sitemap')
    missing = (output / '404.html').read_text(encoding='utf-8')
    if not noindex('404.html', Page(missing)) or re.search(r'http-equiv=["\']refresh|location\s*[.=]|history\.replaceState', missing, re.I):
        raise ValueError('404 must remain a noindex error page, without a soft-404 redirect')
    if (output / 'ritual-lab-fragment.html').exists(): raise ValueError('Practice include was published as a page')
    rewards = output / 'wiki/dungeon-rewards.html'
    if rewards.exists():
        text = rewards.read_text(encoding='utf-8')
        if refresh_reward_guide(text) != text or 'Alpha V1.4' in Page(text).title:
            raise ValueError('Public reward guide is stale')
    return {'htmlPages': count, 'sitemapUrls': len(urls), 'validated': True}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / '_site')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    result = validate(args.output) if args.check else generate(args.output)
    print(json.dumps({k: v for k, v in result.items() if k != 'pages'}))
