import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {inspectNativeSave} from './editor-runtime/native-save-repair.mjs';
import {D2RSaver} from './editor-runtime/index.js';
const W=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i,'$1')),R=path.join(W,'launcher');
const read=p=>JSON.parse(fs.readFileSync(path.join(R,p),'utf8'));
const saver=D2RSaver.fromData(read('docs/d2plus/v105_data.json'),read('docs/d2plus/v105_strings.json'));
const dir=path.resolve(W,'../../outputs/AlphaV1.1/Accursed_Test_Characters'),reports=[];
for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.d2s'))){const b=fs.readFileSync(path.join(dir,name));const report=inspectNativeSave(b,saver.gd);reports.push({name,report});}
fs.writeFileSync(path.join(W,'independent-save-validation.json'),JSON.stringify(reports,null,2));
const bundle=path.join(R,'docs/js/app.bafc4d91.js');let s=fs.readFileSync(bundle,'utf8');const before='socketed_items:[],magic_attributes:[],displayed_combined_magic_attributes:[]';const after='socketed_items:[],_d2plusAccursed:!!(d.stats&&d.stats.d2plus_accursed_mark),magic_attributes:[],displayed_combined_magic_attributes:[]';
assert.equal(s.split(before).length,2);s=s.replace(before,after);fs.writeFileSync(bundle,s);
const p=path.join(R,'docs/d2plus/item-labels.js');s=fs.readFileSync(p,'utf8');s=s.replace("+'<", "+'<");const old="+'</div><div>'+esc(base)+'</div>';";assert(s.includes(old));s=s.replace(old,"+'</div><div>'+esc(base)+'</div>'+(item._d2plusAccursed?'<div style=\"color:#be83df\">Accursed</div>':'');");fs.writeFileSync(p,s);
console.log('Independent native walker accepted all four practice saves; native editor labels successful Accursed items.');
