"""Recreate exact release ZIPs from the public baseline and staged delta blobs.
After release publication, fetch-release-inputs.py downloads the complete assets instead.
"""
from pathlib import Path
import json,zipfile,hashlib,urllib.request,urllib.error,os,base64,sys
ROOT=Path(__file__).resolve().parents[1];M=json.loads((ROOT/'release-inputs/alpha-v08-reconstruction.json').read_text());cache=ROOT/'build-cache';cache.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()

def fetch_published():
 manifest=json.loads((ROOT/'release-inputs/alpha-v08.json').read_text());dest=ROOT/'dist';dest.mkdir(exist_ok=True)
 for f in manifest['files']:
  url=f"https://github.com/{manifest['repository']}/releases/download/{manifest['tag']}/{f['name']}"
  try:
   with urllib.request.urlopen(url) as r:data=r.read()
  except urllib.error.HTTPError as e:
   if e.code==404:return False
   raise
  assert len(data)==f['size'] and sha(data)==f['sha256'],f['name']
  (dest/f['name']).write_bytes(data)
 return True
def reconstruct(baseline,delta,dest):
 assert sha(Path(baseline).read_bytes())==M['baseline']['sha256']
 assert sha(Path(delta).read_bytes())==M['delta']['sha256']
 dest=Path(dest);dest.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(baseline) as b,zipfile.ZipFile(delta) as d:
  for a in M['archives']:
   output=dest/a['name']
   with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for e in a['entries']:
     data=b.read(e['baseline']) if 'baseline' in e else d.read(e['delta'])
     assert sha(data)==e['sha256']
     i=zipfile.ZipInfo(e['name'],tuple(e['date']));i.compress_type=e['compress'];i.create_system=e['createSystem'];i.external_attr=e['externalAttr'];i.internal_attr=e['internalAttr'];i._compresslevel=6
     if e['name'].startswith('D2RMM.mpq/') or a['name'].endswith('Complete_D2RMM.zip'):
      with z.open(i,'w') as stream:
       for offset in range(0,len(data),8192):stream.write(data[offset:offset+8192])
     else:z.writestr(i,data)
   assert sha(output.read_bytes())==a['sha256'],a['name']
   print('Reconstructed and verified',a['name'])
if __name__=='__main__':
 if len(sys.argv)==4:reconstruct(*sys.argv[1:])
 else:
  if fetch_published():
   print('Fetched verified published gameplay packages.');sys.exit(0)
  baseline=cache/'baseline-v07.zip';delta=cache/'gameplay-v08-delta.zip'
  if not baseline.exists() or sha(baseline.read_bytes())!=M['baseline']['sha256']:urllib.request.urlretrieve(M['baseline']['url'],baseline)
  if not delta.exists() or sha(delta.read_bytes())!=M['delta']['sha256']:
   parts=[]
   for blob in M['delta']['blobs']:
    req=urllib.request.Request('https://api.github.com/repos/D2Plus-D2R/D2PLUS-Launcher/git/blobs/'+blob['sha'],headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','User-Agent':'D2PLUS-release-builder'})
    with urllib.request.urlopen(req) as r:v=json.load(r)
    part=base64.b64decode(v['content']);assert len(part)==blob['size'];parts.append(part)
   data=b''.join(parts);assert len(data)==M['delta']['size'] and sha(data)==M['delta']['sha256'];delta.write_bytes(data)
  reconstruct(baseline,delta,ROOT/'dist')
