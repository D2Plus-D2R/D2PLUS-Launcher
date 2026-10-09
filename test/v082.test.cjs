const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
test('AlphaV0.8.2 named item identities and all guide prerequisites agree across companions',()=>{
 const d=read('docs/d2plus/v105_data.json'),c=read('docs/d2plus/constants_105.json'),w=read('docs/wiki/database.json'),b=read('docs/d2plus/build-guides.json'),strings=new Map(d.strings);
 assert.equal(w.version,'D2PLUS AlphaV0.8.2');assert.equal(w.guides.length,33);assert.deepEqual(b.guides,w.guides);
 for(const [kind,table,constant,prefix] of [['Unique',d.uniqueItems,c.unq_items,'unique'],['Set piece',d.setItems,c.set_items,'set']]){
  const items=w.records.filter(x=>x.kind===kind);const eligible=Object.entries(table).filter(([k,r])=>r.enabled!==0&&(r.code||r.item));assert.equal(items.length,eligible.length);
  for(const [key,r] of eligible){const id=Number(key.slice(prefix.length)),name=(strings.get(r.index)||r.index).replace(/ÿc./g,'').trim();assert.equal(constant[id].n,name);const rec=items.find(x=>x.nativeItemId===id);assert.ok(rec,key);assert.equal(rec.name,name);assert.equal(rec.sourceKey,r.index);}
 }
 for(const g of w.guides){const allocated=new Map(g.pointPlan.map(p=>[p.skillId,p.points]));assert.equal(allocated.size,g.pointPlan.length);assert.equal([...allocated.values()].reduce((a,b)=>a+b,0),g.listedSkillPoints);assert.ok(g.listedSkillPoints<=111);
  for(const p of g.pointPlan){const s=d.skills[p.skillId];assert.equal(p.skill,c.skills[p.skillId].s);assert.ok(p.points<=s.maxlvl);for(const k of ['reqskill1','reqskill2','reqskill3'])if(s[k])assert.ok(allocated.get(s[k])>=1,g.id+' '+p.skill);}
 }
});
test('AlphaV0.8.2 includes all approved unique balance cells and ranged Storm Lance',()=>{
 const d=read('docs/d2plus/v105_data.json'),w=read('docs/wiki/database.json'),patches=read('release-inputs/unique-balance-v082.json');assert.equal(patches.length,37);
 for(const p of patches){const row=w.records.find(r=>r.kind==='Unique'&&r.sourceKey===p.index)?.sourceRow;assert.ok(row,p.index);for(const [field,v] of Object.entries(p.cells))assert.equal(row[field],v.after,p.index+' '+field);}
 assert.equal(d.skills[14].range,'none');assert.equal(d.skills[14].calc1,'min(1+lvl/10,3)');assert.equal(d.skills[14].srcdam,128);
});
