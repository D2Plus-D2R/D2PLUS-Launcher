#!/usr/bin/env python3
"""Build the V2.0a Windows portable package and installer from official Electron.

Keeps the historical package.py and installer.nsi inputs unchanged.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
assert VERSION == '2.0.1-alpha', 'Use the V2.0a package metadata'
assert (ROOT / 'docs/d2plus/v105_data.json').is_file(), 'Prepare the final reference before packaging'
parser = argparse.ArgumentParser()
parser.add_argument('--makensis')
args = parser.parse_args()
# A source/site build may have restored older launcher files. Apply this last.
subprocess.run([sys.executable, str(ROOT / 'build/apply-launcher-v20a.py')], check=True)
provenance = json.loads((ROOT / 'build/ELECTRON-PROVENANCE.json').read_text(encoding='utf-8'))
cache = ROOT / 'build-cache'
cache.mkdir(exist_ok=True)
archive = cache / 'electron-win32-x64.zip'
if not archive.exists():
    urllib.request.urlretrieve(provenance['source'], archive)
assert hashlib.sha256(archive.read_bytes()).hexdigest() == provenance['sha256'], 'Electron checksum mismatch'
out = ROOT / 'dist/D2PLUS-Launcher-v20a'
assert out.resolve().parent == (ROOT / 'dist').resolve()
assert (ROOT / 'dist').resolve().is_relative_to(ROOT.resolve())
assert out.name == 'D2PLUS-Launcher-v20a' and not out.is_symlink()
if out.exists():
    # This fixed repository build-output directory is regenerated, never a user installation.
    shutil.rmtree(out)
out.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(archive) as source:
    source.extractall(out)
(out / 'electron.exe').replace(out / 'D2PLUS Launcher.exe')
(out / 'resources/default_app.asar').unlink(missing_ok=True)
app = out / 'resources/app'
app.mkdir(parents=True, exist_ok=True)
for name in ['desktop', 'scripts', 'docs', 'companion', 'licenses', 'test']:
    shutil.copytree(ROOT / name, app / name, dirs_exist_ok=True)
manifest = json.loads((ROOT / 'gameplay/manifest.json').read_text(encoding='utf-8'))
gameplay_archive = manifest['name']
assert Path(gameplay_archive).name == gameplay_archive and 'AlphaV2.0a' in gameplay_archive
assert (ROOT / 'gameplay' / gameplay_archive).stat().st_size == manifest['size']
with (ROOT / 'gameplay' / gameplay_archive).open('rb') as source:
    assert hashlib.file_digest(source, 'sha256').hexdigest() == manifest['sha256'], 'Gameplay snapshot checksum mismatch'
shutil.copytree(ROOT / 'gameplay', app / 'gameplay', dirs_exist_ok=True,
                ignore=lambda directory, names: [name for name in names if name.endswith('.zip') and name != gameplay_archive])
for name in ['package.json', 'LICENSE', 'THIRD_PARTY_NOTICES.md']:
    shutil.copy2(ROOT / name, app / name)
for name in ['README-DESKTOP.txt', f'CHANGELOG-{VERSION}.txt']:
    shutil.copy2(ROOT / name, out / name)
shutil.copy2(ROOT / 'build/ELECTRON-PROVENANCE.json', out / 'ELECTRON-PROVENANCE.json')
quote = lambda value: str(value).replace('/', '\\').replace('$', '$$').replace('"', '$\\"')
files = sorted(p.relative_to(out) for p in out.rglob('*') if p.is_file())
dirs = sorted((p.relative_to(out) for p in out.rglob('*') if p.is_dir()), key=lambda p: len(p.parts), reverse=True)
(ROOT / 'build/uninstall-files.nsh').write_text(
    '\n'.join('Delete "$INSTDIR\\' + quote(p) + '"' for p in files) + '\n' +
    '\n'.join('RMDir "$INSTDIR\\' + quote(p) + '"' for p in dirs) + '\n', encoding='utf-8')
portable = ROOT / f'dist/D2PLUS_Launcher_Portable_{VERSION}.zip'
with zipfile.ZipFile(portable, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as target:
    for path in out.rglob('*'):
        if path.is_file():
            target.write(path, 'D2PLUS-Launcher/' + path.relative_to(out).as_posix())
print(portable, flush=True)
if args.makensis:
    executable = ROOT / f'dist/D2PLUS_Launcher_Setup_{VERSION}.exe'
    prefix = '/' if __import__('os').name == 'nt' else '-'
    subprocess.run([args.makensis, prefix + 'V2', prefix + 'DPAYLOAD=' + str(out),
                    prefix + 'DOUTFILE=' + str(executable), str(ROOT / 'build/installer-v20a.nsi')], check=True)
    print(executable, flush=True)
