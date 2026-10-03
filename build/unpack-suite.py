from pathlib import Path
import zipfile,io,hashlib
root=Path(__file__).resolve().parents[1]
parts=sorted((root/'vendor').glob('offline-suite.zip.part*'))
data=b''.join(p.read_bytes() for p in parts)
if hashlib.sha256(data).hexdigest() != "9f789fcdf701d1da654c85995373a592640484823cdec6cf5833c20dc3dad758":
 raise SystemExit('Offline suite bundle missing or checksum mismatch')
with zipfile.ZipFile(io.BytesIO(data)) as z:
 for name in z.namelist():
  p=Path(name)
  if p.is_absolute() or '..' in p.parts or not name.startswith('docs/') or name.startswith('docs/launcher/'):
   raise SystemExit('Unexpected bundle path: '+name)
 z.extractall(root)
print('Bundled offline wiki/editor unpacked.')
