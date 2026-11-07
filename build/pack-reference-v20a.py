"""Author the final pinned V2.0a reference suite after source acceptance."""
from pathlib import Path
import argparse, hashlib, json, zipfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source-ready', required=True, type=Path)
args = parser.parse_args()
source_bytes = args.source_ready.read_bytes()
source = json.loads(source_bytes.decode('utf8'))
assert source['status'] == 'SOURCE-READY' and source['checkedClassRows'] == 264 and source['checkedGuidePlans'] == 51
for relative, expected in source['files'].items():
    path = (ROOT / relative).resolve()
    assert path.is_relative_to(ROOT) and path.is_file(), relative
    assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, 'Accepted reference changed: ' + relative
wiki = json.loads((ROOT / 'docs/wiki/database.json').read_text(encoding='utf8'))
assert wiki['version'] == 'D2PLUS Alpha V2.0a' and wiki['patchNotes'][0]['version'] == 'Alpha V2.0a'
assert any(row.get('sourceKey') == 'd2cw_kharvul' and row['kind'] == 'Monster' for row in wiki['records'])
archive = ROOT / 'build-cache/alpha-v20a-suite.zip'
archive.parent.mkdir(exist_ok=True)
count = 0
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as output:
    for path in sorted((ROOT / 'docs').rglob('*')):
        if not path.is_file() or path.is_relative_to(ROOT / 'docs/launcher'):
            continue
        assert path.suffix.lower() not in ['.d2s', '.d2i', '.key', '.pem', '.log'], path.name
        name = path.relative_to(ROOT).as_posix()
        info = zipfile.ZipInfo(name, (2026, 11, 7, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        output.writestr(info, path.read_bytes(), compresslevel=6)
        count += 1
# Reject a mixed-stage suite even if another build changes docs during packing.
assert args.source_ready.read_bytes() == source_bytes, 'Source acceptance marker changed while packing'
with zipfile.ZipFile(archive) as accepted:
    names = accepted.namelist()
    assert len(names) == len(set(names))
    for relative, expected in source['files'].items():
        path = ROOT / relative
        assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, 'Accepted source changed while packing: ' + relative
        if relative.startswith('docs/'):
            with accepted.open(relative) as member:
                assert hashlib.file_digest(member, 'sha256').hexdigest() == expected, 'Packed source differs from acceptance: ' + relative
parts = []
with archive.open('rb') as full:
    for number in range(1000):
        block = full.read(40_000_000)
        if not block:
            break
        name = f'alpha-v20a-suite.zip.part{number:03d}'
        (ROOT / 'release-inputs' / name).write_bytes(block)
        parts.append(name)
    else:
        raise AssertionError('Unexpected reference suite size')
with archive.open('rb') as full:
    sha = hashlib.file_digest(full, 'sha256').hexdigest()
manifest = {'sha256': sha, 'parts': parts, 'version': 'Alpha V2.0a', 'bytes': archive.stat().st_size, 'files': count, 'sourceReadySha256': hashlib.sha256(source_bytes).hexdigest(), 'acceptedSourceMembersVerified': True, 'sourceUnchangedDuringPacking': True, 'classSkills': 264, 'guidePlans': 51, 'wikiRecords': len(wiki['records']), 'saveVersion': 105, 'launcherAssets': 'Tracked separately in docs/launcher'}
(ROOT / 'release-inputs/alpha-v20a-suite.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
print('Pinned V2.0a reference suite:', count, 'files;', archive.stat().st_size, 'bytes;', sha)
