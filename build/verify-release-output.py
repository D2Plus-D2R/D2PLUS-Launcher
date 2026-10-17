"""Execute the standalone mod and verify every emitted file against the snapshot."""
from pathlib import Path
import hashlib, json, subprocess, tempfile, zipfile
R=Path(__file__).resolve().parents[1]
M=json.loads((R/'release-inputs/alpha-v10.json').read_text())
with tempfile.TemporaryDirectory(prefix='d2plus-stash-check-') as temp:
    root=Path(temp)
    for item in M['files']:
        p=R/'dist'/item['name']
        with p.open('rb') as f:assert hashlib.file_digest(f,'sha256').hexdigest()==item['sha256']
        with zipfile.ZipFile(p) as z:
            if 'Complete' in item['name']:
                for n in z.namelist():
                    assert (root/n).resolve().is_relative_to(root.resolve())
                z.extractall(root)
            else:
                manifest=json.loads(z.read('INSTALL_MANIFEST.json'))
                expected={}
                for e in manifest['files']:
                    b=z.read(e['path'])
                    assert len(b)==e['size'] and hashlib.sha256(b).hexdigest()==e['sha256'],e['path']
                    if e['path'].startswith('D2RMM.mpq/data/'):
                        expected[e['path'].removeprefix('D2RMM.mpq/data/')]=e
                (root/'expected.json').write_text(json.dumps(expected))
    subprocess.run(['node',str(R/'test/stash-output.cjs'),str(root)],check=True)
