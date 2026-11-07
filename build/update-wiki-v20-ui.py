"""Synchronize active wiki routes and presentation without rewriting release history."""
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
WIKI = ROOT / 'docs/wiki'
data = json.loads((WIKI / 'database.json').read_text(encoding='utf8'))
assert data['version'] == 'D2PLUS Alpha V2.0' and data['patchNotes'][0]['id'] == 'alpha-v20'
current = data['patchNotes'][0]
current.update(title='New depths below Sanctuary', summary='Gloamweb, Azrakek and Kharvul, finished skill roles, boss polish and refreshed tools.')
current['sections'] = [
    {'title': 'Optional dungeons and bosses', 'bullets': [
        'The Gloamweb Hollows has more spiders and champion packs, with Vharzith, the Hollow Weaver in its final chamber. The Gloamweb Abyss is the stronger Uber route with better loot.',
        'The Nightmare Sanctum is led by Azrakek, First Nightmare. The endgame Sanctum faces you with Uber Azrakek.',
        'Kharvul, the Cindermaw rules The Cinderwound in The Hole. This optional early dungeon keeps its world entrance and grows harder in Nightmare and Hell.',
        'Custom bosses receive material and attack-animation polish. Eligible bosses use a flat 10% base Reward Bag roll, with Normal, Nightmare or Hell bags selected by difficulty.']},
    {'title': 'Cube portals in Harrogath', 'bullets': [
        "Every portal recipe uses two matching gems, one Sovereign Seal and one Artisan's Ember.",
        'Gloamweb Hollows: two Perfect Emeralds; available on Nightmare or Hell.',
        'Gloamweb Abyss: two Elder Emeralds; Hell required.',
        'Nightmare Sanctum: two Perfect Amethysts; available on Nightmare or Hell.',
        'Endgame Sanctum: two Elder Amethysts; Hell required. The Cinderwound remains available through The Hole on all three difficulties.']},
    {'title': 'Finished skill roles', 'bullets': [
        'Storm Lance gains two primary bolts at total skill levels 10, 20 and 30, up to seven. Its wider fan has stronger flat lightning, 50% weapon contribution and brief stun against eligible targets.',
        'Shadow Rift is a short magic shock ring around the Assassin. Judgment is a targeted magic spell with consistent secondary bolts; it does not use weapon damage.',
        'Arcane Tempest resolves one small lightning splash per strike. Soul Harvest is a selected recovery stance that consumes corpses and improves mana regeneration.',
        "Ancestral Standard supports nearby allies' attack rating, defense and hit recovery. Bloodroot heals its wounded owner and erupts for physical damage when consuming corpses.",
        'Ravage is a heavy wolf-or-bear strike with knockback and bounded life and mana recovery on successful hits. Native target-drain rules still apply.',
        'Sigil Lord adds 3% faster cast rate and maximum mana per effective rank, each capped at 15%. Five invested ranks permit a second active Sigil of each type; placement remains manual.',
        'Astral Communion adds capped, additive Enhanced Damage to Cleave and Echoing Strike from total Energy and invested ranks, up to 200%. Its separate mana regeneration caps at 100%.',
        'Demonic Resonance supports the owner and newly summoned or bound demons. Invested ranks add up to 25% enhanced demon damage; Tainted receive fire-skill damage, others physical. Recast or rebind after investing.']},
    {'title': 'Interface, reference and installation', 'bullets': [
        'The enemy health bar is twice as wide, centered near the bottom and visible for a valid target. Ordinary gems have cyan names; Elder Gems stay orange.',
        'The new castle loading screen keeps its opening doors and light beyond the gates. The launcher, Hero Editor, wiki and signed Android reference share current data for all 264 class skills.',
        'The complete D2RMM package needs no older D2PLUS download. Close D2R, back up saves, disable older complete packages and overlapping test add-ons, and keep your existing output/save path.',
        'Build advice is data-checked theorycraft. Automated data, asset and package checks do not claim measured clear times or completed gameplay/device testing.']}
]
(WIKI / 'database.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf8')
(WIKI / 'data.js').write_text('window.D2PLUS_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf8')

page = WIKI / 'index.html'
text = page.read_text(encoding='utf8')
text = text.replace('href="alpha-v14.html">Alpha V2.0 — Happy Halloween!', 'href="#alpha-v20">Alpha V2.0 — New depths below Sanctuary')
text = text.replace('href="#alpha-v14" data-route="alpha-v14">Current release', 'href="#alpha-v20" data-route="alpha-v20">Current release')
text = text.replace('v=1.4-20261031', 'v=2.0-20261107')
assert 'Happy Halloween!' not in text and 'data-route="alpha-v20">Current release' in text
page.write_text(text, encoding='utf8')

app = WIKI / 'app.js'
text = app.read_text(encoding='utf8')
text = text.replace('Browse D2PLUS Alpha V1.4 items, builds and farming routes. Explore Shattered Sun, Reward Bags and revised runewords.', 'Browse D2PLUS Alpha V2.0 items, builds and farming routes. Explore Gloamweb, the Nightmare Sanctum and The Cinderwound, and compare the finished skill roles.')
text = text.replace('Current release: Alpha V1.4.', 'Current release: Alpha V2.0.')
text = text.replace('Reviewed: Alpha V1.4', 'Reviewed: Alpha V2.0').replace('reviewed for Alpha V1.4', 'reviewed for Alpha V2.0').replace('Eight full-length columns · Alpha V1.4', 'Eight full-length columns · Alpha V2.0')
start = text.index('  function alphaV05()') if '  function alphaV05()' in text else text.index('  function releasePage(')
end = text.index('  const routes = {', start)
text = text[:start] + '''  function releasePage(id = 'alpha-v20') {
    const release = (D.patchNotes || []).find(entry => entry.id === id);
    if (!release) return patchNotes();
    return head(release.version, release.title, 'The additions and fixes recorded for this release.', '◆') +
      release.sections.map(s=>`<section class="card"><h2>${esc(s.title)}</h2><ul>${s.bullets.map(b=>`<li>${esc(b)}</li>`).join('')}</ul></section>`).join('') +
      '<p><a class="detail-link" href="#patch-notes">Full release history →</a></p>';
  }

''' + text[end:]
for version in ['14', '13', '12', '05', '10']:
    text = text.replace(f"'alpha-v{version}': alphaV05,", f"'alpha-v{version}': () => releasePage('alpha-v{version}'),")
if "'alpha-v20':" not in text:
    text = text.replace('  const routes = {', "  const routes = {\n    'alpha-v20': () => releasePage('alpha-v20'),", 1)
app.write_text(text, encoding='utf8')

report = ROOT / 'release-inputs/reference-v20-report.json'
value = json.loads(report.read_text(encoding='utf8'))
value.update(activeWikiReleaseRoute='alpha-v20', activeWikiUiVersion='Alpha V2.0', historicalReleaseRoutesPreserved=True)
report.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf8')
print('Active wiki overview, banner, routes and notes now use V2.0; historical notes preserved.')
