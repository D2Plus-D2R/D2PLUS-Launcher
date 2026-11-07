'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..');
const {VERSION}=require('../scripts/launcher-core.cjs');
const {createSuite}=require('../scripts/serve-editor.cjs');

test('V2.0a backend health and frontend agree on the current launcher version',async t=>{
 const stateDir=fs.mkdtempSync(path.join(os.tmpdir(),'d2plus-v20a-health-'));
 const suite=createSuite({suiteRoot:root,stateDir,port:0,monitor:false,adapter:{platform:'win32',async stopCompanion(){},async processes(){return {games:[],companions:[]}}}});
 await new Promise((resolve,reject)=>{suite.server.once('error',reject);suite.server.listen(0,'127.0.0.1',resolve)});
 t.after(async()=>{await suite.close();fs.rmSync(stateDir,{recursive:true,force:true})});
 const response=await fetch('http://127.0.0.1:'+suite.server.address().port+'/api/health');
 assert.equal(response.status,200);assert.equal((await response.json()).version,'2.0.1-alpha');
 assert.equal(VERSION,JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version);
 const app=fs.readFileSync(path.join(root,'docs/launcher/app.js'),'utf8');
 assert.equal(app.match(/VERSION='([^']+)'/)[1],VERSION);
});

test('V2.0a launcher exposes the current install and patch-note destinations',()=>{
 const page=fs.readFileSync(path.join(root,'docs/launcher/index.html'),'utf8');
 assert(page.includes('Install Alpha V2.0a'));
 assert(page.includes('/wiki/index.html#alpha-v20a'));
 assert(!page.includes('Happy Halloween!'));
 const installer=fs.readFileSync(path.join(root,'build/installer-v20a.nsi'),'utf8');
 assert(installer.includes('VIProductVersion "2.0.1.0"'));
 assert(installer.includes('"DisplayVersion" "2.0.1-alpha"'));
 assert(installer.includes('InstallDir "$LOCALAPPDATA\\Programs\\D2PLUS Launcher"'));
});
