"""Rebuild the bank-only V0.9 hotfix from checksum-pinned public V0.9 packages.

No live installation or experimental asset directory is read. The only game-data
changes are ObjectClass for Act 5 preset 154 in the two objpreset tables.
"""
from pathlib import Path
import argparse, hashlib, json, zipfile, urllib.request

ROOT = Path(__file__).resolve().parents[1]
SHA = lambda data: hashlib.sha256(data).hexdigest()
RELS = ['global/excel/objpreset.txt', 'global/excel/base/objpreset.txt']
PREFIX = 'D2RMM.mpq/data/'
NOTE = ('Alpha V0.9 Harrogath stash hotfix (0.9.1-alpha), October 12, 2026.\n'
        'Restores native Bank interaction for the moved Act V stash. The custom chest and position remain; '
        'Harrogath uses the standard Bank facing. Only two ObjectClass cells change in game data.\n'
        'No Azmodan or Alpha V1.0 content is included. Existing V0.9 gameplay and Sovereign Warden are unchanged.\n'
        'Close D2R and reinstall using the same mod folder and save path. Character saves are not modified.\n\n')

def patch_table(data):
    lines = data.decode('utf-8').splitlines(keepends=True)
    headers = lines[0].rstrip('\r\n').split('\t')
    act, index, cls = map(headers.index, ['Act', 'Index', 'ObjectClass'])
    count = 0
    for i, line in enumerate(lines[1:], 1):
        values = line.rstrip('\r\n').split('\t')
        if values[act] == '5' and values[index] == '154':
            assert values[cls] == 'D2PlusHarrogathBank'
            values[cls] = 'Bank'
            lines[i] = '\t'.join(values) + line[len(line.rstrip('\r\n')):]
            count += 1
    assert count == 1
    output = ''.join(lines).encode()
    # Exact byte substitution; no newline, whitespace, or other table edits.
    assert len(output) == len(data) - len('D2PlusHarrogath')
    return output

def patch_archive(source, destination, standalone):
    with zipfile.ZipFile(source) as old:
        changes = {}
        if standalone:
            folder = 'D2PLUS_Alpha_v09_Complete/'
            code = old.read(folder + 'mod.js').decode()
            start = code.index('const textFiles=') + len('const textFiles=')
            texts, end = json.JSONDecoder().raw_decode(code[start:])
            previous = dict(texts)
            for rel in RELS:
                texts[rel] = patch_table(texts[rel].encode()).decode()
            assert {k for k in texts if texts[k] != previous[k]} == set(RELS)
            changes[folder + 'mod.js'] = (code[:start] + json.dumps(texts, ensure_ascii=False, separators=(',', ':')) + code[start + end:]).encode()
            table_bytes = {rel: texts[rel].encode() for rel in RELS}
            meta = json.loads(old.read(folder + 'mod.json'))
            meta['version'] = '0.9.1-alpha'
            meta['name'] = 'D2PLUS - Alpha V0.9 Complete (Stash Hotfix)'
            meta['description'] += ' Includes the Harrogath stash interaction hotfix.'
            changes[folder + 'mod.json'] = (json.dumps(meta, indent=2) + '\n').encode()
        else:
            folder = ''
            table_bytes = {rel: patch_table(old.read(PREFIX + rel)) for rel in RELS}
            changes.update({PREFIX + rel: data for rel, data in table_bytes.items()})
        manifest_path = folder + 'INSTALL_MANIFEST.json'
        manifest = json.loads(old.read(manifest_path))
        manifest['version'] = '0.9.1-alpha'
        manifest['hotfix'] = 'Act V preset 154 restored to native Bank identity in both objpreset tables.'
        for entry in manifest['files']:
            rel = entry['path'].removeprefix(PREFIX)
            if rel in table_bytes:
                entry.update(size=len(table_bytes[rel]), sha256=SHA(table_bytes[rel]))
        changes[manifest_path] = (json.dumps(manifest, indent=2) + '\n').encode()
        changes[folder + 'README_INSTALL.txt'] = NOTE.encode() + old.read(folder + 'README_INSTALL.txt')
        with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as new:
            for entry in old.infolist():
                data = changes.get(entry.filename, old.read(entry.filename))
                entry._compresslevel = 6
                new.writestr(entry, data)
    # All file bytes outside this allowlist must match the published release.
    with zipfile.ZipFile(source) as old, zipfile.ZipFile(destination) as new:
        assert old.namelist() == new.namelist()
        changed = [name for name in old.namelist() if old.read(name) != new.read(name)]
        assert set(changed) == set(changes)
        assert not any('azmodan' in name.lower() or 'azmodon' in name.lower() for name in new.namelist())
        assert new.testzip() is None
    return changed

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input-dir', type=Path)
    parser.add_argument('--record', action='store_true', help='Record new checksums during release preparation only.')
    args = parser.parse_args()
    baseline = json.loads((ROOT / 'release-inputs/stash-hotfix-baseline.json').read_text())
    destination = ROOT / 'dist'; destination.mkdir(exist_ok=True)
    cache = args.input_dir or ROOT / 'build-cache/stash-hotfix'; cache.mkdir(parents=True, exist_ok=True)
    outputs, reports = [], []
    for item in baseline['files']:
        source = cache / item['name']
        if not source.exists():
            urllib.request.urlretrieve(f"https://github.com/{baseline['repository']}/releases/download/{baseline['tag']}/{item['name']}", source)
        data = source.read_bytes()
        assert len(data) == item['size'] and SHA(data) == item['sha256'], 'Published baseline checksum mismatch'
        name = item['name'].replace('AlphaV0.9_', 'AlphaV0.9.1_')
        target = destination / name
        changed = patch_archive(source, target, 'Complete_D2RMM' in name)
        outputs.append({'name': name, 'size': target.stat().st_size, 'sha256': SHA(target.read_bytes())})
        reports.append({'archive': name, 'changedEntries': changed, 'allOtherEntriesIdenticalToV09': True})
        print('Built and verified', name, flush=True)
    manifest = {'repository': baseline['repository'], 'tag': 'v0.9.1-alpha', 'files': outputs}
    expected = ROOT / 'release-inputs/alpha-v09.json'
    if args.record:
        expected.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    else:
        assert json.loads(expected.read_text()) == manifest, 'Hotfix archive checksum mismatch'
    (destination / 'STASH-HOTFIX-VALIDATION.json').write_text(json.dumps({'onlyGameplayChanges': RELS, 'changedCells': 2, 'archives': reports, 'inGameRetestPassed': False}, indent=2) + '\n')

if __name__ == '__main__':
    main()
