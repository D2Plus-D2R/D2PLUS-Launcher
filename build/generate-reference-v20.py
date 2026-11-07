"""Refresh the V2.0 editor, wiki and skill page from a frozen gameplay data root.

Run once on the complete final snapshot, then package docs into the pinned suite.
CI applies that suite last; it never reads a developer's installed game or saves.
Save version 105 and native item/skill IDs remain unchanged.
"""
from pathlib import Path
import argparse, collections, csv, hashlib, html, json, re, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--data-root', required=True, type=Path)
args = parser.parse_args()
DATA = args.data_root.resolve()
EDITOR = ROOT / 'docs/d2plus'
WIKI = ROOT / 'docs/wiki'
CLASSES = {'ama': 'Amazon', 'sor': 'Sorceress', 'nec': 'Necromancer', 'pal': 'Paladin', 'bar': 'Barbarian', 'dru': 'Druid', 'ass': 'Assassin', 'war': 'Warlock'}
BOSS_IDS = {'d2a3_warden_mephisto', 'd2a3_warden_baalcrab', 'd2plus_butcher', 'd2plus_uber_butcher', 'd2ss_guardian', 'd2az_azrakek', 'd2az_azrakek_nm', 'd2gw_vharzith', 'd2gw_vharzith_uber', 'd2cw_kharvul'}
VERSION = 'D2PLUS Alpha V2.0'
DATE = '2026-11-07'
fingerprints = {}

def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf8')

def table(name):
    path = DATA / 'global/excel' / (name + '.txt')
    fingerprints[path.relative_to(DATA).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    with path.open(encoding='utf-8-sig', newline='') as source:
        return list(csv.DictReader(source, delimiter='\t', quoting=csv.QUOTE_NONE))

def norm(row):
    return {key.lower().replace(' ', '').removeprefix('*'): int(value) if re.fullmatch(r'-?\d+', value) else value
            for key, value in row.items() if key and value and not key.startswith('*')}

plain = lambda text: re.sub(r'(?:ÿ|�)c.', '', str(text)).strip()
native = read(EDITOR / 'v105_data.json')
constants = read(EDITOR / 'constants_105.json')
wiki = read(WIKI / 'database.json')
strings = dict(read(EDITOR / 'v105_strings.json'))
for path in sorted((DATA / 'local/lng/strings').glob('*.json')):
    fingerprints[path.relative_to(DATA).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    for row in read(path):
        if isinstance(row, dict) and 'Key' in row and 'enUS' in row:
            strings[row['Key']] = row['enUS']
name = lambda key: plain(strings.get(key, key))
skills = [row for row in table('skills') if row.get('*Id', '').isdigit()]
skill_ids = {row['skill']: int(row['*Id']) for row in skills}
descs = {row['skilldesc']: row for row in table('skilldesc') if row.get('skilldesc')}
current_classes = [row for row in skills if row.get('charclass') in CLASSES]
assert collections.Counter(row['charclass'] for row in current_classes) == {key: 33 for key in CLASSES}
for row in skills:
    number = int(row['*Id'])
    converted = {**norm(row), 'id': number}
    for key in ['reqskill1', 'reqskill2', 'reqskill3']:
        if converted.get(key) in skill_ids:
            converted[key] = skill_ids[converted[key]]
    native['skills'][str(number)] = converted
    while len(constants['skills']) <= number:
        constants['skills'].append(None)
    desc = descs.get(row.get('skilldesc'), {})
    constants['skills'][number] = {'s': name(desc.get('str name', row['skill'])), 'c': row.get('charclass', '')}

# Refresh table values while retaining compatibility-only baseline dictionary keys.
for filename, group, key in [
    ('properties', 'properties', 'code'), ('weapons', 'weapons', 'code'), ('armor', 'armor', 'code'),
    ('misc', 'misc', 'code'), ('itemtypes', 'itemTypes', 'Code'), ('gems', 'gems', 'code'),
    ('sets', 'sets', 'index'), ('skilldesc', 'skillDesc', 'skilldesc'), ('missiles', 'missiles', '*ID'),
    ('states', 'states', '*ID'), ('monstats', 'monsters', 'Id'), ('monstats2', 'monstersEx', 'Id'),
    ('levels', 'levels', 'Id'), ('treasureclassex', 'treasureClass', 'Treasure Class')]:
    native.setdefault(group, {})
    for row in table(filename):
        if row.get(key) and row.get(key) != 'Expansion':
            native[group][row[key]] = {**norm(row), **({'id': int(row[key])} if row[key].isdigit() else {})}
for row in native['itemTypes'].values():
    for source, target in [('maxsockets1', 'maxsock1'), ('maxsockets2', 'maxsock25'), ('maxsockets3', 'maxsock40')]:
        if source in row:
            row[target] = row[source]
stats = table('itemstatcost')
for number, row in enumerate(stats):
    if not row.get('Stat'):
        continue
    old = native['itemStatCost'].get(row['Stat'], {})
    converted = {**norm(row), 'id': number}
    for field in ['savebits', 'saveadd', 'saveparambits']:
        assert old.get(field, 0) == converted.get(field, 0), (row['Stat'], field, 'save-layout changed')
    native['itemStatCost'][row['Stat']] = converted
    while len(constants['magical_properties']) <= number:
        constants['magical_properties'].append(None)
    constants['magical_properties'][number] = {'s': row['Stat'], 'sS': 1, 'sB': converted.get('savebits', 0), 'sA': converted.get('saveadd', 0), 'sP': converted.get('saveparambits', 0), 'so': converted.get('descpriority', 0), 'dF': converted.get('descfunc', 0), 'dV': converted.get('descval', 0), 'dP': strings.get(converted.get('descstrpos'), ''), 'dN': strings.get(converted.get('descstrneg'), '')}
for code, row in native['properties'].items():
    constants['properties'][code] = [{'s': row['stat' + str(i)], 'f': row['func' + str(i)]} for i in range(1, 8) if row.get('stat' + str(i))]
for group, legacy in [('weapons', 'weapon_items'), ('armor', 'armor_items'), ('misc', 'other_items')]:
    for code, row in native[group].items():
        old = constants[legacy].get(code, {})
        constants[legacy][code] = {**old, 'n': name(row.get('namestr', code)), 'iw': row.get('invwidth', 1), 'ih': row.get('invheight', 1), 'i': row.get('invfile', old.get('i', ''))}
item_rows = {}
for filename, group, prefix, legacy in [('uniqueitems', 'uniqueItems', 'unique', 'unq_items'), ('setitems', 'setItems', 'set', 'set_items')]:
    fresh = {}
    item_rows[prefix] = [row for row in table(filename) if row.get('index') != 'Expansion']
    for number, row in enumerate(item_rows[prefix]):
        converted = {**norm(row), 'id': number, 'enabled': 0 if row.get('disabled') == '1' else 1}
        for key, value in list(converted.items()):
            if re.fullmatch(r'(?:par\d+|apar\d+[ab]|[pf]param\d+[ab]?)', key) and value in skill_ids:
                converted[key] = skill_ids[value]
        fresh[f'{prefix}{number:03d}'] = converted
        while len(constants[legacy]) <= number:
            constants[legacy].append(None)
        constants[legacy][number] = {**(constants[legacy][number] or {}), 'n': name(row['index']), 'c': row.get('code', row.get('item', ''))}
    native[group] = fresh

# Keep old deep links, but expose exactly the 264 current class skill identities.
old_skills = collections.defaultdict(list)
records = []
for row in wiki['records']:
    if row['kind'] in ['Skill', 'Skill change']:
        old_skills[str(row.get('skillId', ''))].append(row)
    else:
        records.append(row)
aliases = wiki.setdefault('recordAliases', {})
class_records = []
for row in current_classes:
    number = int(row['*Id'])
    prior = old_skills.get(str(number), [])
    desc = descs.get(row.get('skilldesc'), {})
    record = dict(prior[0] if prior else {}, id=prior[0]['id'] if prior else f'v20-skill-{number}', kind='Skill', source=VERSION, name=name(desc.get('str name', row['skill'])), hero=CLASSES[row['charclass']], level=int(row.get('reqlevel') or 1), base='', skillId=number, sourceKey=row['skill'], sourceRow=row, descriptionRow=desc, note=name(desc.get('str long', '')), stats=[{'label': 'Required level', 'value': row.get('reqlevel') or '1'}, {'label': 'Maximum allocated points', 'value': row.get('maxlvl') or '20'}])
    for duplicate in prior[1:]:
        aliases[duplicate['id']] = record['id']
    class_records.append(record)
records += class_records

# Add/update only current level and named encounter reference rows, not authoring files.
for filename, kind, key, label, fields in [
    ('levels', 'Area', 'Id', 'LevelName', [('Normal area level', 'MonLvl1Ex'), ('Nightmare area level', 'MonLvl2Ex'), ('Hell area level', 'MonLvl3Ex')]),
    ('monstats', 'Monster', 'Id', 'NameStr', [('Normal level', 'Level'), ('Nightmare level', 'Level(N)'), ('Hell level', 'Level(H)')]),
    ('superuniques', 'Superunique', 'Superunique', 'Name', [('Monster class', 'Class'), ('Normal treasure class', 'TC'), ('Nightmare treasure class', 'TC(N)'), ('Hell treasure class', 'TC(H)')])]:
    for row in table(filename):
        if not row.get(key) or row.get(key) == 'Expansion' or not row.get(label):
            continue
        current_name = name(row[label])
        compact = lambda value: re.sub(r'\W+', '', value.casefold())
        old = next((record for record in records if record['kind'] == kind and (record.get('sourceKey') == row[key] or record['name'] == current_name or (row[key] in BOSS_IDS and compact(record['name']) == compact(current_name)))), None)
        if not old:
            # Avoid turning unused built-in rows into new public encounters.
            if row[key] not in BOSS_IDS and not any(token in (row[key] + ' ' + current_name).lower() for token in ['d2p', 'gloamweb', 'vharzith', 'kharvul', 'cinderwound', 'sanctum', 'nightmare']):
                continue
            old = {'id': 'v20-' + kind.lower() + '-' + re.sub(r'[^a-z0-9]+', '-', row[key].lower()), 'kind': kind}
            records.append(old)
        old.update(name=current_name, source=VERSION, sourceKey=row[key], sourceRow=row, stats=[{'label': title, 'value': row.get(field, '')} for title, field in fields], note='Current packaged native data. Difficulty scaling and active monster modifiers still apply.')
for record in records:
    if record['kind'] in ['Unique', 'Set piece'] and isinstance(record.get('nativeItemId'), int):
        group = 'unique' if record['kind'] == 'Unique' else 'set'
        row = item_rows[group][record['nativeItemId']]
        record.update(name=name(row['index']), sourceKey=row['index'], sourceRow=row)
    if record.get('sourceRow', {}).get('code') in ['dbn', 'dbm', 'dbh'] or record['name'] in ['Normal Dungeon Reward Bag', 'Nightmare Dungeon Reward Bag', 'Hell Dungeon Reward Bag']:
        record['source'] = VERSION
        record['stats'] = [{'label': 'Inventory size', 'value': '2 × 2'}, {'label': 'Eligible boss bag base roll', 'value': '10%; Normal / Nightmare / Hell bag by difficulty'}, {'label': 'Opening recipe', 'value': "Bag + Sovereign Seal + Artisan's Ember; fresh bag: transmute twice; prepared bag: transmute once"}]
        record['note'] = 'A separate 10% eligible-boss base roll, with matching difficulty tier. Open a fresh bag with one Sovereign Seal and one Artisan\'s Ember: transmute twice; a prepared bag needs one remaining transmute. High-end contents remain rare. Existing saved bag preparation state is preserved.'

native['strings'] = list(strings.items())
native['info']['d2plus'].update(profile='alpha-v2.0', referenceSourceHashes=fingerprints)
current_notes = {row['name']: row['note'] for row in class_records}

def update_guide_text(value):
    if isinstance(value, dict):
        return {key: update_guide_text(item) for key, item in value.items()}
    if isinstance(value, list):
        return [update_guide_text(item) for item in value]
    if not isinstance(value, str):
        return value
    if ('Test variant:' in value or value.startswith('Astral Communion supplies')) and ('Cleave' in value or 'Energy' in value):
        return current_notes['Astral Communion']
    if ('Test variant:' in value and 'Crushing Blow' in value):
        return current_notes['Demonic Resonance']
    if ('Test variant:' in value and 'Sigil' in value) or value.startswith('Sigil Lord gives'):
        return current_notes['Sigil Lord']
    if value.startswith('Ancestral Standard uses a corpse'):
        return current_notes['Ancestral Standard'] + ' It competes with Find Item for corpses.'
    if value.startswith('Ravage') and any(word in value.lower() for word in ['damage', '315%']):
        return current_notes.get('Ravage', value)
    if value.startswith('Arcane Tempest follows you'):
        return current_notes['Arcane Tempest']
    if value.startswith('Storm Lance is a ranged release'):
        return current_notes['Storm Lance']
    if value.startswith('Energy: first compare'):
        return 'Energy: five hard Astral Communion ranks add 50 percentage points of Enhanced Damage at 100 total Energy; the cap is 200. Balance this additive bonus against the life you give up.'
    return value.replace('Total skill levels 10 and 20 add primary bolts.', 'Total skill levels 10, 20 and 30 each add two primary bolts, up to seven.')

wiki['guides'] = update_guide_text(wiki['guides'])
checked_plans = 0

def check_plan(label, hero, level, plan):
    global checked_plans
    allocated = {str(key): int(value) for key, value in plan.items()}
    assert sum(allocated.values()) <= level + 11, (label, 'point budget')
    for number, points in allocated.items():
        skill = native['skills'][number]
        assert skill.get('charclass') == next(key for key, value in CLASSES.items() if value == hero)
        assert 0 <= points <= int(skill.get('maxlvl', 20))
        if not points:
            continue
        assert int(skill.get('reqlevel', 1)) + points - 1 <= level, (label, number, 'rank unlock')
        for key in ['reqskill1', 'reqskill2', 'reqskill3']:
            assert not skill.get(key) or allocated.get(str(skill[key]), 0) > 0, (label, number, key)
    checked_plans += 1

for guide in wiki['guides']:
    plan = {str(row['skillId']): row['points'] for row in guide['pointPlan'] if row.get('skillId') is not None}
    check_plan(guide['id'], guide['hero'], 100, plan)
    guide['reviewedVersion'] = 'Alpha V2.0'
    guide['v20Review'] = {**guide.get('v14Review', {}), 'validation': 'Point plan checked against the final V2.0 native skill IDs, rank limits and prerequisites. Data-checked theorycraft; live benchmarks pending.'}
for guide in wiki['specialistGuides']:
    for level, plan in guide['pointPlans'].items():
        check_plan(guide['id'], guide['hero'], int(level), plan)
    guide.update(version='Alpha V2.0', reviewedDate=DATE, status='Data-checked theorycraft; V2.0 mechanics and legal point plans, live benchmarks pending')
write(EDITOR / 'build-guides.json', {'source': VERSION + '; native point-plan validation', 'guides': wiki['guides']})

# Revise specific specialist mechanics rather than relabeling obsolete formulas.
for path in sorted((WIKI / 'builds').glob('*.html')):
    text = path.read_text(encoding='utf8')
    text = text.replace('Alpha V1.4', 'Alpha V2.0').replace('October 31, 2026', 'November 7, 2026')
    text = text.replace('This version does not have splash damage.', 'Each selected strike now produces one small lightning splash; it does not add source-weapon damage.')
    text = text.replace('and it does not turn Tempest into an area spell.', 'and it does not create the separate Tempest lightning splash.')
    text = text.replace('<strong>Calling the Tempest pulse splash:</strong> it hits one nearby enemy per pulse in this version. Its independent pressure is useful without inventing area damage.', '<strong>Overcounting Tempest:</strong> each pulse selects a target and resolves a single small lightning splash. Do not add an invented second direct hit or weapon strike.')
    if path.name == 'hostile-takeover.html':
        text = text.replace('min(300, total Energy × hard Astral Communion / 5)', 'min(200, total Energy × hard Astral Communion / 10)')
        text = re.sub(r'<p>With five invested points,.*?</p>', '<p>With five invested points, 150 total Energy adds 75 percentage points of Enhanced Damage; 250 adds 125; 400 reaches the 200-point cap. This is additive Enhanced Damage for Cleave and Echoing Strike, not an independent final-damage multiplier. Equipment Energy counts; bonus skill levels do not replace hard ranks in this term.</p>', text, flags=re.S)
        text = re.sub(r'<p>The passive separately grants mana recovery.*?</p>', '<p>Astral Communion separately grants 20% mana regeneration per effective rank, capped at 100%. Sigil Lord grants 3% faster cast rate and maximum mana per effective rank, each capped at 15%; five hard ranks also raise the native manual Sigil limit. Recreate summons after changing Demonic Resonance to refresh their added damage.</p>', text, flags=re.S)
        text = text.replace('Add <strong>5 × effective Sigil Lord rank</strong>, not a fixed 25 after gear.', 'Add <strong>min(15, 3 × effective Sigil Lord rank)</strong>.')
    if path.name == 'repossession-agent.html':
        text = re.sub(r'<p><strong>Judgment is a cast spell\.</strong>.*?</p>', '<p><strong>Judgment is a cast spell.</strong> Its primary hit and secondary bolts both gain 5% magic damage per hard Holy Bolt rank. Secondary bolts use 40% of the primary magic-damage scale and can hit eligible hostile monster types, rather than the old undead/demon-only filter. The spell has a 0.8-second cooldown and launches at most five secondary bolts. It does not use source-weapon damage or heal friendly targets.</p>', text, flags=re.S)
    notice = '<section data-v20-skill-review><h2>Alpha V2.0 skill review</h2><p>This guide uses the final native skill point limits. The current skill descriptions below supersede earlier prototype mechanics. Equipment comparisons remain theorycraft, not measured performance.</p>'
    for record in class_records:
        if record['name'] in text and record['name'] in ['Storm Lance', 'Arcane Tempest', 'Soul Harvest', 'Ancestral Standard', 'Bloodroot', 'Shadow Rift', 'Judgment', 'Astral Communion', 'Sigil Lord', 'Demonic Resonance']:
            notice += '<p><strong>' + html.escape(record['name']) + ':</strong> ' + html.escape(record['note']).replace('\n', '<br>') + '</p>'
    notice += '</section>'
    text = re.sub(r'<section data-v20-skill-review>.*?</section>', '', text, flags=re.S)
    path.write_text(text.replace('</main>', notice + '</main>'), encoding='utf8')
app = WIKI / 'app.js'
text = app.read_text(encoding='utf8').replace('Alpha V1.4 build review', 'Alpha V2.0 build review').replace('guide.v14Review', 'guide.v20Review')
app.write_text(text, encoding='utf8')
index = WIKI / 'specialist-builds.html'
index.write_text(index.read_text(encoding='utf8').replace('Alpha V1.4', 'Alpha V2.0'), encoding='utf8')
for relative in ['docs/index.html', 'docs/js/app.bafc4d91.js', 'docs/wiki/index.html']:
    path = ROOT / relative
    path.write_text(path.read_text(encoding='utf8').replace('Alpha V1.4', 'Alpha V2.0'), encoding='utf8')
for relative in ['docs/d2plus/native-v13.bundle.js', 'docs/d2plus/native-v14.bundle.js', 'editor-native-v14/item-parser.js']:
    path = ROOT / relative
    text = path.read_text(encoding='utf8')
    # Generalize an old authoring verification comment; leave executable code intact.
    text = re.sub(r'verified on (?!a local test character)\w+', 'verified on a local test character', text)
    path.write_text(text, encoding='utf8')
wiki.update(version=VERSION, records=records, contentSnapshot={'modVersion': 'Alpha V2.0', 'date': DATE, 'notes': 'Current packaged class skills, levels, monsters and editor tables. Build advice is data-checked theorycraft; gameplay benchmarks are not implied.'}, summary=dict(collections.Counter(row['kind'] for row in records)))
notes = {'id': 'alpha-v20', 'version': 'Alpha V2.0', 'date': 'November 7, 2026', 'status': 'Released alpha', 'title': 'New depths below Sanctuary', 'summary': 'Optional dungeons, polished bosses, finished skill roles and refreshed reference tools.', 'sections': [{'title': 'Dungeons, bosses and rewards', 'bullets': ['Explore the Gloamweb spider caverns and their stronger Uber version, the Nightmare Sanctum and the Cinderwound in The Hole.', 'Eligible bosses use a flat 10% base Dungeon Reward Bag roll, with the bag tier selected by difficulty.', 'Custom boss materials and attack presentation receive another polish pass.']}, {'title': 'Skills and interface', 'bullets': ['Shadow Rift, Judgment, Arcane Tempest, Soul Harvest, Ancestral Standard, Bloodroot and the Warlock specialist passives receive finalized roles and matching tooltips.', 'Storm Lance reaches seven primary bolts at total skill level 30; its weapon contribution remains 50%.', 'The wider bottom-centered enemy bar follows target visibility. Ordinary gems have a distinct cyan name color; Elder Gems remain orange.']}, {'title': 'Reference and installation', 'bullets': ['Current class skill identities and native table values are shared by the editor and online/offline wiki.', 'The complete D2RMM download needs no older D2PLUS package. Close D2R before installing and keep your existing output/save path.', 'Automated data and package validation does not replace live encounter, build or device testing.']}]}
wiki['patchNotes'] = [notes] + [row for row in wiki['patchNotes'] if row.get('id') != notes['id']]
wiki['news'] = [{'id': 'alpha-v20', 'date': '2026-11-07', 'tag': 'Alpha V2.0', 'title': notes['title'], 'summary': notes['summary'], 'body': 'See the current patch notes for dungeon, boss, skill and interface changes.'}] + [row for row in wiki['news'] if row.get('id') != 'alpha-v20']
assert len({row['id'] for row in records}) == len(records)
assert len(class_records) == 264
boss_coverage = []
for key in sorted(BOSS_IDS):
    record = next(row for row in records if row['kind'] == 'Monster' and row.get('sourceKey') == key)
    boss_coverage.append({'sourceKey': key, 'name': record['name'], 'recordId': record['id']})
write(EDITOR / 'v105_data.json', native)
write(EDITOR / 'v105_strings.json', list(strings.items()))
write(EDITOR / 'constants_105.json', constants)
for stem in ['v105_data', 'constants_105']:
    manifest = read(EDITOR / (stem + '.manifest.json'))
    manifest.update(profile='d2plus-alpha-v2.0', generatedAt=DATE, sha256=hashlib.sha256((EDITOR / (stem + '.json')).read_bytes()).hexdigest(), referenceSourceHashes=fingerprints)
    manifest.setdefault('counts', {}).update(skills=len(native['skills']), classSkills=264, skillDescriptions=len(descs), strings=len(strings), itemStats=len(native['itemStatCost']), uniques=len(native['uniqueItems']), setItems=len(native['setItems']))
    write(EDITOR / (stem + '.manifest.json'), manifest)
(EDITOR / 'constants_105.bundle.js').write_text('window.constants_d2plus = ' + json.dumps({'constants': constants, 'manifest': read(EDITOR / 'constants_105.manifest.json')}, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf8')
write(WIKI / 'database.json', wiki)
(WIKI / 'data.js').write_text('window.D2PLUS_DATA = ' + json.dumps(wiki, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf8')

# Replace the obsolete hand-written skill section with the same current descriptions.
page = ROOT / 'site/index.html'
text = page.read_text(encoding='utf8')
start = text.index('<section id="skills"')
end = text.index('<section class="panel"><h2>Questions at the gate', start)
panels = ['<section id="skills" class="panel skill-reference"><h2>Skill reference <span>Alpha V2.0</span></h2><p>Current packaged names, unlocks and descriptions for all eight classes. Hard points and total skill levels can scale different bonuses; follow each skill tooltip. Encounter and build benchmarks remain open to live testing.</p><div class="skill-tabs" role="tablist" aria-label="Class skill reference">']
for cc, title in CLASSES.items():
    slug = title.lower()
    panels.append(f'<a id="skilltab-{slug}" href="#skills-{slug}" role="tab" aria-controls="skills-{slug}" aria-selected="{str(cc == "ama").lower()}" data-skill-tab>{title}</a>')
panels.append('</div><span class="visually-hidden" role="status" aria-live="polite" data-skill-status></span>')
for cc, title in CLASSES.items():
    slug = title.lower()
    panels.append(f'<div id="skills-{slug}" class="skill-panel" role="tabpanel" tabindex="0" aria-labelledby="skilltab-{slug}" data-skill-panel><h3>{title}</h3><div class="skill-table" tabindex="0" role="region" aria-label="{title} current skills"><table><thead><tr><th>Skill</th><th>Unlock / ranks</th><th>Current behavior</th></tr></thead><tbody>')
    for record in sorted((row for row in class_records if row['hero'] == title), key=lambda row: (row['level'], row['name'])):
        description = html.escape(record['note']).replace('\n', '<br>')
        panels.append(f'<tr><td data-label="Skill">{html.escape(record["name"])}</td><td data-label="Unlock / ranks">Level {record["level"]} · {record["sourceRow"].get("maxlvl", "20")} ranks</td><td data-label="Current behavior">{description}</td></tr>')
    panels.append('</tbody></table></div></div>')
panels.append('</section>')
page.write_text(text[:start] + '\n'.join(panels) + '\n' + text[end:], encoding='utf8')
report = {'release': 'Alpha V2.0', 'date': DATE, 'classSkills': 264, 'checkedGuidePlans': checked_plans, 'classCounts': {CLASSES[key]: sum(row['charclass'] == key for row in current_classes) for key in CLASSES}, 'wikiRecords': len(records), 'customBossCoverage': boss_coverage, 'sourceHashes': fingerprints, 'saveFormat': 105, 'savesReadOrWritten': False}
write(ROOT / 'release-inputs/reference-v20-report.json', report)
subprocess.run([sys.executable, str(ROOT / 'build/update-wiki-v20-ui.py')], check=True)
print(json.dumps({key: value for key, value in report.items() if key != 'sourceHashes'}, indent=2))
