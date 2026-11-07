"""Verify all V2.0a artifacts, upload idempotently, then publish the draft."""
from pathlib import Path
import argparse, hashlib, importlib.util, json, os, shutil, subprocess, sys, urllib.parse, urllib.request, zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist'
INPUTS = ROOT / 'release-inputs'
parser = argparse.ArgumentParser()
parser.add_argument('--verify-only', action='store_true', help='Reconstruct and verify signed Android artifacts without a GitHub request')
parser.add_argument('--android-tools', type=Path, help='Android build-tools directory for independent signature/alignment checks')
parser.add_argument('--java', default='java', help='Java executable used by the Android verifier')
args = parser.parse_args()
OUT.mkdir(exist_ok=True)

def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()

def local(relative, parent=ROOT):
    assert isinstance(relative, str) and '\\' not in relative and ':' not in relative
    path = (parent / relative).resolve()
    assert path.is_relative_to(parent.resolve()) and path != parent.resolve(), relative
    return path

android = json.loads((INPUTS / 'alpha-v20a-android.json').read_text(encoding='utf8'))
assert android['version'] == 'Alpha V2.0a'
required_android = {'D2PLUS_Companion_AlphaV2.0a.apk', 'D2PLUS_Android_AlphaV2.0a_Update_Kit.zip'}
assert {row['name'] for row in android['assets']} == required_android and len(android['assets']) == 2
android_files = []
for row in android['assets']:
    assert Path(row['name']).name == row['name'] and row['parts'] and len(row['parts']) == len(set(row['parts']))
    target = OUT / row['name']
    if not target.exists() or target.stat().st_size != row['size'] or digest(target) != row['sha256']:
        partial = target.with_name(target.name + '.partial')
        with partial.open('wb') as combined:
            for name in row['parts']:
                with local(name, INPUTS).open('rb') as part:
                    shutil.copyfileobj(part, combined, 1024 * 1024)
        assert partial.stat().st_size == row['size'] and digest(partial) == row['sha256'], row['name']
        partial.replace(target)
    assert target.stat().st_size == row['size'] and digest(target) == row['sha256'], 'Pinned Android artifact differs: ' + row['name']
    android_files.append(target)
bindings = {}
for key in ['verification', 'contentManifest', 'reproducibility']:
    binding = android[key]
    path = local(binding['path'])
    assert digest(path) == binding['sha256'], 'Android verification binding mismatch: ' + key
    bindings[key] = path
receipt = json.loads(bindings['verification'].read_text(encoding='utf8'))
apk = next(row for row in android['assets'] if row['name'].endswith('.apk'))
assert receipt['file'] == apk['name'] and receipt['bytes'] == apk['size'] and receipt['sha256'] == apk['sha256']
assert receipt['certificateSha256'] == '18b9f6fea79926265b70e61cd2ea4e5fb5382d3236cc5c3fa2208b85531c6144'
assert receipt['signatureVerified'] is True and receipt['alignmentVerified'] is True and set(receipt['schemes']) >= {'v2', 'v3'}
assert receipt['package'] == 'com.d2plus.companion' and receipt['versionCode'] == 201 and receipt['versionName'] == '2.0.1-alpha'
assert receipt['minSdk'] == 26 and receipt['targetSdk'] == 35
assert receipt['referenceFileManifestSha256'] == android['contentManifest']['sha256']
assert receipt['sourceVersion'] == 'D2PLUS Alpha V2.0a' and receipt['nativeReferenceProfile'] == 'alpha-v2.0a'
suite = json.loads((INPUTS / 'alpha-v20a-suite.json').read_text(encoding='utf8'))
assert suite['version'] == 'Alpha V2.0a' and suite['classSkills'] == 264 and suite['guidePlans'] == 51 and suite['saveVersion'] == 105
assert receipt['sourceReadySHA256'] == suite['sourceReadySha256'], 'Android and the reference suite have different source acceptance receipts'
content = json.loads(bindings['contentManifest'].read_text(encoding='utf8'))
for entry in content['files']:
    current = local(entry['path'], ROOT / 'docs')
    assert current.is_file() and current.stat().st_size == entry['bytes'] and digest(current) == entry['sha256'], 'Android reference is stale against the final suite: ' + entry['path']
rebuild = json.loads(bindings['reproducibility'].read_text(encoding='utf8'))
kit = next(row for row in android['assets'] if row['name'].endswith('.zip'))
assert rebuild['kitFile'] == kit['name'] and rebuild['kitSHA256'] == kit['sha256']
assert rebuild['byteIdentical'] is True and rebuild['allZipEntryBytesIdentical'] is True and rebuild['noSigningMaterialInKit'] is True
assert rebuild['unsignedCanonicalExpectedSHA256'] == rebuild['unsignedRebuiltSHA256']
tools = args.android_tools
if not tools:
    sdk = os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT')
    if sdk and (Path(sdk) / 'build-tools/35.0.0').is_dir():
        tools = Path(sdk) / 'build-tools/35.0.0'
assert not os.environ.get('GITHUB_ACTIONS') or tools, 'CI requires Android build-tools for independent signature verification'
if tools:
    subprocess.run([sys.executable, str(ROOT / 'build/verify-android-v20a.py'), '--apk', str(OUT / apk['name']), '--tools', str(tools), '--java', args.java, '--content-manifest', str(bindings['contentManifest'])], check=True)
print('Pinned Android package, signing identity, version and content receipt verified.', flush=True)
if args.verify_only:
    raise SystemExit(0)

validation = json.loads((OUT / 'GAMEPLAY_VALIDATION.json').read_text(encoding='utf8'))
assert validation['fileCount'] == validation['validatedSnapshotFiles'] == validation['validatedStandaloneFiles'] == 3124
assert validation['executedD2RMMInstallScript'] is True and validation['allOutputHashesMatch'] is True and validation['archiveInventoriesExact'] is True
assert validation['rewardBagValidation']['allForwardReferencesResolved'] is True
assert validation['rewardBagValidation']['allRowValuesPreserved'] is True
assert validation['rewardBagValidation']['nativeTCsha256'] == '3e70fc4b23b9de49e0b523e56f217a1e4508698e0d1ee1181ed85d2882c2a670'
assert validation['referenceSourcesMatchSnapshot'] is True
release_manifest = json.loads((OUT / 'release.json').read_text(encoding='utf8'))
assert release_manifest['tag'] == 'v2.0a-alpha' and release_manifest['displayVersion'] == 'Alpha V2.0a'
assert release_manifest == json.loads((ROOT / 'gameplay/release.json').read_text(encoding='utf8'))
native = json.loads((ROOT / 'docs/d2plus/v105_data.json').read_text(encoding='utf8'))
reference = json.loads((INPUTS / 'reference-v20a-report.json').read_text(encoding='utf8'))
assert native['info']['d2plus']['profile'] == 'alpha-v2.0a'
assert native['info']['d2plus']['referenceSourceHashes'] == reference['sourceHashes']
assert reference['sourceHashes']['global/excel/treasureclassex.txt'] == '3e70fc4b23b9de49e0b523e56f217a1e4508698e0d1ee1181ed85d2882c2a670'
with zipfile.ZipFile(ROOT / 'gameplay/D2PLUS_AlphaV2.0a_Installed_Snapshot.zip') as packaged:
    entries = json.loads(packaged.read('INSTALL_MANIFEST.json'))['files']
    by_source = {row['path'].removeprefix('D2RMM.mpq/data/'): row for row in entries}
    assert len(by_source) == len(entries) == 3124
    for relative, checksum in reference['sourceHashes'].items():
        assert by_source[relative]['sha256'] == checksum, 'Native source binding differs: ' + relative
assert digest(ROOT / 'site/assets/d2plus-alpha-v20a-splash.png') == 'a76d5ff7b45d28a35764677291d73c509456e30738aee198d6c3f01e15201d61'
files = [OUT / 'D2PLUS_Launcher_Portable_2.0.1-alpha.zip', OUT / 'D2PLUS_Launcher_Setup_2.0.1-alpha.exe', OUT / 'D2PLUS_AlphaV2.0a_Complete_D2RMM.zip', ROOT / 'gameplay/D2PLUS_AlphaV2.0a_Installed_Snapshot.zip', OUT / 'GAMEPLAY_VALIDATION.json', OUT / 'release.json', OUT / 'D2PLUS_Offline_Wiki_AlphaV2.0a.zip', OUT / 'SHA256SUMS-WIKI-2.0a.txt'] + android_files + [bindings['verification'], bindings['contentManifest'], bindings['reproducibility']]
assert len({path.name for path in files}) == len(files), 'Release asset filename collision'
for path in files:
    assert path.is_file() and 0 < path.stat().st_size < 2 * 1024 ** 3, 'Missing, empty or oversized GitHub asset: ' + path.name
for row in release_manifest['files']:
    path = next(path for path in files if path.name == row['name'])
    assert path.stat().st_size == row['size'] and digest(path) == row['sha256'], row['name']
body = (ROOT / 'CHANGELOG-2.0.1-alpha.txt').read_text(encoding='utf8')
assert 'Alpha V2.0a' in body and len(body.strip()) > 1000, 'Missing complete plain-English release notes'
with zipfile.ZipFile(OUT / 'D2PLUS_AlphaV2.0a_Complete_D2RMM.zip') as complete:
    assert complete.read('CHANGELOG.txt') == (ROOT / 'CHANGELOG-2.0.1-alpha.txt').read_bytes(), 'Standalone release notes are stale; rebuild the package'
    assert complete.read('README_INSTALL.txt') == (ROOT / 'release-notes/alpha-v20a-install.txt').read_bytes(), 'Standalone installation guide is stale'
checks = OUT / 'SHA256SUMS-2.0a.txt'
checks.write_text(''.join(digest(path) + '  ' + path.name + '\n' for path in files), encoding='utf8')
files.append(checks)

# Retain the existing scoped API helper and signing/credential pattern.
spec = importlib.util.spec_from_file_location('release_api', ROOT / 'build/release-api-v12.py')
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)
tag = 'v2.0a-alpha'
releases = api.api(api.BASE + '/releases?per_page=100')
release = next((row for row in releases if row['tag_name'] == tag), None)
if release is None:
    release = api.api(api.BASE + '/releases', 'POST', {'tag_name': tag, 'target_commitish': os.environ['GITHUB_SHA'], 'name': 'D2PLUS Alpha V2.0a — Reward bags roll again', 'body': body, 'draft': True, 'prerelease': True})
assets = {row['name']: row for row in release['assets']}
for path in files:
    expected_digest = 'sha256:' + digest(path)
    if path.name in assets:
        asset = assets[path.name]
        assert asset.get('digest') == expected_digest and asset['size'] == path.stat().st_size, 'Existing release asset differs; never overwrite: ' + path.name
    else:
        url = release['upload_url'].split('{')[0] + '?name=' + urllib.parse.quote(path.name)
        assert urllib.parse.urlparse(url).hostname == 'uploads.github.com'
        with path.open('rb') as source:
            request = urllib.request.Request(url, data=source, method='POST', headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'], 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/octet-stream', 'Content-Length': str(path.stat().st_size), 'User-Agent': 'D2PLUS-v20a-release'})
            with api.opener.open(request, timeout=600) as response:
                asset = json.load(response)
    assert asset['state'] == 'uploaded' and asset.get('digest') == expected_digest and asset['size'] == path.stat().st_size, path.name
    print('Verified release asset:', path.name, flush=True)

# Re-fetch before removing draft status; every required asset must match remotely.
remote = api.api(api.BASE + '/releases/' + str(release['id']))
remote_assets = {row['name']: row for row in remote['assets']}
for path in files:
    asset = remote_assets[path.name]
    assert asset['state'] == 'uploaded' and asset['size'] == path.stat().st_size and asset.get('digest') == 'sha256:' + digest(path), path.name
api.api(api.BASE + '/releases/' + str(release['id']), 'PATCH', {'draft': False, 'prerelease': True, 'body': body})
print('Published:', release['html_url'], flush=True)
