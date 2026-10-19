"""Build both install formats from the pinned, user-tested Alpha V1.1.2 snapshot."""
from pathlib import Path, PurePosixPath
import csv, hashlib, io, json, os, re, struct, urllib.request, zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
DIST.mkdir(exist_ok=True)
CACHE = ROOT / 'build-cache'
CACHE.mkdir(exist_ok=True)
SOURCE = Path(os.environ.get('D2PLUS_SNAPSHOT', str(CACHE / 'D2PLUSAlphaV1.1.2.zip')))
SOURCE_SHA = '07af758dc36a6bd25febdabe5bb2c71fd602931d2012e7fcf630b0047129a295'
REPO = 'D2Plus-D2R/D2PLUS-Launcher'
TAG = 'v1.1.2-alpha'
PREFIX = 'D2RMM/D2RMM.mpq/data/'
FOLDER = 'D2PLUS_Alpha_v112_Complete/'
STAMP = (2026, 10, 19, 0, 0, 0)
sha = lambda b: hashlib.sha256(b).hexdigest()
def digest(p):
    with p.open('rb') as f: return hashlib.file_digest(f, 'sha256').hexdigest()
def jb(o): return (json.dumps(o, ensure_ascii=False, separators=(',', ':'))+'\n').encode('utf-8')
def put(z, name, data):
    entry = zipfile.ZipInfo(name, STAMP)
    entry.compress_type = zipfile.ZIP_DEFLATED
    entry.external_attr = 0o100644 << 16
    z.writestr(entry, data)
if not SOURCE.exists():
    urllib.request.urlretrieve(f'https://github.com/{REPO}/releases/download/{TAG}/D2PLUSAlphaV1.1.2.zip', SOURCE)
assert digest(SOURCE) == SOURCE_SHA, 'Working snapshot checksum mismatch'
texts, binaries, rows, seen = {}, [], [], set()
standalone = DIST / 'D2PLUS_AlphaV1.1.2_Complete_D2RMM.zip'
snapshot = ROOT / 'gameplay/D2PLUS_AlphaV1.1.2_Installed_Snapshot.zip'
readme = '''D2PLUS Alpha V1.1.2 - complete standalone D2RMM mod
Close D2R and back up offline saves. Extract this ZIP into the mods folder beside
D2RMM.exe. The path must be mods/D2PLUS_Alpha_v112_Complete/mod.json.
Disable older D2PLUS bundles and overlapping addons. Enable this mod and click
Install Mods. Keep your existing output mod name to retain the same save location.
No earlier D2PLUS release or D2RLoader is required. This is a fixed-settings complete
snapshot. Other mods that change the same tables or assets may conflict.
'''
with zipfile.ZipFile(SOURCE) as src, zipfile.ZipFile(standalone, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as mod, zipfile.ZipFile(snapshot, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as installed:
    for entry in sorted(src.infolist(), key=lambda e:e.filename):
        if entry.is_dir() or not entry.filename.startswith(PREFIX): continue
        rel = entry.filename[len(PREFIX):]
        assert not PurePosixPath(rel).is_absolute() and '..' not in PurePosixPath(rel).parts and ':' not in rel and '\\' not in rel
        assert rel.casefold() not in seen
        seen.add(rel.casefold())
        data = src.read(entry)
        rows.append({'path':rel, 'size':len(data), 'sha256':sha(data)})
        put(installed, 'D2RMM.mpq/data/'+rel, data)
        if rel.endswith(('.json', '.txt')): texts[rel] = data.decode('utf-8')
        else:
            binaries.append(rel)
            put(mod, FOLDER+'payload/'+rel, data)
    assert len(rows) == 2367
    code = "// Complete Alpha V1.1.2 snapshot.\n(function(){'use strict';\nconst textFiles="+json.dumps(texts, ensure_ascii=True, separators=(',', ':'))+";\nfor(const p of Object.keys(textFiles))D2RMM.writeTxt(p,textFiles[p]);\nconst binaryFiles="+json.dumps(binaries)+";\nfor(const p of binaryFiles)D2RMM.copyFile('payload/'+p,p,true);\n})();\n"
    put(mod, FOLDER+'mod.js', code.encode('utf-8'))
    put(mod, FOLDER+'mod.json', jb({'name':'D2PLUS - Alpha V1.1.2 Complete','description':'Complete standalone D2PLUS Alpha V1.1.2. Disable older D2PLUS bundles and overlapping addons.','author':'D2PLUS','version':'1.1.2','config':[]}))
    put(mod, FOLDER+'INSTALL_MANIFEST.json', jb({'version':'1.1.2','sourceSha256':SOURCE_SHA,'files':rows}))
    put(mod, FOLDER+'README_INSTALL.txt', readme.encode())
    put(installed, 'D2RMM.mpq/modinfo.json', jb({'name':'D2RMM','savepath':'D2RMM'}))
    put(installed, 'INSTALL_MANIFEST.json', jb({'version':'1.1.2','files':[{**r,'path':'D2RMM.mpq/data/'+r['path']} for r in rows]}))
    put(installed, 'README_INSTALL.txt', b'D2PLUS Alpha V1.1.2. Install through the launcher with D2R closed. Preserve your existing mod name and save path.\n')
    splash = src.read(PREFIX+'hd/global/ui/d2plus/loading/d2plus_alpha11.sprite')
    # Uncompressed RGBA sprite: dimensions and data offset are verified before conversion.
    width, height = struct.unpack_from('<II', splash, 8)
    offset = len(splash) - width*height*4
    assert (width,height)==(1920,1080) and offset >= 40
    Image.frombytes('RGBA',(width,height),splash[offset:]).save(ROOT/'docs/launcher/assets/splash-v11.png')

# Verify all game outputs against the pinned original, including the script's text payload.
with zipfile.ZipFile(standalone) as mod, zipfile.ZipFile(snapshot) as installed:
    assert mod.testzip() is None and installed.testzip() is None
    for r in rows:
        data = texts[r['path']].encode('utf-8') if r['path'] in texts else mod.read(FOLDER+'payload/'+r['path'])
        assert sha(data)==r['sha256'] and sha(installed.read('D2RMM.mpq/data/'+r['path']))==r['sha256'],r['path']
release = {'repository':REPO,'tag':TAG,'displayVersion':'Alpha V1.1.2','files':[{'name':p.name,'size':p.stat().st_size,'sha256':digest(p)} for p in (standalone,snapshot)]}
(ROOT/'gameplay/release.json').write_bytes(jb(release))
(ROOT/'gameplay/manifest.json').write_bytes(jb(release['files'][1]))

# Refresh save stat definitions from this snapshot so new Accursed items are readable.
E = ROOT/'docs/d2plus'
d = json.loads((E/'v105_data.json').read_text(encoding='utf-8'))
c = json.loads((E/'constants_105.json').read_text(encoding='utf-8'))
strings = dict(d['strings'])
for p, text in texts.items():
    if p.startswith('local/lng/strings/') and p.endswith('.json'):
        for row in json.loads(text.lstrip('\ufeff')):
            if row.get('Key') and 'enUS' in row: strings[row['Key']] = row['enUS']
def table(name): return list(csv.DictReader(io.StringIO(texts['global/excel/'+name+'.txt'].lstrip('\ufeff')),delimiter='\t'))
def norm(row): return {k.lower().replace(' ','').removeprefix('*'):(int(v) if re.fullmatch(r'-?\d+',v) else v) for k,v in row.items() if k and v and (not k.startswith('*') or k=='*ID')}
for i,row in enumerate(table('itemstatcost')):
    key=row['Stat']
    if key in d['itemStatCost']:
        for a,b in [('Save Bits','savebits'),('Save Add','saveadd'),('Save Param Bits','saveparambits')]:
            assert int(row[a] or 0)==d['itemStatCost'][key].get(b,0),(key,a)
    if not key.startswith('d2plus_accursed'): continue
    d['itemStatCost'][key]={**norm(row),'id':i}
    if i not in d['info']['d2plus']['nativeItemStatIds']: d['info']['d2plus']['nativeItemStatIds'].append(i)
    while len(c['magical_properties'])<=i:c['magical_properties'].append(None)
    c['magical_properties'][i]={'s':key,'sS':1,'sB':int(row['Save Bits']),'sA':int(row['Save Add'] or 0),'so':int(row['descpriority'] or 0),'dF':int(row['descfunc'] or 0),'dV':int(row['descval'] or 0),'dP':strings.get(row['descstrpos'],row['descstrpos']),'dN':strings.get(row['descstrneg'],row['descstrneg'])}
props=table('properties')
for row in props:
    key=row['code']
    if not key.startswith(('d2plus_accursed','d2plus_ac_boon_')):continue
    d['properties'][key]=norm(row)
    # Annotation properties wrap a native property and add a saved tooltip stat.
    native=next((p for p in props if not p['code'].startswith('d2plus_') and all(p.get(field+str(n),'')==row.get(field+str(n),'') for n in range(1,8) if not row.get('stat'+str(n),'').startswith('d2plus_accursed') for field in ['stat','func','val','set'])),None)
    if key not in c['properties']:
        assert native and native['code'] in c['properties'],key
        c['properties'][key]=json.loads(json.dumps(c['properties'][native['code']]))
        c['properties'][key]+=[{'s':row['stat'+str(n)],'f':int(row['func'+str(n)])} for n in range(1,8) if row.get('stat'+str(n),'').startswith('d2plus_accursed')]
d['misc']['acs']=norm(next(r for r in table('misc') if r['code']=='acs'))
d['strings']=list(strings.items()) if isinstance(d['strings'],list) else strings
(E/'v105_strings.json').write_bytes(jb(list(strings.items())))
for stem,obj in [('v105_data',d),('constants_105',c)]:
    (E/(stem+'.json')).write_bytes(jb(obj))
    m=json.loads((E/(stem+'.manifest.json')).read_text())
    m['sha256']=digest(E/(stem+'.json'));m['counts']['itemStats']=len(d['itemStatCost']);m['counts']['strings']=len(strings)
    m['accursedBoonAudit']={'firstStatId':375,'lastStatId':422,'existingIdsPreserved':True}
    (E/(stem+'.manifest.json')).write_bytes(jb(m))
(E/'constants_105.bundle.js').write_text('window.constants_d2plus = '+json.dumps({'constants':c,'manifest':json.loads((E/'constants_105.manifest.json').read_text())},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
assert len([s for s in d['itemStatCost'].values() if 375<=s['id']<=422])==48
(DIST/'V1.1.2-VALIDATION.json').write_bytes(jb({'sourceSha256':SOURCE_SHA,'filesVerified':len(rows),'zipIntegrityPassed':True,'newAccursedStats':48,'inGameTestPerformed':False}))
print(json.dumps(release,indent=2))
