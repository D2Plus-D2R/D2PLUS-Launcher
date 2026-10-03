"""Repack edited offline assets; excludes launcher sources and local state."""
from pathlib import Path
import zipfile,io,hashlib,re
root=Path(__file__).resolve().parents[1];buf=io.BytesIO()
with zipfile.ZipFile(buf,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted((root/'docs').rglob('*')):
  if p.is_file() and not p.is_relative_to(root/'docs/launcher'):
   assert p.suffix not in ['.d2s','.d2i','.key']
   z.write(p,p.relative_to(root).as_posix())
data=buf.getvalue()
for p in (root/'vendor').glob('offline-suite.zip.part*'):p.unlink()
for i,start in enumerate(range(0,len(data),8*1024*1024),1):(root/f'vendor/offline-suite.zip.part{i:03}').write_bytes(data[start:start+8*1024*1024])
p=root/'build/unpack-suite.py';s=p.read_text();s=re.sub(r'"[a-f0-9]{64}"','"'+hashlib.sha256(data).hexdigest()+'"',s);p.write_text(s)
print('Bundled',len(data),'bytes')
