"""Build V1.2.2 from published V1.2 plus the reviewed controller UI and loading splash."""
from pathlib import Path
import hashlib,json,os,struct,zipfile,io,subprocess,sys
from PIL import Image
R=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(R/'build/prepare-v12.py')],check=True)
base=json.loads((R/'release-inputs/v12.json').read_text())
entry=next(f for f in base['files'] if f['name'].endswith('_Installed_Snapshot.zip'))
src=Path(os.environ.get('D2PLUS_SNAPSHOT',str(R/'gameplay'/entry['name'])))
sha=lambda b:hashlib.sha256(b).hexdigest()
with src.open('rb') as f:assert hashlib.file_digest(f,'sha256').hexdigest()==entry['sha256'],'Base snapshot checksum mismatch'
out=R/'dist';out.mkdir(exist_ok=True);gameplay=R/'gameplay';gameplay.mkdir(exist_ok=True)
new=gameplay/'D2PLUS_AlphaV1.2.2_Installed_Snapshot.zip';full=out/'D2PLUS_AlphaV1.2.2_Complete_D2RMM.zip'
art=Image.open(R/'docs/launcher/assets/splash-v11.png').convert('RGBA');rows=[];texts={};binaries=[];changed=[]
mod='D2PLUS_Alpha_v122_Complete/'
parts=sorted((R/'release-inputs').glob('controller-v03.zip.part*'))
overlay={}
with zipfile.ZipFile(io.BytesIO(b''.join(p.read_bytes() for p in parts))) as c:
 for row in json.loads((R/'release-inputs/controller-v03.json').read_text())['files']:
  raw=c.read(row['path']);assert sha(raw)==row['sha256'];overlay[row['path']]=raw
with zipfile.ZipFile(src) as old,zipfile.ZipFile(new,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z,zipfile.ZipFile(full,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as m:
 manifest=json.loads(old.read('INSTALL_MANIFEST.json'))
 for row in manifest['files']:
  name=row['path'];assert name.startswith('D2RMM.mpq/data/') and '..' not in name
  raw=old.read(name);assert sha(raw)==row['sha256'],name
  rel=name.removeprefix('D2RMM.mpq/data/')
  if rel in overlay:raw=overlay.pop(rel);changed.append(rel)
  if rel in ['hd/global/ui/d2plus/loading/d2plus_alpha11.sprite','hd/global/ui/d2plus/loading/d2plus_alpha11.lowend.sprite']:
   w,h=struct.unpack_from('<II',raw,8);assert len(raw)==40+w*h*4
   raw=raw[:40]+art.resize((w,h),Image.Resampling.LANCZOS).tobytes();changed.append(rel)
  z.writestr(name,raw);rows.append({'path':name,'size':len(raw),'sha256':sha(raw)})
  if rel.endswith(('.json','.txt')):texts[rel]=raw.decode('utf8')
  else:binaries.append(rel);m.writestr(mod+'payload/'+rel,raw)
 for rel,raw in overlay.items():
  name='D2RMM.mpq/data/'+rel;changed.append(rel);z.writestr(name,raw);rows.append({'path':name,'size':len(raw),'sha256':sha(raw)})
  if rel.endswith(('.json','.txt')):texts[rel]=raw.decode('utf8')
  else:binaries.append(rel);m.writestr(mod+'payload/'+rel,raw)
 assert len(changed)==29
 z.writestr('INSTALL_MANIFEST.json',json.dumps({'version':'1.2.2','files':rows},indent=2))
 z.writestr('README_INSTALL.txt','D2PLUS Alpha V1.2.2 launcher snapshot. Use the Complete_D2RMM ZIP with D2RMM. Keep your existing mod output name and save path. No saves included.\n')
 m.writestr(mod+'mod.json',json.dumps({'name':'D2PLUS - Alpha V1.2.2 Complete','description':'Standalone D2PLUS with controller HUD alignment, dark stone panels and the Alpha V1.2.2 splash. Disable older complete packages and overlapping addons.','author':'D2PLUS','version':'1.2.2','config':[]}))
 m.writestr(mod+'mod.js',"// D2PLUS Alpha V1.2.2 complete snapshot\n(function(){'use strict';\nconst textFiles="+json.dumps(texts,separators=(',',':'))+";\nfor(const p of Object.keys(textFiles))D2RMM.writeTxt(p,textFiles[p]);\nconst binaryFiles="+json.dumps(binaries)+";\nfor(const p of binaryFiles)D2RMM.copyFile('payload/'+p,p,true);\n})();\n")
 m.writestr(mod+'INSTALL_MANIFEST.json',json.dumps({'version':'1.2.2','files':[{**r,'path':r['path'].removeprefix('D2RMM.mpq/data/')} for r in rows]},indent=2))
 m.writestr('README_INSTALL.txt','Close D2R and back up saves. Extract D2PLUS_Alpha_v122_Complete into D2RMM/mods. Disable older complete D2PLUS packages and overlapping addons. Enable D2PLUS - Alpha V1.2.2 Complete and click Install Mods. Keep your existing output mod name and save path. No new character is required.\n')
def metadata(p):
 with p.open('rb') as f:h=hashlib.file_digest(f,'sha256').hexdigest()
 return {'name':p.name,'size':p.stat().st_size,'sha256':h}
release={'repository':'D2Plus-D2R/D2PLUS-Launcher','tag':'v1.2.2-alpha','displayVersion':'Alpha V1.2.2','files':[metadata(full),metadata(new)]}
(gameplay/'manifest.json').write_text(json.dumps(metadata(new)))
(gameplay/'release.json').write_text(json.dumps(release))
(out/'release.json').write_text(json.dumps(release,indent=2))
(out/'GAMEPLAY_VALIDATION.json').write_text(json.dumps({'baseRelease':'Alpha V1.2','version':'1.2.2','fileCount':len(rows),'changedGameFiles':changed,'otherGameFilesIdentical':True,'inGameTestPerformed':False},indent=2))
print('Prepared Alpha V1.2.2: controller interface and loading splash updated; gameplay tables unchanged.')
