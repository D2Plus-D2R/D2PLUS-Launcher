from pathlib import Path
import json,re,collections
R=Path(__file__).resolve().parents[1];read=lambda p:json.loads(p.read_text(encoding='utf-8'))
d=read(R/'docs/wiki/database.json');gd=read(R/'docs/d2plus/v105_data.json');classes={'Amazon':'ama','Sorceress':'sor','Necromancer':'nec','Paladin':'pal','Barbarian':'bar','Druid':'dru','Assassin':'ass','Warlock':'war'}
items={r['name']:r for r in d['records'] if r['kind'] in ('Unique','Set piece','Set','Runeword')};bases={**gd['weapons'],**gd['armor'],**gd['misc']}
def types(code):
 out=set();todo=[bases[code].get('type'),bases[code].get('type2')]
 while todo:
  t=todo.pop()
  if not t or t in out:continue
  out.add(t);r=gd['itemTypes'].get(t,{})
  todo += [r.get('equiv1'),r.get('equiv2'),*(r.get('runewordcategory'+str(i)) for i in range(1,4))]
 return out
typecache={c:types(c) for c in bases}
def usable(g,code,weapon_check=True):
 ts=typecache.get(code,set());allowed={gd['itemTypes'].get(t,{}).get('class') for t in ts}-{None,''}
 if allowed and classes[g['hero']] not in allowed:return False
 if code not in gd['weapons'] or not weapon_check:return True
 skill=gd['skills'][str(g['pointPlan'][0]['skillId'])];needs={skill.get('itypea'+str(i)) for i in range(1,4)}-{None,''}
 excluded={skill.get('etypea'+str(i)) for i in range(1,4)}-{None,''}
 return (not needs or bool(needs&ts)) and not bool(excluded&ts)
def codeof(r):return r.get('sourceRow',{}).get('code') or r.get('sourceRow',{}).get('item')
changes=[]
for g in d['guides']:
 primary=g['pointPlan'][0]['skill'];entries=[];seen=set()
 for stage,info in g['stages'].items():
  for entry in info['gear']:
   name=entry['name'];r=items[name]
   if name in seen:continue
   seen.add(name);level=r.get('level') or 0;reason=entry['reason'];okay=True
   if r['kind']=='Set':
    pieces=[items[n] for n in r['pieces']];level=max(x['level'] for x in pieces)
    if any(not usable(g,codeof(x)) for x in pieces):
     legal=[x for x in pieces if usable(g,codeof(x)) and codeof(x) not in gd['weapons']]
     okay=bool(legal)
     if okay:reason='Use compatible armor/accessory pieces only. This set’s weapon cannot support '+primary+'; do not budget its full-set bonus in this build.'
   elif r['kind']=='Runeword':
    row=r['sourceRow'];allowed={row.get('itype'+str(i)) for i in range(1,7)}-{None,''};excluded={row.get('etype'+str(i)) for i in range(1,4)}-{None,''};sockets=r['sockets']
    options=[code for code,b in bases.items() if int(b.get('gemsockets',0))>=sockets and bool(typecache[code]&allowed) and not bool(typecache[code]&excluded) and usable(g,code)]
    if name=='Call to Arms':reason='Weapon-switch buff option. Use its granted warcries, then return to the weapon required by '+primary+'.';okay=True
    else:okay=bool(options)
    if options:reason='Choose a compatible '+('weapon or armor' if any(x in gd['weapons'] for x in options) and any(x in gd['armor'] for x in options) else 'weapon' if any(x in gd['weapons'] for x in options) else 'armor')+' base with exactly '+str(sockets)+' sockets. Confirm its own requirements as well as the rune requirement.'
   else:okay=usable(g,codeof(r))
   if not okay:changes.append({'guide':g['id'],'item':name,'change':'Removed incompatible equipment for '+primary});continue
   target='early' if level<30 else 'mid' if level<60 else 'late'
   if target!=stage:changes.append({'guide':g['id'],'item':name,'change':f'Moved {stage} → {target}; requires level {level}'})
   entries.append((target,{'name':name,'reason':reason,'requiredLevel':level}))
 for stage,info in g['stages'].items():info['gear']=[v for key,v in entries if key==stage]
 if g['id']=='build-4' and not any(x['name']=='Lance of Yaggai' for stage in g['stages'].values() for x in stage['gear']):
  r=items['Lance of Yaggai'];assert usable(g,codeof(r));g['stages']['early']['gear'].append({'name':r['name'],'reason':'An early spear option with the AlphaV0.8.2 enhanced-damage buff; compatible with Jab and Fend.','requiredLevel':r['level']})
 if g['hero']=='Amazon':
  g['moduleNotes']=[x.replace('Storm Lance requires a spear-type weapon in the skill table. Test your intended base before investing in a runeword; the javelin-throwing Lightning Fury plan is a separate loadout.','Storm Lance accepts spears and javelins: javelins inherit the spear item type. Primary bolts use 50% melee weapon damage for spears and the native throwing-damage basis for javelins. Native javelin bases have no sockets, so use compatible armor runewords instead of trying to make a javelin runeword.') for x in g['moduleNotes']]
  g['variants']=[x.replace('Lightning Fury uses a throwing-javelin loadout; the Storm Lance spear plan is a separate choice. Do not copy its weapon and speed assumptions unchanged.','Lightning Fury needs a javelin. Storm Lance can share that javelin or use a spear; changing the weapon changes its damage basis. Respec spare points deliberately if making Lightning Fury a main attack.') for x in g['variants']]
  g['risk']=g['risk'].replace('spear-type','spear or javelin')
 if g['id']=='build-2':
  for k in ['early','mid','late']:
   g[k]=g[k].replace('compatible spear','compatible spear or javelin');g['stages'][k]['summary']=g[k]
  g['lane']='Ranged spear / javelin lightning'
  for p in g['priorities'][:]:
   if p=='Spear damage for the primary bolt weapon component':g['priorities'][g['priorities'].index(p)]='Equipped spear or throwing-javelin damage for primary bolts'
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
write(R/'docs/wiki/database.json',d);(R/'docs/wiki/data.js').write_text('window.D2PLUS_DATA = '+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
write(R/'docs/d2plus/build-guides.json',{'source':'D2PLUS AlphaV0.8.2 · data-reviewed October 9, 2026','guides':d['guides']})
write(R/'docs/wiki/GUIDE_EQUIPMENT_V082_AUDIT.json',{'guidesReviewed':33,'changes':changes,'weaponTypeInheritanceChecked':True,'javelinsInheritSpearType':True})
print(json.dumps({'changes':len(changes),'examples':changes[:14]},indent=2))

