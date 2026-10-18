from pathlib import Path
import json,csv,re,hashlib,copy
W=Path(__file__).resolve().parent;R=W/'launcher';E=R/'docs/d2plus';S=W/'installed/D2RMM.mpq/data'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
def table(n):return list(csv.DictReader((S/'global/excel'/f'{n}.txt').open(encoding='utf-8-sig'),delimiter='\t'))
def norm(r):return {k.lower().replace(' ','').removeprefix('*'):(int(v) if re.fullmatch(r'-?\d+',v) else v) for k,v in r.items() if k and v and (not k.startswith('*') or k=='*ID')}
d=read(E/'v105_data.json');c=read(E/'constants_105.json');strings=dict(d['strings']);old=copy.deepcopy(d['itemStatCost']);added=[]
for key in ['d2plus_accursed_roll','d2plus_accursed_mark']:old.pop(key,None)
d['info']['d2plus']['nativeItemStatIds']=[i for i in d['info']['d2plus']['nativeItemStatIds'] if i not in (503,504)]
c['magical_properties']=c['magical_properties'][:503]
for i,row in enumerate(table('itemstatcost')):
 key=row['Stat']
 if key in old:
  for a,b in [('Save Bits','savebits'),('Save Add','saveadd'),('Save Param Bits','saveparambits')]:assert int(row[a] or 0)==old[key].get(b,0),(key,a)
  continue
 v=norm(row);v['id']=i;d['itemStatCost'][key]=v;added.append(key)
 ids=d['info']['d2plus']['nativeItemStatIds']
 if i not in ids:ids.append(i)
 while len(c['magical_properties'])<=i:c['magical_properties'].append(None)
 c['magical_properties'][i]={'s':key,'sS':1,'sB':int(row['Save Bits']),'sA':int(row['Save Add'] or 0),'so':int(row['descpriority'] or 0),'dF':int(row['descfunc'] or 0),'dV':int(row['descval'] or 0),'dP':strings.get(row['descstrpos'],row['descstrpos']),'dN':strings.get(row['descstrneg'],row['descstrneg'])}
for row in table('properties'):
 if not row.get('code','').startswith('d2plus_accursed'):continue
 key=row['code'];d['properties'][key]=norm(row);c['properties'][key]=[{'s':row['stat1'],'f':int(row['func1'])}]
sig=next(r for r in table('misc') if r['code']=='acs');d['misc']['acs']=norm(sig)
c['other_items']['acs']={**c['other_items']['eap'],'n':'Accursed Ritual Sigil','i':sig['invfile'],'iw':1,'ih':1,'c':['Quest'],'s':0,'maxstack':0}
for name,gdkey in [('monstats','monsters'),('treasureclassex','treasureClass')]:
 # Existing native table layouts are retained; boss references are updated separately.
 pass
assert d['itemStatCost']['d2plus_accursed_roll']['id']==373 and d['itemStatCost']['d2plus_accursed_mark']['id']==374
for stem,v in [('v105_data',d),('constants_105',c)]:
 write(E/(stem+'.json'),v);m=read(E/(stem+'.manifest.json'));m.update(profile='d2plus-alpha-v1.1',sha256=hashlib.sha256((E/(stem+'.json')).read_bytes()).hexdigest());m['counts']['itemStats']=len(d['itemStatCost']);m['counts']['miscBases']=len(d['misc']);write(E/(stem+'.manifest.json'),m)
(E/'constants_105.bundle.js').write_text('window.constants_d2plus = '+json.dumps({'constants':c,'manifest':read(E/'constants_105.manifest.json')},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
write(W/'editor-schema-validation.json',{'existingStatWidthsPreserved':True,'newStats':added,'newIds':[373,374],'sigilBase':'acs'})
print('Editor schema updated, original save widths preserved.')
