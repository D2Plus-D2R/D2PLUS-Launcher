"""Restore the reviewed launcher bytes, including the public signed manifest."""
from pathlib import Path, PurePosixPath
import hashlib
import io
import json
import zipfile

ROOT=Path(__file__).resolve().parents[1]
m=json.loads((ROOT/'release-inputs/alpha-v20b-suite.json').read_text(encoding='utf8'))
assert m['version']=='2.0.2-alpha' and not m['privateKeysIncluded'] and not m['savesIncluded']
chunks=[]
for row in m['parts']:
    assert Path(row['name']).name==row['name'] and row['name'].startswith('alpha-v20b-suite.zip.part')
    raw=(ROOT/'release-inputs'/row['name']).read_bytes();assert len(raw)==row['size'] and hashlib.sha256(raw).hexdigest()==row['sha256'];chunks.append(raw)
raw=b''.join(chunks)
assert len(raw)==m['archiveBytes'] and hashlib.sha256(raw).hexdigest()==m['archiveSHA256']
rows={r['path']:r for r in m['files']};assert len(rows)==len(m['files'])
with zipfile.ZipFile(io.BytesIO(raw))as archive:
    assert len(archive.namelist())==len(rows) and set(archive.namelist())==set(rows)
    for name,row in rows.items():
        assert not name.startswith('/') and ':' not in name and '\\' not in name and '..' not in PurePosixPath(name).parts
        assert not name.lower().endswith(('.d2s','.d2i','.key','.pem','.keystore','.pfx','.p12'))
        data=archive.read(name);assert len(data)==row['size'] and hashlib.sha256(data).hexdigest()==row['sha256']
        target=ROOT/name;assert target.resolve().is_relative_to(ROOT.resolve())
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
print('Restored',len(rows),'reviewed launcher files; no private keys or saves.')
