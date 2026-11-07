"""Author the V2.0a reference delta from accepted V2.0 plus corrected native data.

Historical release entries and native skill/item/save identities are preserved.
This authoring command is intentionally separate from the public site build.
"""
from pathlib import Path
import argparse
import collections
import csv
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
VERSION = 'D2PLUS Alpha V2.0a'
DATE = '2026-11-07'
SELECTORS = ['D2Bag Roll 0', 'D2Bag Roll 1', 'D2Bag Roll 2', 'D2RB NM Roll', 'D2RB Hell Roll']
SHARED = ['ritual-lab.css', 'ritual-lab.mjs', 'ritual-lab-model.mjs', 'ritual-lab-catalog.json', 'ritual-lab-rules.json', 'ritual-lab-pools.json']


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def norm(row):
    return {key.lower().replace(' ', '').removeprefix('*'): int(value) if re.fullmatch(r'-?\d+', value) else value
            for key, value in row.items() if key and value and not key.startswith('*')}


def table(data, name):
    with (data / 'global/excel' / (name + '.txt')).open(encoding='utf-8-sig', newline='') as source:
        return list(csv.DictReader(source, delimiter='\t', quoting=csv.QUOTE_NONE))


def replace_current_version(text):
    text = re.sub(r'Alpha V2\.0(?![a-zA-Z0-9])', 'Alpha V2.0a', text)
    text = re.sub(r'AlphaV2\.0(?![a-zA-Z0-9])', 'AlphaV2.0a', text)
    text = text.replace('ALPHA V2.0 ·', 'ALPHA V2.0a ·')
    return text.replace('v=2.0-20261107', 'v=2.0a-20261107')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-root', required=True, type=Path)
    parser.add_argument('--baseline-ready', required=True, type=Path)
    args = parser.parse_args()
    data = args.data_root.resolve()
    baseline = read(args.baseline_ready)
    assert baseline['status'] == 'SOURCE-READY' and baseline['release'] == 'Alpha V2.0'
    for relative, digest in baseline['files'].items():
        path = (ROOT / relative).resolve()
        assert path.is_relative_to(ROOT) and path.is_file() and sha(path) == digest, 'Accepted V2.0 baseline changed: ' + relative
    editor, wiki_dir = ROOT / 'docs/d2plus', ROOT / 'docs/wiki'
    native = read(editor / 'v105_data.json')
    wiki = read(wiki_dir / 'database.json')
    assert native['info']['d2plus']['profile'] == 'alpha-v2.0' and wiki['version'] == 'D2PLUS Alpha V2.0'
    old_native = json.loads(json.dumps(native))
    historical_notes, historical_news = list(wiki['patchNotes']), list(wiki['news'])
    assert all(note.get('id') != 'alpha-v20a' for note in historical_notes)

    # Every native reference source is rechecked; the only table change is TC row order.
    previous_hashes = native['info']['d2plus']['referenceSourceHashes']
    fingerprints = {}
    for relative, expected in previous_hashes.items():
        path = (data / relative).resolve()
        assert path.is_relative_to(data) and path.is_file(), relative
        fingerprints[relative] = sha(path)
        assert relative == 'global/excel/treasureclassex.txt' or fingerprints[relative] == expected, 'Unexpected native change: ' + relative
    assert fingerprints['global/excel/treasureclassex.txt'] != previous_hashes['global/excel/treasureclassex.txt']
    rows = table(data, 'treasureclassex')
    by_name = {row['Treasure Class']: row for row in rows}
    assert len(by_name) == len(rows) == 1909
    positions = {row['Treasure Class']: i for i, row in enumerate(rows)}
    for name in SELECTORS:
        row = by_name[name]
        assert row['Picks'] == '1' and row['NoDrop'] == '0'
        assert row['Item1'] in ['dbn', 'dbm', 'dbh'] and row['Prob1'] == '1'
        assert row['Item2'] == 'D2PLUS_Bag_Empty1' and row['Prob2'] == '9'
        assert positions[row['Item2']] < positions[name]
    for row in rows:
        for i in range(1, 11):
            target = row.get('Item' + str(i))
            assert target not in positions or positions[target] < positions[row['Treasure Class']], 'Forward TC reference remains'
        assert native['treasureClass'][row['Treasure Class']] == norm(row), 'TC field changed rather than row order'
    active = {row['Treasure Class']: norm(row) for row in rows}
    native['treasureClass'] = {**active, **{key: value for key, value in native['treasureClass'].items() if key not in active}}
    native['info']['d2plus'].update(profile='alpha-v2.0a', referenceSourceHashes=fingerprints)
    for key in old_native:
        if key not in ['treasureClass', 'info']:
            assert native[key] == old_native[key], 'Unrelated native dictionary changed: ' + key
    assert native['treasureClass'] == old_native['treasureClass']
    assert native['info']['d2plus']['saveVersion'] == 105

    # Revalidate the retained point plans without inventing new skill/balance changes.
    skills = [row for row in table(data, 'skills') if row.get('charclass') in ['ama', 'sor', 'nec', 'pal', 'bar', 'dru', 'ass', 'war']]
    assert collections.Counter(row['charclass'] for row in skills) == {key: 33 for key in ['ama', 'sor', 'nec', 'pal', 'bar', 'dru', 'ass', 'war']}
    classes = {'Amazon': 'ama', 'Sorceress': 'sor', 'Necromancer': 'nec', 'Paladin': 'pal', 'Barbarian': 'bar', 'Druid': 'dru', 'Assassin': 'ass', 'Warlock': 'war'}
    checked_plans = 0

    def check_plan(hero, level, plan):
        nonlocal checked_plans
        allocated = {str(key): int(value) for key, value in plan.items()}
        assert sum(allocated.values()) <= level + 11
        for number, points in allocated.items():
            skill = native['skills'][number]
            assert skill['charclass'] == classes[hero] and 0 <= points <= int(skill.get('maxlvl', 20))
            if points:
                assert int(skill.get('reqlevel', 1)) + points - 1 <= level
                for key in ['reqskill1', 'reqskill2', 'reqskill3']:
                    assert not skill.get(key) or allocated.get(str(skill[key]), 0) > 0
        checked_plans += 1

    for guide in wiki['guides']:
        check_plan(guide['hero'], 100, {str(row['skillId']): row['points'] for row in guide['pointPlan'] if row.get('skillId') is not None})
        guide['reviewedVersion'] = 'Alpha V2.0a'
        guide['v20Review']['validation'] = 'V2.0a retains the V2.0 skill IDs, point limits and prerequisites. The legal point plan is rechecked; build advice remains data-checked theorycraft.'
    for guide in wiki['specialistGuides']:
        for level, plan in guide['pointPlans'].items():
            check_plan(guide['hero'], int(level), plan)
        guide.update(version='Alpha V2.0a', reviewedDate=DATE, status='Data-checked theorycraft; V2.0 skill mechanics retained and legal point plans rechecked, live benchmarks pending')
    assert checked_plans == 51
    for record in wiki['records']:
        if record.get('source') == 'D2PLUS Alpha V2.0':
            record['source'] = VERSION
        if record.get('sourceRow', {}).get('code') in ['dbn', 'dbm', 'dbh'] or record['name'] in ['Normal Dungeon Reward Bag', 'Nightmare Dungeon Reward Bag', 'Hell Dungeon Reward Bag']:
            record['source'] = VERSION
            record['stats'] = [{'label': 'Inventory size', 'value': '2 × 2'}, {'label': 'Eligible boss bag base roll', 'value': '10%; existing encounter/difficulty bag tiers retained'}, {'label': 'Opening recipe', 'value': "Bag + Sovereign Seal + Artisan's Ember; fresh bag: transmute twice; prepared bag: transmute once"}]
            record['note'] = "V2.0a fixes the missing no-bag branch so eligible bosses resolve one 10% bag roll. Existing bag tiers and opening rules are unchanged. A fresh bag needs one Sovereign Seal and one Artisan's Ember, then two transmutes; a prepared bag needs its remaining transmute. High-end contents remain rare."
    note = {'id': 'alpha-v20a', 'version': 'Alpha V2.0a', 'date': 'November 7, 2026', 'status': 'Released alpha', 'title': 'Dungeon Reward Bag drop fix', 'summary': 'Restores the intended 10% bag roll and brings the matched V2.0a castle loading art to the complete release.', 'sections': [
        {'title': 'Reward Bag roll corrected', 'bullets': ['A no-bag treasure class was defined after the selectors that referenced it, so the native loader discarded the 90% miss branch. The definition now appears before every reference.', 'Eligible bosses now resolve one bag-weight-1 versus no-bag-weight-9 roll: a 10% base chance. Player-count NoDrop scaling does not change that 1:9 split.', 'Bag tiers, bag contents, Cube opening recipes and ordinary loot-pool values are preserved. A 10% roll does not guarantee a bag within any fixed number of kills.']},
        {'title': 'Matched castle loading screen', 'bullets': ['The Alpha V2.0a castle background and opening-door frames are packaged together, including the revealed hall and light.', 'Existing loading/title layout timing, loading controls and final-frame hold are retained.']},
        {'title': 'Complete update and references', 'bullets': ['The standalone D2RMM package, Windows launcher, offline/online wiki, Hero Editor and Android reference are aligned to Alpha V2.0a.', 'All 264 class skills and existing native item/save IDs retain their V2.0 values. Build point plans are rechecked; no new skill balance changes or measured gameplay benchmarks are claimed.', 'Close D2R, back up your offline saves and retain the same installed output name and save path when updating.']}]}
    wiki.update(version=VERSION, contentSnapshot={'modVersion': 'Alpha V2.0a', 'date': DATE, 'notes': 'V2.0 data retained with the native Reward Bag TC ordering fixed. Historical V2.0 notes preserved; build advice is data-checked theorycraft.'})
    wiki['patchNotes'] = [note] + historical_notes
    wiki['news'] = [{'id': 'alpha-v20a', 'date': DATE, 'tag': 'Alpha V2.0a', 'title': note['title'], 'summary': note['summary'], 'body': 'The boss bag roll now keeps its intended 90% miss branch. The complete release also includes matched castle loading artwork and current reference labels.'}] + historical_news
    assert wiki['patchNotes'][1:] == historical_notes and wiki['news'][1:] == historical_news
    assert len({row['id'] for row in wiki['records']}) == len(wiki['records'])
    write(editor / 'v105_data.json', native)
    for stem in ['v105_data', 'constants_105']:
        manifest = read(editor / (stem + '.manifest.json'))
        manifest.update(profile='d2plus-alpha-v2.0a', generatedAt=DATE, sha256=sha(editor / (stem + '.json')), referenceSourceHashes=fingerprints)
        manifest['rewardBagDropFix'] = {'version': 'Alpha V2.0a', 'noBagClassDefinedBeforeSelectors': True, 'selectorWeights': [1, 9], 'baseChance': '10%', 'nativeTableSHA256': fingerprints['global/excel/treasureclassex.txt']}
        write(editor / (stem + '.manifest.json'), manifest)
    constants = read(editor / 'constants_105.json')
    (editor / 'constants_105.bundle.js').write_text('window.constants_d2plus = ' + json.dumps({'constants': constants, 'manifest': read(editor / 'constants_105.manifest.json')}, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    write(editor / 'build-guides.json', {'source': VERSION + '; native point-plan validation', 'guides': wiki['guides']})
    write(wiki_dir / 'database.json', wiki)
    (wiki_dir / 'data.js').write_text('window.D2PLUS_DATA = ' + json.dumps(wiki, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')

    current_files = ['docs/index.html', 'docs/js/app.bafc4d91.js', 'docs/wiki/index.html', 'docs/wiki/app.js', 'docs/wiki/specialist-builds.html', 'docs/mobile/index.html', 'docs/mobile/app.js', 'docs/mobile/accursed.html', 'docs/ritual-lab.mjs']
    current_files += [p.relative_to(ROOT).as_posix() for p in sorted((wiki_dir / 'builds').glob('*.html'))]
    for relative in current_files:
        path = ROOT / relative
        text = replace_current_version(path.read_text(encoding='utf-8'))
        if relative == 'docs/wiki/index.html':
            text = text.replace('href="#alpha-v20">Alpha V2.0a — New depths below Sanctuary', 'href="#alpha-v20a">Alpha V2.0a — Reward Bag drop fix').replace('href="#alpha-v20" data-route="alpha-v20">Current release', 'href="#alpha-v20a" data-route="alpha-v20a">Current release')
            text = text.replace('Alpha V2.0a · Updated Oct 31', 'Alpha V2.0a · Updated Nov 7')
        if relative == 'docs/wiki/app.js':
            text = text.replace("function releasePage(id = 'alpha-v20')", "function releasePage(id = 'alpha-v20a')")
            assert "'alpha-v20a':" not in text
            text = text.replace('  const routes = {', "  const routes = {\n    'alpha-v20a': () => releasePage('alpha-v20a'),", 1)
        if relative == 'docs/mobile/app.js':
            text = text.replace('source=D2PLUS%20AlphaV2.0a', 'source=D2PLUS%20Alpha%20V2.0a')
            assert "const KEY='d2plus.companion.v1'" in text
        path.write_text(text, encoding='utf-8')
    reward_page = wiki_dir / 'dungeon-rewards.html'
    text = reward_page.read_text(encoding='utf-8').replace('Dungeon Reward Bags · D2PLUS Alpha V1.4', 'Dungeon Reward Bags · D2PLUS Alpha V2.0a').replace('Dungeon Reward Bags · D2PLUS Alpha V2.0', 'Dungeon Reward Bags · D2PLUS Alpha V2.0a')
    text = text.replace('Alpha V2.0aa', 'Alpha V2.0a')
    assert 'd2plus-reference-version' not in text
    text = text.replace('</head>', '<meta name="d2plus-reference-version" content="Alpha V2.0a"></head>', 1)
    text = text.replace('Bag chance starts at 1% on Players 1–2 on every difficulty, scaling to 2% on Players 3–4, about 3.03% on Players 5–6 and 4% on Players 7–8. Native drop limits still apply.', 'Eligible bosses have a flat 10% base Dungeon Reward Bag roll. V2.0a restores the intended 90% no-bag branch. The 1:9 split is independent of the Players setting; existing encounter/difficulty bag tiers, contents and native drop limits are retained.')
    assert '10% base' in text and '1% on Players' not in text
    reward_page.write_text(text, encoding='utf-8')
    report = {'release': 'Alpha V2.0a', 'date': DATE, 'classSkills': 264, 'checkedGuidePlans': checked_plans, 'wikiRecords': len(wiki['records']), 'sourceHashes': fingerprints, 'nativeTableRowCount': len(rows), 'bagSelectorsVerified': SELECTORS, 'bagSelectorWeights': [1, 9], 'noForwardTCReferences': True, 'nativeSkillsItemsAndSavedStatIdsPreserved': True, 'historicalReleaseNotesPreserved': True, 'activeWikiReleaseRoute': 'alpha-v20a', 'activeWikiUiVersion': 'Alpha V2.0a', 'saveFormat': 105, 'savesReadOrWritten': False}
    write(ROOT / 'release-inputs/reference-v20a-report.json', report)
    print(json.dumps({key: value for key, value in report.items() if key != 'sourceHashes'}, indent=2))


if __name__ == '__main__':
    main()
