#!/usr/bin/env python3
"""Build only the public landing page. No editor backend or local settings are published."""
from pathlib import Path
import json,os,re,shutil
root=Path(__file__).resolve().parents[1]
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
