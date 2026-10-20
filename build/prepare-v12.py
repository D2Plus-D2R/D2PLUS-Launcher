from pathlib import Path
import csv,hashlib,io,json,os,re,shutil,urllib.request,zipfile
ROOT=Path(__file__).resolve().parents[1]
release=json.loads((ROOT/'release-inputs/v12.json').read_text())
meta=next(f for f in release['files'] if f['name'].endswith('_Installed_Snapshot.zip'))
SOURCE=Path(os.environ.get('D2PLUS_SNAPSHOT',str(ROOT/'gameplay'/meta['name'])))
def digest(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def jb(o):return (json.dumps(o,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf-8')
if not SOURCE.exists():
 raise SystemExit('Download the verified Alpha V1.2 installed snapshot first.')
assert digest(SOURCE)==meta['sha256'],'Snapshot checksum mismatch'
target=ROOT/'gameplay'/meta['name']
if SOURCE.resolve()!=target.resolve():shutil.copy2(SOURCE,target)
texts={}
with zipfile.ZipFile(SOURCE) as z:
 assert z.testzip() is None
 manifest=json.loads(z.read('INSTALL_MANIFEST.json'))
 for row in manifest['files']:
  data=z.read(row['path']);assert hashlib.sha256(data).hexdigest()==row['sha256'],row['path']
  if row['path'].endswith(('.txt','.json')):texts[row['path'].removeprefix('D2RMM.mpq/data/')]=data.decode('utf-8')
(ROOT/'gameplay/manifest.json').write_bytes(jb(meta))
(ROOT/'gameplay/release.json').write_bytes(jb(release))
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
print('Verified Alpha V1.2 snapshot and refreshed editor definitions.')
