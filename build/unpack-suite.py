from pathlib import Path
import zipfile,io,hashlib
root=Path(__file__).resolve().parents[1]
parts=sorted((root/'vendor').glob('offline-suite.zip.part*'))
data=b''.join(p.read_bytes() for p in parts)
if hashlib.sha256(data).hexdigest() != "276e35d69a0adc8a2210c4430a5ca170ccda594576bc49152d4cef862e6c1a81":
 raise SystemExit('Offline suite bundle missing or checksum mismatch')
with zipfile.ZipFile(io.BytesIO(data)) as z:
 for name in z.namelist():
  p=Path(name)
  if p.is_absolute() or '..' in p.parts or not name.startswith('docs/') or name.startswith('docs/launcher/'):
   raise SystemExit('Unexpected bundle path: '+name)
 z.extractall(root)
print('Bundled offline wiki/editor unpacked.')
