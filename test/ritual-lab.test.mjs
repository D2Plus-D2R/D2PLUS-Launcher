import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {RitualLab,outcomeForRoll,totalStats} from '../site/ritual-lab-model.mjs';

const read = file=>readFile(new URL('../site/'+file,import.meta.url),'utf8');
const [catalog,rules,pools] = await Promise.all(['ritual-lab-catalog.json','ritual-lab-rules.json','ritual-lab-pools.json'].map(async f=>JSON.parse(await read(f))));
const ready = (roll=26, id=catalog.items[0].id, edge='min') => {
  const calls=[];
  const lab=new RitualLab(catalog,rules,pools,(min,max)=>{calls.push([min,max]);return min===1&&max===100?roll:edge==='min'?min:max;});
  lab.select(id);lab.place('unique');lab.place('sigil');return{lab,calls};
};

test('every one of the 100 bins in every pool has exact 25/40/35 odds and grouped rows',()=>{
  for(const pool of Object.keys(rules.pools)){
    const counts=[0,0,0];
    for(let roll=1;roll<=100;roll++){
      const outcome=outcomeForRoll(rules,pool,roll);
      counts[outcome?.length??0]++;
      if(roll>25)assert.deepEqual(outcome,rules.pools[pool][Math.floor((roll-26)/5)].bonuses);
    }
    assert.deepEqual(counts,[25,40,35],pool);
  }
  for(const roll of [0,101,1.5,NaN])assert.throws(()=>outcomeForRoll(rules,'weap',roll));
  assert.throws(()=>outcomeForRoll(rules,'charm',50));
});

test('all success bins apply one legal row, with inclusive integer range endpoints',()=>{
  for(const pool of Object.keys(rules.pools))for(let roll=26;roll<=100;roll++)for(const edge of ['min','max']){
    const item=catalog.items.find(i=>i.pool===pool);
    const {lab}=ready(roll,item.id,edge);lab.transmute();const state=lab.transmute();
    assert.equal(state.result.accursed,true);
    const row=outcomeForRoll(rules,pool,roll);
    assert.deepEqual(state.result.bonuses.map(b=>b.code),row.map(b=>b.code));
    state.result.bonuses.forEach((b,i)=>assert.equal(b.value,row[i][edge]));
    assert.deepEqual(state.item.stats,item.stats,'original unique stats remain unchanged');
  }
});

test('prepared outcome is private and immutable; finishing consumes no extra random draws',()=>{
  const {lab,calls}=ready(66);const prepared=lab.transmute();const before=calls.length;
  assert.equal(prepared.phase,'prepared');assert.equal(prepared.result,null);
  assert.equal('roll' in prepared,false);
  assert.throws(()=>lab.select(catalog.items[1].id),/Finish the prepared/);
  assert.throws(()=>lab.place('sigil',false));assert.throws(()=>lab.clearHistory());
  assert.throws(()=>{prepared.item.stats[0].value=9999;},TypeError);
  const result=lab.transmute();assert.equal(calls.length,before);
  assert.equal(result.sigilPlaced,false);assert.equal(result.result.bonuses.length,2);
  assert.throws(()=>lab.transmute(),/Place the unique/);
  assert.throws(()=>lab.place('sigil'));
});

test('failure loses all unique powers and does not invent rare affixes',()=>{
  for(const roll of [1,25]){
    const {lab}=ready(roll);lab.transmute();const {result,tally}=lab.transmute();
    assert.equal(result.rare,true);assert.equal(result.accursed,undefined);
    assert.equal(result.base,catalog.items[0].base);assert.deepEqual(result.stats,[]);assert.deepEqual(result.bonuses,[]);
    assert.equal(result.name,'Rare '+catalog.items[0].base);assert.equal(tally.rare,1);
  }
});

test('totals combine existing aliases, attributes, and resistance contributions once',()=>{
  assert.deepEqual(totalStats([{code:'cast3',label:'Faster Cast Rate',value:20,unit:'%'}],[{code:'cast2',value:8}]),[{code:'cast2',label:'Faster Cast Rate',value:28,unit:'%'}]);
  const stats=totalStats([{code:'str',label:'Strength',value:8,unit:''},{code:'res-all',value:20},{code:'res-fire',value:10}],[{code:'str',value:8},{code:'res-all',value:6}]);
  assert.equal(stats.find(s=>s.code==='str').value,16);
  assert.equal(stats.find(s=>s.code==='res-fire').value,36);
  for(const e of ['cold','ltng','pois'])assert.equal(stats.find(s=>s.code==='res-'+e).value,26);
  assert.equal(stats.some(s=>s.code==='res-all'),false);
});

test('only eligible catalog examples can be selected; no repeat ritual or substituted item',()=>{
  const bad={items:[{id:'charm',code:'cm1',pool:'armo'},{id:'cursed',code:'hax',pool:'weap',accursed:true},{id:'prepared',code:'hax',pool:'weap',prepared:true}]};
  const lab=new RitualLab(bad,rules,pools);
  for(const id of ['missing','charm','cursed','prepared'])assert.throws(()=>lab.select(id),/cannot be used/);
  const good=new RitualLab(catalog,rules,pools);assert.throws(()=>good.transmute());good.select(catalog.items[0].id);assert.throws(()=>good.place('tome'));assert.throws(()=>good.transmute());
});

test('fresh copies preserve fixed original rolls and journal is bounded separately from totals',()=>{
  const {lab}=ready(26);const original=JSON.stringify(catalog);
  for(let i=0;i<16;i++){
    if(i){lab.select(catalog.items[0].id);lab.place('unique');lab.place('sigil');}
    lab.transmute();lab.transmute();
  }
  assert.equal(lab.state.history.length,12);assert.equal(lab.state.tally.oneBonus,16);
  lab.select(catalog.items[0].id);assert.deepEqual(lab.state.item.stats,catalog.items[0].stats);assert.equal(lab.state.result,null);
  lab.clearHistory();assert.deepEqual(lab.state.tally,{rare:0,oneBonus:0,twoBonuses:0});assert.deepEqual(lab.state.history,[]);
  assert.equal(JSON.stringify(catalog),original);
});

test('controlled examples cover all pools and their scalar rolls are within source ranges',()=>{
  assert.equal(catalog.items.length,39);assert.equal(new Set(catalog.items.map(i=>i.id)).size,39);
  assert.deepEqual([...new Set(catalog.items.map(i=>i.pool))].sort(),Object.keys(rules.pools).sort());
  for(const item of catalog.items){
    assert.equal(pools[item.code],item.pool);assert.match(item.image,/^(d2plus\/|wiki\/assets\/)/);
    for(const s of item.stats){if(s.text)assert.equal(typeof s.text,'string');else{assert.ok(Number.isFinite(s.value));assert.ok(s.value>=s.minimum&&s.value<=s.maximum,`${item.name} ${s.code}`);}}
  }
  const facet=catalog.items.find(i=>i.id==='unique:unique394');assert.ok(facet.stats.some(s=>s.text==='100% Chance to Cast Level 31 Meteor when You Die'));
  assert.ok(facet.stats.find(s=>s.code==='pierce-fire').value<0);
  assert.ok(catalog.items.every(i=>!i.stats.some(s=>s.code==='all-stats')));
});

test('public page includes sandbox and build also embeds it in the wiki route',async()=>{
  const html=await read('accursed.html');assert.equal((html.match(/id="ritual-lab"/g)??[]).length,1);assert.match(html,/type="module" src="ritual-lab.mjs"/);assert.match(html,/href="ritual-lab.css"/);
  const build=await readFile(new URL('../build/site.py',import.meta.url),'utf8');assert.match(build,/'accursed.html','wiki\/accursed.html'/);
  const source=await read('ritual-lab.mjs');assert.doesNotMatch(source,/type=["']file|\.d2s|FileReader|download=|localStorage|fetch\([^)]*,\s*\{/i);
});
