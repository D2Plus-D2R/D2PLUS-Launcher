'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {build}=require('../build/update-manifest.cjs'),{rebuild}=require('../build/rebuild-update-packs.cjs');
test('public packs can be reproduced and verified without the private signing key',async t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'d2plus-publishing-test-'));t.after(()=>{assert(path.dirname(temp)===os.tmpdir()&&path.basename(temp).startsWith('d2plus-publishing-test-'));fs.rmSync(temp,{recursive:true,force:true});});
 const root=path.join(temp,'suite'),gameRoot=path.join(temp,'game'),output=path.join(temp,'signed'),rebuilt=path.join(temp,'rebuilt');
 for(const name of ['desktop','scripts','docs','companion','licenses','gameplay'])fs.mkdirSync(path.join(root,name),{recursive:true});
 for(const name of ['desktop/bootstrap.cjs','desktop/update-protocol.cjs','desktop/update-apply.cjs','scripts/example.cjs','docs/example.html','package.json','gameplay/manifest.json','gameplay/release.json','gameplay/encounter-integrity.json'])fs.writeFileSync(path.join(root,name),'example '+name);
 fs.mkdirSync(path.join(root,'scripts/__pycache__'));fs.writeFileSync(path.join(root,'scripts/__pycache__/example.pyc'),'excluded cache');
 fs.writeFileSync(path.join(root,'scripts/.env'),'excluded private settings');
 fs.mkdirSync(path.join(gameRoot,'data'),{recursive:true});fs.writeFileSync(path.join(gameRoot,'data/example.txt'),'game');
 const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),index=path.join(temp,'index.json');
 fs.writeFileSync(index,JSON.stringify({files:[{area:'game',path:'data/example.txt',size:4,sha256:hash('game')}]}));
 const keyFile=path.join(temp,'private.pem');
 const report=await build({root,gameIndex:index,gameRoot,output,keyFile,generation:1,tag:'vfixture',version:'fixture',createKey:true,blobs:true});assert(report.createdPacks>0);
 // Remove the key entirely from the reconstruction environment.
 const keyBytes=fs.readFileSync(keyFile);fs.unlinkSync(keyFile);
 const result=await rebuild({root,gameRoot,output:rebuilt,tag:'vfixture'});assert.equal(result.signatureVerified,true);
 for(const name of fs.readdirSync(output).filter(n=>n.endsWith('.bin')))assert.deepEqual(fs.readFileSync(path.join(rebuilt,name)),fs.readFileSync(path.join(output,name)));
 const payload=JSON.parse(Buffer.from(JSON.parse(fs.readFileSync(path.join(root,'updates/current.json'))).payload,'base64'));
 assert(!payload.files.some(r=>r.path.includes('__pycache__')||r.path.endsWith('.env')));assert(!JSON.stringify(payload).includes(keyBytes.toString()));
 fs.writeFileSync(path.join(root,'scripts/example.cjs'),'tampered');
 await assert.rejects(rebuild({root,gameRoot,output:path.join(temp,'bad'),tag:'vfixture'}),/Signed update chunk differs|Missing update source/);
});
