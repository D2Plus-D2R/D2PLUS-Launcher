"""Validate all V2.0a archive bytes and execute its standalone D2RMM installer."""
from pathlib import Path, PurePosixPath
import csv, hashlib, io, json, subprocess, tempfile, zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist'
MOD = 'D2PLUS_Alpha_v20a_Complete/'
expected_count = json.loads((ROOT / 'release-inputs/alpha-v20a-gameplay.json').read_text(encoding='utf8'))['expectedSnapshotFiles']
assert expected_count == 3124

def checked(name):
    assert name and not name.startswith('/') and '..' not in PurePosixPath(name).parts and '\\' not in name and ':' not in name, name
    assert not name.lower().endswith(('.d2s', '.d2i', '.key', '.pem')), name
    return name

def bytes_hash(archive, name):
    with archive.open(name) as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()

BAG_SELECTORS = ['D2Bag Roll 0', 'D2Bag Roll 1', 'D2Bag Roll 2', 'D2RB NM Roll', 'D2RB Hell Roll']
TC_AFTER = '3e70fc4b23b9de49e0b523e56f217a1e4508698e0d1ee1181ed85d2882c2a670'
TC_BEFORE = 'd4bc26991065a730af13033ddec2779fe334f01e8d012b7a5a8c4638ef0b28fa'


def verify_native_reference(snapshot, expected):
    native = json.loads((ROOT / 'docs/d2plus/v105_data.json').read_text(encoding='utf8'))
    report = json.loads((ROOT / 'release-inputs/reference-v20a-report.json').read_text(encoding='utf8'))
    fingerprints = native['info']['d2plus']['referenceSourceHashes']
    assert native['info']['d2plus']['profile'] == 'alpha-v2.0a'
    assert native['info']['d2plus']['saveVersion'] == report['saveFormat'] == 105
    assert report['sourceHashes'] == fingerprints and report['checkedGuidePlans'] == 51
    assert fingerprints['global/excel/treasureclassex.txt'] == TC_AFTER
    for relative, checksum in fingerprints.items():
        assert checked(relative) == relative and relative in expected
        assert expected[relative]['sha256'] == checksum, 'Reference source differs from snapshot: ' + relative
    raw = snapshot.read('D2RMM.mpq/data/global/excel/treasureclassex.txt')
    assert hashlib.sha256(raw).hexdigest() == TC_AFTER
    rows = list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig')), delimiter='\t'))
    positions = {row['Treasure Class']: index for index, row in enumerate(rows)}
    assert len(rows) == len(positions) == 1909
    assert positions['D2PLUS_Bag_Empty1'] == 1490
    assert not any(row.get('Item' + str(slot)) for row in rows if row['Treasure Class'] == 'D2PLUS_Bag_Empty1' for slot in range(1, 11))
    forward = []
    for row in rows:
        for slot in range(1, 11):
            child = row.get('Item' + str(slot))
            if child in positions and positions[child] >= positions[row['Treasure Class']]:
                forward.append((row['Treasure Class'], child))
    assert not forward, 'Unresolved or recursive treasure-class link: ' + repr(forward)
    for name in BAG_SELECTORS:
        row = rows[positions[name]]
        assert (row['Picks'], row['NoDrop'], row['Prob1'], row['Item2'], row['Prob2']) == ('1', '0', '1', 'D2PLUS_Bag_Empty1', '9')
        assert row['Item1'] in ['dbn', 'dbm', 'dbh']
        assert not any(row.get('Item' + str(slot)) for slot in range(3, 11))
        assert positions['D2PLUS_Bag_Empty1'] < positions[name]
    # Reverse only the reviewed row move; exact old bytes prove all values retained.
    lines = raw.splitlines(keepends=True)
    empty = lines.pop(1491)
    lines.insert(1810, empty)
    assert hashlib.sha256(b''.join(lines)).hexdigest() == TC_BEFORE
    return {'referenceSourcesMatchSnapshot': True, 'referenceSourceFilesVerified': len(fingerprints),
            'rewardBagValidation': {'nativeTCsha256': TC_AFTER, 'rowCount': len(rows),
                'allForwardReferencesResolved': True, 'allRowValuesPreserved': True,
                'selectorCount': len(BAG_SELECTORS), 'bagWeight': 1, 'missWeight': 9,
                'baseProbability': '1/10', 'offlinePlayers1Through8': ['1/10'] * 8,
                'nativeRuntimeTestPerformed': False}}


snapshot_path = ROOT / 'gameplay/D2PLUS_AlphaV2.0a_Installed_Snapshot.zip'
complete_path = OUT / 'D2PLUS_AlphaV2.0a_Complete_D2RMM.zip'
with zipfile.ZipFile(snapshot_path) as snapshot, zipfile.ZipFile(complete_path) as complete, tempfile.TemporaryDirectory(prefix='d2plus-v20a-check-', dir=OUT) as temp:
    for archive in [snapshot, complete]:
        names = [checked(row.filename) for row in archive.infolist() if not row.is_dir()]
        assert len(names) == len(set(names)), 'Duplicate archive entry'
    snapshot_manifest = json.loads(snapshot.read('INSTALL_MANIFEST.json'))
    module_manifest = json.loads(complete.read(MOD + 'INSTALL_MANIFEST.json'))
    assert snapshot_manifest['version'] == module_manifest['version'] == '2.0a'
    assert json.loads(complete.read(MOD + 'mod.json'))['version'] == '2.0a'
    expected = {checked(row['path']): row for row in module_manifest['files']}
    assert len(expected) == len(module_manifest['files']) == expected_count
    by_snapshot = {row['path'].removeprefix('D2RMM.mpq/data/'): {**row, 'path': row['path'].removeprefix('D2RMM.mpq/data/')} for row in snapshot_manifest['files']}
    assert by_snapshot == expected, 'Snapshot and standalone output manifests differ'
    assert set(snapshot.namelist()) == {'D2RMM.mpq/data/' + name for name in expected} | {'INSTALL_MANIFEST.json', 'README_INSTALL.txt'}
    for name, row in expected.items():
        source = 'D2RMM.mpq/data/' + name
        assert snapshot.getinfo(source).file_size == row['size'] and bytes_hash(snapshot, source) == row['sha256'], source
    native_checks = verify_native_reference(snapshot, expected)
    binaries = {}
    for member in complete.infolist():
        if not member.filename.startswith(MOD + 'payload/'):
            continue
        name = checked(member.filename.removeprefix(MOD + 'payload/'))
        assert name in expected and not name.endswith(('.json', '.txt')), name
        actual = {'size': member.file_size, 'sha256': bytes_hash(complete, member.filename)}
        assert actual == {key: expected[name][key] for key in actual}, name
        binaries[name] = actual
    assert len(binaries) == sum(not name.endswith(('.json', '.txt')) for name in expected)
    allowed = {MOD + 'payload/' + name for name in binaries} | {MOD + name for name in ['mod.js', 'mod.json', 'INSTALL_MANIFEST.json']} | {'README_INSTALL.txt', 'CHANGELOG.txt'}
    assert set(complete.namelist()) == allowed, 'Unexpected standalone package member'
    temporary = Path(temp)
    (temporary / 'mod.js').write_bytes(complete.read(MOD + 'mod.js'))
    (temporary / 'data.json').write_text(json.dumps({'expected': expected, 'binaries': binaries}), encoding='utf8')
    (temporary / 'check.cjs').write_text("""
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const data=JSON.parse(fs.readFileSync(__dirname+'/data.json','utf8')),seen=new Set();
function verify(p,row){assert(!p.startsWith('/')&&!p.includes('..')&&!p.includes('\\\\')&&!p.includes(':'));assert(!seen.has(p),'Duplicate: '+p);seen.add(p);assert(data.expected[p],p);assert.equal(row.size,data.expected[p].size,p);assert.equal(row.sha256,data.expected[p].sha256,p);}
vm.runInNewContext(fs.readFileSync(__dirname+'/mod.js','utf8'),{D2RMM:{
 writeTxt(p,s){assert(p.endsWith('.txt')||p.endsWith('.json'));const b=Buffer.from(s,'utf8');verify(p,{size:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});},
 copyFile(src,dst,overwrite){assert.equal(src,'payload/'+dst);assert.equal(overwrite,true);assert(data.binaries[dst],dst);verify(dst,data.binaries[dst]);}
}},{timeout:30000});
assert.equal(seen.size,3124);assert.equal(seen.size,Object.keys(data.expected).length);
console.log('D2RMM install script verified: '+seen.size+' exact SHA-256 file outputs.');
""", encoding='utf8')
    subprocess.run(['node', str(temporary / 'check.cjs')], check=True)

report = OUT / 'GAMEPLAY_VALIDATION.json'
data = json.loads(report.read_text(encoding='utf8'))
data.update(executedD2RMMInstallScript=True, allOutputHashesMatch=True, validatedSnapshotFiles=expected_count, validatedStandaloneFiles=expected_count, archiveInventoriesExact=True, **native_checks)
report.write_text(json.dumps(data, indent=2) + '\n', encoding='utf8')
print('V2.0a full snapshot, standalone payload and mock install match:', expected_count, 'files.')
