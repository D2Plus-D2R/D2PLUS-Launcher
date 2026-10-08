"""Translate current table column names to the editor's established schema."""
from pathlib import Path
import json,re,hashlib,csv,sys
R=Path(__file__).resolve().parents[1];E=R/'docs/d2plus'
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
d=read(E/'v105_data.json');names={v['skill'].lower():int(k) for k,v in d['skills'].items()}
if len(sys.argv)>1:
 source=Path(sys.argv[1]);c=read(E/'constants_105.json');strings=dict(d['strings'])
 stats=list(csv.DictReader((source/'global/excel/itemstatcost.txt').open(encoding='utf-8-sig'),delimiter='\t'))
 added=[]
 for i,row in enumerate(stats):
  key=row['Stat']
  if key in d['itemStatCost']:
   for a,b in [('Save Bits','savebits'),('Save Add','saveadd'),('Save Param Bits','saveparambits')]:
    assert int(row[a] or 0)==d['itemStatCost'][key].get(b,0),(key,a)
   continue
  v={k.lower().replace(' ','').removeprefix('*'):(int(x) if re.fullmatch(r'-?\d+',x) else x) for k,x in row.items() if k and x and (not k.startswith('*') or k=='*ID')}
  v['id']=i;d['itemStatCost'][key]=v;d['info']['d2plus']['nativeItemStatIds'].append(i);added.append(key)
  while len(c['magical_properties'])<=i:c['magical_properties'].append(None)
  c['magical_properties'][i]={'s':key,'sS':1,'sB':int(row['Save Bits']),'sA':int(row['Save Add'] or 0),'so':int(row['descpriority'] or 0),'dF':int(row['descfunc'] or 0),'dV':int(row['descval'] or 0),'dP':strings.get(row['descstrpos'],row['descstrpos']),'dN':strings.get(row['descstrneg'],row['descstrneg'])}
 for row in csv.DictReader((source/'global/excel/properties.txt').open(encoding='utf-8-sig'),delimiter='\t'):
  key=row.get('code','').lower()
  if not key or key in d['properties']:continue
  d['properties'][key]={k.lower().replace(' ',''):(int(v) if re.fullmatch(r'-?\d+',v) else v) for k,v in row.items() if k and v and not k.startswith('*')}
  c['properties'][key]=[{'s':row['stat'+str(i)],'f':int(row['func'+str(i)])} for i in range(1,8) if row.get('func'+str(i))]
 write(E/'constants_105.json',c);cm=read(E/'constants_105.manifest.json');cm['sha256']=hashlib.sha256((E/'constants_105.json').read_bytes()).hexdigest();cm['counts']['itemStats']=len(d['itemStatCost']);write(E/'constants_105.manifest.json',cm)
 (E/'constants_105.bundle.js').write_text('window.constants_d2plus = '+json.dumps({'constants':c,'manifest':cm},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
 audit=read(R/'docs/wiki/ALPHA_V08_AUDIT.json');audit['addedNativeSaveStats']=sorted(set(audit.get('addedNativeSaveStats',[])+added));audit['existingSaveStatBitWidthsVerified']=True;audit.pop('nativeSaveSchemaPreserved',None);write(R/'docs/wiki/ALPHA_V08_AUDIT.json',audit)
names.update({'sword mastery':127}) # Native renamed Blade Mastery keeps ID 127.
for r in d['itemTypes'].values():
 for src,dst in [('maxsockets1','maxsock1'),('maxsockets2','maxsock25'),('maxsockets3','maxsock40')]:
  if src in r:r[dst]=r[src]
for table in ['uniqueItems','setItems','runes','gems']:
 for r in d[table].values():
  for k,v in list(r.items()):
   if re.fullmatch(r'(prop\d+|aprop\d+[ab]|t1code\d+|(?:weapon|helm|shield)mod\d+code)',k) and isinstance(v,str):r[k]=v.lower()
   if re.fullmatch(r'(par\d+|apar\d+[ab]|t1param\d+|(?:weapon|helm|shield)mod\d+param)',k) and isinstance(v,str) and v.lower() in names:r[k]=names[v.lower()]
for s in d['skills'].values():
 for k in ['reqskill1','reqskill2','reqskill3']:
  if isinstance(s.get(k),str) and s[k].lower() in names:s[k]=names[s[k].lower()]
write(E/'v105_data.json',d);m=read(E/'v105_data.manifest.json');m['sha256']=hashlib.sha256((E/'v105_data.json').read_bytes()).hexdigest();m['counts']['itemStats']=len(d['itemStatCost']);write(E/'v105_data.manifest.json',m)
print('Normalized socket limits, property codes and named skill parameters.')
