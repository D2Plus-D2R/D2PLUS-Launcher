"""Publish only the new, verified AlphaV0.8.2 prerelease. Never replace older releases."""
from pathlib import Path
import urllib.request,urllib.error,urllib.parse,json,hashlib,os
R=Path(__file__).resolve().parents[1];D=R/'dist';repo=os.environ['GH_REPO'];commit=os.environ['GITHUB_SHA'];token=os.environ['GH_TOKEN']
assert repo=='D2Plus-D2R/D2PLUS-Launcher'
base='https://api.github.com/repos/'+repo;tag='v0.8.2-alpha'
def api(url,method='GET',payload=None,ctype='application/json'):
 data=json.dumps(payload).encode() if payload is not None and ctype=='application/json' else payload
 req=urllib.request.Request(url,data=data,method=method,headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','Content-Type':ctype,'User-Agent':'D2PLUS-release-builder','X-GitHub-Api-Version':'2022-11-28'})
 with urllib.request.urlopen(req,timeout=600) as response:return json.load(response)
try:release=api(base+'/releases/tags/'+tag)
except urllib.error.HTTPError as e:
 if e.code!=404:raise
 release=api(base+'/releases','POST',{'tag_name':tag,'target_commitish':commit,'name':'D2PLUS — AlphaV0.8.2','body':(R/'release-notes/v0.8.2-alpha.md').read_text(encoding='utf-8'),'draft':True,'prerelease':True})
assert release['draft'] and release['target_commitish']==commit,'Refusing to replace a public release or an unrelated draft'
files=sorted([*D.glob('*.zip'),*D.glob('*.exe'),*D.glob('*.apk'),D/'SHA256SUMS-0.8.2-alpha.txt'])
existing={a['name']:a for a in release['assets']}
for p in files:
 data=p.read_bytes();expected='sha256:'+hashlib.sha256(data).hexdigest()
 if p.name in existing:
  asset=existing[p.name];assert asset.get('digest')==expected and asset['size']==len(data),'Existing draft asset differs: '+p.name
 else:
  url=release['upload_url'].split('{')[0]+'?name='+urllib.parse.quote(p.name)
  asset=api(url,'POST',data,'application/octet-stream')
 assert asset['state']=='uploaded' and asset['size']==len(data) and asset.get('digest')==expected,p.name
 print('Uploaded and verified',p.name,flush=True)
release=api(base+'/releases/'+str(release['id']),'PATCH',{'draft':False,'prerelease':True,'make_latest':'false'})
assert not release['draft'] and release['prerelease']
print('Published',release['html_url'])
