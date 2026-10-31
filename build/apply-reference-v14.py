"""Apply the verified Alpha V1.4 editor/wiki overlay after historical migrations."""
from pathlib import Path
import hashlib,io,json,shutil,zipfile
R=Path(__file__).resolve().parents[1]
m=json.loads((R/'release-inputs/alpha-v14-suite.json').read_text(encoding='utf8'))
raw=b''.join((R/'release-inputs'/n).read_bytes()for n in m['parts'])
assert hashlib.sha256(raw).hexdigest()==m['sha256']
with zipfile.ZipFile(io.BytesIO(raw))as z:
 for n in z.namelist():
  assert n.startswith('docs/')and'..'not in Path(n).parts and':'not in n and'\\'not in n
  p=R/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(z.read(n))
for folder in ['wiki','d2plus','img']:
 shutil.copytree(R/'docs'/folder,R/'_site'/folder,dirs_exist_ok=True)
for p in (R/'_site/wiki').glob('*.html'):
 s=p.read_text(encoding='utf8').replace('← Offline Wiki','← Online Wiki').replace('Offline Codex','Online Codex')
 s=s.replace('href="/launcher/index.html">Back to launcher','href="/">Back to D2PLUS')
 p.write_text(s,encoding='utf8')
d=json.loads((R/'docs/wiki/database.json').read_text(encoding='utf8'))
assert d['version']=='D2PLUS Alpha V1.4'and d['patchNotes'][0]['version']=='Alpha V1.4'
assert len({r['id']for r in d['records']})==len(d['records'])
assert json.loads((R/'docs/d2plus/v105_data.json').read_text(encoding='utf8'))['uniqueItems']['unique712']['code']=='dbh'
print('Alpha V1.4 editor and both wikis:',len(d['records']),'reference records; no private project data.')
