"""Apply reviewed V1.3 editor assets and merge charm content into the current wiki."""
from pathlib import Path
from collections import Counter
import hashlib, io, json, re, shutil, zipfile
R=Path(__file__).resolve().parents[1]
meta=json.loads((R/'release-inputs/alpha-v13-suite.json').read_text())
raw=b''.join(p.read_bytes() for p in sorted((R/'release-inputs').glob('alpha-v13-suite.zip.part*')))
assert hashlib.sha256(raw).hexdigest()==meta['sha256']
with zipfile.ZipFile(io.BytesIO(raw)) as z:
    for n in z.namelist():
        assert n.startswith('docs/') and '..' not in Path(n).parts and ':' not in n and '\\' not in n
        p=R/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(z.read(n))
for stem in ['v105_data','constants_105']:
    p=R/'docs/d2plus'/f'{stem}.manifest.json'
    manifest=json.loads(p.read_text(encoding='utf8'))
    manifest['profile']='d2plus-alpha-v1.3'
    p.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
patch=json.loads((R/'release-inputs/alpha-v13-reference.json').read_text(encoding='utf8'))
wiki=R/'_site/wiki'
d=json.loads((wiki/'database.json').read_text(encoding='utf8'))
for k in ['news','patchNotes']:
    additions=patch[k];ids={x['id'] for x in additions};d[k]=additions+[x for x in d[k] if x.get('id') not in ids]
records={r['id']:r for r in d['records']}
for r in patch['records']:records[r['id']]=r
for rid,weight in patch['weights'].items():
    r=records[rid];r['stats']=[x for x in r.get('stats',[]) if x['label']!='Charm Weight']+[{'label':'Charm Weight','value':str(weight)}]
    r['note']=r.get('note','')+' Alpha V1.3: charm weight '+str(weight)+'. Check Advanced Character Stats for your total.'
for r in records.values():
    if r['id']=='d2plus-option-enableD2PlusTitleSplash':r['note']='The complete package includes the D2PLUS gothic title presentation and an Alpha V1.3 loading splash.'
    if r['id']=='v12-accursed-tooltip':r['note']+=' Alpha V1.3 also allows unique Grand Charms: success adds one weight; a brick becomes a magic charm of the same base.'
d['records']=list(records.values());d['summary']=dict(Counter(r['kind'] for r in d['records']))
d['version']='D2PLUS Alpha V1.3'
d['contentSnapshot']={'modVersion':'Alpha V1.3','date':'2026-10-26','notes':'Charm rules and seven Oaths verified against the Alpha V1.3 gameplay tables. Existing build equipment names are current; historical skill plans are not new gameplay benchmarks.'}
guide_path=R/'docs/d2plus/build-guides.json'
guides=json.loads(guide_path.read_text(encoding='utf8'))
guides['guides']=d['guides']
guide_path.write_text(json.dumps(guides,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
encoded=json.dumps(d,ensure_ascii=False,separators=(',',':'))
(wiki/'database.json').write_text(encoded+'\n',encoding='utf8');(wiki/'data.js').write_text('window.D2PLUS_DATA = '+encoded+';\n',encoding='utf8')
shutil.copy2(R/'docs/wiki/charms.html',wiki/'charms.html')
app=wiki/'app.js';s=app.read_text(encoding='utf8')
s=s.replace('D2PLUS Alpha V1.2 items, builds and farming routes. Find Lilith, the latest fixes and the Accursed ritual here.','D2PLUS Alpha V1.3 items, builds and farming routes. Explore charm weight, seven Oaths and the latest Accursed rules.')
s=s.replace('Current release: Alpha V1.2.','Current release: Alpha V1.3.').replace("'alpha-v12': alphaV05,","'alpha-v13': alphaV05,\n    'alpha-v12': alphaV05,")
app.write_text(s,encoding='utf8')
for p in wiki.glob('*.html'):
    s=p.read_text(encoding='utf8').replace('Alpha V1.2 · Updated Oct 22','Alpha V1.3 · Updated Oct 26').replace('for D2PLUS Alpha V1.2','for D2PLUS Alpha V1.3')
    s=s.replace('href="#alpha-v12" data-route="alpha-v12"','href="#alpha-v13" data-route="alpha-v13"')
    s=s.replace('?v=1.2-20261022','?v=1.3-20261026')
    if p.name=='index.html':s=s.replace('<body>','<body><div style="padding:12px;text-align:center;background:#171411;color:#c7b377"><a style="color:inherit" href="charms.html">Alpha V1.3 — Charm weight &amp; Oath crafting guide</a></div>',1)
    if p.name=='charms.html':s=s.replace('← Offline Wiki','← Online Wiki')
    if p.name=='accursed.html':s=s.replace('runewords, charms, and quest items','runewords, small and large charms, and quest items').replace('rings, amulets and jewels','rings, amulets, jewels and unique Grand Charms')
    p.write_text(s,encoding='utf8')
for p in [wiki/'accursed.html',R/'_site/accursed.html']:
    s=p.read_text(encoding='utf8').replace('runewords, charms, and quest items','runewords, small and large charms, and quest items').replace('rings, amulets and jewels','rings, amulets, jewels and Grand Charms')
    note='<p class="note">Alpha V1.3: unique Grand Charms, including Oaths, can be Accursed. Success adds one charm weight. A brick becomes a magic charm of the same base and loses its unique powers. Other eligible items still brick into rares. <a href="'+('charms.html' if p.parent.name=='wiki' else 'wiki/charms.html')+'">Charm and Oath guide →</a></p>'
    s=s.replace('<h2 id="ritual">',note+'<h2 id="ritual">',1)
    s=s.replace('Becomes a rare item','Becomes a rare item (Grand Charms become magic)')
    # The existing practice simulator only models its fixed example pool.
    s=s.replace('<h2 id="ritual-lab-heading">','<p>The practice examples below cover equipment only; they do not simulate unique Grand Charm rituals.</p><h2 id="ritual-lab-heading">',1)
    s=s.replace('D2PLUS Alpha V1.1 · Horadric rites','D2PLUS Alpha V1.3 · Horadric rites').replace('Alpha V1.2 · Odds','Alpha V1.3 · Odds')
    s=s.replace('or turn your item into a rare.','or turn your item into a rare (a magic charm for unique Grand Charms).')
    s=s.replace('It gives a new rare of the same base item type','A Grand Charm becomes magic. Other eligible items become a new rare of the same base item type')
    p.write_text(s,encoding='utf8')
for src in (R/'_site').glob('ritual-lab*'):
    if src.is_file():shutil.copy2(src,R/'docs'/src.name)
shutil.copytree(wiki,R/'docs/wiki',dirs_exist_ok=True)
for p in (R/'docs/wiki').glob('*.html'):
    s=p.read_text(encoding='utf8').replace('← Online Wiki','← Offline Wiki').replace('Online Codex','Offline Codex').replace('href="/">Back to D2PLUS','href="/launcher/index.html">Back to launcher')
    p.write_text(s,encoding='utf8')
for folder in ['d2plus','img']:shutil.copytree(R/'docs'/folder,R/'_site'/folder,dirs_exist_ok=True)
(wiki/'CONTENT_AUDIT.json').write_text(json.dumps({'version':'Alpha V1.3','date':'2026-10-26','oaths':7,'exactAuraLevels':20,'charmCapacity':50,'historicalNotesRetained':True,'privateProjectsIncluded':False},indent=2))
print('Alpha V1.3 offline editor and both wikis updated:',len(d['records']),'reference records.')
