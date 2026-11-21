"""Render useful public reference pages from the final, reviewed wiki snapshot.

Only public output is written. Offline suite bytes and fragment routes stay intact.
"""
from html import escape
import hashlib
import json
from pathlib import Path


def e(value):
    return escape(str(value), quote=True)


def page(title, description, body):
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)} · D2PLUS</title><meta name="description" content="{e(description)}">
<link rel="stylesheet" href="/guide.css"></head><body><a class="skip" href="#main">Skip to content</a>
<main id="main" class="guide"><nav class="guide-nav" aria-label="Main navigation">
<a href="/">D2PLUS home</a><a href="/getting-started.html">Installation</a><a href="/wiki/">Interactive wiki</a>
<a href="/wiki/classes/">Classes &amp; skills</a><a href="/wiki/runewords/">Runeword recipes</a><a href="/wiki/specialist-builds.html">Build guides</a></nav>
<p class="eyebrow">Diablo II: Resurrected · Offline mod reference</p><h1>{e(title)}</h1>{body}
<footer class="guide-footer">From the current D2PLUS reference. Saved items retain their existing rolls.
<a href="/download.html">Download D2PLUS</a> · <a href="/skill-changes.html">Skill changes</a> · <a href="/accursed.html">Accursed ritual</a></footer>
</main></body></html>'''


def generate(output):
    output = Path(output)
    source = output / 'wiki/database.json'
    if not source.exists():
        return []
    raw = source.read_bytes()
    data = json.loads(raw)
    if data['version'] != 'D2PLUS Alpha V2.0b':
        raise ValueError('Discovery pages require the reviewed current reference')
    written = []

    def write(route, title, description, body):
        target = output / route
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(page(title, description, body), encoding='utf-8')
        written.append(route)

    classes = data['classes']
    cards = []
    for hero in classes:
        skills = sorted((r for r in data['records'] if r['kind'] == 'Skill' and r.get('hero') == hero),
                        key=lambda r: (int(r.get('level') or 0), r['name']))
        if not skills:
            raise ValueError('Missing class skills: ' + hero)
        slug = hero.lower()
        cards.append(f'<article class="card"><h2><a href="/wiki/classes/{slug}.html">{e(hero)} skills</a></h2><p>{len(skills)} skills, with level requirements, point limits and descriptions.</p></article>')
        rows = []
        for r in skills:
            cap = next((s['value'] for s in r.get('stats', []) if s['label'] == 'Maximum allocated points'), 'See wiki')
            rows.append(f'<tr id="{e(r["id"])}"><th scope="row">{e(r["name"])}</th><td>{e(r.get("level", ""))}</td><td>{e(cap)}</td><td>{e(r.get("note", "")).replace(chr(10), "<br>")}</td></tr>')
        body = f'''<p class="lead">Browse all {len(skills)} {e(hero)} skills in D2PLUS Alpha V2.0b, including their unlock levels and maximum allocated points.</p>
<p>Use this list to plan your next skill investment. Point limits describe allocated points; equipment bonuses are separate. Descriptions explain each skill's role, rather than promising damage or clear times for a particular build.</p>
<p><a href="/wiki/#skills">Compare skills in the interactive wiki</a> or <a href="/wiki/specialist-builds.html">read the build guides</a>.</p>
<div class="table-scroll"><table><caption>{e(hero)} skill reference · Alpha V2.0b</caption><thead><tr><th scope="col">Skill</th><th scope="col">Unlock level</th><th scope="col">Point limit</th><th scope="col">What it does</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div>'''
        write(f'wiki/classes/{slug}.html', f'{hero} Skills & Point Limits',
              f'Browse D2PLUS {hero} skills for Diablo II: Resurrected: unlock levels, maximum allocated points and current skill descriptions.', body)
    write('wiki/classes/index.html', 'D2PLUS Classes & Skills',
          'Compare all eight D2PLUS classes, including Warlock, with complete skill lists, unlock levels, point limits and links to build guides.',
          '<p class="lead">Choose a class and explore its skills before spending your next point.</p><p>D2PLUS is an offline Diablo II: Resurrected mod with eight classes, including Warlock. Each class page lists the current skill names, unlock levels and allocation limits.</p><div class="card-grid">' + ''.join(cards) + '</div><p>Looking for a complete build? The <a href="/wiki/specialist-builds.html">specialist build guides</a> explain progression and equipment choices, with theorycraft clearly distinguished from playtesting.</p>')

    runewords = [r for r in data['records'] if r['kind'] == 'Runeword']
    socket_counts = sorted({int(r['sockets']) for r in runewords})
    links = []
    for count in socket_counts:
        records = sorted((r for r in runewords if int(r['sockets']) == count), key=lambda r: r['name'])
        links.append(f'<li><a href="/wiki/runewords/{count}-sockets.html">{count}-socket runewords</a> — {len(records)} recipes</li>')
        contents = '<nav class="contents" aria-label="Runewords on this page">' + ''.join(f'<a href="#{e(r["id"])}">{e(r["name"])}</a>' for r in records) + '</nav>'
        sections = []
        for r in records:
            stats = ''.join(f'<li>{e(s["label"])}: {e(s["value"])}</li>' for s in r.get('stats', []))
            sections.append(f'''<section id="{e(r['id'])}"><h2>{e(r['name'])}</h2><p><strong>Rune order:</strong> {' → '.join(e(x) for x in r['runes'])}<br>
<strong>Base:</strong> {e(r['base'])}<br><strong>Sockets:</strong> {count}<br><strong>Required level:</strong> {e(r['level'])} (the base may require more)</p><h3>Runeword bonuses</h3><ul>{stats}</ul></section>''')
        write(f'wiki/runewords/{count}-sockets.html', f'{count}-Socket Runewords: Runes & Bonuses',
              f'Find all {len(records)} D2PLUS {count}-socket runeword recipes, with rune order, allowed base types, level requirements and bonus ranges.',
              f'<p class="lead">Compare {len(records)} recipes for {count}-socket equipment in D2PLUS Alpha V2.0b.</p><p>Use a normal or superior base with exactly {count} sockets and insert the runes in the listed order. The base must support both the item type and socket count. Individual rune bonuses apply in addition to the bonuses below; these are not complete equipped-item totals.</p><p>Before spending rare runes, check the <a href="/wiki/runeword-changes.html">runeword base and socket guide</a>. Saved items retain their existing rolls.</p>' + contents + ''.join(sections))
    write('wiki/runewords/index.html', 'D2PLUS Runewords: Recipes & Socket Counts',
          'Find D2PLUS runeword recipes by socket count. Check rune order, base types, level requirements and bonus ranges before crafting.',
          '<p class="lead">Find a recipe that fits your socketed base.</p><p>Browse the current runewords by socket count, then compare rune order, allowed equipment types and bonuses. A matching number of sockets alone does not make every base legal.</p><ul>' + ''.join(links) + '</ul><p><a href="/wiki/runeword-changes.html">Read the base and socket rules</a> before crafting. The <a href="/wiki/#runewords">interactive runeword browser</a> provides the full searchable reference.</p>')

    # Visible navigation for visitors and crawlers; no hidden keyword links.
    wiki = output / 'wiki/index.html'
    text = wiki.read_text(encoding='utf-8')
    if 'id="browse-reference"' not in text:
        block = '<nav id="browse-reference" aria-label="Reference pages" style="padding:12px 18px;display:flex;flex-wrap:wrap;gap:16px"><a href="/wiki/classes/">Classes &amp; skill lists</a><a href="/wiki/runewords/">Runeword recipes by sockets</a><a href="/wiki/specialist-builds.html">Build guides</a><a href="/getting-started.html">Installation guide</a></nav>'
        import re
        text = re.sub(r'(<body\b[^>]*>)', lambda m: m[1] + block, text, count=1)
        wiki.write_text(text, encoding='utf-8')
    (output / 'DISCOVERY-REPORT.json').write_text(json.dumps({'sourceSha256': hashlib.sha256(raw).hexdigest(), 'version': data['version'], 'pages': written, 'skills': sum(r['kind'] == 'Skill' for r in data['records']), 'runewords': len(runewords), 'offlineSourcesModified': False}, indent=2) + '\n')
    return written
