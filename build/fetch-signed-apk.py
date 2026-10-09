"""Reconstruct and verify the already-signed APK; private keys never reach CI."""
from pathlib import Path
import json,hashlib,base64,urllib.request,os,subprocess,zipfile
R=Path(__file__).resolve().parents[1];D=R/'dist';D.mkdir(exist_ok=True);M=json.loads((R/'release-inputs/android-v082-signed.json').read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
parts=[]
for blob in M['blobs']:
 req=urllib.request.Request('https://api.github.com/repos/D2Plus-D2R/D2PLUS-Launcher/git/blobs/'+blob['sha'],headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','User-Agent':'D2PLUS-release-builder'})
 with urllib.request.urlopen(req,timeout=300) as r:v=json.load(r)
 part=base64.b64decode(v['content']);assert len(part)==blob['size'];parts.append(part)
data=b''.join(parts);assert len(data)==M['bytes'] and sha(data)==M['sha256'];apk=D/M['file'];apk.write_bytes(data)
T=R/'build-cache/android-verify';T.mkdir(parents=True,exist_ok=True);archive=T/'tools.zip';tools=M['signingTools']
if not archive.exists():urllib.request.urlretrieve(tools['source'],archive)
assert sha(archive.read_bytes())==tools['sha256']
with zipfile.ZipFile(archive) as z:
 for n in z.namelist():assert (T/n).resolve().is_relative_to(T.resolve())
 z.extractall(T)
B=T/'android-15';result=subprocess.check_output(['java','--enable-native-access=ALL-UNNAMED','-jar',str(B/'lib/apksigner.jar'),'verify','--verbose','--print-certs','--min-sdk-version','26',str(apk)],text=True)
assert 'Signer #1 certificate SHA-256 digest: '+M['certificateSha256'] in result
assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in result and 'Verified using v3 scheme (APK Signature Scheme v3): true' in result
subprocess.run([str(B/'zipalign.exe'),'-c','-P','16','4',str(apk)],check=True)
badging=subprocess.check_output([str(B/'aapt.exe'),'dump','badging',str(apk)],text=True)
assert "name='com.d2plus.companion' versionCode='82' versionName='0.8.2-alpha'" in badging
with zipfile.ZipFile(apk) as z:
 for folder in ['wiki','mobile','d2plus']:
  for p in (R/'docs'/folder).rglob('*'):
   if p.is_file():assert z.read('assets/htdocs/'+p.relative_to(R/'docs').as_posix())==p.read_bytes(),p
print('Verified signed APK, original v0.8 identity, version and every companion reference asset.')
