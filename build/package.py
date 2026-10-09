#!/usr/bin/env python3
"""Build a Windows x64 portable directory and installer from official Electron.
Run from any directory: python3 build/package.py --makensis /path/to/makensis
Requires Python 3, network access, and an NSIS compiler. No Electron npm install.
"""
from pathlib import Path
import argparse,urllib.request,hashlib,json,zipfile,shutil,subprocess
ROOT=Path(__file__).resolve().parents[1]
import runpy
runpy.run_path(str(ROOT/"build/unpack-suite.py"))
a=argparse.ArgumentParser();a.add_argument('--makensis');args=a.parse_args()
provenance=json.loads((ROOT/'build/ELECTRON-PROVENANCE.json').read_text());cache=ROOT/'build-cache';cache.mkdir(exist_ok=True)
archive=cache/'electron-win32-x64.zip'
if not archive.exists():urllib.request.urlretrieve(provenance['source'],archive)
assert hashlib.sha256(archive.read_bytes()).hexdigest()==provenance['sha256'],'Electron checksum mismatch'
out=ROOT/'dist/D2PLUS-Launcher';out.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(archive) as z:z.extractall(out)
(out/'electron.exe').replace(out/'D2PLUS Launcher.exe');(out/'resources/default_app.asar').unlink(missing_ok=True)
app=out/'resources/app';app.mkdir(parents=True,exist_ok=True)
for name in ['desktop','scripts','docs','companion','licenses','test','gameplay']:
 shutil.copytree(ROOT/name,app/name,dirs_exist_ok=True)
for name in ['package.json','LICENSE','THIRD_PARTY_NOTICES.md']:
 shutil.copy2(ROOT/name,app/name)
for name in ['README-DESKTOP.txt','CHANGELOG-0.8.2-alpha.txt']:
 shutil.copy2(ROOT/name,out/name)
shutil.copy2(ROOT/'build/ELECTRON-PROVENANCE.json',out/'ELECTRON-PROVENANCE.json')
quote=lambda p:str(p).replace('/','\\').replace('$','$$').replace('"','$\\"')
files=sorted(p.relative_to(out) for p in out.rglob('*') if p.is_file());dirs=sorted((p.relative_to(out) for p in out.rglob('*') if p.is_dir()),key=lambda p:len(p.parts),reverse=True)
(ROOT/'build/uninstall-files.nsh').write_text('\n'.join('Delete "$INSTDIR\\'+quote(p)+'"' for p in files)+'\n'+'\n'.join('RMDir "$INSTDIR\\'+quote(p)+'"' for p in dirs)+'\n')
portable=ROOT/'dist/D2PLUS_Launcher_Portable_0.8.2-alpha.zip'
with zipfile.ZipFile(portable,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in out.rglob('*'):
  if p.is_file():z.write(p,'D2PLUS-Launcher/'+p.relative_to(out).as_posix())
print(portable)
if args.makensis:
 exe=ROOT/'dist/D2PLUS_Launcher_Setup_0.8.2-alpha.exe';subprocess.run([args.makensis,('/' if __import__('os').name=='nt' else '-')+'V2',('/' if __import__('os').name=='nt' else '-')+'DPAYLOAD='+str(out),('/' if __import__('os').name=='nt' else '-')+'DOUTFILE='+str(exe),str(ROOT/'build/installer.nsi')],check=True);print(exe)
