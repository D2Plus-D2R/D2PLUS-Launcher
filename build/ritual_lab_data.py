#!/usr/bin/env python3
"""Build controlled Accursed examples from the current wiki's source item rows.

No game saves are read or written. Each scalar property receives its repeatable
integer midpoint; compound damage/proc properties retain their actual meanings.
The checked-in catalog is sufficient at runtime: the 11 MB wiki is not loaded.

python build/ritual_lab_data.py --wiki docs/wiki/database.json
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Stable native IDs, not names: release renames flow directly from the wiki.
EXAMPLE_IDS = [
    0, 6, 23, 42, 11, 139, 183, 184, 284, 354, 367,
    71, 82, 103, 105, 106, 210, 230, 119, 271, 120, 121, 122,
    394, 396, 462, 479, 510, 614, 618, 626, 630,
    639, 641, 642, 643, 655, 657, 661,
]
ALIASES = {f'{prefix}{suffix}': f'{prefix}2'
           for prefix in ['cast', 'swing', 'balance', 'move', 'block']
           for suffix in [1, 2, 3]}
LABELS = {
    'str': 'Strength', 'dex': 'Dexterity', 'vit': 'Vitality', 'enr': 'Energy',
    'hp': 'Life', 'mana': 'Mana', 'cast2': 'Faster Cast Rate',
    'swing2': 'Increased Attack Speed', 'balance2': 'Faster Hit Recovery',
    'move2': 'Faster Run/Walk', 'block2': 'Faster Block Rate',
    'dmg%': 'Enhanced Damage', 'crush': 'Crushing Blow', 'deadly': 'Deadly Strike',
    'res-all': 'All Resistances', 'red-dmg%': 'Physical Damage Reduction',
    'red-dmg': 'Damage Reduced by', 'red-mag': 'Magic Damage Reduced by',
    'ac': 'Defense', 'ac%': 'Enhanced Defense', 'regen-mana': 'Regenerate Mana',
    'light': 'Light Radius', 'res-fire': 'Fire Resistance',
    'res-cold': 'Cold Resistance', 'res-ltng': 'Lightning Resistance',
    'res-pois': 'Poison Resistance', 'res-mag': 'Magic Resistance',
}
ELEMENTS = {'fire': 'Fire', 'ltng': 'Lightning', 'cold': 'Cold',
            'mag': 'Magic', 'norm': 'Physical'}
PROC_WHEN = {'hit-skill': 'on Striking', 'gethit-skill': 'when Struck',
             'att-skill': 'on Attack', 'death-skill': 'when You Die',
             'levelup-skill': 'when You Level Up', 'kill-skill': 'on Kill'}
# Only a small explicit compound vocabulary is supported. Unknown semantics stop
# the build instead of silently presenting a chance, damage pair, or level as a roll.
COMPOUND_CODES = {'dmg-' + k for k in ELEMENTS} | set(PROC_WHEN)
BOOLEAN_CODES = {'half-freeze', 'nofreeze', 'indestruct', 'ignore-ac', 'knock'}


def read_wiki(path):
    raw = path.read_bytes()
    text = raw.decode('utf8')
    if text.lstrip().startswith('window.D2PLUS_DATA'):
        text = text[text.index('{'):].rstrip(';\n ')
    return json.loads(text), hashlib.sha256(raw).hexdigest()


def property_stats(record):
    row = record['sourceRow']
    ranges = {p['field']: p for p in record.get('propertyRanges', [])}
    result = []
    for i in range(1, 13):
        raw_code = row.get(f'prop{i}', '')
        if not raw_code or raw_code.startswith('*'):
            continue
        code = raw_code.lower()
        p = ranges.get(f'prop{i}')
        if not p:
            raise ValueError(f"Missing label for {record['name']} prop{i}")
        minimum, maximum = int(row[f'min{i}']), int(row[f'max{i}'])
        parameter = row.get(f'par{i}', '')
        if code in PROC_WHEN:
            # Proc columns are chance and level, never a min/max random interval.
            skill = p['label'].split(' level')[0]
            result.append({'code': code, 'label': 'Chance to Cast',
                           'text': f'{minimum}% Chance to Cast Level {maximum} {skill} {PROC_WHEN[code]}'})
            continue
        if code.startswith('dmg-') and code[4:] in ELEMENTS:
            # These columns are the damage interval itself, not a scalar roll.
            element = ELEMENTS[code[4:]]
            text = f'Adds {minimum}–{maximum} {element} Damage'
            if code == 'dmg-cold' and parameter:
                text += f' ({int(parameter) / 25:g} Seconds Cold Duration)'
            result.append({'code': code, 'label': f'{element} Damage', 'text': text})
            continue
        if code in BOOLEAN_CODES:
            assert minimum == maximum == 1, (record['name'], code)
            result.append({'code': code, 'label': p['label'], 'text': p['label']})
            continue
        if minimum > maximum:
            raise ValueError(f"Unsupported compound property {record['name']} {code}")
        if '/lvl' in code or code in {'charged', 'aura', 'dmg-pois', 'pois-min', 'pois-max', 'pois-len'}:
            raise ValueError(f"Unsupported property {record['name']} {code}; choose another controlled example")
        value = (minimum + maximum) // 2
        if code == 'all-stats':
            # Expanding attributes makes the later +Strength/+Dexterity ritual
            # totals explicit instead of hiding their existing contribution.
            for attribute in ['str', 'dex', 'vit', 'enr']:
                result.append({'code': attribute, 'label': LABELS[attribute],
                               'value': value, 'unit': '', 'minimum': minimum,
                               'maximum': maximum})
            continue
        canonical = ALIASES.get(code, code)
        unit = '%' if '%' in str(p.get('minimum', '')) else ''
        if code.startswith('pierce-'):
            value, minimum, maximum = -value, -maximum, -minimum
            unit = '%'
        label = LABELS.get(canonical, p['label'])
        result.append({'code': canonical, 'label': label, 'value': value,
                       'unit': unit, 'minimum': minimum, 'maximum': maximum})
    return result


def build(data, sha, pools):
    records = {r.get('nativeItemId'): r for r in data['records']
               if r.get('kind') == 'Unique'}
    items = []
    for native_id in EXAMPLE_IDS:
        r = records[native_id]
        row = r['sourceRow']
        code = row['code']
        assert row.get('spawnable') == '1' and row.get('disabled') != '1', r['name']
        assert code in pools, r['name']
        image = r.get('art', {}).get('src', '')
        if image.startswith('../'):
            image = image[3:]
        elif image.startswith('assets/'):
            image = 'wiki/' + image
        assert image.startswith(('d2plus/', 'wiki/assets/')), (r['name'], image)
        item = {'id': r['canonicalId'], 'name': r['name'], 'base': r['base'],
                'code': code, 'pool': pools[code], 'level': r['level'],
                'image': image, 'stats': property_stats(r), 'source': r['source']}
        if native_id == 394:
            item['variant'] = 'Fire · on death'
        elif native_id == 396:
            item['variant'] = 'Lightning · on level-up'
        items.append(item)
    assert {i['pool'] for i in items} == {'wand', 'staf', 'orb', 'weap', 'armo', 'ring', 'amul', 'jewl'}
    assert len({i['id'] for i in items}) == len(items)
    return {'version': data.get('version', 'D2PLUS Alpha V1.2'),
            'source': 'https://d2-plus.net/wiki/data.js', 'sourceSha256': sha,
            'itemDataProvenance': 'Current wiki item rows; Alpha V1.1 item ranges retained in Alpha V1.2.',
            'examplePolicy': 'Controlled examples use fixed integer midpoint rolls. Original properties remain unchanged on ritual success. Base weapon damage and base armor defense are not recalculated.',
            'items': items}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wiki', type=Path, default=ROOT / 'docs/wiki/database.json')
    parser.add_argument('--pools', type=Path, default=ROOT / 'site/ritual-lab-pools.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'site/ritual-lab-catalog.json')
    args = parser.parse_args()
    data, sha = read_wiki(args.wiki)
    result = build(data, sha, json.loads(args.pools.read_text(encoding='utf8')))
    args.output.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf8')
    print(f"Built {len(result['items'])} controlled examples across all eight eligible pools: {args.output}")


if __name__ == '__main__':
    main()
