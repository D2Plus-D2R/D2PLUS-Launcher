"""Reproducibly build the fresh V2.0b snapshot and complete D2RMM package.

Consumes the authenticated public V2.0a ZIP and the five reviewed visual fixes.
No local converter, private key, game install, forum or save files are read.
"""
from pathlib import Path, PurePosixPath
import argparse
import hashlib
import io
import json
import os
import urllib.request
import zipfile

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist';OUT.mkdir(exist_ok=True)
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--base',type=Path)
a=p.parse_args()
base=json.loads((ROOT/'release-inputs/v20a-base.json').read_text())
source=a.base or Path(os.environ.get('D2PLUS_V20A_SNAPSHOT',str(ROOT/'build-cache'/base['name'])))
def digest(p):
    with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
if not source.exists():
    source.parent.mkdir(parents=True,exist_ok=True);partial=source.with_suffix('.zip.partial')
    url=f"https://github.com/{base['repository']}/releases/download/{base['tag']}/{base['name']}"
    with urllib.request.urlopen(url,timeout=120) as response,partial.open('wb') as target:
        while block:=response.read(1024*1024):target.write(block)
    assert partial.stat().st_size==base['size'] and digest(partial)==base['sha256'],'Base download checksum mismatch'
    partial.replace(source)
assert source.stat().st_size==base['size'] and digest(source)==base['sha256'],'Base snapshot checksum mismatch'
review=json.loads((ROOT/'release-inputs/alpha-v20b-gameplay.json').read_text())
assert review['version']=='2.0b' and review['expectedFiles']==3124 and review['tablesUnchanged'] and review['saveLayoutUnchanged']
chunks=[]
for part in review['parts']:
    assert Path(part['name']).name==part['name'] and part['name'].startswith('alpha-v20b-gameplay.zip.part')
    raw=(ROOT/'release-inputs'/part['name']).read_bytes()
    assert len(raw)==part['size'] and hashlib.sha256(raw).hexdigest()==part['sha256']
    chunks.append(raw)
raw=b''.join(chunks)
assert len(raw)==review['archiveBytes'] and hashlib.sha256(raw).hexdigest()==review['archiveSHA256']
overlay_rows={r['path']:r for r in review['files']}
assert len(overlay_rows)==len(review['files'])==5
def safe(name):
    assert name.startswith('data/') and '\\' not in name and ':' not in name and '..' not in PurePosixPath(name).parts and not name.endswith('/')
    assert not name.startswith('data/global/excel/'),'This bug-fix overlay must not alter game balance or saved-stat tables'
    return name
with zipfile.ZipFile(io.BytesIO(raw)) as patch:
    assert set(patch.namelist())==set(overlay_rows) and len(patch.namelist())==5
    overlay={safe(n):patch.read(n)for n in patch.namelist()}
    for name,data in overlay.items():
        assert len(data)==overlay_rows[name]['size'] and hashlib.sha256(data).hexdigest()==overlay_rows[name]['sha256']
snapshot=ROOT/'gameplay/D2PLUS_AlphaV2.0b_Installed_Snapshot.zip'
complete=OUT/'D2PLUS_AlphaV2.0b_Complete_D2RMM.zip'
rows,texts,binaries=[],{},[]
prefix='D2PLUS_Alpha_v20b_Complete/'
def put(z,name,data):
    info=zipfile.ZipInfo(name,(2026,11,21,12,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,data,compresslevel=6)
with zipfile.ZipFile(source) as old,zipfile.ZipFile(snapshot,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as installed,zipfile.ZipFile(complete,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as module:
    manifest=json.loads(old.read('INSTALL_MANIFEST.json'))
    assert len(manifest['files'])==3124
    consumed=set()
    for row in manifest['files']:
        name=row['path'].removeprefix('D2RMM.mpq/')
        assert row['path'].startswith('D2RMM.mpq/data/') and '..' not in PurePosixPath(name).parts
        original=old.read(row['path'])
        assert len(original)==row['size'] and hashlib.sha256(original).hexdigest()==row['sha256']
        if name in overlay:
            assert row['sha256']==overlay_rows[name]['beforeSHA256'];consumed.add(name)
        data=overlay.get(name,original);put(installed,row['path'],data)
        rows.append(dict(path=row['path'],size=len(data),sha256=hashlib.sha256(data).hexdigest()))
        relative=name.removeprefix('data/')
        if name.endswith(('.txt','.json')):texts[relative]=data.decode('utf8')
        else:binaries.append(relative);put(module,prefix+'payload/'+relative,data)
    assert consumed==set(overlay)
    put(installed,'INSTALL_MANIFEST.json',json.dumps(dict(version='2.0b',files=rows),indent=2).encode())
    put(installed,'README_INSTALL.txt',b'D2PLUS Alpha V2.0b complete gameplay snapshot. No saves are included.\n')
    put(module,prefix+'mod.json',json.dumps(dict(name='D2PLUS - Alpha V2.0b Complete',author='D2PLUS',version='2.0b',description='Fresh complete standalone D2PLUS. Disable older complete D2PLUS mods and overlapping test addons before installing. Keeps existing output and save path.',config=[]),indent=2).encode())
    script="// Complete standalone Alpha V2.0b; no previous D2PLUS package required.\n(function(){'use strict';\nconst textFiles="+json.dumps(texts,separators=(',',':'))+";\nfor(const p of Object.keys(textFiles))D2RMM.writeTxt(p,textFiles[p]);\nconst binaryFiles="+json.dumps(binaries)+";\nfor(const p of binaryFiles)D2RMM.copyFile('payload/'+p,p,true);\n})();\n"
    put(module,prefix+'mod.js',script.encode())
    put(module,prefix+'INSTALL_MANIFEST.json',json.dumps(dict(version='2.0b',files=[{**r,'path':r['path'].removeprefix('D2RMM.mpq/data/')}for r in rows]),indent=2).encode())
    put(module,'README_INSTALL.txt',(ROOT/'release-notes/alpha-v20b-install.txt').read_bytes())
    put(module,'CHANGELOG.txt',(ROOT/'CHANGELOG-2.0.2-alpha.txt').read_bytes())
def metadata(p):return dict(name=p.name,size=p.stat().st_size,sha256=digest(p))
release=dict(repository=base['repository'],tag='v2.0b-alpha',displayVersion='Alpha V2.0b',files=[metadata(complete),metadata(snapshot)])
(ROOT/'gameplay/manifest.json').write_text(json.dumps(metadata(snapshot),indent=2)+'\n')
(ROOT/'gameplay/release.json').write_text(json.dumps(release,indent=2)+'\n')
(OUT/'gameplay-index.json').write_text(json.dumps(dict(version='2.0b',files=[dict(area='game',path=r['path'].removeprefix('D2RMM.mpq/'),size=r['size'],sha256=r['sha256'])for r in rows]),indent=2)+'\n')
(OUT/'GAMEPLAY-READY.json').write_text(json.dumps(dict(version='2.0b',files=len(rows),changedFiles=sorted(consumed),allTablesUnchanged=True,saveLayoutUnchanged=True,runtimeCrashFixConfirmed=False,release=release),indent=2)+'\n')
print('Prepared complete Alpha V2.0b:',len(rows),'files; five reviewed visual changes; no table/save changes.')
