"""Build V2.0b portable/installer from signed launcher inventory and game ZIP.

The runtime can come from the official pinned Electron ZIP or a checksum-pinned
previous portable release. Private keys, settings, saves and build scratch are
not copied into the application payload.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess
import urllib.request
import zipfile

ROOT=Path(__file__).resolve().parents[1]
VERSION='2.0.2-alpha'
assert json.loads((ROOT/'package.json').read_text())['version']==VERSION
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--makensis')
p.add_argument('--runtime-template',type=Path)
p.add_argument('--runtime-template-sha256')
a=p.parse_args()
def digest(file):
    with file.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
provenance=json.loads((ROOT/'build/ELECTRON-PROVENANCE.json').read_text())
out=ROOT/'dist/D2PLUS-Launcher-v20b'
assert out.resolve().parent==(ROOT/'dist').resolve() and not out.is_symlink()
if out.exists():shutil.rmtree(out)
out.mkdir(parents=True)
if a.runtime_template:
    assert a.runtime_template_sha256 and digest(a.runtime_template)==a.runtime_template_sha256,'Previous portable checksum mismatch'
    with zipfile.ZipFile(a.runtime_template) as source:
        prefix='D2PLUS-Launcher/'
        previous=json.loads(source.read(prefix+'ELECTRON-PROVENANCE.json'))
        assert previous==provenance,'Previous release used a different Electron runtime'
        for member in source.infolist():
            if member.is_dir() or not member.filename.startswith(prefix):continue
            name=member.filename[len(prefix):]
            if name.startswith('resources/app/') or name.startswith(('README','CHANGELOG')) or name=='ELECTRON-PROVENANCE.json':continue
            assert '..' not in Path(name).parts and ':' not in name and '\\' not in name
            target=out/name;target.parent.mkdir(parents=True,exist_ok=True)
            with source.open(member) as src,target.open('wb') as dst:shutil.copyfileobj(src,dst,1024*1024)
else:
    archive=ROOT/'build-cache/electron-win32-x64.zip';archive.parent.mkdir(exist_ok=True)
    if not archive.exists():urllib.request.urlretrieve(provenance['source'],archive)
    assert digest(archive)==provenance['sha256'],'Electron checksum mismatch'
    with zipfile.ZipFile(archive) as source:source.extractall(out)
    (out/'electron.exe').replace(out/'D2PLUS Launcher.exe')
    (out/'resources/default_app.asar').unlink(missing_ok=True)
app=out/'resources/app';app.mkdir(parents=True,exist_ok=True)
# Signature/schema are verified with the same immutable protocol used at runtime.
checked=subprocess.run(['node','-e',"const p=require('./desktop/update-protocol.cjs'),fs=require('fs');const e=JSON.parse(fs.readFileSync('updates/current.json'));p.decode(e,p.channelAt(process.cwd()));"],cwd=ROOT,check=True)
envelope=json.loads((ROOT/'updates/current.json').read_text())
import base64
manifest=json.loads(base64.b64decode(envelope['payload']))
for row in manifest['files']:
    if row['area']!='launcher':continue
    name=row['path'];source=ROOT/name
    assert source.resolve().is_relative_to(ROOT.resolve()) and source.is_file()
    assert source.stat().st_size==row['size'] and digest(source)==row['sha256'],'Signed launcher source drift: '+name
    target=app/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
for name in ['updates/current.json','updates/channel.json']:
    target=app/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/name,target)
game=json.loads((ROOT/'gameplay/manifest.json').read_text())
assert Path(game['name']).name==game['name'] and 'AlphaV2.0b' in game['name']
archive=ROOT/'gameplay'/game['name']
assert archive.stat().st_size==game['size'] and digest(archive)==game['sha256']
shutil.copy2(archive,app/'gameplay'/game['name'])
for name in ['LICENSE','THIRD_PARTY_NOTICES.md']:shutil.copy2(ROOT/name,app/name)
for name in ['README-DESKTOP.txt','CHANGELOG-2.0.2-alpha.txt']:shutil.copy2(ROOT/name,out/name)
shutil.copy2(ROOT/'build/ELECTRON-PROVENANCE.json',out/'ELECTRON-PROVENANCE.json')
quote=lambda v:str(v).replace('/','\\').replace('$','$$').replace('"','$\\"')
files=sorted(p.relative_to(out)for p in out.rglob('*')if p.is_file())
dirs=sorted((p.relative_to(out)for p in out.rglob('*')if p.is_dir()),key=lambda p:len(p.parts),reverse=True)
(ROOT/'build/uninstall-files-v20b.nsh').write_text('\n'.join('Delete "$INSTDIR\\'+quote(p)+'"'for p in files)+'\n'+'\n'.join('RMDir "$INSTDIR\\'+quote(p)+'"'for p in dirs)+'\n')
portable=ROOT/f'dist/D2PLUS_Launcher_Portable_{VERSION}.zip'
with zipfile.ZipFile(portable,'w',zipfile.ZIP_DEFLATED,compresslevel=6)as archive:
    for p in out.rglob('*'):
        if p.is_file():archive.write(p,'D2PLUS-Launcher/'+p.relative_to(out).as_posix())
print(portable,flush=True)
if a.makensis:
    executable=ROOT/f'dist/D2PLUS_Launcher_Setup_{VERSION}.exe';prefix='/'if __import__('os').name=='nt'else'-'
    subprocess.run([a.makensis,prefix+'V2',prefix+'DPAYLOAD='+str(out),prefix+'DOUTFILE='+str(executable),str(ROOT/'build/installer-v20b.nsi')],check=True)
    print(executable,flush=True)
