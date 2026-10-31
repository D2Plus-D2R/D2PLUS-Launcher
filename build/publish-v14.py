"""Publish verified V1.3 outputs using the workflow's repository token."""
from pathlib import Path
import importlib.util,json,os,urllib.parse
R=Path(__file__).resolve().parents[1];D=R/'dist'
spec=importlib.util.spec_from_file_location('api',R/'build/release-api-v12.py');a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
tag='v1.4-alpha';releases=a.api(a.BASE+'/releases?per_page=100')
release=next((r for r in releases if r['tag_name']==tag),None)
if release is None:release=a.api(a.BASE+'/releases','POST',{'tag_name':tag,'target_commitish':os.environ['GITHUB_SHA'],'name':'D2PLUS Alpha V1.4 — Happy Halloween!','body':(R/'CHANGELOG-1.4.0-alpha.txt').read_text(),'draft':True,'prerelease':True})
assets={x['name']:x for x in release['assets']}
files=[D/'D2PLUS_Launcher_Portable_1.4.0-alpha.zip',D/'D2PLUS_Launcher_Setup_1.4.0-alpha.exe',D/'D2PLUS_AlphaV1.4_Complete_D2RMM.zip',R/'gameplay/D2PLUS_AlphaV1.4_Installed_Snapshot.zip',D/'GAMEPLAY_VALIDATION.json',D/'release.json',D/'D2PLUS_Offline_Wiki_AlphaV1.4.zip',D/'SHA256SUMS-WIKI-1.4.txt']
checks=D/'SHA256SUMS-1.4.txt';checks.write_text(''.join(a.digest(p)+'  '+p.name+'\n' for p in files));files.append(checks)
for p in files:
 digest='sha256:'+a.digest(p)
 if p.name in assets:
  asset=assets[p.name];assert asset.get('digest')==digest and asset['size']==p.stat().st_size,'Existing release asset differs: '+p.name
 else:
  with a.request(release['upload_url'].split('{')[0]+'?name='+urllib.parse.quote(p.name),'POST',p.read_bytes(),ctype='application/octet-stream') as response:asset=json.load(response)
 assert asset['state']=='uploaded' and asset.get('digest')==digest and asset['size']==p.stat().st_size
 print('Verified release asset:',p.name,flush=True)
a.api(a.BASE+'/releases/'+str(release['id']),'PATCH',{'draft':False,'prerelease':True,'body':(R/'CHANGELOG-1.4.0-alpha.txt').read_text()})
print('Published:',release['html_url'])
