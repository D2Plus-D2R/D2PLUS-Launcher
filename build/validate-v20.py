"""Validate all V2.0 archive bytes and execute its standalone D2RMM installer."""
from pathlib import Path, PurePosixPath
import hashlib, json, subprocess, tempfile, zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist'
MOD = 'D2PLUS_Alpha_v20_Complete/'
expected_count = json.loads((ROOT / 'release-inputs/alpha-v20-gameplay.json').read_text(encoding='utf8'))['expectedSnapshotFiles']
assert expected_count == 3120

def checked(name):
    assert name and not name.startswith('/') and '..' not in PurePosixPath(name).parts and '\\' not in name and ':' not in name, name
    assert not name.lower().endswith(('.d2s', '.d2i', '.key', '.pem')), name
    return name

def bytes_hash(archive, name):
    with archive.open(name) as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()

snapshot_path = ROOT / 'gameplay/D2PLUS_AlphaV2.0_Installed_Snapshot.zip'
complete_path = OUT / 'D2PLUS_AlphaV2.0_Complete_D2RMM.zip'
with zipfile.ZipFile(snapshot_path) as snapshot, zipfile.ZipFile(complete_path) as complete, tempfile.TemporaryDirectory(prefix='d2plus-v20-check-', dir=OUT) as temp:
    for archive in [snapshot, complete]:
        names = [checked(row.filename) for row in archive.infolist() if not row.is_dir()]
        assert len(names) == len(set(names)), 'Duplicate archive entry'
    snapshot_manifest = json.loads(snapshot.read('INSTALL_MANIFEST.json'))
    module_manifest = json.loads(complete.read(MOD + 'INSTALL_MANIFEST.json'))
    assert snapshot_manifest['version'] == module_manifest['version'] == '2.0'
    assert json.loads(complete.read(MOD + 'mod.json'))['version'] == '2.0'
    expected = {checked(row['path']): row for row in module_manifest['files']}
    assert len(expected) == len(module_manifest['files']) == expected_count
    by_snapshot = {row['path'].removeprefix('D2RMM.mpq/data/'): {**row, 'path': row['path'].removeprefix('D2RMM.mpq/data/')} for row in snapshot_manifest['files']}
    assert by_snapshot == expected, 'Snapshot and standalone output manifests differ'
    assert set(snapshot.namelist()) == {'D2RMM.mpq/data/' + name for name in expected} | {'INSTALL_MANIFEST.json', 'README_INSTALL.txt'}
    for name, row in expected.items():
        source = 'D2RMM.mpq/data/' + name
        assert snapshot.getinfo(source).file_size == row['size'] and bytes_hash(snapshot, source) == row['sha256'], source
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
assert.equal(seen.size,3120);assert.equal(seen.size,Object.keys(data.expected).length);
console.log('D2RMM install script verified: '+seen.size+' exact SHA-256 file outputs.');
""", encoding='utf8')
    subprocess.run(['node', str(temporary / 'check.cjs')], check=True)

report = OUT / 'GAMEPLAY_VALIDATION.json'
data = json.loads(report.read_text(encoding='utf8'))
data.update(executedD2RMMInstallScript=True, allOutputHashesMatch=True, validatedSnapshotFiles=expected_count, validatedStandaloneFiles=expected_count, archiveInventoriesExact=True)
report.write_text(json.dumps(data, indent=2) + '\n', encoding='utf8')
print('V2.0 full snapshot, standalone payload and mock install match:', expected_count, 'files.')
