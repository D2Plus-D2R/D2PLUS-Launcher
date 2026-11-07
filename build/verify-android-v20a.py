#!/usr/bin/env python3
"""Verify public Android package metadata, signing and embedded content checksums."""
from pathlib import Path
import argparse,hashlib,json,subprocess,zipfile,re
CERT='18b9f6fea79926265b70e61cd2ea4e5fb5382d3236cc5c3fa2208b85531c6144'
CORE='66bd6e3919df4995403a9ceb86ba849b398d9f7c4b8e7e589c5f443d80fd938a'
def run(args):
 r=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 if r.returncode:raise RuntimeError('Package verification tool failed (exit '+str(r.returncode)+')')
 return r.stdout
def verify(apk,tools,java,content_manifest=None):
 apk=Path(apk);tools=Path(tools)
 binary=lambda name:str(tools/(name+'.exe' if (tools/(name+'.exe')).is_file() else name))
 sig=run([str(java),'--enable-native-access=ALL-UNNAMED','-jar',str(tools/'lib/apksigner.jar'),'verify','--verbose','--print-certs','--min-sdk-version','26',str(apk)])
 assert 'Signer #1 certificate SHA-256 digest: '+CERT in sig,'Signing identity differs'
 for v in [2,3]:assert f'Verified using v{v} scheme (APK Signature Scheme v{v}): true' in sig,'Required signature scheme missing'
 schemes=['v'+str(v)for v in [1,2,3]if ('Verified using v'+str(v)+' scheme (JAR signing): true' if v==1 else f'Verified using v{v} scheme (APK Signature Scheme v{v}): true')in sig]
 run([binary('zipalign'),'-c','-P','16','4',str(apk)])
 badge=run([binary('aapt'),'dump','badging',str(apk)])
 assert "name='com.d2plus.companion' versionCode='201' versionName='2.0.1-alpha'" in badge,'Version/package mismatch'
 assert "sdkVersion:'26'" in badge and "targetSdkVersion:'35'" in badge,'SDK metadata changed'
 verified=0
 with zipfile.ZipFile(apk)as z:
  names=z.namelist();assert len(names)==len(set(names)),'Duplicate ZIP entries'
  assert all('..'not in Path(n).parts and not n.startswith(('/', '\\'))for n in names),'Escaping ZIP path'
  assert hashlib.sha256(z.read('classes.dex')).hexdigest()==CORE,'Retained native app core differs'
  assert b'mobile/index.html'in z.read('assets/htdocs/index.html'),'Offline entry missing'
  if content_manifest:
   manifest=json.loads(Path(content_manifest).read_text(encoding='utf-8-sig'))
   expected=set()
   for e in manifest['files']:
    n='assets/htdocs/'+e['path'];expected.add(n);b=z.read(n)
    assert len(b)==e['bytes']and hashlib.sha256(b).hexdigest()==e['sha256'],'Embedded content differs: '+e['path'];verified+=1
   actual={n for n in names if n.startswith('assets/htdocs/')and n!='assets/htdocs/index.html'and not n.endswith('/')}
   assert actual==expected,'Embedded content file set differs'
 return {'file':apk.name,'bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'certificateSha256':CERT,'signatureVerified':True,'schemes':schemes,'alignmentVerified':True,'retainedAppCoreSha256':CORE,'retainedAppCoreVerified':True,'package':'com.d2plus.companion','versionCode':201,'versionName':'2.0.1-alpha','minSdk':26,'targetSdk':35,'verifiedReferenceFiles':verified,'sameIdentityAsV08':True,'sameIdentityAsV11':True,'deviceTested':False}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--apk',required=True,type=Path);p.add_argument('--tools',required=True,type=Path);p.add_argument('--java',default='java');p.add_argument('--content-manifest',type=Path);a=p.parse_args();print(json.dumps(verify(a.apk,a.tools,a.java,a.content_manifest),indent=2))
