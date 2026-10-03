"""Refresh the Alpha v0.5 wiki from an extracted, installed working data folder.
Usage: python3 build/update-wiki.py /path/to/data
Does not modify gameplay files or the hero editor's save-format database.
"""
from pathlib import Path
import sys,json,csv,collections,hashlib,shutil,re
root=Path(__file__).resolve().parents[1]; source=Path(sys.argv[1]); wiki=root/'docs/wiki'
def read(name):return json.loads((source/name).read_text(encoding='utf-8-sig'))
def table(name):return list(csv.DictReader((source/'global/excel'/name).open(encoding='utf-8-sig'),delimiter='\t'))
d=json.loads((wiki/'database.json').read_text()); records=d['records']
roles=read('d2plus/mercenaries/doom-knight-roles.json'); potions=read('d2plus/alpha003-potions-report.json')
labels={'skill_armor_percent':'Enhanced defense','normal_damage_reduction':'Damage reduced by','damagepercent':'Enhanced physical damage','item_tohit_percent':'Bonus attack rating','item_fastercastrate':'Faster cast rate','manarecoverybonus':'Mana regeneration','item_fastermovevelocity':'Faster run/walk','item_fastergethitrate':'Faster hit recovery','fireresist':'Fire resistance','coldresist':'Cold resistance','lightresist':'Lightning resistance','item_magicbonus':'Better chance of getting magic items'}
names={s['skill']:s['name'] for s in roles['skills']}
# Refresh every hireling record from the actual installed rows; keep stable wiki IDs.
mercs=[r for r in records if r['kind']=='Mercenary']; rows=table('hireling.txt');assert len(mercs)==len(rows)==135
fields={'HP':'Base life','HP/Lvl':'Life growth','Defense':'Base defense','Def/Lvl':'Defense growth','AR':'Base attack rating','AR/Lvl':'Attack rating growth','Dmg-Min':'Minimum base damage','Dmg-Max':'Maximum base damage','Dmg/Lvl':'Damage growth','ResistFire':'Base fire resistance','ResistCold':'Base cold resistance','ResistLightning':'Base lightning resistance','ResistPoison':'Base poison resistance'}
looks={'1':'Blood Raven','2':'Cow King','3':'D1-inspired Summoner','5':'Doom Knight'}
for r,row in zip(mercs,rows):
 assert r['hirelingId']==int(row['Id']) and r['gameVersion']==int(row['Version'])
 role=('Doom Reaver' if row['Class']=='560' else 'Dreadguard') if row['Act']=='5' else looks[row['Act']]
 r['name']=f"Act {row['Act']} · {role} · {row['*SubType']} · level {row['Level']} · "+('Classic' if row['Version']=='0' else 'Expansion')
 r['source']='D2PLUS Alpha v0.5';r['stats']=[{'label':v,'value':row[k]} for k,v in fields.items()]
 r['stats'] += [{'label':names.get(row['Skill'+str(i)],row['Skill'+str(i)])+' level','value':row['Level'+str(i)]} for i in range(1,7) if row['Skill'+str(i)]]
 r['note']='Captured from the working Alpha v0.5 hireling table. Base values at this row’s hiring level; growth uses native game units. Equipment, difficulty and level scaling affect final totals. Appearance: '+looks[row['Act']]+'.'
# Replace only entries owned by this updater on repeated runs.
records[:]=[r for r in records if not r['id'].startswith('alpha-v05-')]
def add(id,name,kind,note,stats=None,**kw):
 r={'id':'alpha-v05-'+id,'name':name,'kind':kind,'source':'D2PLUS Alpha v0.5','level':'','base':'','hero':'','stats':stats or [],'note':note};r.update(kw);records.append(r)
for i,p in enumerate(potions['potions'],1):
 add('potion-'+str(i),p['name'],'Misc item','Hell-only luxury buff potion. Sold by Akara, Lysander, Alkor, Jamella and Malah. Target price before quest and equipment discounts; actual shop price may differ. Reusing the same potion reapplies its own state.',
 [{'label':labels[k],'value':str(v)+('' if k=='normal_damage_reduction' else '%')} for k,v in p['effects']]+[{'label':'Duration','value':'10 minutes'},{'label':'Target price','value':f"{p['entries'][0]['targetPrice']:,} gold"}],level=60)
for s in roles['skills']:add(s['skill'],s['name'],'Skill',s['description'],[{'label':'Used by','value':'Dreadguard' if int(s['id'])<457 else 'Doom Reaver'}])
for boss,label in [('andariel','Andariel'),('duriel','Duriel'),('mephisto','Mephisto'),('diablo','Diablo'),('baalcrab','Baal')]:
 row=next(r for r in table('monstats.txt') if r['Id']=='d2a3_warden_'+boss)
 assert [row['TreasureClass'+s] for s in ['', '(N)', '(H)']]==['Countess','Countess (N)','Countess (H)']
 add('warden-'+boss,'Sovereign Warden · '+label,'Monster','Distinguished boss escort with a gold-name presentation. Uses the existing Countess parent treasure class for the current difficulty, including its item/rune structure. This does not guarantee a particular rune. Configured for all five act bosses; Andariel and Mephisto were explicitly confirmed in playtesting.',[{'label':'Normal drops','value':'Countess'},{'label':'Nightmare drops','value':'Countess (Nightmare)'},{'label':'Hell drops','value':'Countess (Hell)'}])
add('dungeons','Astral Reliquary and Sovereign Dunes','Mod system','Experimental dungeon prototypes remain outside this working snapshot. Their portal-entry crashes are unresolved. The working Furnace of Storms is retained. Do not use the older Reliquary art/private-model probes with this release.')
for r in records:
 if r['name']=='Worldstone Shard':
  r['art']={'src':'assets/worldstone-shard.png','source':'D2PLUS custom artwork','usesBaseArt':False,'baseCode':'wss'}
  r['note']='Custom crimson Worldstone Shard inventory artwork, occupying one 1×1 slot. Existing item identity and all Cube recipes are unchanged in Alpha v0.5.'
 if r.get('source','').startswith('D2PLUS'):r['source']='D2PLUS Alpha v0.5'
# Reflect the installed skill formulas for the 21 class-passive presentation fixes.
strings={r['Key']:r.get('enUS',r['Key']) for r in read('local/lng/strings/skills.json')}
passives=read('d2plus/alpha003-presentation-report.json')['passives']; skills={r['skill']:r for r in table('skills.txt')}
for p in passives:
 s=skills[p['skill']]
 if p['formula']=='ln12':
  add('passive-'+p['skill'],strings.get(p['skill']+'_name',p['skill'])+' · numeric tooltip','Skill change',f"Numeric passive tooltip repair: {'passive bonus'}. Value at skill level L is {s['Param1']} + (L − 1) × {s['Param2']}. Consult the in-game named passive for the current level.")
# Retain the existing named skill catalog; presentation-only updates above do not change skill balance.
sections=[{'title':'Mercenaries','bullets':['Act I: Blood Raven with visible bow and custom palette. Native Fire and Cold specializations retained.','Act II: Cow King appearance with native auras and Jab.','Act III: Summoner with a Diablo I-inspired robe; Fire, Lightning and Cold hirelings retained. Shared robe art also affects the Summoner boss.','Act V: fixed-sword Doom Knights. Dreadguard uses Grave Strike, Dread Cry and Bone Guard; red Doom Reaver uses Ruin Frenzy, Siphoning Blade and Reaver’s Challenge.','All 135 hireling records refreshed from the working tables. Failed isolated Sorcerer and horn-removal experiments are excluded.']},{'title':'Hell Alchemy','bullets':['Six level-60 luxury potions last 10 minutes. Hell vendors: Akara, Lysander, Alkor, Jamella and Malah.','Target costs range from 500,000 to 650,000 gold before discounts. Exact potion effects are searchable in the item catalog.']},{'title':'Bosses and crafting','bullets':['Sovereign Wardens are configured alongside each act boss and use the Countess drop table of the corresponding difficulty.','Worldstone Shard receives new transparent inventory artwork and remains 1×1. Cube recipes are unchanged.','Custom rune labels and numeric passive tooltips include the Alpha 0.0.3 presentation fixes.']},{'title':'Release status','bullets':['Based on the user-tested installed v0.5 prototype plus the Shard art replacement.','Astral Reliquary and Sovereign Dunes are not enabled in this snapshot; their portal-entry crashes remain unresolved. Furnace content is retained.','File checks do not substitute for Windows launcher or in-game testing. Existing build guides are retained; their gear recommendations have not been re-optimized for the new mercenaries.']}]
d['patchNotes']=[p for p in d['patchNotes'] if p['version']!='Alpha v0.5'];d['patchNotes'].insert(0,{'version':'Alpha v0.5','date':'October 3, 2026','status':'Working gameplay prototype; updated launcher and Shard art require live validation','summary':'Four mercenary appearances, two Doom Knight roles, Hell Alchemy, Countess-drop Wardens and new Shard artwork.','sections':sections})
d['news']=[n for n in d['news'] if n['id']!='alpha-v05'];d['news'].insert(0,{'id':'alpha-v05','date':'October 3, 2026','tag':'Alpha v0.5','title':'New companions for Sanctuary','summary':'Blood Raven, Cow King, the robed Summoner and two Doom Knight roles join the working alpha.','body':[b for s in sections for b in s['bullets']]})
d['version']='D2PLUS Alpha v0.5';d['summary']=dict(collections.Counter(r['kind'] for r in records));d['contentSnapshot']={'modVersion':'Alpha v0.5','date':'2026-10-03','gameDataCapture':'User-supplied working prototype','notes':'Mercenary rows and v0.5 additions read from installed data. Established item and recipe catalog retained. Historical news/build guides retain their original context.'}
for c in d['companions']:
 c['appearance']={'I':'Blood Raven','II':'Cow King','III':'D1-inspired Summoner','V':'Dreadguard / Doom Reaver'}[c['act']]
(wiki/'database.json').write_text(json.dumps(d,ensure_ascii=False,separators=(',',':')))
(wiki/'data.js').write_text('window.D2PLUS_DATA = '+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';\n')
# Audit evidence excludes all personal data and paths.
audit={'version':'Alpha v0.5','refreshedHirelingRows':len(rows),'potionDurationFrames':potions['durationFrames'],'sourceHashes':{str(p.relative_to(source)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [source/'global/excel/hireling.txt',source/'global/excel/cubemain.txt',source/'global/excel/monstats.txt']},'recordCounts':d['summary']}
(wiki/'ALPHA_V05_AUDIT.json').write_text(json.dumps(audit,indent=2))
print('Wiki refreshed:',len(records),'records')
