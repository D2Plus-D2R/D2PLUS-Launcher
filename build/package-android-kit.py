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
decoded=C/'decoded';framework=C/'framework';unsigned=C/'D2PLUS_Companion_AlphaV0.8.2_unsigned.apk'
subprocess.run(['java','-jar',str(tool),'d','-f',str(original),'-p',str(framework),'-o',str(decoded)],check=True)
for folder in ['wiki','mobile','d2plus']:shutil.copytree(R/'docs'/folder,decoded/'assets/htdocs'/folder,dirs_exist_ok=True)
p=decoded/'apktool.yml';s=p.read_text(encoding='utf-8');s=re.sub(r'versionCode: .*','versionCode: 82',s);s=re.sub(r'versionName: .*','versionName: 0.8.2-alpha',s);p.write_text(s,encoding='utf-8')
subprocess.run(['java','-jar',str(tool),'b',str(decoded),'-p',str(framework),'-o',str(unsigned)],check=True)
with zipfile.ZipFile(unsigned) as z:
 for folder in ['wiki','mobile','d2plus']:
  for p in (R/'docs'/folder).rglob('*'):
   if p.is_file():assert z.read('assets/htdocs/'+p.relative_to(R/'docs').as_posix())==p.read_bytes(),str(p)
 assert b'mobile/index.html' in z.read('assets/htdocs/index.html')
 assert not any(n.startswith('META-INF/') and n.endswith(('.RSA','.DSA','.EC')) for n in z.namelist())
with zipfile.ZipFile(D/'D2PLUS_Android_AlphaV0.8.2_Update_Kit.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 z.write(unsigned,unsigned.name)
 for p in sorted(decoded.rglob('*')):
  if p.is_file() and p.relative_to(decoded).parts[0] not in ('build','dist','original'):z.write(p,'decoded/'+p.relative_to(decoded).as_posix())
 z.writestr('READ_BEFORE_INSTALLING.txt','AlphaV0.8.2 rebuild kit. Use the separately published signed APK for installation. Reconstructed Apktool sources and unsigned build; package com.d2plus.companion, versionCode 82. Rebuild with Apktool 3.0.2 and sign with the existing private v0.8 release identity. This identity supports in-place updates over v0.8. No private keys are included.\n')
print('Built and verified unsigned Android update kit.')
