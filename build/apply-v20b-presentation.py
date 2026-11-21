"""Apply V2.0b presentation after historical reference restoration.

Underlying item/skill/editor records retain their source identities and values.
The V2.0a Android/wiki downloads are intentionally retained as compatible tools.
"""
from pathlib import Path
import json
import re
import shutil

ROOT=Path(__file__).resolve().parents[1]
assert json.loads((ROOT/'package.json').read_text(encoding='utf-8'))['version']=='2.0.2-alpha'
news='<article class="updates"><div class="update-title"><h2><span>✦</span> Fixes. Easier updates.</h2><small>Launcher Alpha V2.0b<br>Wiki Alpha V2.0b</small></div><ul><li>75% smaller Warden texture payload.</li><li>Full installer fixed. File scans and smaller updates.</li><li><a href="/wiki/alpha-v20b.html" target="d2plus-wiki">Alpha V2.0b fixes and update guide</a></li></ul></article>'
page=ROOT/'docs/launcher/index.html';text=page.read_text(encoding='utf-8')
if 'id="fileUpdates"' not in text:
    card='<article id="fileUpdates"><h3>File scan &amp; automatic updates</h3><p>Check your installed launcher and game files. Updates download needed files and keep a rollback copy. Settings and characters stay where they are.</p><label class="toggle"><input id="automaticUpdates" type="checkbox">Automatically check and download updates</label><div class="actions"><button id="scanFiles">Scan files</button><button id="checkUpdates">Check &amp; update</button><button id="restartUpdate" hidden>Restart to apply</button><button id="discardUpdate" hidden>Discard staged update</button></div><p id="updateStatus" role="status" aria-live="polite">Ready to check your installation.</p><progress id="updateProgress" hidden></progress><ul id="updateFindings"></ul><p class="fine">Verified updates apply when the launcher restarts and D2R is closed.</p></article>'
    text,count=re.subn(r'(<article><h3>Install D2PLUS Alpha V2\.0[ab]</h3>)',lambda m:card+m.group(1),text,count=1)
    assert count==1,'Launcher update panel insertion point changed'
text=text.replace('Alpha V2.0a','Alpha V2.0b').replace('ALPHA V2.0a','ALPHA V2.0b').replace('D2PLUS_Alpha_v20a_Complete','D2PLUS_Alpha_v20b_Complete').replace('/launcher/assets/splash-v20a.png','/launcher/assets/splash-v20b.png')
text,count=re.subn(r'<article class="updates">.*?</article>',lambda _:news,text,count=1,flags=re.S)
assert count==1;page.write_text(text,encoding='utf-8',newline='\n')
for folder in ['docs/launcher']:
    app=ROOT/folder/'app.js';text=app.read_text(encoding='utf-8');text=re.sub(r"VERSION='2\.0\.[12]-alpha'","VERSION='2.0.2-alpha'",text);app.write_text(text.replace('Alpha V2.0a','Alpha V2.0b'),encoding='utf-8',newline='\n')
note=dict(id='alpha-v20b',version='Alpha V2.0b',date='November 21, 2026',status='Released alpha',title='Smaller loads and easier updates',summary='Lower memory use, installation fixes and smaller updates through the new launcher.',sections=[
    dict(title='Less memory needed',bullets=['The Warden uses 75% less texture memory. This should ease loading pressure, but crash prevention still needs testing on affected PCs.']),
    dict(title='Installation and updates',bullets=['Fixed the old size limit that could reject the complete mod.','The new launcher can scan for missing or damaged files and download needed updates. Close D2R and restart the launcher to apply them.','Backup copies are kept. Your settings, characters and gameplay balance stay in place.']),
    dict(title='Animation fix',bullets=['Added missing animation information for the custom Act III sorcerer and corrected its animation timing.'])])

db=ROOT/'docs/wiki/database.json';data=json.loads(db.read_text(encoding='utf-8'));data['version']='D2PLUS Alpha V2.0b';data['patchNotes']=[note]+[n for n in data['patchNotes']if n.get('id')!='alpha-v20b']
db.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8',newline='\n')
(ROOT/'docs/wiki/data.js').write_text('window.D2PLUS_DATA = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8',newline='\n')
index=ROOT/'docs/wiki/index.html';text=index.read_text(encoding='utf-8').replace('href="#alpha-v20a"','href="alpha-v20b.html"').replace(' data-route="alpha-v20a"','').replace('Alpha V2.0a','Alpha V2.0b');
for asset in ['data.js','app.js','styles.css']:
    text=re.sub(r'('+re.escape(asset)+r')(?:\?v=[^\"]*)?\"',lambda m:m.group(1)+'?v=2.0b-20261121\"',text)
index.write_text(text,encoding='utf-8',newline='\n')
article=(ROOT/'site/news-alpha-v20b.html').read_text(encoding='utf-8')
offline=article.replace('href="guide.css"','href="../guide.css"').replace('href="index.html"','href="index.html"').replace('href="download.html"','href="../launcher/index.html"').replace('href="wiki/"','href="index.html"').replace('href="news-alpha-v20a.html"','href="index.html#alpha-v20a"')
(ROOT/'docs/wiki/alpha-v20b.html').write_text(offline,encoding='utf-8',newline='\n')
shutil.copy2(ROOT/'site/guide.css',ROOT/'docs/guide.css')
for base in [ROOT/'site',ROOT/'_site']:
    index=base/'index.html'
    if not index.exists():continue
    text=index.read_text(encoding='utf-8');held=[]
    def hold(match):
        card=match.group(0)
        if 'D2PLUS_Companion_AlphaV2.0a.apk' in card or 'D2PLUS_Offline_Wiki_AlphaV2.0a.zip' in card:
            card=re.sub(r' data-release-tag="[^"]+"','',card)
            card=re.sub(r'(<a[^>]*data-download="[^"]+")',r'\1 data-release-tag="v2.0a-alpha"',card)
            held.append(card);return f'<!-- held-tool-{len(held)-1} -->'
        return card
    text=re.sub(r'<article>.*?</article>',hold,text,flags=re.S)
    for old,new in [('Alpha V2.0a','Alpha V2.0b'),('AlphaV2.0a','AlphaV2.0b'),('2.0.1-alpha','2.0.2-alpha'),('v2.0a-alpha','v2.0b-alpha')]:text=text.replace(old,new)
    for i,card in enumerate(held):text=text.replace(f'<!-- held-tool-{i} -->',card)
    marker='id="v20b-fixes"'
    if marker not in text:
        block='<section class="panel" id="v20b-fixes"><p class="eyebrow">ALPHA V2.0b · NOVEMBER 21, 2026</p><h2>Smaller loads. Easier updates.</h2><p>The Warden uses 75% less texture data. The full-package installer is fixed, and the new launcher can scan files and download smaller updates. Settings and saves stay in place.</p><p>These are verified file and installer changes; affected-machine crash prevention still needs testing.</p><a class="button" href="news-alpha-v20b.html">Read the fixes in plain language</a></section>'
        text=text.replace('<section id="downloads"',block+'<section id="downloads"',1)
        assert marker in text, 'Current release summary insertion point changed'
    text=re.sub(r'src=\"site-config\.js(?:\?[^\"]*)?\"','src=\"site-config.js?v=2.0b-20261121\"',text)
    index.write_text(text,encoding='utf-8',newline='\n')
    (base/'site-config.js').write_text('window.D2PLUS_SITE='+json.dumps(dict(repository='D2Plus-D2R/D2PLUS-Launcher',releaseTag='v2.0b-alpha',releasePublished=True))+';\n',encoding='utf-8',newline='\n')
    if base.name=='_site':
        shutil.copy2(ROOT/'site/assets/d2plus-alpha-v20b-splash.png',base/'assets/d2plus-alpha-v20b-splash.png')
        shutil.copy2(ROOT/'site/news-alpha-v20b.html',base/'news-alpha-v20b.html')
        for name in ['database.json','data.js','index.html','alpha-v20b.html']:shutil.copy2(ROOT/'docs/wiki'/name,base/'wiki'/name)
print('Applied V2.0b release notes and current labels; historical records and compatible V2.0a tool downloads retained.')
