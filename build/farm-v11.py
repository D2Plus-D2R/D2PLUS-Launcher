"""Add item-specific custom boss routes from the release's actual TC graph.
No drop probabilities are inferred. Unknown conditional drops remain excluded.
"""
from pathlib import Path
import csv,json,re,sys,collections,hashlib
R=Path(__file__).resolve().parents[1]; S=Path(sys.argv[1]); W=R/'docs/wiki'
def table(name):return list(csv.DictReader((S/'global/excel'/name).open(encoding='utf-8-sig'),delimiter='\t'))
def dump(p,v):p.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
types={r['Code']:r for r in table('itemtypes.txt') if r.get('Code')}
base={r['code']:r for n in ['weapons.txt','armor.txt','misc.txt'] for r in table(n) if r.get('code')}
tc={r['Treasure Class']:r for r in table('treasureclassex.txt') if r.get('Treasure Class')}
mon={r['Id']:r for r in table('monstats.txt') if r.get('Id')}
uniques={r['index']:r for r in table('uniqueitems.txt') if r.get('index') and r['index']!='Expansion'}
sets={r['index']:r for r in table('setitems.txt') if r.get('index') and r['index']!='Expansion'}
def inherits(code,target,seen=None):
 if code==target:return True
 seen=set() if seen is None else seen
 if not code or code in seen:return False
 seen=seen|{code};r=types.get(code,{})
 return any(inherits(r.get(k,''),target,seen) for k in ['Equiv1','Equiv2'])
def permits(row,diff):
 if row.get('disabled')=='1' or row.get('spawnable')!='1':return False
 calc=row.get('DropConditionCalc','').strip()
 if not calc:return True
 m=re.fullmatch(r"cond\('Difficulty',\s*(normal|nightmare|hell)\)",calc,re.I)
 return bool(m and m[1].lower()==diff.lower())
def expand(name,diff,path=(),seen=None):
 seen=set() if seen is None else seen
 if name in seen:return []
 seen=seen|{name};path=path+(name,)
 if name in tc:
  row=tc[name];out=[]
  if int(row.get('Picks') or 0)==0:return []
  for i in range(1,11):
   child=row.get('Item'+str(i),'')
   if child and int(row.get('Prob'+str(i)) or 0)>0:out+=expand(child,diff,path,seen)
  return out
 auto=re.fullmatch(r'([a-z]+)(\d+)',name)
 if auto and auto[1] in types and types[auto[1]].get('TreasureClass')=='1':
  level=int(auto[2]);out=[]
  for code,row in base.items():
   ilvl=int(row.get('level') or 0)
   if max(3,((ilvl+2)//3)*3)==level and permits(row,diff) and any(inherits(row.get(t,''),auto[1]) for t in ['type','type2']):out.append((code,None,None,path+(code,)))
  return out
 if name in uniques:return [(uniques[name]['code'],'Unique',name,path)]
 if name in sets:return [(sets[name]['item'],'Set piece',name,path)]
 parts=name.split(',');code=parts[0];quality=None
 if code not in base:return []
 for part in parts[1:]:
  if part in ['mag','rar','nor','hiq','low','crf']:return []
  if part=='uni':quality='Unique'
  if part=='set':quality='Set piece'
 return [(code,quality,None,path)] if permits(base[code],diff) else []
d=json.loads((W/'database.json').read_text(encoding='utf8'));records=d['records'];audit=[];sources=[]
for mid,name,area,onlyhell in [('d2plus_butcher','The Butcher','Tristram',False),('d2a3_warden_baalcrab','Azmodan, the Lord of Sin','Worldstone Chamber, beside Baal',False),('d2plus_uber_butcher','Uber Butcher','Uber Tristram',True)]:
 row=mon[mid]
 for diff,suf in [('Normal',''),('Nightmare','(N)'),('Hell','(H)')]:
  if onlyhell and diff!='Hell':continue
  level=int(row['Level'+suf]);root=row['TreasureClass'+suf]
  assert row['boss']=='1',(mid,'Level assumptions require boss flag')
  paths=expand(root,diff)
  sources.append(dict(id=mid,name=name,difficulty=diff,area=area,level=level,treasureClass=root,noDrop=tc[root].get('NoDrop','0'),eligibleBaseCodes=len({p[0] for p in paths})))
  for rec in records:
   if rec['kind'] not in ['Unique','Set piece']:continue
   item=rec.get('sourceRow',{});code=item.get('code') or item.get('item')
   if not code or not permits(item,diff) or int(item.get('lvl') or 0)>level:continue
   matching=[p for p in paths if p[0]==code and (not p[1] or p[1]==rec['kind']) and (not p[2] or p[2]==item['index'])]
   if not matching:continue
   wording=f'{diff} {name} — {area}.'
   rec.setdefault('farming',[])
   rec['farming']=[f for f in rec['farming'] if not any(n in f for n in ['The Butcher','Azmodan','Uber Butcher']) or not f.startswith(diff+' '+name)]
   rec['farming']=[f for f in rec['farming'] if not re.search(r'no confirmed|not known to drop',f,re.I)]
   rec['farming'].append(wording)
   rec.setdefault('bossFarmSources',[])
   rec['bossFarmSources']=[p for p in rec['bossFarmSources'] if (p['id'],p['difficulty'])!=(mid,diff)]
   proof=dict(id=mid,difficulty=diff,monsterLevel=level,itemQualityLevel=int(item.get('lvl') or 0),treasureClass=root,path=list(min(matching,key=lambda x:len(x[3]))[3]))
   rec['bossFarmSources'].append(proof);audit.append(dict(item=rec['name'],itemId=rec['id'],kind=rec['kind'],baseCode=code,**proof))
 # Replace obsolete Baal Warden record rather than showing misleading Countess loot.
 record=next((r for r in records if r['id']==('alpha-v05-warden-baalcrab' if mid=='d2a3_warden_baalcrab' else 'v11-'+mid)),None)
 if record is None:record={'id':'v11-'+mid,'kind':'Monster'};records.append(record)
 record.update(name=name,source='D2PLUS AlphaV1.1',base=area,level='',hero='',note=(area+'. Uses the actual difficulty-specific loot tables below. Item cards list this boss only when both the base item and unique/set quality level qualify. '+('Azmodan has a higher NoDrop weight than Diablo; loot is not guaranteed.' if mid=='d2a3_warden_baalcrab' else '')),stats=[{'label':s['difficulty']+' loot','value':s['treasureClass']+' (monster level '+str(s['level'])+')'} for s in sources if s['id']==mid])
report=dict(sourceHashes={n:hashlib.sha256((S/'global/excel'/n).read_bytes()).hexdigest() for n in ['treasureclassex.txt','monstats.txt','uniqueitems.txt','setitems.txt','weapons.txt','armor.txt','misc.txt','itemtypes.txt']},method='Positive-weight TC reachability plus base/unique/set spawnability, conditional difficulty and boss level. No assumed drop rates. Unrecognized drop conditions excluded.',sources=sources,qualifications=audit,counts=dict(collections.Counter((x['id']+' / '+x['difficulty']+' / '+x['kind']) for x in audit)))
d['summary']=dict(collections.Counter(r['kind'] for r in records));d['bossFarmingAudit']='BOSS_FARMING_V11.json'
dump(W/'BOSS_FARMING_V11.json',report);dump(W/'database.json',d)
(W/'data.js').write_text('window.D2PLUS_DATA = '+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
print(json.dumps(report['counts'],indent=2));print('Item-specific boss routes',len(audit))
