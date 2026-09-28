#!/usr/bin/env python3
"""Build only the public landing page. No editor backend or local settings are published."""
from pathlib import Path
import json,os,re,shutil
root=Path(__file__).resolve().parents[1]
cfg=json.loads((root/'site/config.json').read_text())
repo=os.environ.get('GITHUB_REPOSITORY') or cfg['repository']
if repo and not re.fullmatch(r'[A-Za-z0-9-]+/[A-Za-z0-9._-]+',repo):raise SystemExit('Invalid owner/repository')
cfg['repository']=repo
out=root/'_site'
if out.exists():shutil.rmtree(out)
shutil.copytree(root/'site',out)
(out/'config.json').unlink()
(out/'site-config.js').write_text('window.D2PLUS_SITE='+json.dumps(cfg)+';\n')
(out/'.nojekyll').touch()
print(out)
