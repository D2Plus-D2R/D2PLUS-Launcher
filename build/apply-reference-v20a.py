"""Apply the hash-pinned V2.0a reference after every historical overlay."""
from pathlib import Path
import hashlib, io, json, re, shutil, zipfile

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'release-inputs/alpha-v20a-suite.json').read_text(encoding='utf8'))
assert manifest['acceptedSourceMembersVerified'] is True and manifest['sourceUnchangedDuringPacking'] is True
assert manifest['parts'] and len(set(manifest['parts'])) == len(manifest['parts'])
for name in manifest['parts']:
    assert Path(name).name == name and re.fullmatch(r'alpha-v20a-suite\.zip\.part\d{3}', name)
raw = b''.join((ROOT / 'release-inputs' / name).read_bytes() for name in manifest['parts'])
assert hashlib.sha256(raw).hexdigest() == manifest['sha256'], 'V2.0a reference checksum mismatch'
with zipfile.ZipFile(io.BytesIO(raw)) as archive:
    assert archive.testzip() is None
    for member in archive.infolist():
        name = member.filename
        assert name.startswith('docs/') and '..' not in Path(name).parts and ':' not in name and '\\' not in name
        assert not name.lower().endswith(('.d2s', '.d2i', '.key', '.pem'))
        assert not name.startswith('docs/launcher/'), 'Launcher assets have a separate release owner'
        if member.is_dir():
            continue
        target = ROOT / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(archive.read(member))
data = json.loads((ROOT / 'docs/wiki/database.json').read_text(encoding='utf8'))
assert data['version'] == 'D2PLUS Alpha V2.0a'
assert data['patchNotes'][0]['version'] == 'Alpha V2.0a'
assert len({row['id'] for row in data['records']}) == len(data['records'])
native = json.loads((ROOT / 'docs/d2plus/v105_data.json').read_text(encoding='utf8'))
assert native['info']['d2plus']['profile'] == 'alpha-v2.0a'
assert native['uniqueItems']['unique712']['code'] == 'dbh'
for folder in ['wiki', 'd2plus', 'img', 'mobile']:
    shutil.copytree(ROOT / 'docs' / folder, ROOT / '_site' / folder, dirs_exist_ok=True)
for name in ['ritual-lab.css', 'ritual-lab.mjs', 'ritual-lab-model.mjs', 'ritual-lab-catalog.json', 'ritual-lab-rules.json', 'ritual-lab-pools.json']:
    shutil.copy2(ROOT / 'docs' / name, ROOT / '_site' / name)
for page in (ROOT / '_site/wiki').glob('*.html'):
    text = page.read_text(encoding='utf8').replace('← Offline Wiki', '← Online Wiki').replace('Offline Codex', 'Online Codex')
    page.write_text(text.replace('href="/launcher/index.html">Back to launcher', 'href="/">Back to D2PLUS'), encoding='utf8')
print('Alpha V2.0a final reference:', len(data['records']), 'records; save format remains 105.')
