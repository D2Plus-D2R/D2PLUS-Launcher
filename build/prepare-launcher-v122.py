"""Refresh launcher reference data while keeping the published V1.2.2 gameplay bytes."""
from pathlib import Path
import importlib.util,json,subprocess,sys
R=Path(__file__).resolve().parents[1]
saved={n:(R/'gameplay'/n).read_bytes() for n in ['manifest.json','release.json']}
subprocess.run([sys.executable,str(R/'build/download-v12.py')],check=True)
subprocess.run([sys.executable,str(R/'build/prepare-v12.py')],check=True)
for name,data in saved.items():(R/'gameplay'/name).write_bytes(data)
meta=json.loads(saved['manifest.json'])
spec=importlib.util.spec_from_file_location('api',R/'build/release-api-v12.py');a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
release=a.api(a.BASE+'/releases/tags/v1.2.2-alpha')
asset=next(x for x in release['assets'] if x['name']==meta['name'])
assert asset['size']==meta['size']
a.download(asset,R/'gameplay'/meta['name'],meta['sha256'])
print('Bundling the unchanged, published Alpha V1.2.2 gameplay snapshot.')
