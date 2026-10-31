#!/usr/bin/env python3
"""Build the public website and online wiki. No editor backend or local settings are published."""
from pathlib import Path
import json,os,re,shutil
root=Path(__file__).resolve().parents[1]
import subprocess,sys
subprocess.run([sys.executable,str(root/'build/getting-started.py')],check=True)
cfg=json.loads((root/'site/config.json').read_text())
repo=os.environ.get('GITHUB_REPOSITORY') or cfg['repository']
if repo and not re.fullmatch(r'[A-Za-z0-9-]+/[A-Za-z0-9._-]+',repo):raise SystemExit('Invalid owner/repository')
cfg['repository']=repo
out=(root/'_site').resolve()
if out.parent != root.resolve() or out.name != '_site':raise SystemExit('Unsafe site output path')
if out.exists():shutil.rmtree(out)
shutil.copytree(root/'site',out)
(out/'config.json').unlink()
(out/'site-config.js').write_text('window.D2PLUS_SITE='+json.dumps(cfg)+';\n')
(out/'.nojekyll').touch()
print(out)

# Publish the static reference only; never copy the editor or launcher backend.
import subprocess,sys
subprocess.run([sys.executable,str(root/'build/unpack-suite.py')],check=True)
wiki=root/'docs/wiki'
old=json.loads((wiki/'unique-catalog-v10.json').read_text(encoding='utf8'))
current=json.loads((wiki/'unique-catalog-v11.json').read_text(encoding='utf8'))
byid={x['id']:x for x in current}
renames={x['name']:byid[x['id']]['name'] for x in old if x['id'] in byid and x['name']!=byid[x['id']]['name']}
pattern=re.compile('|'.join(re.escape(x) for x in sorted(renames,key=len,reverse=True)))
changes=[]
def refresh(value,where='guides'):
    if isinstance(value,str):
        updated=pattern.sub(lambda m:renames[m.group()],value)
        if updated!=value:changes.append({'path':where,'before':value,'after':updated})
        return updated
    if isinstance(value,list):return [refresh(v,where+'/'+str(i)) for i,v in enumerate(value)]
    if isinstance(value,dict):return {k:(v if k in ('id','canonicalId','recordId','itemId') else refresh(v,where+'/'+k)) for k,v in value.items()}
    return value
shutil.copytree(wiki,out/'wiki')
for folder in ['d2plus','img']:
    shutil.copytree(root/'docs'/folder,out/folder)
data=json.loads((wiki/'database.json').read_text(encoding='utf8'))
data['guides']=refresh(data['guides'])
encoded=json.dumps(data,ensure_ascii=False,separators=(',',':'))
(out/'wiki/database.json').write_text(encoded,encoding='utf8')
(out/'wiki/data.js').write_text('window.D2PLUS_DATA = '+encoded+';',encoding='utf8')
(out/'wiki/BUILD_NAME_AUDIT.json').write_text(json.dumps({'guidesChecked':len(data['guides']),'renamedUniqueItems':len(renames),'referencesUpdated':len(changes),'changes':changes},ensure_ascii=False,indent=2),encoding='utf8')
for page in (out/'wiki').glob('*.html'):
    html=page.read_text(encoding='utf8')
    html=html.replace('AlphaV1.1 · Oct 17','Alpha V1.2 · Item names updated')
    html=html.replace('../mobile/index.html#reference','/').replace('Open companion tools','Back to D2PLUS').replace('Offline Codex','Online Codex')
    html=re.sub(r'<a[^>]*target="d2plus-editor"[^>]*>.*?</a>','',html)
    page.write_text(html,encoding='utf8')
landing=out/'index.html'
html=landing.read_text(encoding='utf8')
html=html.replace('<a href="#features">','<a href="wiki/">Online Wiki</a><a href="#features">',1)
if 'href="wiki/"' not in html:
    html=html.replace('<nav ', '<nav ',1).replace('<main', '<a class="button" href="wiki/">Browse the Online Wiki</a><main',1)
assert 'href="wiki/"' in html
landing.write_text(html,encoding='utf8')
print('Online wiki:',len(data['guides']),'guides;',len(changes),'name references updated')
# Current public reference corrections. Historical patch notes retain their release context.
from collections import Counter
current_sections=[
 {'title':'Lilith joins Mephisto','bullets':['Lilith, Daughter of Hatred appears beside Mephisto on Normal, Nightmare and Hell, replacing his Sovereign Warden escort.','She uses Mephisto-based loot for the matching difficulty with a higher NoDrop weight. Lilith does not drop the Mephisto trophy; that reward belongs to Mephisto.']},
 {'title':'Combat presentation fixes','bullets':["Azmodan's attack, walking and death animations have been cleaned up.",'Mouse targeting is fixed for Mephisto and the Memory of Mephisto in Crystalvein Hollow.','The loading splash now displays Alpha V1.2.']},
 {'title':'Updating','bullets':['Close the game and back up characters and the shared stash. Replace the old complete package with the standalone Alpha V1.2 D2RMM package, disable overlapping addons, and click Install Mods.','Keep your existing output mod name and save path. No new character or earlier package is required. Launcher users can install the bundled Alpha V1.2 gameplay from Setup.']}
]
fix_sections=[{'title':'Items and interface','bullets':['Fixed clipped high-end unique and set inventory sprites and missing equipped models.','Accursed tooltips identify added bonuses in violet and show their roll ranges. The normal stat list still includes those bonuses; the violet explanation is not a second application.','Added Accursed Ritual Sigil storage in the Materials tab.','Corrected Ritual Sigil and Accursed names, slimmed character-selection frames and removed their side figures.','Published a complete standalone D2RMM package. The launcher snapshot archive is not the D2RMM installation package.']}]
for version,date,title,sections in [('1.1.2','October 18, 2026','Item artwork and Accursed fixes',fix_sections),('1.2','October 20, 2026','Mephisto has company',current_sections)]:
    key='alpha-v'+version.replace('.','')
    dnote={'id':key,'version':'Alpha V'+version,'date':date,'status':'Released alpha','title':title,'summary':title+'.','sections':sections}
    data['patchNotes']=[dnote]+[p for p in data['patchNotes'] if p.get('id')!=key]
    data['news']=[{'id':key,'date':date,'tag':'Alpha V'+version,'title':title,'summary':title+'.','body':[b for s in sections for b in s['bullets']]}]+[p for p in data['news'] if p.get('id')!=key]
data['version']='D2PLUS Alpha V1.2'
data['contentSnapshot']={'modVersion':'Alpha V1.2','date':'2026-10-22','notes':'Release notes and encounter information updated through Alpha V1.2. Item ranges retain their Alpha V1.1 data provenance. Build equipment names are updated; skill plans have not been newly playtested.'}
by_id={r['id']:r for r in data['records']}
# Retain the old record ID so existing bookmarks continue to resolve.
lilith=by_id['alpha-v05-warden-mephisto']
lilith.update(name='Lilith, Daughter of Hatred',source='D2PLUS Alpha V1.2',note='Appears beside Mephisto in the Durance of Hate on Normal, Nightmare and Hell, replacing his Sovereign Warden escort. A caster with Mephisto-based loot for the same difficulty and a higher NoDrop weight. She cannot drop the Mephisto trophy. This is a separate encounter from the original Uber Quest Lilith.',stats=[{'label':'Location','value':'Durance of Hate Level 3'},{'label':'Difficulties','value':'Normal, Nightmare and Hell'},{'label':'Mephisto trophy','value':'Does not drop'}])
for k in ['farming','sourceRow','loot','treasureClasses']:
    lilith.pop(k,None)
for r in data['records']:
    if r['id'] in ['alpha-v05-warden-andariel','alpha-v05-warden-duriel','alpha-v05-warden-diablo']:
        boss=r['name'].split(' · ')[-1]
        r['note']='Sovereign Warden escort beside '+boss+'. Uses the Countess treasure class for the matching difficulty. Mephisto instead has Lilith, Daughter of Hatred; Baal has Azmodan.'
    if r['id']=='alpha-v05-warden-baalcrab':r['note']+=' Alpha V1.2 improves his attack, walk and death animations.'
    if r['id']=='entry-4529':r['note']='Original Uber Quest Lilith (Uber Andariel). This is not the D2PLUS Lilith, Daughter of Hatred encounter beside Mephisto. The listed values are from the underlying monster table.'
    if r['id']=='alpha-v08-material-stash':r['note']='The Materials tab stores D2PLUS crafting materials, including Worldforge Shards, Artisan\u2019s Embers, Sovereign Seals, all seven Elder Gems and the Accursed Ritual Sigil. Sigil storage was added in Alpha V1.1.2.'
    if r['id']=='d2plus-option-enableD2PlusTitleSplash':r['note']='The complete package includes the D2PLUS gothic title presentation and an Alpha V1.2 loading splash. This online wiki does not change game settings.'

def add_reference(id,name,note):
    data['records'].append({'id':id,'name':name,'kind':'Mod system','source':'D2PLUS Alpha V1.2','level':'','base':'','hero':'','note':note,'stats':[]})
add_reference('v12-melee-splash','Optional melee splash charm','Gheed sells the melee splash charm. Keep it in your character inventory to enable its effect; leaving it in the stash does not enable it.')
add_reference('v12-accursed-tooltip','Reading Accursed bonuses','Successful rituals show the Accursed label and added-bonus explanations in violet, with the possible roll range in parentheses. The ordinary stat list also includes the applied bonuses. These are two descriptions of the same benefit, not duplicate bonuses. Ritual Sigils have a dedicated Materials stash slot.')
add_reference('v12-targeting','Mephisto targeting fixes','Alpha V1.2 fixes mouse targeting for Mephisto and the Memory of Mephisto in Crystalvein Hollow.')
# Normalize display copy only. Never rewrite file paths, table keys or stable IDs.
label_fixes={
 'Enhanced defense':'Enhanced Defense','Enhanced physical damage':'Enhanced Physical Damage','Bonus attack rating':'Bonus Attack Rating','Mana regeneration':'Mana Regeneration','Damage reduced by':'Damage Reduced by','Better chance of getting magic items':'Better Chance of Getting Magic Items',
 'Enhanced damage':'Enhanced Damage','All resistances':'All Resistances','All skills':'All Skills','All attributes':'All Attributes',
 'Life stolen per hit':'Life Stolen per Hit','Mana stolen per hit':'Mana Stolen per Hit','Increased attack speed':'Increased Attack Speed',
 'Faster cast rate':'Faster Cast Rate','Faster hit recovery':'Faster Hit Recovery','Faster run/walk':'Faster Run/Walk',
 'Life after each Kill':'Life after Each Kill','Mana after each Kill':'Mana after Each Kill','Cannot be frozen':'Cannot Be Frozen',
 'Replenish quantity':'Replenish Quantity','Maximum durability':'Maximum Durability','Fire resistance':'Fire Resistance',
 'Cold resistance':'Cold Resistance','Lightning resistance':'Lightning Resistance','Poison resistance':'Poison Resistance',
}
label_count=[0]
def display_cleanup(value,key=''):
    if key in ('sourceRow','id','canonicalId','recordId','itemId','art','code','field','src','url','href','image','imagePath','key'):return value
    if isinstance(value,dict):return {k:display_cleanup(v,k) for k,v in value.items()}
    if isinstance(value,list):return [display_cleanup(v,key) for v in value]
    if isinstance(value,str):
        value=re.sub(r'\bD2\s*Plus\b','D2PLUS',value,flags=re.I)
        value=re.sub(r'\bAlpha\s*[vV]\s*(?=\d)','Alpha V',value)
        if key=='label':
            for old,new in label_fixes.items():
                if old in value and old!=new:label_count[0]+=1;value=value.replace(old,new)
        return value
    return value
data=display_cleanup(data)
data['summary']=dict(Counter(r['kind'] for r in data['records']))
encoded=json.dumps(data,ensure_ascii=False,separators=(',',':'))
(out/'wiki/database.json').write_text(encoded,encoding='utf8')
(out/'wiki/data.js').write_text('window.D2PLUS_DATA = '+encoded+';',encoding='utf8')
app=out/'wiki/app.js'
js=app.read_text(encoding='utf8')
replacements={
 'The complete offline reference':'The D2PLUS online reference',
 'Browse D2PLUS Alpha V1.1 items, builds and farming routes offline. Open the Accursed guide for the new unique-item ritual.':'Browse D2PLUS Alpha V1.2 items, builds and farming routes. Find Lilith, the latest fixes and the Accursed ritual here.',
 'Official offline dispatches':'D2PLUS release archive',
 '${esc(D.version)}</div></article>':'${esc(article.tag)} (historical article)</div></article>',
 "D.patchNotes.find(p => p.id === 'alpha-v10')":"D.patchNotes[0]",
 "head('AlphaV1.0 · October 16, 2026', 'More trouble in Sanctuary', 'Azmodan, The Butcher, gothic towns, snowy Harrogath and the Gothic Rose HUD.'":"head('Alpha V1.2 · October 20, 2026', 'Mephisto has company', 'Lilith joins Mephisto, with cleaner Azmodan animations and repaired Mephisto targeting.'",
 'Read every AlphaV1.0 change':'Read the release history',
 "'alpha-v05': alphaV05,":"'alpha-v12': alphaV05,\n    'alpha-v05': alphaV05,",
 'AlphaV1.0 skill plans':'equipment names updated; skill plans from Alpha V1.0',
 '<span class="badge mod">AlphaV1.0</span>':'<span class="badge mod">Skill plan: Alpha V1.0</span>',
 '<strong>AlphaV1.0:</strong>':'<strong>Mercenary appearances:</strong>',
 'Follow D2PLUS from its original content foundation through the unified interface and the current combined Expedition test.':'Current release: Alpha V1.2. Older entries below describe their original release and may have been superseded.',
 'Enable “32 identified unique ring sprites” in D2RMM and click Install Mods to reveal the individual HD sprite after identification.':'The complete D2PLUS package includes individual HD sprites for identified trinkets.',
}
for old,new in replacements.items():
    assert old in js,old
    js=js.replace(old,new)
js=re.sub(r'AlphaV(?=\d)','Alpha V',js)
# The current release page should lead with this release, not the old potion showcase.
start=js.index('  function alphaV05() {')
end=js.index('  const routes = {',start)
js=js[:start]+"""  function alphaV05() {
    const latest = D.patchNotes[0];
    return head(latest.version, latest.title, 'The latest additions and fixes in D2PLUS.', '◆') +
      latest.sections.map(s=>`<section class="card"><h2>${esc(s.title)}</h2><ul>${s.bullets.map(b=>`<li>${esc(b)}</li>`).join('')}</ul></section>`).join('') +
      '<p><a class="detail-link" href="#patch-notes">Full release history →</a></p>';
  }

"""+js[end:]
app.write_text(js,encoding='utf8')
for page in (out/'wiki').glob('*.html'):
    html=page.read_text(encoding='utf8')
    html=html.replace('Reign of the Warlock and the working D2PLUS AlphaV1.1 build in one archive.','Items, systems and release information for D2PLUS Alpha V1.2. Older patch notes are retained as history.')
    html=html.replace('Alpha V1.2 · Item names updated','Alpha V1.2 · Updated Oct 22')
    html=html.replace('href="#alpha-v10" data-route="alpha-v05">AlphaV1.1','href="#alpha-v12" data-route="alpha-v12">Current release')
    html=html.replace('The complete offline item, recipe, runeword, skill, build, news, and patch-history reference for D2PLUS AlphaV1.1','The online item, recipe, runeword, skill, build, news, and patch-history reference for D2PLUS Alpha V1.2')
    if page.name=='accursed.html':
        html=html.replace('Successful items gain a violet <span class="violet">Accursed</span> tooltip label along with their new bonuses.','Successful items gain a violet <span class="violet">Accursed</span> label and violet explanations showing the added bonuses and their possible roll ranges. These bonuses also appear in the normal stat list; they are applied only once. Accursed Ritual Sigils can be stored in their Materials tab slot.')
        html=html.replace('Alpha V1.1 · Odds','Alpha V1.2 · Odds')
    html=re.sub(r'AlphaV(?=\d)','Alpha V',html)
    # Cache refresh for the changed database, renderer and styles.
    for asset in ['data.js','app.js','styles.css']:
        html=html.replace('"'+asset+'"','"'+asset+'?v=1.2-20261022"')
    page.write_text(html,encoding='utf8')
(out/'wiki/CONTENT_AUDIT.json').write_text(json.dumps({'version':data['version'],'date':'2026-10-22','statLabelsNormalized':label_count[0],'releaseEntriesAdded':['1.1.2','1.2'],'guides':len(data['guides']),'itemDataProvenance':'Alpha V1.1; retained, not relabeled as newly extracted','historicalNotesRetained':True},indent=2),encoding='utf8')
assert data['patchNotes'][0]['version']=='Alpha V1.2'
assert len({r['id'] for r in data['records']})==len(data['records'])
print('Current release notes and references refreshed;',label_count[0],'stat labels normalized')

# The standalone guide and the wiki's guide share the same practice chamber.
# Relative resource paths support both the custom domain and project Pages URLs.
subprocess.run([sys.executable,str(root/'build/ritual_lab_data.py'),
                '--wiki',str(out/'wiki/database.json'),
                '--output',str(out/'ritual-lab-catalog.json')],check=True)
practice=(root/'site/ritual-lab-fragment.html').read_text(encoding='utf8')
for relative in ['accursed.html','wiki/accursed.html']:
    page=out/relative
    html=page.read_text(encoding='utf8')
    prefix='../' if relative.startswith('wiki/') else ''
    if 'id="ritual-lab"' not in html:
        if '<h2 id="ritual">' not in html:raise SystemExit('Missing ritual guide insertion point: '+relative)
        html=html.replace('<h2 id="ritual">',practice+'\n<h2 id="ritual">',1)
    if 'ritual-lab.css' not in html:
        html=html.replace('</head>','<link rel="stylesheet" href="'+prefix+'ritual-lab.css"></head>',1)
    if 'ritual-lab.mjs' not in html:
        html=html.replace('</body>','<script type="module" src="'+prefix+'ritual-lab.mjs"></script></body>',1)
    if 'href="#ritual-lab"' not in html:
        html=html.replace('<a href="#ritual">','<a href="#ritual-lab">Try the ritual</a><a href="#ritual">',1)
    page.write_text(html,encoding='utf8')
print('Accursed practice chamber included in both public guide routes')

# Current release patch runs after historical normalization and preserves stable record IDs.
subprocess.run([sys.executable,str(root/'build/apply-reference-v13.py')],check=True)

# Final V1.4 snapshot overrides historical reference normalization.
subprocess.run([sys.executable,str(root/'build/apply-reference-v14.py')],check=True)
