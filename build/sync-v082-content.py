"""Refresh references from the supplied AlphaV0.8.2 data, retaining native save IDs."""
from pathlib import Path
import csv,json,re,sys,hashlib,collections,copy
R=Path(__file__).resolve().parents[1]; S=Path(sys.argv[1]); E=R/'docs/d2plus'; W=R/'docs/wiki'
VERSION='D2PLUS AlphaV0.8.2'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
def table(n):return list(csv.DictReader((S/'global/excel'/n).open(encoding='utf-8-sig'),delimiter='\t'))
def clean(s):return re.sub(r'ÿc.','',str(s)).strip()
def normal(r):return {k.lower().replace(' ','').removeprefix('*'):(int(v) if re.fullmatch(r'-?\d+',v) else v) for k,v in r.items() if k and v and (not k.startswith('*') or k.lower()=='*id')}
gd=read(E/'v105_data.json'); old=copy.deepcopy(gd); c=read(E/'constants_105.json'); wiki=read(W/'database.json'); records=wiki['records']; aliases=wiki.setdefault('recordAliases',{})
strings=dict(read(E/'v105_strings.json'))
for p in sorted((S/'local/lng/strings').glob('*.json')):
 for r in read(p):
  if isinstance(r,dict) and 'Key' in r:strings[r['Key']]=r.get('enUS') or r['Key']
def label(k):return clean(strings.get(k,k))
skills=[r for r in table('skills.txt') if r.get('*Id','').isdigit()]; sd={r['skilldesc']:r for r in table('skilldesc.txt') if r.get('skilldesc')}
skillids={r['skill'].lower():int(r['*Id']) for r in skills}; skillids['sword mastery']=127
skillnames={r['skill']:label(sd.get(r['skilldesc'],{}).get('str name') or r['skill']) for r in skills}
byid={int(r['*Id']):r for r in skills}
rename={}
for r in skills:
 i=int(r['*Id']); name=skillnames[r['skill']]
 if i<len(c['skills']) and c['skills'][i]:rename[c['skills'][i]['s']]=name
 rename[r['skill']]=name
 gd['skills'][str(i)]=normal(r)
 while len(c['skills'])<=i:c['skills'].append(None)
 c['skills'][i]={'s':name,'c':r.get('charclass','')}
gd['skillDesc']={k:normal(v) for k,v in sd.items()}
classes={'ama':'Amazon','sor':'Sorceress','nec':'Necromancer','pal':'Paladin','bar':'Barbarian','dru':'Druid','ass':'Assassin','war':'Warlock'}
for r in skills:
 hero=classes.get(r.get('charclass'))
 if not hero:continue
 i=int(r['*Id']); name=skillnames[r['skill']]
 matches=[x for x in records if x['kind']=='Skill' and (x.get('skillId')==i or (x.get('hero')==hero and rename.get(x['name'],x['name'])==name))]
 item=next((x for x in matches if x.get('skillId')==i),None) or (matches[0] if matches else {'id':f'skill-{i}','kind':'Skill'})
 for other in matches:
  if other is not item:aliases[other['id']]=item['id'];records.remove(other)
 if not matches:records.append(item)
 item.update(name=name,hero=hero,source=VERSION,skillId=i,sourceKey=r['skill'],sourceRow=r,descriptionRow=sd.get(r['skilldesc'],{}),level=int(r['reqlevel'] or 1),note=label(sd.get(r['skilldesc'],{}).get('str long','')),stats=[{'label':'Required level','value':r['reqlevel'] or '1'},{'label':'Maximum allocated points','value':r['maxlvl'] or '20'}])
def params(v):
 for k,x in list(v.items()):
  if re.fullmatch(r'(?:par\d+|apar\d+[ab]|[pf]param\d+[ab]?|t1param\d+)',k) and isinstance(x,str) and x.lower() in skillids:v[k]=skillids[x.lower()]
  if re.fullmatch(r'(?:prop\d+|aprop\d+[ab]|[pf]code\d+[ab]?)',k) and isinstance(x,str):v[k]=x.lower()
 return v
for r in gd['skills'].values():
 for k in ['reqskill1','reqskill2','reqskill3']:
  if isinstance(r.get(k),str) and r[k].lower() in skillids:r[k]=skillids[r[k].lower()]
base={r['code']:r for n in ['weapons.txt','armor.txt','misc.txt'] for r in table(n) if r.get('code')}
templates={p['code']:p for rec in records for p in rec.get('propertyRanges',[]) if p.get('code')}
labels={'swing2':'Increased attack speed','cast2':'Faster cast rate','balance2':'Faster hit recovery','lifesteal':'Life stolen per hit','red-dmg%':'Physical damage reduced','res-all':'All resistances','dmg%':'Enhanced damage','dmg-demon':'Damage to demons','fireskill':'Fire skills','allskills':'All skills'}
percent={'swing2','cast2','balance2','lifesteal','manasteal','red-dmg%','res-all','dmg%','dmg-demon','res-pois','res-fire','res-cold','res-ltng','crush','deadly','openwounds','reduce-pois'}
def property_rows(row,previous):
 result=[]; before=previous.get('sourceRow',{}); prior={p['field']:p for p in previous.get('propertyRanges',[]) if p.get('field')}
 for field,code in row.items():
  m=re.fullmatch(r'(prop|aprop)(\d+[ab]?)',field)
  if not m or not code:continue
  prefix='a' if m[1]=='aprop' else ''; suffix=m[2]
  lo=row.get(prefix+'min'+suffix,''); hi=row.get(prefix+'max'+suffix,''); par=row.get(prefix+'par'+suffix,'')
  oldp=prior.get(field); code=code.lower()
  if oldp and oldp['code'].lower()==code and all(before.get(k,'')==row.get(k,'') for k in [field,prefix+'min'+suffix,prefix+'max'+suffix,prefix+'par'+suffix]):
   p=copy.deepcopy(oldp)
  else:
   proto=oldp if oldp and oldp['code'].lower()==code else templates.get(code,{})
   title=labels.get(code,proto.get('label',code)); detail=''; section=proto.get('section','Always active') if prefix else 'Always active'
   if prefix and not proto:section='Additional set bonus '+suffix
   unit='%' if code in percent or '%' in str(proto.get('minimum','')) else ''
   if code in ('skill','oskill','aura'):
    title=skillnames.get(par, c['skills'][int(par)]['s'] if par.isdigit() and int(par)<len(c['skills']) and c['skills'][int(par)] else label(par)) + (' aura level' if code=='aura' else ' skill level');unit=''
   if code in classes:title=classes[code]+' skill levels';unit=''
   value=lo+unit if lo==hi else '['+lo+unit+' – '+hi+unit+']'
   p={'label':title,'minimum':lo+unit,'maximum':hi+unit,'value':value,'kind':'fixed' if lo==hi else 'roll','section':section,'detail':detail,'code':code,'field':field}
  for k in ['label','detail','section']:
   for a,b in rename.items():
    if a!=b:p[k]=p.get(k,'').replace(a,b)
  result.append(p)
 return result
namechanges=[]; unresolved=[]
for fn,key,prefix,ckey,kind in [('uniqueitems.txt','uniqueItems','unique','unq_items','Unique'),('setitems.txt','setItems','set','set_items','Set piece')]:
 rows=[r for r in table(fn) if r.get('index')!='Expansion']; new={}; listing=[]
 previous=[x for x in records if x['kind']==kind]; records[:]=[x for x in records if x['kind']!=kind]
 for i,row in enumerate(rows):
  if not row.get('index'):continue
  native=prefix+str(i).zfill(3); canonical=prefix+':'+native; name=label(row['index']); code=row.get('code') or row.get('item')
  v=params(normal(row));v['enabled']=0 if row.get('disabled')=='1' else 1;new[native]=v
  prev=next((x for x in previous if x.get('canonicalId')==canonical),None)
  if not prev:prev=next((x for x in previous if not x.get('canonicalId') and x.get('nativeItemId')==i),None)
  if not prev:prev=next((x for x in previous if x.get('sourceRow',{}).get('index')==row['index'] or x['name']==name),None)
  rec=copy.deepcopy(prev) if prev else {'id':'native-'+canonical.replace(':','-'),'kind':kind,'source':VERSION,'hero':''}
  if prev and prev['name']!=name:rename[prev['name']]=name;namechanges.append({'id':canonical,'before':prev['name'],'after':name})
  if row['index'] not in strings:unresolved.append({'id':canonical,'key':row['index']})
  while len(c[ckey])<=i:c[ckey].append(None)
  c[ckey][i]={**(c[ckey][i] or {}),'n':name,'c':code}
  if row.get('invfile'):c[ckey][i]['i']=row['invfile']
  if not v['enabled'] or not code:continue
  ranges=property_rows(row,rec)
  base_name=label(base.get(code,{}).get('namestr') or row.get('*ItemName') or code)
  rec.update(name=name,canonicalId=canonical,nativeItemId=i,sourceRow=row,sourceKey=row['index'],level=int(row.get('lvl req') or 0),itemLevel=int(row.get('lvl') or 0),base=base_name,propertyRanges=ranges,stats=[{'label':(p['section']+' · ' if p['section']!='Always active' else '')+p['label'],'value':p['value'],'rangeType':p['kind']} for p in ranges])
  rec['aliases']=sorted(set([row['index'],*(rec.get('aliases') or []),*(([prev['name']]) if prev else [])])-{name})
  rec['note']=name+' is a '+('unique '+base_name if kind=='Unique' else base_name+' belonging to '+label(row['set']))+f'. Requires level {rec["level"]}. Values match AlphaV0.8.2; existing saved items retain their prior rolls.'
  if kind=='Set piece':rec['setName']=label(row['set'])
  records.append(rec);listing.append({'id':i,'key':row['index'],'name':name,'code':code,'level':rec['level']})
 gd[key]=new
 write(W/(prefix+'-catalog-v082.json'),listing)
gd['sets']={r['index']:params(normal(r)) for r in table('sets.txt') if r.get('index')}
for rec in records:
 if rec['kind']=='Set':
  k=rec.get('canonicalId','').removeprefix('set-family:') or rec['name']; rec['name']=label(k)
  pieces=[p for p in records if p['kind']=='Set piece' and p.get('setName')==rec['name']]
  rec['pieces']=[p['name'] for p in pieces];rec['base']=' · '.join(rec['pieces'])
  rec['note']=rec['name']+f' contains {len(pieces)} pieces. Names and membership verified against AlphaV0.8.2.'
  for p in rec.get('propertyRanges',[]):
   for a,b in rename.items():
    if a!=b:p['section']=p.get('section','').replace(a,b)
 if rec.get('source','').startswith('D2PLUS'):rec['source']=VERSION
gd['strings']=list(strings.items());gd['info']['d2plus']['profile']='alpha-v0.8.2'
write(E/'v105_strings.json',list(strings.items()));write(E/'v105_data.json',gd);write(E/'constants_105.json',c)
for stem in ['v105_data','constants_105']:
 m=read(E/(stem+'.manifest.json'));m.update(profile='d2plus-alpha-v0.8.2',generatedAt='2026-10-09',sha256=hashlib.sha256((E/(stem+'.json')).read_bytes()).hexdigest());m['counts'].update(uniques=len(gd['uniqueItems']),setItems=len(gd['setItems']),skills=len(gd['skills']),strings=len(strings));write(E/(stem+'.manifest.json'),m)
(E/'constants_105.bundle.js').write_text('window.constants_d2plus = '+json.dumps({'constants':c,'manifest':read(E/'constants_105.manifest.json')},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
wiki['version']=VERSION;wiki['summary']=dict(collections.Counter(r['kind'] for r in records));wiki['contentSnapshot']={'modVersion':'AlphaV0.8.2','date':'2026-10-09','notes':'Synchronized from the supplied compiled archive. Guide recommendations are data-reviewed, not gameplay benchmarks.'}
duplicates={k:v for k,v in collections.Counter(r['id'] for r in records).items() if v>1}
assert not duplicates,duplicates
write(W/'database.json',wiki);(W/'data.js').write_text('window.D2PLUS_DATA = '+json.dumps(wiki,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
audit={'version':'AlphaV0.8.2','nameChanges':namechanges,'unresolvedStringKeys':unresolved,'counts':wiki['summary'],'nativeSaveSchemaUnchanged':gd['itemStatCost']==old['itemStatCost'],'sourceHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (S/'global/excel').glob('*.txt')}}
write(W/'ALPHA_V082_AUDIT.json',audit);write(R/'release-inputs/name-map-v082.json',rename)
print(json.dumps({k:v for k,v in audit.items() if k!='sourceHashes'},ensure_ascii=False,indent=2))
