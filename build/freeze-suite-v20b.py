"""Freeze the exact signed launcher bytes for reproducible release builds."""
from pathlib import Path
import base64
import hashlib
import json
import subprocess
import zipfile

ROOT=Path(__file__).resolve().parents[1]
subprocess.run(['node','-e',"const p=require('./desktop/update-protocol.cjs'),fs=require('fs');p.decode(JSON.parse(fs.readFileSync('updates/current.json')),p.channelAt(process.cwd()));"],cwd=ROOT,check=True)
envelope=json.loads((ROOT/'updates/current.json').read_text(encoding='utf8'))
manifest=json.loads(base64.b64decode(envelope['payload']))
assert manifest['version']=='2.0.2-alpha' and all(r.get('download') or r.get('immutable') for r in manifest['files'])
out=ROOT/'build-cache/alpha-v20b-suite.zip';out.parent.mkdir(exist_ok=True)
members={r['path']:r for r in manifest['files']if r['area']=='launcher'}
for name in ['updates/current.json','updates/channel.json','LICENSE','THIRD_PARTY_NOTICES.md','README-DESKTOP.txt','CHANGELOG-2.0.2-alpha.txt']:
    raw=(ROOT/name).read_bytes();members[name]=dict(path=name,size=len(raw),sha256=hashlib.sha256(raw).hexdigest())
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=6)as archive:
    for name,row in sorted(members.items()):
        file=ROOT/name;assert file.resolve().is_relative_to(ROOT.resolve())
        raw=file.read_bytes();assert len(raw)==row['size'] and hashlib.sha256(raw).hexdigest()==row['sha256'],'Source changed after signing: '+name
        info=zipfile.ZipInfo(name,(2026,11,21,12,0,0));info.compress_type=zipfile.ZIP_DEFLATED;archive.writestr(info,raw,compresslevel=6)
parts=[]
with out.open('rb')as source:
    for i in range(100):
        raw=source.read(40000000)
        if not raw:break
        file=ROOT/f'release-inputs/alpha-v20b-suite.zip.part{i:03d}';file.write_bytes(raw)
        parts.append(dict(name=file.name,size=len(raw),sha256=hashlib.sha256(raw).hexdigest()))
with out.open('rb')as source:digest=hashlib.file_digest(source,'sha256').hexdigest()
result=dict(version='2.0.2-alpha',archiveBytes=out.stat().st_size,archiveSHA256=digest,parts=parts,files=list(members.values()),privateKeysIncluded=False,savesIncluded=False)
(ROOT/'release-inputs/alpha-v20b-suite.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(dict(files=len(members),bytes=out.stat().st_size,parts=len(parts))))
