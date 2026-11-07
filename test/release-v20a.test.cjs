'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const data=read('docs/d2plus/v105_data.json'),wiki=read('docs/wiki/database.json');

test('V2.0a editor and wiki agree on every current class skill and save identity',()=>{
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
  const report=read('release-inputs/reference-v20a-report.json');assert.equal(report.checkedGuidePlans,51);assert.equal(report.savesReadOrWritten,false);
  const suite=read('release-inputs/alpha-v20a-suite.json');assert.equal(suite.acceptedSourceMembersVerified,true);assert.equal(suite.sourceUnchangedDuringPacking,true);assert.equal(suite.wikiRecords,6350);
  assert.equal(report.nativeSkillsItemsAndSavedStatIdsPreserved,true);
  const coverage=read('release-inputs/reference-v20-report.json').customBossCoverage;
  assert.equal(coverage.length,10);
  for(const row of coverage)assert.ok(wiki.records.some(record=>record.id===row.recordId&&record.sourceKey===row.sourceKey&&record.kind==='Monster'),row.name);
  assert.ok(wiki.records.some(row=>row.kind==='Monster'&&row.name==='Kharvul, the Cindermaw'));
  for(const stem of ['v105_data','constants_105']){
    const manifest=read('docs/d2plus/'+stem+'.manifest.json');assert.equal(manifest.profile,'d2plus-alpha-v2.0a');
    assert.equal(manifest.sha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'docs/d2plus/'+stem+'.json'))).digest('hex'));
  }
});

test('current public page has eight usable class tabs and publication waits for assets',()=>{
  const html=fs.readFileSync(path.join(root,'site/index.html'),'utf8');
  assert.equal((html.match(/data-skill-tab>/g)||[]).length,8);
  assert.equal((html.match(/data-skill-panel>/g)||[]).length,8);
  assert.ok(html.includes('D2PLUS_Companion_AlphaV2.0a.apk'));
  assert.ok(html.includes('news-alpha-v14.html'),'previous release retained');
  const build=fs.readFileSync(path.join(root,'build/site.py'),'utf8');
  assert.ok(build.lastIndexOf('apply-reference-v20a.py')>build.lastIndexOf('apply-reference-v20.py'));
  assert.ok(build.lastIndexOf('build/seo.py')>build.lastIndexOf('apply-reference-v20a.py'));
  const workflow=fs.readFileSync(path.join(root,'.github/workflows/publish-v20a.yml'),'utf8');
  assert.ok(workflow.indexOf('publish-v20a.py')<workflow.indexOf('upload-pages-artifact'));
  assert.ok(fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8').includes('[publish-v20a]'));
  const article=fs.readFileSync(path.join(root,'site/news-alpha-v20a.html'),'utf8');
  for(const text of ['10%', 'instead of dropping every time', 'opening doors', 'Download Alpha V2.0a', 'Full release notes on GitHub'])assert.ok(article.includes(text),text);
  const notes=fs.readFileSync(path.join(root,'CHANGELOG-2.0.1-alpha.txt'),'utf8');
  for(const text of ['weight 1', 'weight 9', '1,909', 'Install Alpha V2.0a'])assert.ok(notes.includes(text),text);
  const gallery=read('site/assets/updates/v20/gallery.json');assert.equal(gallery.images.length,7);
  const galleryHtml=fs.readFileSync(path.join(root,'site/screenshots.html'),'utf8');
  for(const image of gallery.images){
    const bytes=fs.readFileSync(path.join(root,'site/assets/updates/v20',image.webFile));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),image.webSHA256);
    assert.ok(galleryHtml.includes(image.webFile));
    if(image.retouched)assert.match(image.caption,/retouched/i);
  }
  assert.ok(html.includes('name="google-site-verification"'),'Google ownership tag preserved');
  const splash=fs.readFileSync(path.join(root,'site/assets/d2plus-alpha-v20a-splash.png'));
  assert.equal(crypto.createHash('sha256').update(splash).digest('hex'),'a76d5ff7b45d28a35764677291d73c509456e30738aee198d6c3f01e15201d61');
  const historical=fs.readFileSync(path.join(root,'site/news-alpha-v20.html'),'utf8');
  for(const name of ['Vharzith','Azrakek','Kharvul','Ravage','Harrogath','Perfect Amethysts','Elder Emeralds','Nightmare or Hell'])assert.ok(historical.includes(name),name);
  const firstSite=workflow.indexOf('python build/site.py'),prepare=workflow.indexOf('python build/prepare-v20a.py'),lastSite=workflow.lastIndexOf('python build/site.py'),wikiBuild=workflow.indexOf('python build/package-wiki-v20a.py');
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

test('active wiki banner, overview and route show V2.0a while historical V1.4 stays historical',()=>{
  const {JSDOM}=require('jsdom');
  const html=fs.readFileSync(path.join(root,'docs/wiki/index.html'),'utf8');
  for(const file of ['app.js','data.js','styles.css'])assert.ok(html.includes(file+'?v=2.0a-20261107'),file+' must bust the previous release cache');
  function render(hash){
    const dom=new JSDOM(html,{url:'https://wiki.test/index.html'+hash,runScripts:'outside-only'}),w=dom.window;
    w.scrollTo=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
    for(const file of ['data.js','item-presentation.js','trinkets.js','app.js'])w.eval(fs.readFileSync(path.join(root,'docs/wiki',file),'utf8'));
    return dom;
  }
  const home=render('#home'),doc=home.window.document;
  const banner=doc.querySelector('body>div:first-child a');assert.equal(banner.getAttribute('href'),'#alpha-v20a');assert.match(banner.textContent,/Alpha V2\.0a.*Reward Bag drop fix/);
  assert.equal(doc.querySelector('#navigation [data-route="alpha-v20a"]').getAttribute('href'),'#alpha-v20a');
  assert.match(doc.querySelector('#content .lede').textContent,/Alpha V2\.0a/);assert.ok(!doc.querySelector('#content .lede').textContent.includes('V1.4'));home.window.close();
  const current=render('#alpha-v20a');assert.match(current.window.document.querySelector('#content h1').textContent,/Reward Bag drop fix/);assert.ok(current.window.document.querySelector('#content').textContent.includes('90%'));assert.ok(current.window.document.querySelector('#content').textContent.includes('10%'));current.window.close();
  const prior=render('#alpha-v20');assert.match(prior.window.document.querySelector('#content h1').textContent,/New depths below Sanctuary/);assert.match(prior.window.document.querySelector('#content .eyebrow').textContent,/Alpha V2\.0(?!a)/);prior.window.close();
  const historical=render('#alpha-v14');assert.match(historical.window.document.querySelector('#content h1').textContent,/Halloween/);assert.match(historical.window.document.querySelector('#content .eyebrow').textContent,/Alpha V1\.4/);historical.window.close();
  assert.match(fs.readFileSync(path.join(root,'docs/wiki/alpha-v14.html'),'utf8'),/Alpha V1\.4/);
  const article=fs.readFileSync(path.join(root,'site/news-alpha-v20.html'),'utf8');assert.ok(article.includes('minmax(min(280px,100%),1fr)'));
});


test('V2.0a native reference defines the fixed no-bag branch before all five selectors',()=>{
  const names=Object.keys(data.treasureClass),positions=new Map(names.map((name,index)=>[name,index]));
  const empty='D2PLUS_Bag_Empty1';assert.equal(positions.get(empty),1490);
  const selectors=['D2Bag Roll 0','D2Bag Roll 1','D2Bag Roll 2','D2RB NM Roll','D2RB Hell Roll'];
  for(const name of selectors){
    const row=data.treasureClass[name];assert.ok(row,name);
    assert.equal(row.picks,1);assert.equal(row.nodrop,0);
    assert.equal(row.prob1,1);assert.equal(row.item2,empty);assert.equal(row.prob2,9);
    assert.ok(['dbn','dbm','dbh'].includes(row.item1));assert.ok(positions.get(empty)<positions.get(name));
    assert.equal(row.prob1/(row.prob1+row.prob2),0.1);
  }
  const report=read('release-inputs/reference-v20a-report.json');
  assert.deepEqual(report.sourceHashes,data.info.d2plus.referenceSourceHashes);
  assert.equal(report.sourceHashes['global/excel/treasureclassex.txt'],'3e70fc4b23b9de49e0b523e56f217a1e4508698e0d1ee1181ed85d2882c2a670');
  const current=wiki.patchNotes[0];assert.equal(current.id,'alpha-v20a');assert.equal(current.version,'Alpha V2.0a');
  assert.equal(wiki.patchNotes[1].id,'alpha-v20');assert.equal(wiki.patchNotes[1].version,'Alpha V2.0');
  const guide=fs.readFileSync(path.join(root,'docs/wiki/dungeon-rewards.html'),'utf8');
  assert.ok(guide.includes('name="d2plus-reference-version" content="Alpha V2.0a"'));
  assert.ok(guide.includes('flat 10% base Dungeon Reward Bag roll'));
});
