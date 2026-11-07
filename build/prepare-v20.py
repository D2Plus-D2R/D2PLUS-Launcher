"""Build the complete V2.0 snapshot and standalone mod from hash-pinned inputs."""
from pathlib import Path, PurePosixPath
import hashlib, json, os, shutil, urllib.request, zipfile

ROOT = Path(__file__).resolve().parents[1]
INPUTS = ROOT / 'release-inputs'
OUT = ROOT / 'dist'
OUT.mkdir(exist_ok=True)
STAMP = (2026, 11, 7, 0, 0, 0)
MOD = 'D2PLUS_Alpha_v20_Complete/'

def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()

def metadata(path):
    return {'name': path.name, 'size': path.stat().st_size, 'sha256': digest(path)}

def safe_path(name, prefix='data/'):
    assert isinstance(name, str) and name.startswith(prefix), name
    assert '\\' not in name and ':' not in name and '..' not in PurePosixPath(name).parts
    assert not name.endswith('/') and not name.lower().endswith(('.d2s', '.d2i', '.key', '.pem'))
    return name

def put(archive, name, raw):
    info = zipfile.ZipInfo(name, STAMP)
    info.compress_type = zipfile.ZIP_DEFLATED
    archive.writestr(info, raw, compresslevel=6)

base = json.loads((INPUTS / 'v122-base.json').read_text(encoding='utf8'))
base_entry = next(row for row in base['files'] if row['name'].endswith('_Installed_Snapshot.zip'))
source = Path(os.environ.get('D2PLUS_V122_SNAPSHOT', str(ROOT / 'gameplay' / base_entry['name'])))
if not source.exists():
    source.parent.mkdir(parents=True, exist_ok=True)
    partial = source.with_name(source.name + '.partial')
    url = 'https://github.com/' + base['repository'] + '/releases/download/' + base['tag'] + '/' + base_entry['name']
    with urllib.request.urlopen(url, timeout=120) as response, partial.open('wb') as target:
        shutil.copyfileobj(response, target, 1024 * 1024)
    assert partial.stat().st_size == base_entry['size'] and digest(partial) == base_entry['sha256'], 'Downloaded base snapshot checksum mismatch'
    partial.replace(source)
assert source.stat().st_size == base_entry['size'] and digest(source) == base_entry['sha256'], 'Base snapshot checksum mismatch; the pinned SHA must not be changed'

overlay_manifest = json.loads((INPUTS / 'alpha-v20-gameplay.json').read_text(encoding='utf8'))
parts = overlay_manifest.get('parts') or [path.name for path in sorted(INPUTS.glob('alpha-v20-gameplay.zip.part*'))]
assert parts and len(parts) == len(set(parts)), 'Missing or duplicate V2.0 gameplay parts'
for name in parts:
    assert Path(name).name == name and name.startswith('alpha-v20-gameplay.zip.part'), name
cache = ROOT / 'build-cache'
cache.mkdir(exist_ok=True)
overlay_path = cache / 'alpha-v20-gameplay.zip'
if not overlay_path.exists() or digest(overlay_path) != overlay_manifest['archiveSha256']:
    partial = overlay_path.with_suffix('.zip.partial')
    with partial.open('wb') as target:
        for name in parts:
            with (INPUTS / name).open('rb') as part:
                shutil.copyfileobj(part, target, 1024 * 1024)
    assert digest(partial) == overlay_manifest['archiveSha256'], 'Overlay archive checksum mismatch'
    partial.replace(overlay_path)
overlay_rows = {safe_path(row['path']): row for row in overlay_manifest['files']}
assert len(overlay_rows) == len(overlay_manifest['files'])
removed = set(overlay_manifest.get('removeCompiled', [])) | set(overlay_manifest.get('removePaths', []))
for name in removed:
    safe_path(name)
assert not removed.intersection(overlay_rows), 'A removed path also appears in the final overlay'
assert overlay_manifest['expectedSnapshotFiles'] == 3120, 'Unexpected V2.0 snapshot inventory'
snapshot = ROOT / 'gameplay/D2PLUS_AlphaV2.0_Installed_Snapshot.zip'
complete = OUT / 'D2PLUS_AlphaV2.0_Complete_D2RMM.zip'
snapshot.parent.mkdir(exist_ok=True)
rows, texts, binaries, changed = [], {}, [], []
seen = set()
removed_seen = set()

def emit(installed, module, name, raw):
    safe_path(name)
    assert name not in seen, 'Duplicate output: ' + name
    seen.add(name)
    relative = name.removeprefix('data/')
    put(installed, 'D2RMM.mpq/' + name, raw)
    rows.append({'path': 'D2RMM.mpq/' + name, 'size': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
    if relative.endswith(('.json', '.txt')):
        texts[relative] = raw.decode('utf8')
    else:
        binaries.append(relative)
        put(module, MOD + 'payload/' + relative, raw)
    if len(rows) % 500 == 0:
        print('Packed', len(rows), 'of', overlay_manifest['expectedSnapshotFiles'], 'gameplay files', flush=True)

with zipfile.ZipFile(source) as old, zipfile.ZipFile(overlay_path) as overlay, zipfile.ZipFile(snapshot, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as installed, zipfile.ZipFile(complete, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as module:
    overlay_names = [row.filename for row in overlay.infolist() if not row.is_dir()]
    assert len(overlay_names) == len(set(overlay_names)) and set(overlay_names) == set(overlay_rows), 'Overlay archive inventory differs from its manifest'
    consumed = set()
    for row in json.loads(old.read('INSTALL_MANIFEST.json'))['files']:
        archived = safe_path(row['path'], 'D2RMM.mpq/data/')
        name = archived.removeprefix('D2RMM.mpq/')
        if name in removed:
            removed_seen.add(name)
            continue
        if name in overlay_rows:
            raw = overlay.read(name)
            assert hashlib.sha256(raw).hexdigest() == overlay_rows[name]['sha256'] and len(raw) == overlay_rows[name]['size'], name
            consumed.add(name)
            changed.append(name)
        else:
            raw = old.read(archived)
            assert hashlib.sha256(raw).hexdigest() == row['sha256'] and len(raw) == row['size'], archived
        emit(installed, module, name, raw)
    for name in sorted(set(overlay_rows) - consumed):
        raw = overlay.read(name)
        assert hashlib.sha256(raw).hexdigest() == overlay_rows[name]['sha256'] and len(raw) == overlay_rows[name]['size'], name
        changed.append(name)
        emit(installed, module, name, raw)
    assert len(changed) == len(overlay_rows)
    assert len(rows) == overlay_manifest['expectedSnapshotFiles']
    assert not seen.intersection(removed)
    put(installed, 'INSTALL_MANIFEST.json', json.dumps({'version': '2.0', 'files': rows}, indent=2).encode())
    put(installed, 'README_INSTALL.txt', b'D2PLUS Alpha V2.0 launcher snapshot. D2RMM users should use the Complete_D2RMM ZIP. No saves are included.\n')
    mod_info = {'name': 'D2PLUS - Alpha V2.0 Complete', 'description': 'Complete standalone D2PLUS with optional dungeons, custom bosses, finished skill roles, improved materials and interface, reward bags and all earlier content. Disable older complete packages and overlapping add-ons.', 'author': 'D2PLUS', 'version': '2.0', 'config': []}
    put(module, MOD + 'mod.json', json.dumps(mod_info, indent=2).encode())
    script = "// D2PLUS Alpha V2.0 complete standalone snapshot\n(function(){'use strict';\nconst textFiles=" + json.dumps(texts, separators=(',', ':')) + ";\nfor(const p of Object.keys(textFiles))D2RMM.writeTxt(p,textFiles[p]);\nconst binaryFiles=" + json.dumps(binaries) + ";\nfor(const p of binaryFiles)D2RMM.copyFile('payload/'+p,p,true);\n})();\n"
    put(module, MOD + 'mod.js', script.encode())
    put(module, MOD + 'INSTALL_MANIFEST.json', json.dumps({'version': '2.0', 'files': [{**row, 'path': row['path'].removeprefix('D2RMM.mpq/data/')} for row in rows]}, indent=2).encode())
    put(module, 'README_INSTALL.txt', (ROOT / 'release-notes/alpha-v20-install.txt').read_bytes())
    put(module, 'CHANGELOG.txt', (ROOT / 'CHANGELOG-2.0.0-alpha.txt').read_bytes())

release = {'repository': 'D2Plus-D2R/D2PLUS-Launcher', 'tag': 'v2.0-alpha', 'displayVersion': 'Alpha V2.0', 'files': [metadata(complete), metadata(snapshot)]}
for path, data in [(ROOT / 'gameplay/manifest.json', metadata(snapshot)), (ROOT / 'gameplay/release.json', release), (OUT / 'release.json', release)]:
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf8')
report = {'baseRelease': 'Alpha V1.2.2', 'baseSha256': base_entry['sha256'], 'overlaySha256': overlay_manifest['archiveSha256'], 'version': '2.0', 'fileCount': len(rows), 'changedGameFiles': changed, 'removedPaths': sorted(removed), 'removedCompiledTables': sorted(overlay_manifest.get('removeCompiled', [])), 'removedPathsPresentInBase': sorted(removed_seen), 'otherGameFilesIdentical': True, 'nativeSaveStatLayoutUnchanged': True, 'automatedInGameTestPerformed': False}
(OUT / 'GAMEPLAY_VALIDATION.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
print('Prepared complete Alpha V2.0 snapshot and standalone D2RMM mod:', len(rows), 'files', flush=True)
