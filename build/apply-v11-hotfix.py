"""Build Hotfix 1 from pinned public V1.1 ZIPs and a small reviewed payload.

No installed game or save files are read. --validate-only checks the complete
patch against both baselines without writing either large output archive.
"""
from pathlib import Path, PurePosixPath
import argparse, hashlib, json, shutil, urllib.request, zipfile

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'D2RMM.mpq/data/'
FOLDER = 'D2PLUS_Alpha_v11_Complete/'
STAMP = (2026, 10, 17, 0, 0, 0)

def digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def sha(data):
    return hashlib.sha256(data).hexdigest()

def json_bytes(value):
    return (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode('utf-8')

def safe_rel(value):
    p = PurePosixPath(value)
    assert value and not p.is_absolute() and '..' not in p.parts and '\\' not in value and ':' not in value, value
    return value

def load_payload(path):
    spec = json.loads(path.read_text(encoding='utf-8-sig'))
    assert spec['schemaVersion'] == 1 and spec['version'] == '1.1.1-alpha'
    assert spec['tag'] == 'v1.1.1-alpha'
    files = {}
    for item in spec['files']:
        rel = safe_rel(item['path']); source = path.parent / safe_rel(item['source'])
        data = source.read_bytes()
        assert len(data) == item['size'] and sha(data) == item['sha256'], rel
        assert rel not in files, 'Duplicate payload: ' + rel
        files[rel] = data
    removed = {safe_rel(item['path']): item for item in spec.get('removed', [])}
    assert len(removed) == len(spec.get('removed', [])) and not files.keys() & removed.keys()
    return spec, files, removed

def prepare_changes(old, standalone, spec, files, removed):
    changes, omitted = {}, set()
    folder = FOLDER if standalone else ''
    manifest_path = folder + 'INSTALL_MANIFEST.json'
    manifest = json.loads(old.read(manifest_path))
    index = {e['path'].removeprefix(PREFIX): e for e in manifest['files']}
    expected = {e['path']: e for e in spec['files']} | removed
    for rel, item in expected.items():
        assert rel in index and index[rel]['sha256'] == item['baselineSha256'], 'Baseline entry mismatch: ' + rel
    if standalone:
        code = old.read(FOLDER + 'mod.js').decode('utf-8')
        start = code.index('const textFiles=') + len('const textFiles=')
        texts, end = json.JSONDecoder().raw_decode(code[start:])
        for rel, item in expected.items():
            original = texts[rel].encode('utf-8') if rel in texts else old.read(FOLDER + 'payload/' + rel)
            assert sha(original) == item['baselineSha256'], rel
        for rel, data in files.items():
            if rel in texts:
                texts[rel] = data.decode('utf-8')
            else:
                changes[FOLDER + 'payload/' + rel] = data
        for rel in removed:
            if rel in texts:
                del texts[rel]
            else:
                omitted.add(FOLDER + 'payload/' + rel)
        changes[FOLDER + 'mod.js'] = (code[:start] + json.dumps(texts, ensure_ascii=False, separators=(',', ':')) + code[start + end:]).encode('utf-8')
        meta = json.loads(old.read(FOLDER + 'mod.json'))
        meta.update(version=spec['version'], name='D2PLUS - Alpha V1.1 Complete (Hotfix 1)')
        meta['description'] += ' Hotfix 1 corrects Accursed localization and character-selection artwork.'
        changes[FOLDER + 'mod.json'] = json_bytes(meta)
    else:
        for rel, item in expected.items():
            assert sha(old.read(PREFIX + rel)) == item['baselineSha256'], rel
        changes.update({PREFIX + rel: data for rel, data in files.items()})
        omitted.update(PREFIX + rel for rel in removed)
    manifest['version'] = spec['version']
    manifest['hotfix'] = spec['note']
    manifest['files'] = [e for e in manifest['files'] if e['path'].removeprefix(PREFIX) not in removed]
    for entry in manifest['files']:
        rel = entry['path'].removeprefix(PREFIX)
        if rel in files:
            entry.update(size=len(files[rel]), sha256=sha(files[rel]))
    changes[manifest_path] = json_bytes(manifest)
    readme = folder + 'README_INSTALL.txt'
    note = (spec['displayVersion'] + ' (' + spec['version'] + ')\n' + spec['note'] + '\nClose D2R and reinstall using the same mod folder and save path. Character saves are not modified.\n\n')
    changes[readme] = note.encode('utf-8') + old.read(readme)
    assert set(changes) <= set(old.namelist())
    return changes, omitted

def patch_archive(source, destination, standalone, spec, files, removed, validate_only=False):
    assert source.resolve() != destination.resolve(), 'Input and output archive must differ'
    with zipfile.ZipFile(source) as old:
        changes, omitted = prepare_changes(old, standalone, spec, files, removed)
        if not validate_only:
            with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as new:
                for name in sorted(set(old.namelist()) - omitted):
                    safe_rel(name.rstrip('/'))
                    entry = zipfile.ZipInfo(name, STAMP); entry.compress_type = zipfile.ZIP_DEFLATED
                    entry.create_system = 3; entry.external_attr = (0o40755 if name.endswith('/') else 0o100644) << 16
                    entry._compresslevel = 6
                    if name in changes:
                        new.writestr(entry, changes[name])
                    else:
                        with old.open(name) as src, new.open(entry, 'w') as dst:
                            shutil.copyfileobj(src, dst, 1024 * 1024)
            with zipfile.ZipFile(destination) as new:
                assert new.testzip() is None
                assert set(new.namelist()) == set(old.namelist()) - omitted
                for name in changes:
                    assert new.read(name) == changes[name], name
    return {'archive': destination.name, 'changedEntries': sorted(changes), 'removedEntries': sorted(omitted)}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input-dir', type=Path)
    parser.add_argument('--payload', type=Path, default=ROOT / 'release-inputs/v11-hotfix/manifest.json')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'dist')
    parser.add_argument('--validate-only', action='store_true')
    args = parser.parse_args()
    spec, files, removed = load_payload(args.payload)
    baseline = json.loads((ROOT / 'release-inputs/v11-hotfix-baseline.json').read_text())
    cache = args.input_dir or ROOT / 'build-cache/v11-hotfix-baseline'
    cache.mkdir(parents=True, exist_ok=True); args.output_dir.mkdir(parents=True, exist_ok=True)
    outputs, reports = [], []
    for item in baseline['files']:
        source = cache / item['name']
        if not source.exists():
            assert not args.input_dir, 'Missing local baseline: ' + str(source)
            urllib.request.urlretrieve(f"https://github.com/{baseline['repository']}/releases/download/{baseline['tag']}/{item['name']}", source)
        assert source.stat().st_size == item['size'] and digest(source) == item['sha256'], 'Published baseline checksum mismatch'
        destination = args.output_dir / item['name']
        reports.append(patch_archive(source, destination, 'Complete_D2RMM' in item['name'], spec, files, removed, args.validate_only))
        if not args.validate_only:
            outputs.append({'name': destination.name, 'size': destination.stat().st_size, 'sha256': digest(destination)})
        print('Validated' if args.validate_only else 'Built and verified', item['name'], flush=True)
    report = {'version': spec['version'], 'gameplayChanges': sorted(files), 'gameplayRemovals': sorted(removed), 'archives': reports}
    if not args.validate_only:
        release = {'repository': baseline['repository'], 'tag': spec['tag'], 'displayVersion': spec['displayVersion'], 'files': outputs}
        (ROOT / 'release-inputs/alpha-v11-hotfix.json').write_bytes(json_bytes(release))
        (ROOT / 'gameplay/release.json').write_bytes(json_bytes(release))
        snapshot = next(f for f in outputs if 'Installed_Snapshot' in f['name'])
        shutil.copyfile(args.output_dir / snapshot['name'], ROOT / 'gameplay' / snapshot['name'])
        (ROOT / 'gameplay/manifest.json').write_bytes(json_bytes(snapshot))
        (args.output_dir / 'HOTFIX1-VALIDATION.json').write_bytes(json_bytes(report))
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
