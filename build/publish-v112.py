"""Add verified 1.1.2 mod and Windows packages to the existing release."""
from pathlib import Path
import hashlib,json,os,urllib.request,urllib.parse
R=Path(__file__).resolve().parents[1];D=R/'dist'
repo=os.environ['GH_REPO'];assert repo=='D2Plus-D2R/D2PLUS-Launcher'
def api(url,method='GET',data=None,ctype='application/json'):
    request=urllib.request.Request(url,data=data,method=method,headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','Content-Type':ctype,'User-Agent':'D2PLUS-v112-release'})
    with urllib.request.urlopen(request,timeout=600) as response:return json.load(response)
base='https://api.github.com/repos/'+repo
release=api(base+'/releases/tags/v1.1.2-alpha')
assert not release['draft']
names=['D2PLUS_AlphaV1.1.2_Complete_D2RMM.zip','D2PLUS_Launcher_Portable_1.1.2-alpha.zip','D2PLUS_Launcher_Setup_1.1.2-alpha.exe','V1.1.2-VALIDATION.json']
files=[D/n for n in names]
assert all(p.is_file() for p in files)
checks=D/'SHA256SUMS-1.1.2-packages.txt'
checks.write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in files),encoding='utf-8')
files.append(checks)
existing={a['name']:a for a in release['assets']}
for p in files:
    data=p.read_bytes();digest='sha256:'+hashlib.sha256(data).hexdigest()
    if p.name in existing:
        asset=existing[p.name]
        assert asset.get('digest')==digest and asset['size']==len(data),'Existing asset differs; refusing overwrite: '+p.name
    else:
        asset=api(release['upload_url'].split('{')[0]+'?name='+urllib.parse.quote(p.name),'POST',data,'application/octet-stream')
    assert asset['state']=='uploaded' and asset['size']==len(data) and asset.get('digest')==digest,p.name
    print('Verified release asset:',p.name,flush=True)
note='''<!-- d2plus-v112-packages -->
### Corrected D2RMM package and launcher
The first upload was the installed working snapshot. The standalone D2RMM package is now available, along with the full 1.1.2 Windows launcher.

- **D2RMM users:** download `D2PLUS_AlphaV1.1.2_Complete_D2RMM.zip`, extract into D2RMM's `mods` folder, disable older D2PLUS bundles, enable this mod and click Install Mods.
- **Launcher users:** download the 1.1.2 installer or portable ZIP. Both include the working gameplay snapshot and the updated Accursed editor definitions.
- `D2PLUSAlphaV1.1.2.zip` is the original installed snapshot, not a D2RMM input mod.

Back up offline saves and close D2R before installing. Keep your existing output mod name.
'''
body=release.get('body') or ''
if '<!-- d2plus-v112-packages -->' not in body:
    api(base+'/releases/'+str(release['id']),'PATCH',json.dumps({'body':body+'\n\n'+note}).encode())
print(release['html_url'])
