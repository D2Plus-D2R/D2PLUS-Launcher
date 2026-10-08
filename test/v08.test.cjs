const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {installationPlan,installSnapshot}=require('../scripts/guided-install.cjs');
const docs=path.join(__dirname,'../docs'),json=p=>JSON.parse(fs.readFileSync(path.join(docs,p),'utf8'));
test('guided install preserves an existing output and extra arguments; rejects destinations outside the game',()=>{
 assert.equal(installationPlan({gameExe:'C:\\Game Folder\\D2R.exe',arguments:''}).directory,'C:\\Game Folder\\mods\\D2RMM');
 const p=installationPlan({gameExe:'C:\\Game Folder\\D2R.exe',modDirectory:'C:\\Game Folder\\mods\\MyMod',arguments:'-mod MyMod -txt -w'});
 assert.equal(p.modName,'MyMod');assert.match(p.arguments,/-w/);
 assert.throws(()=>installationPlan({gameExe:'C:\\Game\\D2R.exe',modDirectory:'C:\\Other\\mods\\Bad'}));
 assert.throws(()=>installationPlan({gameExe:'C:\\Game\\D2R.exe',modDirectory:'C:\\Game\\mods\\..'}));
 assert.throws(()=>installationPlan({gameExe:'C:\\Game\\Other.exe'}));
});
test('wiki, editor and constants agree on every enabled native runeword including Ritual and custom endpoints',()=>{
 const d=json('d2plus/v105_data.json'),c=json('d2plus/constants_105.json'),w=json('wiki/database.json');
 const rw=w.records.filter(r=>r.kind==='Runeword');assert.equal(rw.length,163);assert.equal(Object.keys(d.runes).length,163);
 for(const r of rw){const key='runeword'+String(r.nativeRunewordId).padStart(3,'0'),v=d.runes[key];assert.ok(v,r.name);assert.equal(c.runewords[r.nativeRunewordId].n,r.name);assert.equal(v.name,r.sourceKey);assert.equal(r.sockets,r.runes.length);assert.ok(!r.name.startsWith('D2PlusRuneword'));}
 assert.equal(d.runes.runeword207.name,'Runeword182');assert.equal(d.runes.runeword208.name,'D2PlusRuneword001');assert.equal(d.runes.runeword271.name,'D2PlusRuneword064');
 assert.equal(d.runes.runeword271.t1param2,123); // Conviction, not the old placeholder Attack (0).
});
test('updated skills and item identity zero have current localized labels',()=>{
 const d=json('d2plus/v105_data.json'),c=json('d2plus/constants_105.json');assert.equal(d.skills['460'].skill,'d2p7_bloodroot_cycle');
 for(const name of ['Storm Lance','Arcane Tempest','Soul Harvest','Judgment','Shadow Rift','Storm Cry','Bloodroot','Blight Creeper','Spirit of the Gale','Ravage'])assert.ok(c.skills.some(s=>s?.s===name),name);
 const window={};vm.runInNewContext(fs.readFileSync(path.join(docs,'d2plus/item-labels.js'),'utf8'),{window});
 assert.match(window.D2PLUS_ITEM_LABEL({type:'hax',quality:7,unique_id:0,identified:1},c),/The Gnasher/);
 const final=window.D2PLUS_ITEM_LABEL({type:'7pa',given_runeword:1,runeword_id:271,identified:1},c);assert.match(final,/Final Hour/);
 assert.equal(d.uniqueItems.unique702.index,'Dplus Chronicle Relic');assert.equal(c.unq_items[702].n,dictName(d,'Dplus Chronicle Relic'));
});
function dictName(d,key){return new Map(d.strings).get(key)||key;}

test('new installed save stats and socket columns match the native editor schema',()=>{
 const d=json('d2plus/v105_data.json'),c=json('d2plus/constants_105.json');
 for(const [name,id] of [['d2s_proofs',371],['d2s_roll',372]]){
  assert.equal(d.itemStatCost[name].id,id);assert.equal(d.itemStatCost[name].savebits,7);
  assert.equal(c.magical_properties[id].s,name);assert.equal(c.magical_properties[id].sB,7);
 }
 for(const r of Object.values(d.itemTypes))if(r.maxsockets3!==undefined)assert.equal(r.maxsock40,r.maxsockets3);
});
test('editor manifest hashes cover the actual refreshed data',()=>{
 for(const stem of ['v105_data','constants_105']){const m=json('d2plus/'+stem+'.manifest.json');assert.equal(m.profile,'d2plus-alpha-v0.8');assert.equal(m.sha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(docs,'d2plus/'+stem+'.json'))).digest('hex'));}
});
