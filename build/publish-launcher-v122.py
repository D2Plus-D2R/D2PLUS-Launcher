"""Replace only the two launcher downloads and their checksums in V1.2.2."""
from pathlib import Path
import importlib.util,json,os,urllib.parse
R=Path(__file__).resolve().parents[1];D=R/'dist'
spec=importlib.util.spec_from_file_location('api',R/'build/release-api-v12.py');a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
release=a.api(a.BASE+'/releases/tags/v1.2.2-alpha');assert not release['draft']
original={x['name']:x for x in release['assets']}
names=['D2PLUS_Launcher_Portable_1.2.2-alpha.zip','D2PLUS_Launcher_Setup_1.2.2-alpha.exe']
assert all(n in original for n in names+['SHA256SUMS-1.2.2.txt'])
run=os.environ['GITHUB_RUN_ID'];pending={}
def upload(p,name):
 with a.request(release['upload_url'].split('{')[0]+'?name='+urllib.parse.quote(name),'POST',p.read_bytes(),ctype='application/octet-stream') as response:item=json.load(response)
 assert item['state']=='uploaded' and item['size']==p.stat().st_size and item['digest']=='sha256:'+a.digest(p)
 return item
for name in names:pending[name]=upload(D/name,name+'.pending-'+run)
digests={n:x['digest'].removeprefix('sha256:') for n,x in original.items() if n!='SHA256SUMS-1.2.2.txt' and '.pending-' not in n and '.previous-' not in n}
for name in names:digests[name]=pending[name]['digest'].removeprefix('sha256:')
checks=D/'SHA256SUMS-1.2.2.txt';checks.write_text(''.join(digests[n]+'  '+n+'\n' for n in sorted(digests)),encoding='utf8')
pending[checks.name]=upload(checks,checks.name+'.pending-'+run)
# Upload and hash-verify every replacement before retiring the working downloads.
fresh={x['name']:x for x in a.api(a.BASE+'/releases/'+str(release['id']))['assets']}
for name in pending:assert fresh[name]['id']==original[name]['id'] and fresh[name]['digest']==original[name]['digest'],'Release changed during build'
for name,item in pending.items():
 old=original[name]
 a.api(a.BASE+'/releases/assets/'+str(old['id']),'PATCH',{'name':name+'.previous-'+run})
 try:a.api(a.BASE+'/releases/assets/'+str(item['id']),'PATCH',{'name':name})
 except:
  a.api(a.BASE+'/releases/assets/'+str(old['id']),'PATCH',{'name':name});raise
final={x['name']:x for x in a.api(a.BASE+'/releases/'+str(release['id']))['assets']}
for name,item in pending.items():assert final[name]['id']==item['id'] and final[name]['digest']==item['digest']
for name,item in original.items():
 if name not in pending:assert final[name]['id']==item['id'] and final[name]['digest']==item['digest'],'Non-launcher asset changed'
for name in pending:
 with a.request(a.BASE+'/releases/assets/'+str(original[name]['id']),'DELETE'):pass
note='\n\nLauncher refresh (October 24): restored the visible offline-map reroll toggle and restyled the save controls to match the launcher. Gameplay packages are unchanged.'
body=release['body'] or ''
if 'Launcher refresh (October 24)' not in body:a.api(a.BASE+'/releases/'+str(release['id']),'PATCH',{'body':body+note})
print('Updated only the V1.2.2 launcher downloads and checksum file.')
