'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {GameplayIntegrity,safePath}=require('../scripts/gameplay-integrity.cjs');
const {hashFile}=require('../scripts/guided-install.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'d2plus-integrity-test-'));
 t.after(()=>{assert(path.dirname(root)===os.tmpdir()&&path.basename(root).startsWith('d2plus-integrity-test-'));fs.rmSync(root,{recursive:true,force:true});});
 const suite=path.join(root,'suite'),mod=path.join(root,'mods','MyMod'),mpq=path.join(mod,'MyMod.mpq');
 fs.mkdirSync(path.join(suite,'gameplay'),{recursive:true});fs.mkdirSync(path.join(mpq,'data'),{recursive:true});
 const row=(name,body)=>({path:'data/'+name,size:Buffer.byteLength(body),sha256:hash(body)});
 const manifest={schemaVersion:1,archiveSHA256:hash('zip'),installManifestSHA256:hash('inventory'),common:[row('table','table')],profiles:[{id:'original',files:[row('texture','original'),row('cache','original-cache')]},{id:'optimized',files:[row('texture','small'),row('cache','small-cache')]}]};
 for(const [name,body]of Object.entries({table:'table',texture:'small',cache:'small-cache'}))fs.writeFileSync(path.join(mpq,'data',name),body);
 fs.writeFileSync(path.join(suite,'gameplay','encounter-integrity.json'),JSON.stringify(manifest));
 return {suite,mod,mpq,manifest,check:new GameplayIntegrity(suite)};
}
test('manual installs require a coherent approved asset profile; mixed cache/texture is blocked',async t=>{
 const f=fixture(t);assert.equal((await f.check.verify(f.mpq)).profile,'optimized');
 fs.writeFileSync(path.join(f.mpq,'data','cache'),'original-cache');
 await assert.rejects(f.check.verify(f.mpq),/mixed or changed Warden/);
 fs.writeFileSync(path.join(f.mpq,'data','texture'),'original');
 assert.equal((await f.check.verify(f.mpq)).profile,'original');
});
test('changed, missing and truncated encounter assets are blocked with repair instructions',async t=>{
 const f=fixture(t);await f.check.verify(f.mpq);
 fs.writeFileSync(path.join(f.mpq,'data','table'),'wrong');
 await assert.rejects(f.check.verify(f.mpq),/changed or incomplete.*Install Alpha V2.0b/);
 fs.unlinkSync(path.join(f.mpq,'data','table'));
 await assert.rejects(f.check.verify(f.mpq),/missing encounter asset/);
});
test('Launch force check rehashes even if monitor metadata cache matches',async t=>{
 const f=fixture(t);await f.check.verify(f.mpq);
 fs.writeFileSync(path.join(f.mpq,'data','table'),'wrong');
 // Deliberately poison the cache key with current metadata; force must ignore it.
 const original=f.check.cached;
 try{await f.check.verify(f.mpq);}catch{}
 const bytes=fs.readFileSync(path.join(f.suite,'gameplay','encounter-integrity.json'));
 const sig=[hash(bytes),path.resolve(f.mpq)];
 for(const file of [path.join(f.mpq,'data','table'),path.join(f.mpq,'data','texture'),path.join(f.mpq,'data','cache'),path.join(f.mod,'D2PLUS-INSTALL-RECEIPT.json'),path.join(f.mod,'INSTALL_MANIFEST.json')]){
  const s=fs.existsSync(file)?fs.statSync(file):null;sig.push(s?`${file}:${s.dev}:${s.ino}:${s.size}:${s.mtimeMs}:${s.ctimeMs}`:file+':missing');
 }
 f.check.cached={key:JSON.stringify(sig),result:original.result};
 await assert.rejects(f.check.verify(f.mpq,{force:true}),/changed or incomplete/);
});
test('guided receipt must bind the archive, inventory and configured mod name',async t=>{
 const f=fixture(t),receipt={schemaVersion:1,archiveSHA256:f.manifest.archiveSHA256,manifestSHA256:f.manifest.installManifestSHA256,modName:'MyMod'};
 fs.writeFileSync(path.join(f.mod,'INSTALL_MANIFEST.json'),'inventory');
 const receiptFile=path.join(f.mod,'D2PLUS-INSTALL-RECEIPT.json');
 fs.writeFileSync(receiptFile,JSON.stringify(receipt));assert.equal((await f.check.verify(f.mpq)).installation,'guided');
 fs.writeFileSync(path.join(f.mod,'INSTALL_MANIFEST.json'),'tampered');await assert.rejects(f.check.verify(f.mpq),/receipt does not match/);
 fs.writeFileSync(path.join(f.mod,'INSTALL_MANIFEST.json'),'inventory');
 receipt.modName='Other';fs.writeFileSync(receiptFile,JSON.stringify(receipt));await assert.rejects(f.check.verify(f.mpq),/receipt does not match/);
});
test('integrity paths cannot escape the selected mod',()=>{
 for(const p of ['../save.d2s','data/../../save.d2s','C:/other','data\\other','/data/other'])assert.throws(()=>safePath(os.tmpdir(),p));
});
test('large archive hashing streams bounded chunks rather than reading the entire file',async t=>{
 const f=fixture(t),file=path.join(f.mod,'archive.zip'),chunk=Buffer.alloc(1024*1024,17),expected=crypto.createHash('sha256');
 const fd=fs.openSync(file,'w');try{for(let i=0;i<40;i++){fs.writeSync(fd,chunk);expected.update(chunk);}}finally{fs.closeSync(fd);}
 const read=fs.readFileSync;fs.readFileSync=()=>{throw Error('Whole-file read is forbidden');};
 try{assert.equal(await hashFile(file),expected.digest('hex'));}finally{fs.readFileSync=read;}
});
