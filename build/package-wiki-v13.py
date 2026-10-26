"""Package the current standalone offline reference without saves or private projects."""
from pathlib import Path
import hashlib,json,re,zipfile
R=Path(__file__).resolve().parents[1];D=R/'dist';D.mkdir(exist_ok=True)
assert json.loads((R/'docs/wiki/database.json').read_text(encoding='utf8'))['version']=='D2PLUS Alpha V1.3'
p=D/'D2PLUS_Offline_Wiki_AlphaV1.3.zip'
with zipfile.ZipFile(p,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for folder in ['wiki','img','d2plus']:
        for src in sorted((R/'docs'/folder).rglob('*')):
            if not src.is_file():continue
            rel=src.relative_to(R).as_posix();raw=src.read_bytes()
            if src.suffix=='.html':
                s=raw.decode('utf8').replace('href="/"','href="https://d2-plus.net/"').replace('href="/launcher/index.html"','href="https://d2-plus.net/"')
                if src.name=='accursed.html':
                    s=re.sub(r'<section id="ritual-lab".*?</section>', '<section id="ritual-lab"><h2>Practice the ritual</h2><p>The interactive practice Cube is available in the Windows launcher or <a href="https://d2-plus.net/accursed.html#ritual-lab">online</a>. All recipe and bonus reference tables below work offline.</p></section>',s,flags=re.S)
                    s=s.replace('<link rel="stylesheet" href="../ritual-lab.css">','').replace('<script type="module" src="../ritual-lab.mjs"></script>','')
                raw=s.encode('utf8')
            info=zipfile.ZipInfo(rel,(2026,10,26,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
            z.writestr(info,raw,compresslevel=6)
    info=zipfile.ZipInfo('START_HERE.txt',(2026,10,26,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
    z.writestr(info,'D2PLUS Offline Wiki - Alpha V1.3\n\nExtract the whole ZIP, then open docs/wiki/index.html in your browser.\nNo server or installation is needed for the item, build, recipe and charm reference.\nThe interactive Accursed practice Cube is available in the launcher or online.\nFor character import/export, use the Hero Editor included in the Windows launcher.\nNo character saves are included.\n')
with zipfile.ZipFile(p) as z:assert z.testzip() is None
with p.open('rb') as f:sha=hashlib.file_digest(f,'sha256').hexdigest()
(D/'SHA256SUMS-WIKI-1.3.txt').write_text(sha+'  '+p.name+'\n',encoding='utf8')
print('Verified offline wiki:',p.name,p.stat().st_size,sha)
