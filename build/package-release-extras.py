"""Create public companion/source assets and checksums after the Windows build."""
from pathlib import Path
import zipfile,hashlib,subprocess,json,shutil
R=Path(__file__).resolve().parents[1];D=R/'dist'
with zipfile.ZipFile(D/'D2PLUS_Offline_Wiki_Alpha_v0.8.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted((R/'docs').rglob('*')):
  if p.is_file() and not p.is_relative_to(R/'docs/launcher'):z.write(p,p.relative_to(R).as_posix())
 z.writestr('START_HERE.txt','Extract fully, then open docs/wiki/index.html. Use the Windows launcher for full hero-editor character import/export. Keep original save backups. Alpha v0.8 contains all 163 enabled runewords.\n')
subprocess.run(['git','archive','--format=zip','--prefix=D2PLUS-Launcher/','-o',str(D/'D2PLUS_Source_Alpha_v0.8.zip'),'HEAD'],cwd=R,check=True)
subprocess.run(['python','build/site.py'],cwd=R,check=True)
with zipfile.ZipFile(D/'D2PLUS_Website_Alpha_v0.8.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted((R/'_site').rglob('*')):
  if p.is_file():z.write(p,p.relative_to(R/'_site').as_posix())
for p in D.glob('*.zip'):
 with zipfile.ZipFile(p) as z:assert z.testzip() is None,p.name
files=sorted([*D.glob('*.zip'),*D.glob('*.exe')])
(D/'SHA256SUMS-0.8.0-alpha.txt').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in files),encoding='utf-8')
print('Verified',len(files),'release archives/executables.')
