"""Materialize hash-verified gameplay release inputs staged through GitHub blobs.
Once published, release assets are the durable source; staged blobs bootstrap the
first build without adding installed game data to the source repository tree.
"""
from pathlib import Path
import json,hashlib,base64,os,urllib.request,urllib.error
root=Path(__file__).resolve().parents[1];manifest=json.loads((root/'release-inputs/alpha-v05.json').read_text());dest=root/'dist';dest.mkdir(exist_ok=True)
repo=manifest['repository'];token=os.environ.get('GH_TOKEN','')
for f in manifest['files']:
 path=dest/f['name']
 if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest()==f['sha256']:continue
 url=f"https://github.com/{repo}/releases/download/{manifest['tag']}/{f['name']}"
 try:
  with urllib.request.urlopen(url) as response:data=response.read()
 except urllib.error.HTTPError as e:
  if e.code!=404:raise
  chunks=[]
  for blob in f['blobs']:
   request=urllib.request.Request(f"https://api.github.com/repos/{repo}/git/blobs/{blob['sha']}",headers={'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,'User-Agent':'D2PLUS-release-builder'})
   with urllib.request.urlopen(request) as response:result=json.load(response)
   assert result['sha']==blob['sha'] and result['encoding']=='base64'
   part=base64.b64decode(result['content']);assert len(part)==blob['size'];chunks.append(part)
  data=b''.join(chunks)
 assert len(data)==f['size'] and hashlib.sha256(data).hexdigest()==f['sha256'],f['name']
 path.write_bytes(data);print('Verified',f['name'])
