"""Verify local release inputs or fetch the already-published v0.8 packages.
First build: python build/fetch-release-inputs.py --input-dir PATH
This script performs no upload or release mutation.
"""
from pathlib import Path
import argparse,json,hashlib,urllib.request,urllib.error,shutil
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--input-dir',type=Path);args=parser.parse_args()
manifest=json.loads((root/'release-inputs/alpha-v082.json').read_text())
dest=root/'dist';dest.mkdir(exist_ok=True)
for f in manifest['files']:
 path=dest/f['name'];source=(args.input_dir/f['name']) if args.input_dir else path
 if source.is_file():data=source.read_bytes()
 else:
  url=f"https://github.com/{manifest['repository']}/releases/download/{manifest['tag']}/{f['name']}"
  try:
   with urllib.request.urlopen(url) as response:data=response.read()
  except urllib.error.HTTPError as e:
   if e.code==404:raise SystemExit('Release input is not published. Supply the reviewed local packages with --input-dir. Missing: '+f['name'])
   raise
 if len(data)!=f['size'] or hashlib.sha256(data).hexdigest()!=f['sha256']:raise SystemExit('Release input checksum mismatch: '+f['name'])
 path.write_bytes(data);print('Verified',f['name'])
 if f['name'].endswith('_Installed_Snapshot.zip'):
  (root/'gameplay').mkdir(exist_ok=True);shutil.copyfile(path,root/'gameplay'/f['name'])
  (root/'gameplay/manifest.json').write_text(json.dumps(f,indent=2))
