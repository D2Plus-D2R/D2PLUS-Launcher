"""Synchronize companion catalogs with the complete installed Alpha v0.8 snapshot.
Usage: python build/update-v08-content.py PATH/TO/data
Native save identities and serialization bit definitions are preserved.
"""
from pathlib import Path
import csv, json, re, sys, hashlib, collections, copy

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(sys.argv[1]); WIKI = ROOT/'docs/wiki'; EDITOR = ROOT/'docs/d2plus'
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p, v): p.write_text(json.dumps(v, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8')
def table(n): return list(csv.DictReader((SRC/'global/excel'/n).open(encoding='utf-8-sig'), delimiter='\t'))
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def clean(s): return re.sub(r'ÿc.', '', str(s)).strip()
strings = dict(read(EDITOR/'v105_strings.json'))
for p in sorted((SRC/'local/lng/strings').glob('*.json')):
    for r in read(p):
        if isinstance(r, dict) and 'Key' in r: strings[r['Key']] = r.get('enUS') or r['Key']
def label(s): return clean(strings.get(s, s))
def normal(r):
    out = {}
    for k,v in r.items():
        if not k or not v or (k.startswith('*') and k.lower()!='*id'): continue
        k=k.lower().replace(' ', '').removeprefix('*')
        out[k]=int(v) if re.fullmatch(r'-?\d+',v) else v
    return out

gd=read(EDITOR/'v105_data.json'); old=copy.deepcopy(gd); const=read(EDITOR/'constants_105.json')
wiki=read(WIKI/'database.json'); records=wiki['records']; aliases=wiki.setdefault('recordAliases',{})
if wiki.get('version')=='D2PLUS Alpha v0.8':
    raise SystemExit('Already migrated. Restore the v0.7 companion baseline before re-running this one-time migration.')
skills=table('skills.txt'); desc={r['skilldesc']:r for r in table('skilldesc.txt') if r['skilldesc']}
skill_ids={r['skill'].lower():int(r['*Id']) for r in skills if r.get('*Id','').isdigit()}
skill_names={r['skill']:label(desc.get(r['skilldesc'],{}).get('str name',r['skill'])) for r in skills if r.get('*Id','').isdigit()}
for r in skills:
    if not r.get('*Id','').isdigit(): continue
    i=int(r['*Id']); gd['skills'][str(i)]=normal(r)
    while len(const['skills'])<=i: const['skills'].append({'s':'Unused','c':''})
    const['skills'][i]={'s':skill_names[r['skill']], 'c':r.get('charclass','')}
gd['skillDesc']={k:normal(r) for k,r in desc.items()}
# Preserve extended unused IDs needed by the existing v105 parser.
base_tables={}
for fn,key,ckey in [('misc.txt','misc','other_items'),('weapons.txt','weapons','weapon_items'),('armor.txt','armor','armor_items')]:
    rows=table(fn);base_tables[key]={r['code']:r for r in rows if r.get('code')}
    for code,r in base_tables[key].items():
        row=normal(r); row['name']=label(r.get('namestr') or r.get('name') or code)
        if 'hd' in old[key].get(code,{}):row['hd']=old[key][code]['hd']
        gd[key][code]=row
        c=const[ckey].setdefault(code, {'iq':0,'hi':0,'gt':0,'it':0,'ig':[],'c':['Miscellaneous']})
        c.update(n=row['name'],i=r.get('invfile',''),iw=int(r.get('invwidth') or 1),ih=int(r.get('invheight') or 1))
        for a,b in [('stackable','s'),('maxstack','maxstack')]:
            if a in r and r[a]: c[b]=int(r[a])
for r in table('itemtypes.txt'):
    if r.get('Code'):
        v=normal(r);v['name']=r['ItemType'];gd['itemTypes'][r['Code']]=v
# Resolve named skill parameters before serializing editor properties.
def resolve_params(v):
    for k,x in list(v.items()):
        if re.fullmatch(r'(t1param|par|weaponmod\d+param|helmmod\d+param|shieldmod\d+param)\d*',k) and isinstance(x,str) and x.lower() in skill_ids:
            v[k]=skill_ids[x.lower()]
    return v
for fn,key,prefix,ckey in [('uniqueitems.txt','uniqueItems','unique','unq_items'),('setitems.txt','setItems','set','set_items')]:
    for i,r in enumerate(r for r in table(fn) if r.get('index')!='Expansion'):
        if not r.get('index'):continue
        v=resolve_params(normal(r));v['enabled']=0 if r.get('disabled')=='1' else 1
        native_key=prefix+str(i).zfill(3)
        gd[key][native_key]=v
        previous=old[key].get(native_key,{})
        oldname=label(previous.get('index',''))
        for record in records:
            if record['kind']==('Unique' if key=='uniqueItems' else 'Set piece') and record['name'] in (oldname,previous.get('index')):
                record.update(name=label(r['index']),sourceRow=r,nativeItemId=i)
        while len(const[ckey])<=i:const[ckey].append(None)
        const[ckey][i]={**(const[ckey][i] or {}),'n':label(r['index']),'c':r.get('code') or r.get('item')}
        if r.get('invfile'):const[ckey][i]['i']=r['invfile']

# Native IDs are the full, unfiltered runes.txt row index plus 27.
# The previous custom catalog was one row behind the installed Ritual row.
old_rw={v['name']:k for k,v in old['runes'].items()}
old_rw.update({label(v['name']):k for k,v in old['runes'].items()})
all_runes=table('runes.txt')
active=[r for r in all_runes if r.get('complete')=='1']
native_rune_ids={r['Name']:i+27 for i,r in enumerate(all_runes)}
const['runewords']=[]
new_runes={}; rw_sources=[]
for r in active:
    name=label(r['Name'])
    if r.get('*Rune Name','').startswith('Hustle ('):name=r['*Rune Name']
    key='runeword'+str(native_rune_ids[r['Name']]).zfill(3)
    v=resolve_params(normal(r));v['name']=r['Name'];new_runes[key]=v
    i=int(key[8:])
    while len(const['runewords'])<=i:const['runewords'].append(None)
    const['runewords'][i]={**(const['runewords'][i] or {}),'n':name}
    rw_sources.append({'id':i,'key':r['Name'],'name':name,'runes':[r['Rune'+str(j)] for j in range(1,7) if r['Rune'+str(j)]], 'row':r})
gd['runes']=new_runes
for r in table('gems.txt'):
    if r.get('code'):gd['gems'][r['code']]=resolve_params(normal(r))
gd['strings']=list(strings.items());gd['info']['d2plus']['profile']='alpha-v0.8'
write(EDITOR/'v105_strings.json',list(strings.items()))

# Reconcile duplicate/internal-name wiki runewords into one current record per active row.
previous_rw=[r for r in records if r['kind']=='Runeword'];records[:]=[r for r in records if r['kind']!='Runeword']
labels={p.get('code'):p['label'] for r in previous_rw for p in r.get('propertyRanges',[]) if p.get('code')}
types={r['Code']:r['ItemType'] for r in table('itemtypes.txt') if r.get('Code')}
for info in rw_sources:
    row=info['row'];matches=[r for r in previous_rw if label(r['name'])==info['name']]
    canonical=next((r for r in matches if r['name']==info['name']),None) or (matches[0] if matches else None)
    item=copy.deepcopy(canonical) if canonical else {'id':'alpha-v08-runeword-'+str(info['id']),'kind':'Runeword'}
    for r in matches:
        if r['id']!=item['id']:aliases[r['id']]=item['id']
    bases=[types.get(row['itype'+str(i)],row['itype'+str(i)]) for i in range(1,7) if row['itype'+str(i)]]
    excluded=[types.get(row['etype'+str(i)],row['etype'+str(i)]) for i in range(1,4) if row.get('etype'+str(i))]
    item.update(name=info['name'],source='D2PLUS Alpha v0.8',runes=[label(base_tables['misc'].get(c,{}).get('namestr',c)).removesuffix(' Rune') for c in info['runes']],sockets=len(info['runes']),allowedBases=bases,base=', '.join(bases),nativeRunewordId=info['id'],sourceKey=info['key'],sourceRow=row)
    item['level']=max(int(base_tables['misc'][c].get('levelreq') or 0) for c in info['runes'])
    stats=[]; ranges=[]
    for i in range(1,8):
        code=row.get('T1Code'+str(i));lo=row.get('T1Min'+str(i),'');hi=row.get('T1Max'+str(i),'');param=row.get('T1Param'+str(i),'')
        if not code:continue
        prior=next((p for p in item.get('propertyRanges',[]) if p.get('field')=='T1Code'+str(i) and p.get('code')==code),{})
        title=prior.get('label') or labels.get(code,code)
        if code in ('aura','oskill','skill') and param:title=skill_names.get(param,param)+(' aura level' if code=='aura' else ' skill level')
        suffix='%' if '%' in str(prior.get('minimum','')) else ''
        value=(lo+suffix if lo==hi else lo+suffix+' – '+hi+suffix)
        stats.append({'label':title,'value':value,'rangeType':'fixed' if lo==hi else 'roll'})
        ranges.append({'label':title,'minimum':lo+suffix,'maximum':hi+suffix,'value':value,'kind':'fixed' if lo==hi else 'roll','section':'Runeword bonuses','code':code,'field':'T1Code'+str(i),'detail':skill_names.get(param,param)})
    item['stats']=stats;item['propertyRanges']=ranges
    item['note']='Use a normal-quality socketed base with exactly the listed sockets. Insert runes in this order. Individual rune socket bonuses also apply.'+(' Excludes: '+', '.join(excluded)+'.' if excluded else '')
    records.append(item)

classes={'ama':'Amazon','sor':'Sorceress','nec':'Necromancer','pal':'Paladin','bar':'Barbarian','dru':'Druid','ass':'Assassin','war':'Warlock'}
old_names={}
old_strings=dict(old['strings'])
for id,s in old['skills'].items():
    sd=old['skillDesc'].get(s.get('skilldesc'),{})
    old_names[id]=clean(old_strings.get(sd.get('strname'),sd.get('strname') or s.get('skill','')))
skill_changes=[]
for row in skills:
    id=row.get('*Id');hero=classes.get(row.get('charclass'))
    if not id or not id.isdigit() or not hero:continue
    name=skill_names[row['skill']];oldname=old_names.get(id,'')
    spellings={re.sub(r'[^a-z0-9]','',x.lower()) for x in (name,oldname,row['skill'],old['skills'].get(id,{}).get('skill',''))}
    matches=[r for r in records if r['kind']=='Skill' and re.sub(r'[^a-z0-9]','',r['name'].lower()) in spellings and r.get('hero','') in ('',hero)]
    item=matches[0] if matches else {'id':'alpha-v08-skill-'+id,'kind':'Skill'}
    if not matches:records.append(item)
    sd=desc.get(row['skilldesc'],{});tooltip=label(sd.get('str long',''))
    item.update(name=name,hero=hero,level=int(row.get('reqlevel') or 1),source='D2PLUS Alpha v0.8',skillId=int(id),sourceKey=row['skill'],sourceRow=row,descriptionRow=sd)
    item['note']=tooltip+' '+f"Maximum allocated points: {row.get('maxlvl') or '20'}. Combat values and synergies scale with skill level; the installed formulas are included in the reference data."
    item['stats']=[{'label':'Required level','value':row.get('reqlevel') or '1'},{'label':'Maximum allocated points','value':row.get('maxlvl') or '20'}]
    if old['skills'].get(id)!=gd['skills'][id]:skill_changes.append({'id':int(id),'name':name,'previousName':oldname})
for r in records:
    if r.get('source','').startswith('D2PLUS'):r['source']='D2PLUS Alpha v0.8'
    if r['kind'] in ('Unique','Set piece'):
        r['name']=label(r['name'])
for code,row in base_tables['misc'].items():
    if code in old['misc']:continue
    records.append({'id':'alpha-v08-misc-'+code,'kind':'Misc item','name':label(row.get('namestr') or code),'source':'D2PLUS Alpha v0.8','level':int(row.get('levelreq') or 0),'base':code,'hero':'','stats':[{'label':'Item code','value':code}],'note':'Installed item definition. Internal vendor/quest variants may share a display name; presence in the data does not guarantee a drop or vendor listing.'})
features=['Eight custom runes in the rune stash tab: Vyr, Nym, Pyr, Ael, Khar, Zyr, Thyr and Eon.','Ten D2PLUS materials in the material stash tab, including Worldforge Shards, Artisan’s Embers, Sovereign Seals and all seven Elder Gems.','Updated skills and simpler skill icons from the supplied complete installation.','Alpha v0.8 splash artwork; refreshed skill names, item definitions and all 163 enabled runewords in the offline references.','Guided Windows installation with automatic mod paths and launch arguments, plus a separate all-in-one D2RMM download.']
for id,title,note in [('rune-stash','Custom rune stash',features[0]),('material-stash','Crafting material stash',features[1])]:
    records.append({'id':'alpha-v08-'+id,'kind':'Mod system','name':title,'source':'D2PLUS Alpha v0.8','level':'','base':'','hero':'','stats':[],'note':note+' Mouse/keyboard and controller layouts included.'})
wiki['version']='D2PLUS Alpha v0.8';wiki['summary']=dict(collections.Counter(r['kind'] for r in records))
wiki['patchNotes'].insert(0,{'id':'alpha-v08','version':'Alpha v0.8','date':'October 7, 2026','title':'One complete journey','summary':'The complete stash, skills and companion release.','sections':[{'title':'Alpha v0.8','bullets':features}]})
wiki['news'].insert(0,{'id':'alpha-v08','date':'October 7, 2026','tag':'Alpha v0.8','title':'One complete journey','summary':'Rune and material stash tabs, new skills, simpler icons and guided setup.','body':features})
wiki['contentSnapshot']={'modVersion':'Alpha v0.8','date':'2026-10-07','notes':'Generated from the user-supplied complete installed snapshot. Native save IDs retained; live game and Android device testing remain separate.'}
assert len({r['id'] for r in records})==len(records)
write(WIKI/'database.json',wiki);(WIKI/'data.js').write_text('window.D2PLUS_DATA = '+json.dumps(wiki,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
write(EDITOR/'v105_data.json',gd);write(EDITOR/'constants_105.json',const)
for stem in ('v105_data','constants_105'):
    m=read(EDITOR/(stem+'.manifest.json'));m.update(profile='d2plus-alpha-v0.8',generatedAt='2026-10-07',sha256=digest(EDITOR/(stem+'.json')))
    m['counts'].update(skills=len(gd['skills']),skillDescriptions=len(gd['skillDesc']),runewords=len(new_runes),uniques=len(gd['uniqueItems']),setItems=len(gd['setItems']),miscBases=len(gd['misc']),strings=len(strings))
    write(EDITOR/(stem+'.manifest.json'),m)
m=read(EDITOR/'constants_105.manifest.json')
(EDITOR/'constants_105.bundle.js').write_text('window.constants_d2plus = '+json.dumps({'constants':const,'manifest':m},ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
audit={'version':'Alpha v0.8','enabledRunewords':len(active),'editorRunewords':len(new_runes),'wikiRunewords':sum(r['kind']=='Runeword' for r in records),'duplicateRunewordsRemoved':len(previous_rw)-len(active),'updatedClassSkills':skill_changes,'newMiscCodes':sorted(set(gd['misc'])-set(old['misc'])),'sourceHashes':{p.name:digest(p) for p in sorted((SRC/'global/excel').glob('*.txt'))},'recordCounts':wiki['summary'],'nativeSaveSchemaPreserved':gd['itemStatCost']==old['itemStatCost']}
write(WIKI/'ALPHA_V08_AUDIT.json',audit)
print(json.dumps({k:v for k,v in audit.items() if k not in ('sourceHashes','updatedClassSkills','newMiscCodes')},indent=2))
import subprocess
subprocess.run([sys.executable,str(ROOT/'build/normalize-v08-editor.py'),str(SRC)],check=True)
