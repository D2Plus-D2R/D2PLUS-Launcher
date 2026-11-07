#!/usr/bin/env python3
"""Rebuild the unsigned Android companion from this inspected Apktool tree."""
from pathlib import Path
import argparse,datetime,hashlib,os,subprocess,zipfile
p=argparse.ArgumentParser();p.add_argument('--apktool',required=True,type=Path);p.add_argument('--java',default='java');p.add_argument('--output',type=Path,default=Path('D2PLUS_Companion_AlphaV2.0_unsigned.apk'));a=p.parse_args()
root=Path(__file__).resolve().parent;decoded=root/'decoded';framework=root/'framework'
assert (decoded/'AndroidManifest.xml').is_file() and (decoded/'classes.dex').is_file(),'Missing reconstructed source tree'
assert not a.output.exists(),'Choose a new output filename to preserve previous builds'
assert hashlib.sha256(a.apktool.read_bytes()).hexdigest()=='eee4669a704a14e0623407e6701b0b91887e61e1e4049cb7a82833e14ae8b5fd','Use the pinned Apktool 3.0.2 jar'
date=(2026,11,7,0,0,0);epoch=int(datetime.datetime(*date,tzinfo=datetime.timezone.utc).timestamp())
for item in decoded.rglob('*'):
 if item.is_file():os.utime(item,(epoch,epoch))
framework.mkdir(exist_ok=True)
build=root/'rebuild-runs'/datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ');build.mkdir(parents=True,exist_ok=False)
raw=build/'apktool-output.apk'
r=subprocess.run([a.java,'-jar',str(a.apktool.resolve()),'b',str(decoded),'-p',str(framework),'-o',str(raw)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,env={**os.environ,'SOURCE_DATE_EPOCH':str(epoch)})
if r.returncode:print(r.stdout);raise SystemExit(r.returncode)
with zipfile.ZipFile(raw)as z,zipfile.ZipFile(a.output,'w',compresslevel=9)as output:
 for name in sorted(z.namelist()):
  if name.endswith('/'):continue
  assert '..'not in Path(name).parts and not name.startswith(('/','\\')),'Unsafe generated package path'
  assert not(name.startswith('META-INF/')and name.endswith(('.RSA','.DSA','.EC','.SF'))),'Old signature in unsigned package'
  item=zipfile.ZipInfo(name,date);item.compress_type=z.getinfo(name).compress_type;item.create_system=0;item.external_attr=0x20;output.writestr(item,z.read(name))
print('Unsigned APK created; SHA-256 '+hashlib.sha256(a.output.read_bytes()).hexdigest()+'. Use the separately released signed APK for ordinary installation/update.')
