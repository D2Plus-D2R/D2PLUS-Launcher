const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'../docs/wiki');
test('AlphaV0.8.2 wiki renders new content offline and preserves unique records',()=>{
 const d=JSON.parse(fs.readFileSync(path.join(root,'database.json')));
 assert.equal(d.version,'D2PLUS AlphaV0.8.2');assert.equal(new Set(d.records.map(r=>r.id)).size,d.records.length);
 assert.equal(d.records.filter(r=>r.kind==='Mercenary').length,135);
 assert.equal(d.records.filter(r=>r.id.startsWith('alpha-v05-potion-')).length,6);
 assert.equal(d.records.find(r=>r.name==='Worldforge Shard').art.src,'../wiki/assets/worldstone-shard.png');
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://local.test/wiki/index.html#alpha-v082',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.scrollTo=()=>{};
 for(const file of ['data.js','item-presentation.js','trinkets.js','app.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
 const text=w.document.querySelector('#content').textContent;
 assert.ok(!fs.readFileSync(path.join(root,'app.js'),'utf8').includes('alpha-v0822'));
 assert.ok(fs.readFileSync(path.join(root,'../launcher/index.html'),'utf8').includes('37 unique balance changes'));
 for(const term of ['Cow King','Dreadguard','Doom Reaver','Ironblood Draught','10 minutes','Worldforge Shard','October 9, 2026','The Warden takes form','Storm Lance'])assert.ok(text.includes(term),term);
 assert.ok(d.records.some(r=>r.name==='Token of Regret'));
 w.location.hash='#companions';w.dispatchEvent(new w.HashChangeEvent('hashchange'));
 assert.ok(w.document.querySelector('#content').textContent.includes('Blood Raven'));
 assert.ok(!w.document.querySelector('#content').textContent.includes('retains native mercenary models'));
 dom.window.close();
});
test('release download uses the exact gameplay package checksum and version',()=>{
 const {CATALOG}=require('../scripts/setup-service.cjs');
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../release-inputs/alpha-v082.json')));
 assert.equal(CATALOG.d2plus.sha256,manifest.files[0].sha256);assert.ok(CATALOG.d2plus.url.endsWith('/v0.8.2-alpha/'+manifest.files[0].name));
 assert.equal(require('../package.json').version,require('../scripts/launcher-core.cjs').VERSION);
});

test('localized set names receive the actual reduced smelting rewards',()=>{const d=JSON.parse(fs.readFileSync(path.join(root,'database.json')));for(const [id,out] of [['entry-2450','Sol Rune'],['entry-2493','Ort Rune'],['entry-2497','Ort Rune']])assert.deepEqual(d.records.find(r=>r.id===id).outputs,[out]);});
