"""Verify the complete V2.0b release, upload immutable assets, then publish."""
from pathlib import Path
import argparse, base64, hashlib, importlib.util, json, os, urllib.parse, urllib.request, zipfile

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist'
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--packs',type=Path,default=OUT/'update-packs')
p.add_argument('--verify-only',action='store_true')
a=p.parse_args()
def digest(file):
    with file.open('rb')as source:return hashlib.file_digest(source,'sha256').hexdigest()
validation=json.loads((OUT/'GAMEPLAY_VALIDATION.json').read_text(encoding='utf8'))
assert validation['version']=='2.0b' and validation['executedD2RMMInstallScript'] and validation['allOutputHashesMatch']
assert validation['validatedSnapshotFiles']==validation['validatedStandaloneFiles']==3124
assert validation['runtimeCrashFixConfirmed'] is False
game=json.loads((ROOT/'gameplay/release.json').read_text(encoding='utf8'))
assert game['tag']=='v2.0b-alpha'
files=[OUT/'D2PLUS_Launcher_Portable_2.0.2-alpha.zip',OUT/'D2PLUS_Launcher_Setup_2.0.2-alpha.exe',OUT/'GAMEPLAY_VALIDATION.json']
for row in game['files']:
    file=(ROOT/'gameplay' if 'Installed_Snapshot' in row['name'] else OUT)/row['name']
    assert file.stat().st_size==row['size'] and digest(file)==row['sha256'],row['name']
    files.append(file)
envelope=json.loads((ROOT/'updates/current.json').read_text(encoding='utf8'))
manifest=json.loads(base64.b64decode(envelope['payload']))
assert manifest['version']=='2.0.2-alpha' and manifest['generation']==1
assert (a.packs/'d2plus-update.json').read_bytes()==(ROOT/'updates/current.json').read_bytes()
packs={}
for row in manifest['files']:
    download=row.get('download')
    if not download:
        assert row.get('immutable');continue
    url=urllib.parse.urlparse(download['url'])
    assert url.scheme=='https' and url.hostname=='github.com'
    assert url.path.startswith('/D2Plus-D2R/D2PLUS-Launcher/releases/download/v2.0b-alpha/')
    name=url.path.rsplit('/',1)[1]
    assert name==download['packSHA256']+'.bin'
    value=(download['packSize'],download['packSHA256'])
    assert name not in packs or packs[name]==value
    packs[name]=value
for name,(size,sha)in packs.items():
    file=a.packs/name;assert file.stat().st_size==size and digest(file)==sha,name
    files.append(file)
files.append(a.packs/'d2plus-update.json')
with zipfile.ZipFile(OUT/'D2PLUS_AlphaV2.0b_Complete_D2RMM.zip')as complete:
    assert complete.read('CHANGELOG.txt')==(ROOT/'CHANGELOG-2.0.2-alpha.txt').read_bytes()
    assert complete.read('README_INSTALL.txt')==(ROOT/'release-notes/alpha-v20b-install.txt').read_bytes()
with zipfile.ZipFile(OUT/'D2PLUS_Launcher_Portable_2.0.2-alpha.zip')as portable:
    prefix='D2PLUS-Launcher/resources/app/'
    assert portable.read(prefix+'updates/current.json')==(ROOT/'updates/current.json').read_bytes()
    expected_app={row['path'] for row in manifest['files'] if row['area']=='launcher'}
    snapshot=json.loads(portable.read(prefix+'gameplay/manifest.json'))
    expected_app.update(['updates/current.json','updates/channel.json','LICENSE','THIRD_PARTY_NOTICES.md','gameplay/'+snapshot['name']])
    actual_app=[name.removeprefix(prefix)for name in portable.namelist()if name.startswith(prefix)and not name.endswith('/')]
    assert len(actual_app)==len(set(actual_app))and set(actual_app)==expected_app,'Unexpected launcher app payload'
    with portable.open(prefix+'gameplay/'+snapshot['name'])as source:
        assert hashlib.file_digest(source,'sha256').hexdigest()==snapshot['sha256'],'Bundled gameplay ZIP differs'
    assert portable.getinfo(prefix+'gameplay/'+snapshot['name']).file_size==snapshot['size']
    for row in manifest['files']:
        if row['area']!='launcher':continue
        with portable.open(prefix+row['path'])as source:actual=hashlib.file_digest(source,'sha256').hexdigest()
        assert actual==row['sha256'] and portable.getinfo(prefix+row['path']).file_size==row['size'],row['path']
assert len({f.name for f in files})==len(files)
for file in files:assert file.is_file() and 0<file.stat().st_size<2*1024**3,file
checks=OUT/'SHA256SUMS-2.0b.txt'
checks.write_text(''.join(digest(f)+'  '+f.name+'\n'for f in files),encoding='utf8',newline='\n')
files.append(checks)
print('Verified',len(files),'release assets and all signed launcher files.',flush=True)
if a.verify_only:raise SystemExit(0)
spec=importlib.util.spec_from_file_location('release_api',ROOT/'build/release-api-v12.py')
api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api)
body="""Alpha V2.0b brings a fresh complete D2RMM mod and a new Windows launcher.

- The Warden uses 75% less texture memory to ease loading pressure near encounters such as Andariel and Duriel. Testing on PCs that experienced crashes is still needed.
- Fixed the old installer size limit that could reject the complete mod.
- The new launcher can scan for missing or damaged files and download smaller updates. Automatic updates are on by default and can be switched off.
- Added checks before launch and reduced memory use when checking large downloads.
- Corrected missing animation information and timing for the custom Act III sorcerer.

Install the new launcher once to enable future updates. Close D2R and restart the launcher when an update is ready. Major launcher changes may occasionally need a new installer.

Choose the Windows installer, portable ZIP, or Complete D2RMM mod below. Update packs are support files and do not need to be downloaded by hand. For D2RMM, disable older complete D2PLUS bundles and keep your existing output folder and save path.

Your settings and characters stay in place. Gameplay balance is unchanged. The existing V2.0a Android companion remains compatible.

If a crash continues, please report your D2R version, difficulty, graphics settings and whether it happens during loading or after entering. Include a crash log with personal details removed.
"""
releases=api.api(api.BASE+'/releases?per_page=100')
release=next((r for r in releases if r['tag_name']=='v2.0b-alpha'),None)
if release is None:
    release=api.api(api.BASE+'/releases','POST',dict(tag_name='v2.0b-alpha',target_commitish=os.environ['GITHUB_SHA'],name='D2PLUS Alpha V2.0b — Smaller loads, easier updates',body=body,draft=True,prerelease=True))
assets={r['name']:r for r in release['assets']}
for file in files:
    expected='sha256:'+digest(file)
    if file.name in assets:asset=assets[file.name]
    else:
        assert release['draft'],'Never add to an already published release in place'
        url=release['upload_url'].split('{')[0]+'?name='+urllib.parse.quote(file.name)
        assert urllib.parse.urlparse(url).hostname=='uploads.github.com'
        with file.open('rb')as source:
            request=urllib.request.Request(url,data=source,method='POST',headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','Content-Type':'application/octet-stream','Content-Length':str(file.stat().st_size),'User-Agent':'D2PLUS-v20b-release'})
            with api.opener.open(request,timeout=600)as response:asset=json.load(response)
    assert asset['state']=='uploaded' and asset['size']==file.stat().st_size and asset.get('digest')==expected,file.name
    print('Verified remote asset:',file.name,flush=True)
remote=api.api(api.BASE+'/releases/'+str(release['id']))
assets={r['name']:r for r in remote['assets']}
for file in files:
    asset=assets[file.name]
    assert asset['state']=='uploaded' and asset['size']==file.stat().st_size and asset.get('digest')=='sha256:'+digest(file),file.name
if release['draft']:
    api.api(api.BASE+'/releases/'+str(release['id']),'PATCH',dict(draft=False,prerelease=True,body=body))
print('Published:',release['html_url'],flush=True)
