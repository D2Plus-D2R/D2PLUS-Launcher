import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {D2RSaver,checkOathPlacement} from '../editor-native-v13/index.js';
import {createTemplate,itemSignature} from '../editor-native-v13/item-library.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const saver=D2RSaver.fromData(read('docs/d2plus/v105_data.json'),read('docs/d2plus/v105_strings.json'));
const rules=read('release-inputs/alpha-v13-charm-rules.json');
test('all 140 Oath outcomes retain their exact aura and display stats through native serialization',()=>{
 let outcomes=0,presets=0;
 for(const a of rules.auraCharms){
  const key=Object.keys(saver.gd.uniqueItems).find(k=>saver.gd.uniqueItems[k].index===a.uniqueIndex);
  for(const mode of ['minimum','average','maximum']){
   const item=createTemplate(saver,{id:'unique:'+key},mode);
   assert.equal(item.stats.d2plus_charm_weight,7);
   assert.equal(item.stats['item_aura#'+a.skillId],mode==='minimum'?1:mode==='maximum'?20:10);
   presets++;
  }
  const item=createTemplate(saver,{id:'unique:'+key});
  assert.throws(()=>checkOathPlacement(saver.gd,[{unique_id:703}],item),/one Oath/);
  for(const outcome of a.exactOutcomes){
   const changed=structuredClone(item);
   changed.stats['item_aura#'+a.skillId]=outcome.level;
   Object.assign(changed.stats,outcome.displayValues);
   const decoded=saver.deserializeItem(saver.serializeItem(changed,{}));
   assert.deepEqual(itemSignature(decoded.item,decoded.allItems),itemSignature(changed));
   outcomes++;
  }
 }
 assert.equal(outcomes,140);assert.equal(presets,21);
});
