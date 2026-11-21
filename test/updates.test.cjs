'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {decode,sha}=require('../desktop/update-protocol.cjs');
const {applyPending}=require('../desktop/update-apply.cjs');
const {UpdateService}=require('../scripts/update-service.cjs');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'d2plus-update-test-'));
 t.after(()=>{assert(path.dirname(root)===os.tmpdir()&&path.basename(root).startsWith('d2plus-update-test-'));fs.rmSync(root,{recursive:true,force:true});});
 const suite=path.join(root,'suite'),stateDir=path.join(root,'state'),gameExe=path.join(root,'game','D2R.exe'),modDirectory=path.join(root,'game','mods','MyMod'),mpq=path.join(modDirectory,'MyMod.mpq');
 for(const p of [path.join(suite,'updates'),path.join(suite,'scripts'),path.join(suite,'gameplay'),stateDir,path.join(mpq,'data/global/excel')])fs.mkdirSync(p,{recursive:true});
 fs.writeFileSync(gameExe,'not executed');
 const keys=crypto.generateKeyPairSync('ed25519'),channel={publicKey:keys.publicKey.export({type:'spki',format:'pem'}),manifestUrl:'https://github.com/D2Plus-D2R/D2PLUS-Launcher/releases/latest/download/d2plus-update.json'};
 const sign=manifest=>{const b=Buffer.from(JSON.stringify(manifest));return {payload:b.toString('base64'),signature:crypto.sign(null,b,keys.privateKey).toString('base64')};};
 fs.writeFileSync(path.join(suite,'updates/channel.json'),JSON.stringify(channel));
 const config={gameExe,modDirectory,automaticUpdates:true},saves=path.join(root,'characters.d2s');fs.writeFileSync(saves,'untouched character');fs.writeFileSync(path.join(stateDir,'settings.json'),JSON.stringify(config));
 const previous=[{area:'launcher',path:'scripts/fixture.cjs',size:3,sha256:sha('old')},{area:'game',path:'data/global/excel/skills.txt',size:3,sha256:sha('old')},{area:'launcher',path:'scripts/unchanged.cjs',size:4,sha256:sha('same')}];
 fs.writeFileSync(path.join(suite,'scripts/fixture.cjs'),'old');fs.writeFileSync(path.join(suite,'scripts/unchanged.cjs'),'same');fs.writeFileSync(path.join(mpq,'data/global/excel/skills.txt'),'old');
 const baseline={schemaVersion:1,generation:1,version:'fixture-1',files:previous};fs.writeFileSync(path.join(suite,'updates/current.json'),JSON.stringify(sign(baseline)));
 const compressed=zlib.gzipSync(Buffer.from('new')),url='https://github.com/D2Plus-D2R/D2PLUS-Launcher/releases/download/test/new.bin';
 const files=previous.map(r=>r.path.includes('unchanged')?r:{...r,sha256:sha('new'),download:{url,size:compressed.length,sha256:sha(compressed)}});
 const latest={schemaVersion:1,generation:2,version:'fixture-2',files},envelope=sign(latest),calls=[];
 let badBody=false,running=false;
 const launcher={suiteRoot:suite,config,adapter:{async processes(){return {games:running?[{pid:1}]:[],companions:[]};}},companionPath(){return '';}};
 const fetchImpl=async(url,options)=>{calls.push(url);return new Response(url===channel.manifestUrl?JSON.stringify(envelope):badBody?Buffer.from('invalid'):compressed,{status:200});};
 const service=new UpdateService({launcher,stateDir,fetchImpl});
 return {root,suite,stateDir,gameExe,modDirectory,mpq,saves,channel,sign,baseline,latest,envelope,service,calls,setBadBody(v){badBody=v;},setRunning(v){running=v;}};
}
test('update signatures, duplicate destinations, protected paths and repository hosts are checked',t=>{
 const f=fixture(t);assert.equal(decode(f.envelope,f.channel).generation,2);
 assert.throws(()=>decode({...f.envelope,signature:Buffer.alloc(64).toString('base64')},f.channel),/signature/);
 for(const row of [{...f.latest.files[0],path:'../settings.json'},{...f.latest.files[0],path:'desktop/bootstrap.cjs'},{...f.latest.files[0],download:{...f.latest.files[0].download,url:'https://attacker.test/update'}}])assert.throws(()=>decode(f.sign({...f.latest,files:[row]}),f.channel));
 assert.throws(()=>decode(f.sign({...f.latest,files:[f.latest.files[0],f.latest.files[0]]}),f.channel),/Duplicate/);
});
test('scan uses local signed inventory and reports damage without downloading or writing files',async t=>{
 const f=fixture(t);fs.unlinkSync(path.join(f.mpq,'data/global/excel/skills.txt'));
 await f.service.run('scan');assert.equal(f.service.job.state,'Repair available');assert.equal(f.service.job.missingOrChanged,1);assert.equal(f.calls.length,0);assert(!fs.existsSync(path.join(f.stateDir,'updates/pending.json')));
});
test('only changed files download; restart transaction keeps settings, saves and rollback copies',async t=>{
 const f=fixture(t),settings=fs.readFileSync(path.join(f.stateDir,'settings.json'));
 await f.service.run('check');assert.equal(f.service.job.state,'Ready');assert.equal(f.calls.length,3);assert.equal(f.service.job.missingOrChanged,2);
 assert.equal(fs.readFileSync(path.join(f.suite,'scripts/fixture.cjs'),'utf8'),'old');
 assert.deepEqual(applyPending({root:f.suite,stateDir:f.stateDir,isGameRunning:()=>true}),{applied:false,waitingForGame:true});
 const r=applyPending({root:f.suite,stateDir:f.stateDir,isGameRunning:()=>false});assert.equal(r.files,2);
 assert.equal(fs.readFileSync(path.join(f.suite,'scripts/fixture.cjs'),'utf8'),'new');assert.equal(fs.readFileSync(path.join(f.mpq,'data/global/excel/skills.txt'),'utf8'),'new');
 assert.equal(fs.readFileSync(path.join(f.suite,'scripts/unchanged.cjs'),'utf8'),'same');assert.deepEqual(fs.readFileSync(path.join(f.stateDir,'settings.json')),settings);assert.equal(fs.readFileSync(f.saves,'utf8'),'untouched character');
 assert.equal(fs.readFileSync(path.join(r.backup,'backup/0.file'),'utf8'),'old');
 assert.equal(JSON.parse(fs.readFileSync(path.join(f.modDirectory,'D2PLUS-INSTALL-RECEIPT.json'))).schemaVersion,2);
 fs.writeFileSync(path.join(f.suite,'gameplay/encounter-integrity.json'),JSON.stringify({schemaVersion:1,common:[{path:'data/global/excel/skills.txt',size:3,sha256:sha('old')}],profiles:[{id:'old',files:[]}]}));
 const {GameplayIntegrity}=require('../scripts/gameplay-integrity.cjs');assert.equal((await new GameplayIntegrity(f.suite).verify(f.mpq,{force:true})).profile,'signed-update-2');
});
test('corrupt downloads never modify live files and remove their failed staging directory',async t=>{
 const f=fixture(t);f.setBadBody(true);await assert.rejects(f.service.run('check'),/checksum mismatch/);
 assert.equal(fs.readFileSync(path.join(f.suite,'scripts/fixture.cjs'),'utf8'),'old');assert(!fs.existsSync(path.join(f.stateDir,'updates/pending.json')));
 assert.deepEqual(fs.readdirSync(path.join(f.stateDir,'updates')),[]);
});
test('an interrupted apply rolls back all written files, and a later retry succeeds',async t=>{
 const f=fixture(t);await f.service.run('check');
 assert.throws(()=>applyPending({root:f.suite,stateDir:f.stateDir,isGameRunning:()=>false,afterWrite(){throw Error('injected disk failure');}}),/injected/);
 assert.equal(fs.readFileSync(path.join(f.suite,'scripts/fixture.cjs'),'utf8'),'old');assert.equal(fs.readFileSync(path.join(f.mpq,'data/global/excel/skills.txt'),'utf8'),'old');
 assert.equal(decode(JSON.parse(fs.readFileSync(path.join(f.suite,'updates/current.json'))),f.channel).generation,1);
 assert.equal(applyPending({root:f.suite,stateDir:f.stateDir,isGameRunning:()=>false}).applied,true);
});
test('game running, staged corruption, changed predecessors and downgrade are blocked',async t=>{
 const f=fixture(t);f.setRunning(true);await f.service.run('check');assert.equal(f.service.job.state,'Waiting for game');assert.equal(f.calls.length,1);
 f.setRunning(false);await f.service.run('check');
 const pending=JSON.parse(fs.readFileSync(path.join(f.stateDir,'updates/pending.json')));
 fs.writeFileSync(path.join(pending.operation,'0.file'),'bad');assert.throws(()=>applyPending({root:f.suite,stateDir:f.stateDir,isGameRunning:()=>false}),/Staged update checksum/);
 fs.writeFileSync(path.join(pending.operation,'0.file'),'new');fs.writeFileSync(path.join(f.suite,'scripts/fixture.cjs'),'external');
 assert.throws(()=>applyPending({root:f.suite,stateDir:f.stateDir,isGameRunning:()=>false}),/changed since the scan/);
 fs.writeFileSync(path.join(f.suite,'updates/current.json'),JSON.stringify(f.sign({...f.latest,generation:3})));
 await assert.rejects(f.service.manifest(true),/older update generation/);
});
for(const supportsRange of [true,false])test('signed pack ranges download correctly; whole-pack fallback is cached ('+supportsRange+')',async t=>{
 const f=fixture(t),chunk=zlib.gzipSync(Buffer.from('new')),pack=Buffer.concat([chunk,chunk]),manifest=structuredClone(f.latest);
 let index=0;for(const row of manifest.files)if(row.download)row.download={...row.download,offset:index++*chunk.length,packSize:pack.length,packSHA256:sha(pack)};
 const signed=f.sign(manifest),ranges=[];
 f.service.fetchImpl=async(url,options)=>{
  if(url===f.channel.manifestUrl)return new Response(JSON.stringify(signed));
  const range=options.headers.Range;ranges.push(range);const [start,end]=range.slice(6).split('-').map(Number);
  return supportsRange?new Response(pack.subarray(start,end+1),{status:206,headers:{'Content-Range':`bytes ${start}-${end}/${pack.length}`}}):new Response(pack);
 };
 await f.service.run('check');assert.equal(f.service.job.state,'Ready');assert.equal(ranges.length,supportsRange?2:1);
 assert.equal(applyPending({root:f.suite,stateDir:f.stateDir,isGameRunning:()=>false}).applied,true);
});
test('incorrect range responses and corrupt pack fallback are rejected',async t=>{
 const f=fixture(t),chunk=zlib.gzipSync(Buffer.from('new')),manifest=structuredClone(f.latest);
 for(const row of manifest.files)if(row.download)row.download={...row.download,offset:0,packSize:chunk.length,packSHA256:sha(chunk)};
 const signed=f.sign(manifest);
 f.service.fetchImpl=async(url)=>url===f.channel.manifestUrl?new Response(JSON.stringify(signed)):new Response(chunk,{status:206,headers:{'Content-Range':'bytes 1-2/3'}});
 await assert.rejects(f.service.run('check'),/incorrect byte range/);
 f.service.fetchImpl=async(url)=>url===f.channel.manifestUrl?new Response(JSON.stringify(signed)):new Response(Buffer.alloc(chunk.length));
 await assert.rejects(f.service.run('check'),/pack checksum mismatch/);
});
test('power-loss journal restores original files before a later retry',async t=>{
 const f=fixture(t);await f.service.run('check');
 const pending=JSON.parse(fs.readFileSync(path.join(f.stateDir,'updates/pending.json'))),oldCurrent=fs.readFileSync(path.join(f.suite,'updates/current.json'),'utf8');
 fs.mkdirSync(path.join(pending.operation,'backup'));
 fs.copyFileSync(path.join(f.suite,'scripts/fixture.cjs'),path.join(pending.operation,'backup/0.file'));
 fs.copyFileSync(path.join(f.mpq,'data/global/excel/skills.txt'),path.join(pending.operation,'backup/1.file'));
 fs.writeFileSync(path.join(f.suite,'scripts/fixture.cjs'),'new');
 fs.writeFileSync(path.join(pending.operation,'journal.json'),JSON.stringify({state:'applying',oldCurrent,oldReceipt:null}));
 const first=applyPending({root:f.suite,stateDir:f.stateDir,isGameRunning:()=>false});assert.equal(first.recovered,true);
 assert.equal(fs.readFileSync(path.join(f.suite,'scripts/fixture.cjs'),'utf8'),'old');assert.equal(applyPending({root:f.suite,stateDir:f.stateDir,isGameRunning:()=>false}).applied,true);
});
test('discarding a staged update preserves installed files and prevents a stale apply',async t=>{
 const f=fixture(t);await f.service.run('check');
 const pending=JSON.parse(fs.readFileSync(path.join(f.stateDir,'updates/pending.json')));
 const reopened=new UpdateService({launcher:f.service.launcher,stateDir:f.stateDir});assert.equal(reopened.job.state,'Ready');
 f.service.discard();assert(!fs.existsSync(pending.operation));assert(!fs.existsSync(path.join(f.stateDir,'updates/pending.json')));
 assert.equal(fs.readFileSync(path.join(f.suite,'scripts/fixture.cjs'),'utf8'),'old');assert.equal(applyPending({root:f.suite,stateDir:f.stateDir,isGameRunning:()=>false}).applied,false);
});
