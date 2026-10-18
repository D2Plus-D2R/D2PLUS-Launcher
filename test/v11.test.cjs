const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
test('V1.1 reviewed unique ranges agree with both editor and wiki',()=>{
 const edits=read('release-inputs/unique-balance-v11.json'),d=read('docs/d2plus/v105_data.json'),w=read('docs/wiki/database.json');
 assert(Object.keys(edits).length>=250);
 for(const [key,cells] of Object.entries(edits)){const r=w.records.find(r=>r.kind==='Unique'&&r.sourceKey===key);assert(r,key);for(const [field,value] of Object.entries(cells))assert.equal(r.sourceRow[field],value,key+' '+field);}
 for(const s of ['d2plus_accursed_roll','d2plus_accursed_mark'])assert(d.itemStatCost[s]);
 assert.equal(d.itemStatCost.d2plus_accursed_roll.id,373);assert.equal(d.itemStatCost.d2plus_accursed_mark.id,374);
 assert.equal(d.itemStatCost.d2plus_accursed_roll.savebits,11);assert.equal(d.itemStatCost.d2plus_accursed_mark.savebits,1);
 assert(d.misc.acs);assert.equal(d.misc.acs.invwidth,1);assert.equal(d.misc.acs.invheight,1);
});
test('all build guides have bounded Accursed choices and preserve save identities',()=>{
 const b=read('docs/d2plus/build-guides.json');assert.equal(b.guides.length,33);
 for(const g of b.guides){assert(g.accursed.targets.length>=2,g.id);assert(g.accursed.risk.includes('25%'),g.id);}
 const global={};vm.runInNewContext(fs.readFileSync(path.join(root,'docs/d2plus/item-labels.js'),'utf8'),{window:global});
 const c=read('docs/d2plus/constants_105.json');assert.match(global.D2PLUS_ITEM_LABEL({type:'hax',quality:7,unique_id:0,identified:1,_d2plusAccursed:true},c),/Accursed/);
 assert(!global.D2PLUS_ITEM_LABEL({type:'hax',quality:7,unique_id:0,identified:1},c).includes('Accursed'));
 const source=fs.readFileSync(path.join(root,'docs/js/app.bafc4d91.js'),'utf8');assert(source.includes('_d2plusAccursed:'));assert(!source.includes('Alpha v0.8'));assert(/new Set\(\[[^\]]*"cfe"[^\]]*"acs"/.test(source));
});
test('farming entries respect item level and the specific boss difficulty',()=>{
 const a=read('docs/wiki/BOSS_FARMING_V11.json');const rows=a.qualifications;
 assert(Array.isArray(rows),'named eligibility list');
 for(const r of rows){assert(r.monsterLevel>=r.itemQualityLevel,r.item);assert(r.path.length>0);if(r.id==='d2plus_butcher'&&r.difficulty==='Normal'){assert.equal(r.treasureClass,'Griswold');assert(r.itemQualityLevel<=8);}}
 assert(rows.some(r=>r.id==='d2a3_warden_baalcrab'&&r.kind==='Set piece'));
});
