"""Render the same short guide for GitHub, the website and the offline launcher."""
from pathlib import Path
import html,re,shutil
R=Path(__file__).resolve().parents[1]
def inline(s):
 s=html.escape(s)
 s=re.sub(r'`([^`]+)`',r'<code>\1</code>',s)
 s=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',s)
 return re.sub(r'\[([^\]]+)\]\((https://[^)]+)\)',r'<a href="\2">\1</a>',s)
parts=[];items=False
for line in (R/'GETTING_STARTED.md').read_text(encoding='utf8').splitlines():
 if not line.strip():continue
 if not line.startswith('- ') and items:parts.append('</ul>');items=False
 if line.startswith('# '):parts.append('<h1>'+inline(line[2:])+'</h1>')
 elif line.startswith('## '):parts.append('<h2>'+inline(line[3:])+'</h2>')
 elif line.startswith('- '):
  if not items:parts.append('<ul>');items=True
  parts.append('<li>'+inline(line[2:])+'</li>')
 else:parts.append('<p>'+inline(line)+'</p>')
if items:parts.append('</ul>')
style='''body{margin:0;background:#101110 url("assets/dark-basalt.webp") repeat;color:#d6cbbb;font:17px/1.7 Georgia,serif}main{max-width:850px;margin:40px auto;padding:28px 38px;background:#101110ed;border:1px solid #806b43;box-shadow:0 8px 45px #000}nav{display:flex;gap:24px;flex-wrap:wrap;border-bottom:1px solid #55472e;padding-bottom:15px}a,h1,h2{color:#d9bc7b}h1{font-size:35px;line-height:1.25}h2{font-size:24px;margin-top:34px}code{overflow-wrap:anywhere;color:#e3d4b1;font-size:.88em}li{margin:9px 0}a:focus-visible{outline:2px solid #efcc77;outline-offset:4px}.eyebrow{font:12px Arial,sans-serif;letter-spacing:2px;color:#b3a58e;margin-top:28px}@media(max-width:650px){main{margin:10px;padding:20px}h1{font-size:29px}}'''
for offline,dest in [(False,R/'site/getting-started.html'),(True,R/'docs/launcher/getting-started.html')]:
 body='\n'.join(parts)
 if offline:body=body.replace('https://d2-plus.net/wiki/','/wiki/index.html').replace('https://d2-plus.net/accursed.html','/wiki/accursed.html')
 nav='<a href="/">Launcher</a><a href="/wiki/index.html">Offline Wiki</a>' if offline else '<a href="index.html">D2PLUS Home</a><a href="wiki/">Online Wiki</a><a href="https://github.com/D2Plus-D2R/D2PLUS-Launcher">GitHub</a>'
 dest.parent.mkdir(parents=True,exist_ok=True)
 dest.write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Getting Started · D2PLUS</title><meta name="description" content="Install D2PLUS, find and back up your saves, and learn the basics of charms, materials and Accursed rituals."><style>'+style+'</style></head><body><main><nav>'+nav+'</nav><p class="eyebrow">D2PLUS · ALPHA V1.3 LAUNCHER GUIDE</p>'+body+'</main></body></html>',encoding='utf8')
shutil.copy2(R/'site/assets/dark-basalt.webp',R/'docs/launcher/assets/dark-basalt.webp')
print('Getting Started guide rendered for web and launcher.')
