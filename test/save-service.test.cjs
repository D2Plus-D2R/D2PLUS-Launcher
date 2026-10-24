const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {SaveService,saveLocation,inventory}=require('../scripts/save-service.cjs');
const config={gameExe:'C:\\Game\\D2R.exe',modDirectory:'C:\\Game\\mods\\D2PLUS',arguments:'-mod D2PLUS -txt'};
test('save folder follows installed savepath, including redirected Saved Games and Unicode',()=>{
 assert.equal(saveLocation(config,{savepath:'D2RMM'},'D:\\玩家\\Saved Games'),'D:\\玩家\\Saved Games\\Diablo II Resurrected\\mods\\D2RMM');
 assert.throws(()=>saveLocation(config,{savepath:'..\\Other'},'C:\\Saved'),/unsupported/);
 assert.throws(()=>saveLocation(config,{savepath:'C:\\Other'},'C:\\Saved'),/unsupported/);
 assert.throws(()=>saveLocation(config,{},'C:\\Saved'),/explicit savepath/);
 assert.throws(()=>saveLocation({...config,arguments:'-mod Another'}, {savepath:'D2RMM'},'C:\\Saved'),/do not match/);
});
async function setup(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'D2PLUS-saves-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const source=path.join(dir,'玩家 saves');await fs.mkdir(source);const state=path.join(dir,'state');let running=false;
 const opened=[];const s=new SaveService({launcher:{config},adapter:{saveProcesses:async()=>running?['D2R.exe']:[]},stateDir:state,openPath:async p=>opened.push(p)});s.folder=async()=>source;
 return {s,source,state,opened,setRunning:v=>{running=v}};}
test('verified backups include character and shared stash, preserve originals and never overwrite older backups',async t=>{
 const {s,source,opened}=await setup(t);await fs.writeFile(path.join(source,'Hero.d2s'),'character');await fs.writeFile(path.join(source,'ModernSharedStashSoftCoreV2.d2i'),'stash');await fs.mkdir(path.join(source,'nested'));await fs.writeFile(path.join(source,'nested','Hero.key'),'keys');
 const before=await inventory(source),a=await s.backup(),b=await s.backup();assert.notEqual(a.folder,b.folder);assert.equal(a.fileCount,3);assert.equal(a.verified,true);assert.deepEqual(await inventory(path.join(a.folder,'files')),before);assert.deepEqual(await inventory(source),before);
 await s.open();await s.openBackup();assert.deepEqual(opened,[source,b.folder]);assert.equal((await s.status()).lastBackup.folder,b.folder);
});
test('running game and empty folders cannot yield successful backups',async t=>{const x=await setup(t);x.setRunning(true);await assert.rejects(x.s.backup(),/close Diablo/);x.setRunning(false);await assert.rejects(x.s.backup(),/empty/);assert.equal((await x.s.status()).lastBackup,null);});
test('a game opening during the copy leaves no verified backup',async t=>{const x=await setup(t);await fs.writeFile(path.join(x.source,'Hero.d2s'),'hero');let checks=0;x.s.adapter.saveProcesses=async()=>++checks===1?[]:['D2R.exe'];await assert.rejects(x.s.backup(),/close Diablo/);assert.equal((await x.s.status()).lastBackup,null);});
test('changing saves during backup is detected',async t=>{const x=await setup(t);await fs.writeFile(path.join(x.source,'Hero.d2s'),'before');let checks=0;x.s.adapter.saveProcesses=async()=>{if(++checks===2)await fs.writeFile(path.join(x.source,'Hero.d2s'),'after');return []};await assert.rejects(x.s.backup(),/changed/);assert.equal((await x.s.status()).lastBackup,null);});
