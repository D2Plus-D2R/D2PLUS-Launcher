"""Refresh release references from the validated final installed v0.7 tables.
Usage: python build/update-v07-content.py /path/to/installed-v07 /path/to/token.png
Preserves catalog IDs, user-bookmark aliases, and the editor's save-format schema.
"""
from pathlib import Path
import csv,json,sys,re,hashlib,collections,copy,shutil
root=Path(__file__).resolve().parents[1];src=Path(sys.argv[1]);token=Path(sys.argv[2]);wiki=root/'docs/wiki';editor=root/'docs/d2plus'
def table(name):return list(csv.DictReader((src/'global/excel'/name).open(encoding='utf-8-sig'),delimiter='\t'))
def read(path):return json.loads(path.read_text())
def write(path,obj):path.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'))+'\n')
names={}
for p in (src/'local/lng/strings').glob('*.json'):
 a=read(p)
 if isinstance(a,list):names.update({r['Key']:r.get('enUS',r['Key']) for r in a if isinstance(r,dict) and 'Key'in r})
misc=table('misc.txt');items={r['code']:r for r in misc};cube=table('cubemain.txt');mon={r['Id']:r for r in table('monstats.txt')}
def name(code):return names.get(items.get(code,{}).get('namestr',code),code)
d=read(wiki/'database.json');records=d['records'];prior_ids={r['id'] for r in records}
def renamed(v):
 if isinstance(v,str):return re.sub(r'(?<!Western )(?<!Eastern )(?<!Southern )(?<!Deep )(?<!Northern )Worldstone Shard','Worldforge Shard',v)
 if isinstance(v,list):return [renamed(x) for x in v]
 if isinstance(v,dict):return {k:renamed(x) for k,x in v.items()}
 return v
records[:]=[renamed(r) for r in records]
smelts={name(r['input 1'].split(',')[0]):r for r in cube if r['description'].startswith('D2PLUS Smelt:') and r['enabled']=='1'}
updated_smelts=0
for r in records:
 if r['kind']=='Recipe' and (r['name'].startswith('D2PLUS Smelt:') or r['name'].startswith('Smelt ')):
  key=(r.get('ingredients') or [''])[0]
  if key in smelts:
   c=smelts[key];output=name(c['output']);r.update(name='Smelt '+key+' → '+output,outputs=[output],source='D2PLUS Alpha v0.7',note='Cube '+key+" + Artisan's Ember + Sovereign Seal to create "+output+'. Ingredients are consumed.');updated_smelts+=1
apex={r['description'].split(': ',1)[1]:r for r in cube if any(r.get('input '+str(i))=='wss' for i in range(1,8))}
labels={'dmg%':'Enhanced damage','swing1':'Increased attack speed','crush':'Crushing Blow','deadly':'Deadly Strike','allskills':'All skills','ac%':'Enhanced defense','res-all':'All resistances','red-dmg%':'Physical damage reduction','hp':'Life','balance1':'Faster hit recovery','mana':'Mana','block1':'Faster block rate','block':'Increased chance of blocking','str':'Strength','lifesteal':'Life stolen per hit','move1':'Faster run/walk','dex':'Dexterity','nofreeze':'Cannot Be Frozen','all-stats':'All attributes','cast1':'Faster cast rate'}
percent={'dmg%','swing1','crush','deadly','ac%','red-dmg%','balance1','block1','block','lifesteal','move1','cast1'}
bases={'weap':'weapon','tors':'body armor','helm':'helm','shld':'shield','glov':'gloves','boot':'boots','belt':'belt','amul':'amulet'}
for r in records:
 key=r['name'].removeprefix('D2 Plus Craft: ')
 if r['kind']=='Recipe' and key in apex:
  c=apex[key];r['ingredients']=['Magic '+bases[c['input 1'].split(',')[0]],'Worldforge Shard','Sovereign Seal',name(c['input 4']),name(c['input 5'])];r['outputs']=['Crafted item of the supplied base type'];r['base']=' + '.join(r['ingredients']);r['stats']=[]
  for i in range(1,6):
   code=c['mod '+str(i)];lo=c['mod '+str(i)+' min'];hi=c['mod '+str(i)+' max'];value=lo if lo==hi else lo+'–'+hi
   if code=='nofreeze':value='Yes'
   elif code in percent:value+='%'
   r['stats'].append({'label':labels[code],'value':value})
  r['note']='Apex craft. Consumes the five ingredients and creates crafted equipment; the recipe title is not a guaranteed unique-item name. Recipe bonuses shown; random crafted affixes can add properties.';r['source']='D2PLUS Alpha v0.7'
trinkets={names.get(r['index'],r['index']) for r in table('uniqueitems.txt') if r['code']=='ztr'}
for r in records:
 if r['name'] in trinkets:
  r['farming']=['Nightmare and Hell Secret Cow Level: 1 in 2,000 per eligible cow for any trinket; all 32 equally weighted (1 in 64,000 for this identity). Regular, champion and random unique cows. Normal and Cow King-specific tables unchanged.']
  r['note']=r.get('note','').split(' Alpha v0.7:')[0]+' Alpha v0.7: equipment level requirements do not restrict the equal-weight drop pool; repeat drops in one game are allowed.'
 if r['name']=='Worldforge Shard':
  r['note']='D2PLUS crafting material, formerly Worldstone Shard. Same wss identity and custom 1×1 artwork. Used by eight Apex crafting recipes.'
  r['farming']=['Hell act bosses and eligible champion/unique monsters; Nightmare Griswold, Smith and Cow King also have a path through Hell item pools. Regular cows and Countess-based Sovereign Wardens do not have a drop route.']
 if r['id'].startswith('alpha-v05-warden-'):
  boss=r['id'].removeprefix('alpha-v05-warden-');row=mon['d2a3_warden_'+boss]
  r['note']='Act-boss escort with 30% more base health in every difficulty. Warden-only Countess-style loot retains rune tiers but reduces players-1 bonus success per attempt from 75% to 60%; total rune drops also depend on drop caps and player settings. The Countess herself is unchanged.'
  r['stats']=[{'label':label+' base life','value':row[col]} for label,col in [('Normal','minHP'),('Nightmare','MinHP(N)'),('Hell','MinHP(H)')]]
 if r.get('source','').startswith('D2PLUS'):r['source']='D2PLUS Alpha v0.7'
def add(key,title,kind,note,stats=None,**extra):
 id='alpha-v07-'+key;r=next((r for r in records if r['id']==id),None)
 if r is None:r={};records.append(r)
 r.update(id=id,name=title,kind=kind,source='D2PLUS Alpha v0.7',level='',base='',hero='',note=note,stats=stats or []);r.update(extra)
add('token-regret','Token of Regret','Misc item','Consumable full respec: right-click to refund all allocated stat and skill points. Sold by Akara, Drognan, Ormus, Jamella and Malah on Normal, Nightmare and Hell. Target purchase price 250,000 gold before native quest/equipment discounts. Uses the native Token of Absolution respec action. Two internal price variants share the same name, artwork and effect.',[{'label':'Price before discounts','value':'250,000 gold'},{'label':'Inventory size','value':'1×1'},{'label':'Consumed on use','value':'Yes'}],art={'src':'../wiki/assets/token-of-regret.png','source':'D2PLUS original artwork','usesBaseArt':False,'baseCode':'trg'},level=1)
add('smelting','Set smelting balance','Mod system','Lower-level set rewards are capped by the higher of set quality level and required level: 1–15 Ith; 16–30 Ort; 31–45 Sol; 46–60 Hel. 163 recipe rewards reduced. Existing lower rewards never increase. Higher-tier sets, unique smelting and input costs unchanged.')
equipment={'I':'Bows and crossbows','II':'Original Act II polearm/spear rules','III':'Staff, or orb and shield','V':'Doom Reaver: dual swords. Dreadguard: one-handed melee weapon and shield.'}
for c in d['companions']:
 c['equipment']=equipment[c['act']]
 if c['act']=='III':c.update(role='Summoner sorcerer',purpose='Fire, Cold or Lightning spellcaster.',bases='Staff, or orb and shield')
 if c['act']=='I':c['role']='Blood Raven'
 if c['act']=='II':c['role']='Cow King'
 if c['act']=='V':c['role']='Dreadguard / Doom Reaver'
add('merc-equipment','Mercenary equipment and portraits','Mod system','Act I Blood Raven uses bows/crossbows; Act II Cow King retains native equipment; Act III Summoner uses staff or orb/shield; Act V Doom Reaver uses dual swords and Dreadguard uses a one-handed melee weapon/shield. Custom portraits, class labels and personal names are selectable; separate Act V portraits default off.')
add('maps','Reset offline maps','Mod system','The Windows launcher has a default-off Reset offline maps checkbox. It adds D2R’s native -resetofflinemaps switch for the next process launch. While enabled, new games reroll maps. Restart D2R after changing the option. The launcher does not delete character saves.')
sections=[{'title':'Final Alpha v0.7','bullets':['Token of Regret: full stat/skill respec, sold in every act and difficulty; 250,000 gold before native discounts.','Nightmare and Hell cow trinkets: 1 in 2,000; all 32 equally weighted.','163 lower-level set-smelting payouts reduced.','Worldforge Shard name replaces the custom Worldstone Shard; codes and eight Apex recipes retained.','Mercenary equipment, portraits and names; Warden health +30% and reduced bonus runes.','Alpha v0.7 loading screen, synchronized offline references, editor browse fix and launcher map-reset option.']}]
d['patchNotes']=[x for x in d['patchNotes'] if x.get('id')!='alpha-v07'];d['patchNotes'].insert(0,{'id':'alpha-v07','version':'Alpha v0.7','date':'October 3, 2026','title':'Alpha v0.7 — Regret and renewal','summary':'The final v0.7 feature set and synchronized companion tools.','sections':sections})
d['news']=[x for x in d['news'] if x.get('id')!='alpha-v07'];d['news'].insert(0,{'id':'alpha-v07','date':'October 3, 2026','tag':'Alpha v0.7','title':'A second chance in Sanctuary','summary':'Full-respec tokens, restored cow trinkets and balanced smelting.','body':sections[0]['bullets']})
d['version']='D2PLUS Alpha v0.7';d['summary']=dict(collections.Counter(r['kind'] for r in records));d['contentSnapshot']={'modVersion':'Alpha v0.7','date':'2026-10-03','notes':'v0.7 additions, changed recipes and Warden data read from the validated default installation; established IDs, guides and unchanged catalog retained. Live game and device testing pending.'}
assert prior_ids<={r['id'] for r in records}
write(wiki/'database.json',d);(wiki/'data.js').write_text('window.D2PLUS_DATA = '+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';\n');shutil.copyfile(token,wiki/'../wiki/assets/token-of-regret.png')
# Hero editor: retain serialization schema and existing indexes; append misc codes.
data=read(editor/'v105_data.json');strings=read(editor/'v105_strings.json');constants=read(editor/'constants_105.json')
for code in ['trg','tr5']:
 r=items[code];entry=copy.deepcopy(data['misc']['toa']);entry.update(name='Token of Regret',code=code,namestr='d2p07_token_regret',type='zrg',invfile='invtoa',level=1,levelreq=1,cost=int(r['cost']),hd='d2plus/token_of_regret',spelldescstr='d2p07_token_regret_use');data['misc'][code]=entry
 c=copy.deepcopy(constants['other_items']['toa']);c.update(n='Token of Regret',i='invtoa',c=['Miscellaneous']);constants['other_items'][code]=c
data['misc']['wss']['name']='Worldforge Shard';constants['other_items']['wss']['n']='Worldforge Shard'
data['itemTypes']['zrg']={**copy.deepcopy(data['itemTypes']['misc']),'name':'D2PLUS Respec Token','equiv1':'misc','normal':1,'storepage':'misc','treasureclass':0}
data['info']['d2plus']['profile']='alpha-v0.7';data['info']['d2plus']['tokenOfRegretCodes']=['trg','tr5']
if isinstance(strings,dict):strings.update(wss='Worldforge Shard',d2p07_token_regret='Token of Regret',d2p07_token_regret_use='Right-click to reset all allocated stat and skill points.')
write(editor/'v105_data.json',data);write(editor/'v105_strings.json',strings);write(editor/'constants_105.json',constants)
for n in ['v105_data','constants_105']:
 p=editor/(n+'.manifest.json');m=read(p);m.update(profile='d2plus-alpha-v0.7',generatedAt='2026-10-03',sha256=hashlib.sha256((editor/(n+'.json')).read_bytes()).hexdigest());m['counts']['miscBases']=len(data['misc'] if n=='v105_data' else constants['other_items']);write(p,m)
m=read(editor/'constants_105.manifest.json');(editor/'constants_105.bundle.js').write_text('window.constants_d2plus = '+json.dumps({'constants':constants,'manifest':m},ensure_ascii=False,separators=(',',':'))+';\n')
art=editor/'art/hd/misc/d2plus';art.mkdir(parents=True,exist_ok=True);shutil.copyfile(token,art/'token_of_regret.png')
audit={'version':'Alpha v0.7','retainedRecordIds':len(prior_ids),'records':len(records),'smeltingRecordsRefreshed':updated_smelts,'trinketPoolNames':len(trinkets),'apexRecipes':len(apex),'tokenCodes':['trg','tr5'],'sourceHashes':{n:hashlib.sha256((src/'global/excel'/n).read_bytes()).hexdigest() for n in ['misc.txt','cubemain.txt','monstats.txt','uniqueitems.txt']}}
write(wiki/'ALPHA_V07_AUDIT.json',audit);print(json.dumps(audit))
