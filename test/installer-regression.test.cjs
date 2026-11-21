'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const run=promisify(execFile),{installSnapshot,hashFile}=require('../scripts/guided-install.cjs');
const suite=path.resolve(__dirname,'..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const script=path.join(suite,'scripts','install-snapshot.ps1');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'d2plus-installer-test-'));
 t.after(()=>{assert(path.dirname(root)===os.tmpdir()&&path.basename(root).startsWith('d2plus-installer-test-'));fs.rmSync(root,{recursive:true,force:true});});
 const gameExe=path.join(root,'D2R.exe');fs.writeFileSync(gameExe,'fixture, never executed');
 return {root,gameExe,modName:'MyMod',archive:path.join(root,'gameplay.zip')};
}
async function zip(file,entries){
 const ps=`Add-Type -AssemblyName System.IO.Compression.FileSystem;$r=$env:D2PLUS_ZIP_TEST|ConvertFrom-Json;$z=[IO.Compression.ZipFile]::Open($r.file,'Create');try{foreach($e in $r.entries){$s=$z.CreateEntry($e.name).Open();try{$b=[Convert]::FromBase64String($e.body);$s.Write($b,0,$b.Length)}finally{$s.Dispose()}}}finally{$z.Dispose()}`;
 await run('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(ps,'utf16le').toString('base64')],{windowsHide:true,env:{...process.env,D2PLUS_ZIP_TEST:JSON.stringify({file,entries:entries.map(([name,body])=>({name,body:Buffer.from(body).toString('base64')}))})}});
}
async function invoke(f,{failPromotion=false}={}){
 const request=path.join(f.root,'request.json');fs.writeFileSync(request,JSON.stringify({gameExe:f.gameExe,modName:f.modName,archive:f.archive,sha256:await hashFile(f.archive)}));
 const args=failPromotion?['-EncodedCommand',Buffer.from(`function Move-Item { param([string]$LiteralPath,[string]$Destination) if([IO.Path]::GetFileName($LiteralPath).StartsWith('.d2plus-stage-')){throw 'Injected promotion failure'}; Microsoft.PowerShell.Management\\Move-Item -LiteralPath $LiteralPath -Destination $Destination }; & $env:D2PLUS_TEST_SCRIPT -RequestFile $env:D2PLUS_TEST_REQUEST`,'utf16le').toString('base64')]:['-File',script,'-RequestFile',request];
 const r=await run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass',...args],{windowsHide:true,maxBuffer:1024*1024,env:{...process.env,D2PLUS_TEST_SCRIPT:script,D2PLUS_TEST_REQUEST:request}});return JSON.parse(r.stdout.replace(/^\uFEFF/,''));
}
function entries({size=4,digest=hash('test'),extra=[]}={}){
 return [['D2RMM.mpq/data/global/excel/skills.txt','test'],['INSTALL_MANIFEST.json',JSON.stringify({version:'fixture',files:[{path:'D2RMM.mpq/data/global/excel/skills.txt',size,sha256:digest}]})],...extra];
}
test('installer rejects missing, duplicate, traversal and size-mismatched entries without replacing old output',{skip:process.platform!=='win32'},async t=>{
 const f=fixture(t),target=path.join(f.root,'mods','MyMod');fs.mkdirSync(target,{recursive:true});fs.writeFileSync(path.join(target,'keep.txt'),'preserve');
 for(const [label,list,pattern] of [
  ['size',entries({size:5}),/contents differ/],
  ['duplicate',entries({extra:[['D2RMM.mpq/data/global/excel/skills.txt','test']]}),/Duplicate archive/],
  ['traversal',entries({extra:[['D2RMM.mpq/../../escape.txt','bad']]}),/Unexpected gameplay/],
  ['missing',entries().slice(1),/manifest file is missing/],
  ['hash',entries({digest:hash('evil')}),/verification failed/]
 ]){
  f.archive=path.join(f.root,label+'.zip');await zip(f.archive,list);
  await assert.rejects(invoke(f),pattern);assert.equal(fs.readFileSync(path.join(target,'keep.txt'),'utf8'),'preserve');
  assert(!fs.existsSync(path.join(f.root,'escape.txt')));
  assert(!fs.readdirSync(path.join(f.root,'mods')).some(n=>n.startsWith('.d2plus-stage-')));
 }
});
test('failed promotion restores the moved previous output',{skip:process.platform!=='win32'},async t=>{
 const f=fixture(t),target=path.join(f.root,'mods','MyMod');fs.mkdirSync(target,{recursive:true});fs.writeFileSync(path.join(target,'keep.txt'),'preserve');
 await zip(f.archive,entries());await assert.rejects(invoke(f,{failPromotion:true}),/Injected promotion failure/);
 assert.equal(fs.readFileSync(path.join(target,'keep.txt'),'utf8'),'preserve');
 assert.deepEqual(fs.readdirSync(path.join(f.root,'mods')),['MyMod']);
});
test('real guided install accepts full V2.0b archive above 2 GiB expanded and preserves upgrade savepath/backup',{
 skip:process.platform!=='win32'||!process.env.D2PLUS_TEST_FULL_ARCHIVE,timeout:1800000
},async t=>{
 const f=fixture(t);f.archive=process.env.D2PLUS_TEST_FULL_ARCHIVE;
 const manifest=JSON.parse(fs.readFileSync(path.join(suite,'gameplay','manifest.json')));
 const config={gameExe:f.gameExe,modDirectory:path.join(f.root,'mods','MyMod'),arguments:'-mod MyMod -txt -w'};
 const launcher={config,adapter:{async processes(){return {games:[],companions:[]};}},companionPath(){return '';},async save(v){Object.assign(config,v);}};
 const options={launcher,stateDir:path.join(f.root,'state'),archive:f.archive,sha256:manifest.sha256};
 const first=await installSnapshot(options);assert.equal(first.installed,true);assert.equal(first.backup,'');
 const receipt=JSON.parse(fs.readFileSync(path.join(config.modDirectory,'D2PLUS-INSTALL-RECEIPT.json')));
 assert.equal(receipt.fileCount,3124);assert(receipt.expandedBytes>2**31);
 assert.equal(receipt.archiveSHA256,manifest.sha256);
 const mpq=path.join(config.modDirectory,'MyMod.mpq');assert(fs.existsSync(path.join(mpq,'data','hd','character','enemy','sovereign_warden.json')));
 const {GameplayIntegrity}=require('../scripts/gameplay-integrity.cjs');
 assert.equal((await new GameplayIntegrity(suite).verify(mpq,{force:true})).verified,true);
 fs.writeFileSync(path.join(mpq,'modinfo.json'),JSON.stringify({name:'MyMod',savepath:'Preserved Saves'}));
 fs.writeFileSync(path.join(config.modDirectory,'previous-marker.txt'),'previous output');
 const second=await installSnapshot(options);
 const actualParent=fs.statSync(path.dirname(second.backup),{bigint:true}),expectedParent=fs.statSync(path.join(f.root,'mods'),{bigint:true});
 assert.equal(actualParent.dev,expectedParent.dev);assert.equal(actualParent.ino,expectedParent.ino);
 assert(path.basename(second.backup).startsWith('MyMod.before-v20b-'),second.backup);
 assert.equal(second.savepath,'Preserved Saves');assert.equal(fs.readFileSync(path.join(second.backup,'previous-marker.txt'),'utf8'),'previous output');
 assert.equal(JSON.parse(fs.readFileSync(path.join(mpq,'modinfo.json'))).savepath,'Preserved Saves');
 assert(!fs.readdirSync(path.join(f.root,'mods')).some(n=>n.startsWith('.d2plus-stage-')));
 assert.equal((await new GameplayIntegrity(suite).verify(mpq,{force:true})).installation,'guided');
});
