'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const data=read('docs/d2plus/v105_data.json'),wiki=read('docs/wiki/database.json');

test('V2.0 editor and wiki agree on every current class skill and save identity',()=>{
  const classes=['ama','sor','nec','pal','bar','dru','ass','war'];
  const skills=Object.values(data.skills).filter(row=>classes.includes(row.charclass));
  assert.equal(skills.length,264);
  for(const cc of classes)assert.equal(skills.filter(row=>row.charclass===cc).length,33,cc);
  const records=wiki.records.filter(row=>row.kind==='Skill');assert.equal(records.length,264);
  for(const row of records){const native=data.skills[row.skillId];assert.ok(native,row.name);assert.equal(row.sourceKey,native.skill);assert.equal(row.sourceRow.maxlvl,String(native.maxlvl));assert.ok(!/Test variant:/i.test(row.note),row.name);}
  assert.equal(data.info.d2plus.saveVersion,105);
  assert.equal(data.skills[253].skill,'Psychic Hammer');
  assert.equal(data.skills[116].skill,'Conversion');
  assert.equal(data.uniqueItems.unique712.code,'dbh');
  assert.equal(data.itemStatCost.d2plus_reward_bag_roll?.id,448);
});

test('current release formulas and reward descriptions replace prototype values',()=>{
  const byName=name=>wiki.records.find(row=>row.kind==='Skill'&&row.name===name);
  assert.match(byName('Storm Lance').note,/\+2 bolts at skill levels 10, 20 and 30 \(max 7\)/);
  assert.match(byName('Astral Communion').note,/10 total Energy/);
  assert.match(byName('Astral Communion').note,/\+200%/);
  assert.match(byName('Sigil Lord').note,/capped at 15%/);
  assert.match(byName('Demonic Resonance').note,/newly/);
  assert.match(byName('Ancestral Standard').note,/allies/);
  const bags=wiki.records.filter(row=>['dbn','dbm','dbh'].includes(row.sourceRow?.code));
  assert.equal(bags.length,3);for(const bag of bags)assert.ok(bag.stats.some(row=>/10%/.test(row.value)),bag.name);
  const report=read('release-inputs/reference-v20-report.json');assert.equal(report.checkedGuidePlans,51);assert.equal(report.savesReadOrWritten,false);
  const suite=read('release-inputs/alpha-v20-suite.json');assert.equal(suite.acceptedSourceMembersVerified,true);assert.equal(suite.sourceUnchangedDuringPacking,true);assert.equal(suite.wikiRecords,6350);
  assert.equal(report.customBossCoverage.length,10);
  for(const row of report.customBossCoverage)assert.ok(wiki.records.some(record=>record.id===row.recordId&&record.sourceKey===row.sourceKey&&record.kind==='Monster'),row.name);
  assert.ok(wiki.records.some(row=>row.kind==='Monster'&&row.name==='Kharvul, the Cindermaw'));
  for(const stem of ['v105_data','constants_105']){
    const manifest=read('docs/d2plus/'+stem+'.manifest.json');assert.equal(manifest.profile,'d2plus-alpha-v2.0');
    assert.equal(manifest.sha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'docs/d2plus/'+stem+'.json'))).digest('hex'));
  }
});

test('current public page has eight usable class tabs and publication waits for assets',()=>{
  const html=fs.readFileSync(path.join(root,'site/index.html'),'utf8');
  assert.equal((html.match(/data-skill-tab>/g)||[]).length,8);
  assert.equal((html.match(/data-skill-panel>/g)||[]).length,8);
  assert.ok(html.includes('D2PLUS_Companion_AlphaV2.0.apk'));
  assert.ok(html.includes('news-alpha-v14.html'),'previous release retained');
  const build=fs.readFileSync(path.join(root,'build/site.py'),'utf8');
  assert.ok(build.lastIndexOf('apply-reference-v20.py')>build.lastIndexOf('apply-reference-v14.py'));
  const workflow=fs.readFileSync(path.join(root,'.github/workflows/publish-v20.yml'),'utf8');
  assert.ok(workflow.indexOf('publish-v20.py')<workflow.indexOf('upload-pages-artifact'));
  assert.ok(fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8').includes('[publish-v20]'));
  const article=fs.readFileSync(path.join(root,'site/news-alpha-v20.html'),'utf8');
  const figures=[...article.matchAll(/<figure>.*?<img[^>]+src="([^"]+)".*?<\/figure>/gs)].map(match=>match[1]);
  assert.equal(figures.length,7);assert.equal(new Set(figures).size,figures.length,'gallery images must be unique');
  for(const name of ['Vharzith','Azrakek','Kharvul','Ravage','Harrogath','Perfect Amethysts','Elder Emeralds','Nightmare or Hell'])assert.ok(article.includes(name),name);
  const firstSite=workflow.indexOf('python build/site.py'),prepare=workflow.indexOf('python build/prepare-v20.py'),lastSite=workflow.lastIndexOf('python build/site.py'),wikiBuild=workflow.indexOf('python build/package-wiki-v20.py');
  assert.ok(firstSite<prepare&&prepare<lastSite&&lastSite<wikiBuild,'final site/wiki build must use prepared gameplay metadata');
});

test('four native saved-stat row identities survive synthetic item byte round trips',async()=>{
  const {D2RSaver}=await import('../editor-native-v14/index.js');
  const saver=D2RSaver.fromData(JSON.parse(JSON.stringify(data)),read('docs/d2plus/v105_strings.json'));
  for(const [stat,id,key,value] of [
    ['passive_mastery_gethit_rate',212,'passive_mastery_gethit_rate',17],
    ['item_meleeareadamage',368,'item_meleeareadamage',25],
    ['melee_mindamage_percent',369,'melee_mindamage_percent',33],
    ['melee_maxdamage_percent',370,'melee_maxdamage_percent',57]
  ]){
    assert.equal(saver.gd.itemStatCost[stat].id,id);
    const item={itemId:1,base:'rin',quality:2,ilvl:1,unidentified:false,ethereal:false,socketed:false,sockets:0,socketedItems:[],stats:{[key]:value},binaryOffset:{start:0,end:0}};
    const encoded=saver.serializeItem(item,{}),decoded=saver.deserializeItem(encoded);
    assert.equal(decoded.item.stats[key],value,stat);
    assert.equal(saver.serializeItem(decoded.item,decoded.allItems),encoded,stat+' byte continuity');
  }
});

test('active wiki banner, overview and route show V2.0 while historical V1.4 stays historical',()=>{
  const {JSDOM}=require('jsdom');
  const html=fs.readFileSync(path.join(root,'docs/wiki/index.html'),'utf8');
  for(const file of ['app.js','data.js','styles.css'])assert.ok(html.includes(file+'?v=2.0-20261107'),file+' must bust the previous release cache');
  function render(hash){
    const dom=new JSDOM(html,{url:'https://wiki.test/index.html'+hash,runScripts:'outside-only'}),w=dom.window;
    w.scrollTo=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
    for(const file of ['data.js','item-presentation.js','trinkets.js','app.js'])w.eval(fs.readFileSync(path.join(root,'docs/wiki',file),'utf8'));
    return dom;
  }
  const home=render('#home'),doc=home.window.document;
  const banner=doc.querySelector('body>div:first-child a');assert.equal(banner.getAttribute('href'),'#alpha-v20');assert.match(banner.textContent,/Alpha V2\.0.*New depths below Sanctuary/);
  assert.equal(doc.querySelector('#navigation [data-route="alpha-v20"]').getAttribute('href'),'#alpha-v20');
  assert.match(doc.querySelector('#content .lede').textContent,/Alpha V2\.0/);assert.ok(!doc.querySelector('#content .lede').textContent.includes('V1.4'));home.window.close();
  const current=render('#alpha-v20');assert.match(current.window.document.querySelector('#content h1').textContent,/New depths below Sanctuary/);assert.ok(current.window.document.querySelector('#content').textContent.includes('Kharvul'));assert.ok(current.window.document.querySelector('#content').textContent.includes('Ravage'));current.window.close();
  const historical=render('#alpha-v14');assert.match(historical.window.document.querySelector('#content h1').textContent,/Halloween/);assert.match(historical.window.document.querySelector('#content .eyebrow').textContent,/Alpha V1\.4/);historical.window.close();
  assert.match(fs.readFileSync(path.join(root,'docs/wiki/alpha-v14.html'),'utf8'),/Alpha V1\.4/);
  const article=fs.readFileSync(path.join(root,'site/news-alpha-v20.html'),'utf8');assert.ok(article.includes('minmax(min(280px,100%),1fr)'));
});
