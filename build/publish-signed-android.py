"""Publish an already-signed APK; no private key or password is used by CI."""
from pathlib import Path
import json,os,hashlib,base64,urllib.request,urllib.parse,zipfile,subprocess,re
R=Path(__file__).resolve().parents[1];M=json.loads((R/'release-inputs/android-v08-signed.json').read_text());D=R/'dist/android-signed';D.mkdir(parents=True,exist_ok=True)
repo=os.environ['GH_REPO'];assert repo=='D2Plus-D2R/D2PLUS-Launcher';token=os.environ['GH_TOKEN'];base='https://api.github.com/repos/'+repo
sha=lambda b:hashlib.sha256(b).hexdigest()
def request(url,method='GET',payload=None,ctype='application/json'):
 data=json.dumps(payload).encode() if payload is not None and ctype=='application/json' else payload
 req=urllib.request.Request(url,data=data,method=method,headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','Content-Type':ctype,'User-Agent':'D2PLUS-Android-release'})
 with urllib.request.urlopen(req,timeout=600) as r:
  body=r.read();return json.loads(body) if body else None
def download(url):
 with urllib.request.urlopen(url,timeout=300) as r:return r.read()
parts=[]
for blob in M['blobs']:
 v=request(base+'/git/blobs/'+blob['sha']);assert v['sha']==blob['sha'] and v['encoding']=='base64'
 data=base64.b64decode(v['content']);assert len(data)==blob['size'];parts.append(data)
data=b''.join(parts);assert len(data)==M['bytes'] and sha(data)==M['sha256'];apk=D/M['file'];apk.write_bytes(data)
tools=M['signingTools'];toolzip=D/'build-tools.zip';toolzip.write_bytes(download(tools['source']));assert sha(toolzip.read_bytes())==tools['sha256']
with zipfile.ZipFile(toolzip) as z:
 for n in z.namelist():assert (D/'tools'/n).resolve().is_relative_to((D/'tools').resolve())
 z.extractall(D/'tools')
T=D/'tools/android-15'
result=subprocess.check_output(['java','--enable-native-access=ALL-UNNAMED','-jar',str(T/'lib/apksigner.jar'),'verify','--verbose','--print-certs','--min-sdk-version','26',str(apk)],text=True)
assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in result
assert 'Verified using v3 scheme (APK Signature Scheme v3): true' in result
assert 'Signer #1 certificate SHA-256 digest: '+M['certificateSha256'] in result
subprocess.run([str(T/'zipalign.exe'),'-c','-P','16','4',str(apk)],check=True)
badging=subprocess.check_output([str(T/'aapt.exe'),'dump','badging',str(apk)],text=True)
assert "name='com.d2plus.companion' versionCode='8' versionName='0.8.0-alpha'" in badging
release=request(base+'/releases/tags/'+M['releaseTag'])
assert release['id']==M['releaseId'] and release['prerelease'] and not release['draft'] and release['target_commitish']==M['originalReleaseCommit']
assets={a['name']:a for a in release['assets']}
def upload(p,name=None):
 name=name or p.name;data=p.read_bytes();digest='sha256:'+sha(data)
 if name in assets and assets[name].get('digest')==digest:return assets[name]
 if name in assets:assert assets[name].get('digest')=='sha256:'+M['expectedAssets'].get(name,''),'Unexpected changed release asset: '+name
 stage=name+'.uploading'
 if stage in assets:
  a=assets[stage];assert a.get('digest')==digest,'Different staged upload: '+stage
 else:
  a=request(release['upload_url'].split('{')[0]+'?name='+urllib.parse.quote(stage),'POST',data,'application/octet-stream')
 assert a['state']=='uploaded' and a['size']==len(data) and a['digest']==digest,name
 if name in assets:request(base+'/releases/assets/'+str(assets[name]['id']),'DELETE')
 a=request(base+'/releases/assets/'+str(a['id']),'PATCH',{'name':name});assets[name]=a;assets.pop(stage,None)
 print('Uploaded and verified',name,flush=True);return a
upload(apk)
# Keep the unsigned rebuild kit's instructions consistent with the new identity.
kitname='D2PLUS_Android_Alpha_v0.8_Update_Kit.zip';old=D/'old-android-kit.zip';old.write_bytes(download(assets[kitname]['browser_download_url']))
assert sha(old.read_bytes())==M['expectedAssets'][kitname]
kit=D/kitname
notes=(R/'release-notes/android-v08-installation.txt').read_text(encoding='utf-8')+'\nThis kit contains an UNSIGNED APK and reconstructed Apktool sources. For installation, use the separately published signed .apk. For future updates, rebuild with Apktool 3.0.2, align, and sign with the NEW v0.8 key held privately by the maintainer. No private key or password is included.\n'
with zipfile.ZipFile(old) as source,zipfile.ZipFile(kit,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for i in source.infolist():
  z.writestr(i,notes.encode() if i.filename=='READ_BEFORE_INSTALLING.txt' else source.read(i.filename))
upload(kit)
subprocess.run(['python','build/site.py'],cwd=R,check=True)
website=D/'D2PLUS_Website_Alpha_v0.8.zip'
with zipfile.ZipFile(website,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted((R/'_site').rglob('*')):
  if p.is_file():z.write(p,p.relative_to(R/'_site').as_posix())
upload(website)
source=D/'D2PLUS_Source_Alpha_v0.8.zip';subprocess.run(['git','archive','--format=zip','--prefix=D2PLUS-Launcher/','-o',str(source),'HEAD'],cwd=R,check=True);upload(source)
checksums=D/'SHA256SUMS-0.8.0-alpha.txt';checksums.write_text(''.join(a['digest'].removeprefix('sha256:')+'  '+name+'\n' for name,a in sorted(assets.items()) if name.endswith(('.zip','.exe','.apk'))),encoding='utf-8');upload(checksums)
body=(R/'release-notes/v0.8-alpha.md').read_text(encoding='utf-8')+'\nAndroid signing and source update: `'+os.environ['GITHUB_SHA']+'`. The Windows and gameplay downloads are unchanged.\n'
request(base+'/releases/'+str(release['id']),'PATCH',{'body':body})
print('Signed Android APK published; new signing identity notice included.')
