"""Apply the Alpha V2.0a launcher UI after historical reference restoration."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil
import struct

VERSION = '2.0.1-alpha'
DISPLAY = 'Alpha V2.0a'
NEWS = '''<article class="updates"><div class="update-title"><h2><span>✦</span> The odds, restored.</h2><small>Launcher Alpha V2.0a<br>Wiki Alpha V2.0a</small></div><ul><li>Eligible bosses use the intended 10% base Dungeon Reward Bag roll.</li><li>The new castle keeps its opening doors and light.</li><li><a href="/wiki/index.html#alpha-v20a" target="d2plus-wiki">Alpha V2.0a patch notes and update guide</a></li></ul></article>'''


def update(root: Path, allow_pending_art=False):
    root = root.resolve()
    launcher = root / 'docs/launcher'
    assert json.loads((root / 'package.json').read_text(encoding='utf-8'))['version'] == VERSION
    core = (root / 'scripts/launcher-core.cjs').read_text(encoding='utf-8')
    assert f"const VERSION = '{VERSION}';" in core, 'Backend and package versions disagree'
    page = launcher / 'index.html'
    text = page.read_text(encoding='utf-8')
    # Relabel only the launcher, never the pinned wiki's historical patch notes.
    text = re.sub(r'Alpha V2\.0(?![a-zA-Z0-9])', DISPLAY, text)
    text = re.sub(r'ALPHA V2\.0(?![a-zA-Z0-9])', 'ALPHA V2.0a', text)
    text, count = re.subn(r'<article class="updates">.*?</article>', lambda _: NEWS, text, count=1, flags=re.S)
    assert count == 1, 'Launcher news insertion point changed'
    asset_manifest = root / 'release-inputs/launcher-v20a.json'
    artwork = {'ready': False, 'reason': 'Pending root-approved V2.0a artwork'}
    if asset_manifest.is_file():
        binding = json.loads(asset_manifest.read_text(encoding='utf-8'))
        assert binding['version'] == VERSION and binding['displayVersion'] == DISPLAY
        assert '\\' not in binding['source'] and ':' not in binding['source']
        source = (root / binding['source']).resolve()
        assert source.is_relative_to(root) and source.suffix.lower() == '.png'
        raw = source.read_bytes()
        assert hashlib.sha256(raw).hexdigest() == binding['sha256'], 'Approved launcher artwork changed'
        assert raw[:8] == b'\x89PNG\r\n\x1a\n'
        width, height = struct.unpack('>II', raw[16:24])
        assert width == binding['width'] and height == binding['height']
        target = launcher / 'assets/splash-v20a.png'
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists() or target.read_bytes() != raw:
            shutil.copy2(source, target)
        text, count = re.subn(r'(<div id="releaseSplash"[^>]*>\s*<img src=")[^"]+("[^>]*>)',
                             r'\g<1>/launcher/assets/splash-v20a.png\2', text, count=1)
        assert count == 1, 'Launcher splash insertion point changed'
        artwork = {'ready': True, 'source': binding['source'], 'sha256': binding['sha256'],
                   'width': width, 'height': height, 'output': 'docs/launcher/assets/splash-v20a.png'}
    elif not allow_pending_art:
        raise FileNotFoundError('Root-approved release-inputs/launcher-v20a.json is required for final packaging')
    page.write_text(text, encoding='utf-8', newline='\n')
    app = launcher / 'app.js'
    text = app.read_text(encoding='utf-8')
    text, count = re.subn(r"VERSION='2\.0\.[01]-alpha'", f"VERSION='{VERSION}'", text, count=1)
    assert count == 1, 'Launcher frontend version insertion point changed'
    app.write_text(text, encoding='utf-8', newline='\n')
    guide = launcher / 'skills-reference.md'
    if guide.is_file():
        text = re.sub(r'Alpha V2\.0(?![a-zA-Z0-9])', DISPLAY, guide.read_text(encoding='utf-8'))
        guide.write_text(text, encoding='utf-8', newline='\n')
    report = {'version': VERSION, 'displayVersion': DISPLAY, 'launcherUpdated': True,
              'newsRoute': '/wiki/index.html#alpha-v20a', 'artwork': artwork,
              'settingsAndSavesModified': False, 'historicalWikiSourcesModified': False}
    cache = root / 'build-cache'
    cache.mkdir(exist_ok=True)
    (cache / 'LAUNCHER-V20A-REPORT.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--allow-pending-art', action='store_true', help='Development UI preparation only; final packaging never enables this')
    args = parser.parse_args()
    print(json.dumps(update(args.root, args.allow_pending_art)))
