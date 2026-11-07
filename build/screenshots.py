#!/usr/bin/env python3
"""Render the public screenshot gallery from its reviewed image allowlist."""
from pathlib import Path
from html import escape
import json
import re

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'site/assets/updates/v20'


def render():
    entries = json.loads((ASSETS / 'gallery.json').read_text(encoding='utf-8'))['images']
    figures, ids = [], set()
    for row in entries:
        filename = row['webFile']
        if not re.fullmatch(r'[a-zA-Z0-9._-]+\.(?:webp|png|jpg|jpeg)', filename):
            raise ValueError('Gallery entry needs a local image filename')
        if not (ASSETS / filename).is_file():
            raise ValueError('Gallery image is missing: ' + filename)
        anchor = re.sub(r'^\d+-', '', Path(filename).stem)
        if anchor in ids:
            raise ValueError('Duplicate gallery image anchor: ' + anchor)
        ids.add(anchor)
        for key in ('title', 'alt', 'caption'):
            if not row[key].strip():
                raise ValueError('Missing gallery ' + key)
        if row['retouched'] and 'retouched' not in row['caption'].lower():
            raise ValueError('Retouched images need accurate captions')
        if not all(isinstance(row[k], int) and row[k] > 0 for k in ('width', 'height')):
            raise ValueError('Gallery image dimensions are required')
        url = 'assets/updates/v20/' + filename
        figures.append(f'''<figure id="{anchor}"><h2>{escape(row['title'])}</h2>
<a href="{url}" aria-label="Open full-size image: {escape(row['title'], quote=True)}"><img src="{url}" width="{row['width']}" height="{row['height']}" alt="{escape(row['alt'], quote=True)}" loading="lazy" decoding="async"></a>
<figcaption>{escape(row['caption'])}</figcaption><p class="fine"><a href="{url}">Open full-size screenshot</a></p></figure>''')
    html = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>D2PLUS Screenshots — Dungeons, Bosses &amp; Diablo II Resurrected</title><meta name="description" content="See D2PLUS Alpha V2.0 screenshots: Gloamweb Hollows, the Nightmare Sanctum, The Butcher, Kharvul and the offline Diablo II: Resurrected overhaul."><link rel="stylesheet" href="guide.css"></head>
<body><a class="skip" href="#main">Skip to content</a><main class="guide" id="main"><nav class="guide-nav" aria-label="Main navigation"><a href="index.html">D2PLUS Home</a><a href="download.html">Download &amp; install</a><a href="dungeons.html">Dungeons</a><a href="skill-changes.html">Skill changes</a><a href="screenshots.html" aria-current="page">Screenshots</a><a href="wiki/">Online wiki</a></nav>
<p class="eyebrow">From the latest journeys · Alpha V2.0</p><h1>D2PLUS screenshots</h1><p class="lead">Custom bosses, dark caverns and a familiar Sanctuary with a new face. Explore scenes from the D2PLUS offline Diablo II: Resurrected mod.</p><p>Select an image to open it at full size. Captions identify retouched gameplay views and development captures.</p>
<div class="gallery-grid">''' + '\n'.join(figures) + '''</div>
<h2>Make your own descent</h2><p>Read the <a href="dungeons.html">dungeon and portal guide</a>, explore the <a href="skill-changes.html">class skill changes</a> or <a href="download.html">download the complete Alpha V2.0 package</a>.</p>
<footer class="guide-footer">D2PLUS is an unofficial offline Diablo II: Resurrected mod. Not affiliated with or endorsed by Blizzard Entertainment.</footer></main></body></html>
'''
    (ROOT / 'site/screenshots.html').write_text(html, encoding='utf-8', newline='\n')
    print(f'Public screenshots gallery rendered: {len(entries)} reviewed images.')


if __name__ == '__main__':
    render()
