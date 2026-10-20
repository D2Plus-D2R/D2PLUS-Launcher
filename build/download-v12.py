from pathlib import Path
import importlib.util,json
R=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('api',R/'build/release-api-v12.py');a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
release=a.release();assets={x['name']:x for x in release['assets']}
manifest=json.loads((R/'release-inputs/v12.json').read_text())
for f in manifest['files']:
 assert f['name'] in assets and assets[f['name']]['size']==f['size']
 if f['name'].endswith('_Installed_Snapshot.zip'):a.download(assets[f['name']],R/'gameplay'/f['name'],f['sha256'])
print('Verified release inputs; downloaded the pinned gameplay snapshot.')
