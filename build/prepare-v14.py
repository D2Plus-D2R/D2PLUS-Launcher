"""Build complete, reproducible Alpha V1.4 packages from the pinned released base."""
from pathlib import Path
import hashlib, io, json, os, urllib.request, zipfile

R = Path(__file__).resolve().parents[1]
digest = lambda b: hashlib.sha256(b).hexdigest()
def metadata(p):
    with p.open('rb') as f: h = hashlib.file_digest(f, 'sha256').hexdigest()
    return {'name': p.name, 'size': p.stat().st_size, 'sha256': h}
base = json.loads((R/'release-inputs/v122-base.json').read_text())
entry = next(f for f in base['files'] if f['name'].endswith('_Installed_Snapshot.zip'))
src = Path(os.environ.get('D2PLUS_V122_SNAPSHOT', str(R/'gameplay'/entry['name'])))
if not src.exists():
    src.parent.mkdir(parents=True, exist_ok=True)
    url = 'https://github.com/'+base['repository']+'/releases/download/'+base['tag']+'/'+entry['name']
    with urllib.request.urlopen(url, timeout=120) as response, src.open('wb') as target:
        while block := response.read(1024*1024): target.write(block)
assert metadata(src) == entry, 'Base snapshot checksum mismatch'
overlay_manifest = json.loads((R/'release-inputs/alpha-v14-gameplay.json').read_text())
overlay_bytes = b''.join(p.read_bytes() for p in sorted((R/'release-inputs').glob('alpha-v14-gameplay.zip.part*')))
assert digest(overlay_bytes) == overlay_manifest['archiveSha256'], 'Overlay archive checksum mismatch'
overlay = {}
with zipfile.ZipFile(io.BytesIO(overlay_bytes)) as z:
    for row in overlay_manifest['files']:
        name = row['path']
        assert name.startswith('data/') and '..' not in Path(name).parts and '\\' not in name and ':' not in name
        raw = z.read(name); assert digest(raw) == row['sha256'], name
        overlay[name] = raw
out = R/'dist'; out.mkdir(exist_ok=True)
new = R/'gameplay/D2PLUS_AlphaV1.4_Installed_Snapshot.zip'
full = out/'D2PLUS_AlphaV1.4_Complete_D2RMM.zip'
mod = 'D2PLUS_Alpha_v14_Complete/'
rows, texts, binaries, changed = [], {}, [], []
remove = set(overlay_manifest['removeCompiled'])
def put(z, m, name, raw):
    rel = name.removeprefix('data/')
    z.writestr('D2RMM.mpq/'+name, raw)
    rows.append({'path':'D2RMM.mpq/'+name, 'size':len(raw), 'sha256':digest(raw)})
    if rel.endswith(('.json','.txt')): texts[rel] = raw.decode('utf8')
    else: binaries.append(rel); m.writestr(mod+'payload/'+rel, raw)
with zipfile.ZipFile(src) as old, zipfile.ZipFile(new,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z, zipfile.ZipFile(full,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as m:
    for row in json.loads(old.read('INSTALL_MANIFEST.json'))['files']:
        name = row['path']; assert name.startswith('D2RMM.mpq/data/') and '..' not in Path(name).parts
        raw = old.read(name); assert digest(raw) == row['sha256'], name
        name = name.removeprefix('D2RMM.mpq/')
        if name in remove: continue
        if name in overlay: raw = overlay.pop(name); changed.append(name)
        put(z,m,name,raw)
    for name,raw in sorted(overlay.items()): changed.append(name); put(z,m,name,raw)
    assert len(changed) == len(overlay_manifest['files'])
    assert len(rows) == len({r['path'] for r in rows})
    assert len(rows) == overlay_manifest['expectedSnapshotFiles']
    z.writestr('INSTALL_MANIFEST.json',json.dumps({'version':'1.4','files':rows},indent=2))
    z.writestr('README_INSTALL.txt','D2PLUS Alpha V1.4 launcher snapshot. Use Complete_D2RMM.zip with D2RMM. No saves are included.\n')
    m.writestr(mod+'mod.json',json.dumps({'name':'D2PLUS - Alpha V1.4 Complete','description':'Complete standalone D2PLUS: Shattered Sun dungeon, Last Sunkeeper, Dungeon Reward Bags, revised runewords, class sets, item visuals and all earlier content. Disable older complete packages and overlapping addons.','author':'D2PLUS','version':'1.4','config':[]}))
    m.writestr(mod+'mod.js',"// D2PLUS Alpha V1.4 complete snapshot\n(function(){'use strict';\nconst textFiles="+json.dumps(texts,separators=(',',':'))+";\nfor(const p of Object.keys(textFiles))D2RMM.writeTxt(p,textFiles[p]);\nconst binaryFiles="+json.dumps(binaries)+";\nfor(const p of binaryFiles)D2RMM.copyFile('payload/'+p,p,true);\n})();\n")
    m.writestr(mod+'INSTALL_MANIFEST.json',json.dumps({'version':'1.4','files':[{**r,'path':r['path'].removeprefix('D2RMM.mpq/data/')} for r in rows]},indent=2))
    m.writestr('README_INSTALL.txt',(R/'release-notes/alpha-v14-install.txt').read_text(encoding='utf8'))
    m.writestr('CHANGELOG.txt',(R/'CHANGELOG-1.4.0-alpha.txt').read_text(encoding='utf8'))
release={'repository':'D2Plus-D2R/D2PLUS-Launcher','tag':'v1.4-alpha','displayVersion':'Alpha V1.4','files':[metadata(full),metadata(new)]}
for folder,name,data in [(R/'gameplay','manifest.json',metadata(new)),(R/'gameplay','release.json',release),(out,'release.json',release)]:
    (folder/name).write_text(json.dumps(data,indent=2)+'\n',encoding='utf8')
(out/'GAMEPLAY_VALIDATION.json').write_text(json.dumps({'baseRelease':'Alpha V1.2.2','version':'1.4','fileCount':len(rows),'changedGameFiles':changed,'removedCompiledTables':sorted(remove),'otherGameFilesIdentical':True,'automatedInGameTestPerformed':False},indent=2))
print('Prepared full Alpha V1.4 snapshot and standalone D2RMM mod:',len(rows),'files',flush=True)
