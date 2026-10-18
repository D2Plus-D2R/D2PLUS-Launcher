import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const W=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i,'$1')),R=path.join(W,'launcher');
for(const file of ['app.bafc4d91.js','app.d4ff1c99.js']){const p=path.join(R,'docs/js',file);let s=fs.readFileSync(p,'utf8');s=s.replaceAll('Alpha v0.8','Alpha V1.1').replaceAll('ALPHA V0.8','ALPHA V1.1');
let patched=0;s=s.replace(/new Set\(\[([^\]]+)\]\)/g,(full,inner)=>{if(!inner.includes('"cfe"')||!inner.includes('"eto"'))return full;patched++;return inner.includes('"acs"')?full:'new Set(['+inner+',"acs"])';});fs.writeFileSync(p,s);console.log(file,'material sets checked',patched);}
const p=path.join(R,'package.json');let pkg=JSON.parse(fs.readFileSync(p));pkg.scripts.test+=' test/v11.test.cjs';fs.writeFileSync(p,JSON.stringify(pkg,null,2)+'\n');
