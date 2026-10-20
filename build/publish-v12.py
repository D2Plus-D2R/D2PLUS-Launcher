from pathlib import Path
import importlib.util,json,subprocess,urllib.parse
R=Path(__file__).resolve().parents[1];D=R/'dist'
spec=importlib.util.spec_from_file_location('api',R/'build/release-api-v12.py');a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
release=a.release();assets={x['name']:x for x in release['assets']}
inputs=json.loads((R/'release-inputs/v12.json').read_text())
for row in inputs['files']:
 assert assets[row['name']]['size']==row['size'] and assets[row['name']].get('digest')=='sha256:'+row['sha256']
files=[D/'D2PLUS_Launcher_Portable_1.2.0-alpha.zip',D/'D2PLUS_Launcher_Setup_1.2.0-alpha.exe']
assert all(p.is_file() for p in files)
report={'version':'1.2.0-alpha','gameplayFiles':2409,'snapshotSha256':inputs['files'][1]['sha256'],'launcherTestsPassed':True,'uiTestsPassed':True,'sourceGameplayUserConfirmed':True,'rebuiltLauncherInGameTested':False}
(D/'V1.2-LAUNCHER-VALIDATION.json').write_text(json.dumps(report,indent=2)+'\n');files.append(D/'V1.2-LAUNCHER-VALIDATION.json')
checks=D/'SHA256SUMS-1.2-launcher.txt';checks.write_text(''.join(a.digest(p)+'  '+p.name+'\n' for p in files));files.append(checks)
for p in files:
 digest='sha256:'+a.digest(p)
 if p.name in assets:
  asset=assets[p.name];assert asset.get('digest')==digest and asset['size']==p.stat().st_size,'Existing asset differs: '+p.name
 else:
  with a.request(release['upload_url'].split('{')[0]+'?name='+urllib.parse.quote(p.name),'POST',p.read_bytes(),ctype='application/octet-stream') as response:asset=json.load(response)
 assert asset['state']=='uploaded' and asset.get('digest')==digest and asset['size']==p.stat().st_size
 print('Verified release asset:',p.name,flush=True)
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip()
a.api(a.BASE+'/releases/'+str(release['id']),'PATCH',{'tag_name':'v1.2-alpha','target_commitish':head,'draft':False,'prerelease':True})
print('Published:',release['html_url'])
