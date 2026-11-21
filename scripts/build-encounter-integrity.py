"""Build encounter fingerprints from a hash-authenticated gameplay archive.

The optional Warden overlay supplies an explicitly reviewed second coherent
asset profile. Never fingerprint unknown live files automatically at startup.
"""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--archive', type=Path, required=True)
p.add_argument('--warden-overlay', type=Path, required=True)
a = p.parse_args()
root = Path(__file__).resolve().parent.parent
release = json.loads((root / 'gameplay/manifest.json').read_text())
with a.archive.open('rb') as f:
    assert hashlib.file_digest(f, 'sha256').hexdigest() == release['sha256']
sha = lambda b: hashlib.sha256(b).hexdigest()
common_paths = {
    'data/hd/character/monsters.json', 'data/hd/model_lod_desc.bin',
    'data/global/excel/monstats.txt', 'data/global/excel/monstats2.txt',
    'data/global/excel/levels.txt', 'data/global/excel/lvlprest.txt',
    'data/global/excel/skills.txt',
}
profile_paths = {'data/hd/texture_desc_cache.json'} | {
    f'data/hd/character/enemy/sovereign_warden/textures/warden_{s}.texture'
    for s in ('alb', 'nrm', 'orm')
}
with zipfile.ZipFile(a.archive) as z:
    raw_manifest = z.read('INSTALL_MANIFEST.json')
    manifest = json.loads(raw_manifest)
    rows = {r['path'].removeprefix('D2RMM.mpq/'): r for r in manifest['files']}
    common_paths |= {
        name for name in rows
        if (name.startswith('data/hd/character/enemy/sovereign_warden/') or
            name == 'data/hd/character/enemy/sovereign_warden.json') and name not in profile_paths
    }
    common_paths |= {name for name in rows if name.startswith('data/hd/character/enemy/d2plus_rodin_sorcerer/') or name == 'data/hd/character/enemy/d2plus_act3_sorcerer.json'}
    def pinned(name):
        r = rows[name]
        return dict(path=name, size=r['size'], sha256=r['sha256'])
    common = [pinned(n) for n in sorted(common_paths)]
    legacy = [pinned(n) for n in sorted(profile_paths)]
    optimized = []
    for name in sorted(profile_paths):
        raw = (a.warden_overlay / name.removeprefix('data/')).read_bytes()
        optimized.append(dict(path=name, size=len(raw), sha256=sha(raw)))
    # Critical metadata must be covered by the archive manifest, not just present.
    assert len(common) >= 20
    profile_id = 'alpha-v' + manifest['version'].replace('.', '') + '-current'
    profiles = [dict(id=profile_id, files=legacy)]
    if optimized != legacy:
        profiles.append(dict(id=profile_id+'-warden-low-memory', files=optimized))
    result = dict(schemaVersion=1, gameplayVersion=manifest['version'],
                  archiveSHA256=release['sha256'], installManifestSHA256=sha(raw_manifest),
                  common=common, profiles=profiles)
    dest = root / 'gameplay/encounter-integrity.json'
    dest.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(dict(output=str(dest), commonFiles=len(common), profileFiles=len(legacy))))
