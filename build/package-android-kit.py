"""Rebuild the companion reference assets without inventing a signing identity."""
from pathlib import Path
import hashlib,urllib.request,subprocess,shutil,re,zipfile
R=Path(__file__).resolve().parents[1];C=R/'build-cache/android';C.mkdir(parents=True,exist_ok=True);D=R/'dist';D.mkdir(exist_ok=True)
def fetch(name,url,digest):
 p=C/name
 if not p.exists():urllib.request.urlretrieve(url,p)
 assert hashlib.sha256(p.read_bytes()).hexdigest()==digest,name
 return p
original=fetch('original-v07.apk','https://github.com/D2Plus-D2R/D2PLUS-Launcher/releases/download/v0.7-alpha/D2PLUS_Companion_Alpha_v0.7.apk','96e910a813fceaf828dd0b1feacfc29d6ac914d9802434269de26fa81fde7f26')
tool=fetch('apktool.jar','https://github.com/iBotPeaches/Apktool/releases/download/v3.0.2/apktool_3.0.2.jar','eee4669a704a14e0623407e6701b0b91887e61e1e4049cb7a82833e14ae8b5fd')
decoded=C/'decoded';framework=C/'framework';unsigned=C/'D2PLUS_Companion_Alpha_v0.8_unsigned.apk'
subprocess.run(['java','-jar',str(tool),'d','-f',str(original),'-p',str(framework),'-o',str(decoded)],check=True)
for folder in ['wiki','mobile','d2plus']:shutil.copytree(R/'docs'/folder,decoded/'assets/htdocs'/folder,dirs_exist_ok=True)
p=decoded/'apktool.yml';s=p.read_text(encoding='utf-8');s=re.sub(r'versionCode: .*','versionCode: 8',s);s=re.sub(r'versionName: .*','versionName: 0.8.0-alpha',s);p.write_text(s,encoding='utf-8')
subprocess.run(['java','-jar',str(tool),'b',str(decoded),'-p',str(framework),'-o',str(unsigned)],check=True)
with zipfile.ZipFile(unsigned) as z:
 for folder in ['wiki','mobile','d2plus']:
  for p in (R/'docs'/folder).rglob('*'):
   if p.is_file():assert z.read('assets/htdocs/'+p.relative_to(R/'docs').as_posix())==p.read_bytes(),str(p)
 assert b'mobile/index.html' in z.read('assets/htdocs/index.html')
 assert not any(n.startswith('META-INF/') and n.endswith(('.RSA','.DSA','.EC')) for n in z.namelist())
with zipfile.ZipFile(D/'D2PLUS_Android_Alpha_v0.8_Update_Kit.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 z.write(unsigned,unsigned.name)
 for p in sorted(decoded.rglob('*')):
  if p.is_file() and p.relative_to(decoded).parts[0] not in ('build','dist','original'):z.write(p,'decoded/'+p.relative_to(decoded).as_posix())
 z.writestr('READ_BEFORE_INSTALLING.txt','''D2PLUS Alpha v0.8 Android update kit - UNSIGNED
This is an unsigned rebuild kit. For installation, use the separately published
signed APK. The original v0.7 private signing key was unavailable; v0.8 uses a new
key. Existing users must uninstall the old companion, clearing its app data.
Package: com.d2plus.companion; versionCode: 8; versionName: 0.8.0-alpha.
The decoded folder is reconstructed Apktool source, not the original Gradle project.
Rebuild using Apktool 3.0.2, then zipalign and apksigner with the NEW v0.8 key.
New release certificate SHA-256:
18b9f6fea79926265b70e61cd2ea4e5fb5382d3236cc5c3fa2208b85531c6144
Keep this identity for future updates over v0.8. No private keys
are included. Android device behavior has not been validated.
''')
print('Built and verified unsigned Android update kit.')
