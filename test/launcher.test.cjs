const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Launcher,splitWindowsCommandLine,modName,patchIni}=require('../scripts/launcher-core.cjs');
const {createSuite}=require('../scripts/serve-editor.cjs');
const c={gameExe:'C:\\Games With Spaces\\D2R.exe',modDirectory:'C:\\Games With Spaces\\mods\\My D2PLUS',arguments:'-mod "My D2PLUS" -txt -direct -w -custom "a b"',workingDirectory:'C:\\Games With Spaces'};
const game={pid:12,exe:c.gameExe,commandLine:`"${c.gameExe}" ${c.arguments}`,started:'12345',window:true};
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'d2plus test '));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));let now=10000;
 const a={platform:'win32',games:[],companions:[],starts:0,stops:0,launches:0,alive:true,verified:false,
  async validateFiles(conf,mpq){this.mpq=mpq;},async processes(){return {games:this.games,companions:this.companions};},
  async launchGame(conf){this.launches++;this.launched=structuredClone(conf);return{pid:99};},
  async startCompanion(exe,g,conf){this.starts++;if(this.fail)throw new Error('Companion missing');this.started={exe,g,conf};return {integrated:true};},
  async stopCompanion(){this.stops++;},async companionStatus(){return {alive:this.alive,verified:this.verified};},async inspectExe(){return{fileVersion:'test-version'};}};
 const options={adapter:a,settingsFile:path.join(dir,'settings.json'),suiteRoot:dir,now:()=>now};const l=new Launcher(options);
 return {dir,a,l,options,advance:(n=5000)=>now+=n};}
async function enabled(s){await s.l.save({...c,enableDamageNumbers:true});s.a.games=[{...game}];await s.l.tick();s.advance();await s.l.tick();}
test('defaults disabled; persistence and full arguments round trip paths with spaces',async t=>{const s=setup(t);assert.equal(s.l.config.enableDamageNumbers,false);await s.l.save({...c,enableDamageNumbers:true,dpsX:77});const again=new Launcher(s.options);assert.equal(again.config.arguments,c.arguments);assert.equal(again.config.enableDamageNumbers,true);assert.equal(again.config.dpsX,77);await again.launchGame();assert.equal(s.a.launched.arguments,c.arguments);assert.equal(s.a.launched.gameExe,c.gameExe);assert.equal(s.a.mpq,c.modDirectory+'\\My D2PLUS.mpq');});
test('Windows argument parsing handles spaces, quoted quotes, trailing slash, preserves input',()=>{assert.deepEqual(splitWindowsCommandLine('-mod "My D2PLUS" -x "a b"'),['-mod','My D2PLUS','-x','a b']);assert.deepEqual(splitWindowsCommandLine('"C:\\path with spaces\\\\" -txt'),['C:\\path with spaces\\','-txt']);assert.equal(modName(c.arguments),'My D2PLUS');assert.throws(()=>modName('-mod a -mod b'));assert.throws(()=>splitWindowsCommandLine('"unclosed'));});
test('mod directory mismatch prevents accidental wrong output launch',async t=>{const s=setup(t);await s.l.save({...c,modDirectory:'C:\\Other\\mods\\My D2PLUS'});await assert.rejects(()=>s.l.launchGame(),/resolves/);assert.equal(s.a.launches,0);});
test('double clicks and pending game start produce one launch; detects already-running game',async t=>{const s=setup(t);await s.l.save(c);await Promise.all([s.l.serialize(()=>s.l.launchGame()),s.l.serialize(()=>s.l.launchGame())]);assert.equal(s.a.launches,1);s.a.games=[game];assert.equal((await s.l.launchGame()).alreadyRunning,true);assert.equal(s.a.launches,1);});
test('separately launched configured game starts once after readiness; only verified status claims checks',async t=>{const s=setup(t);await enabled(s);assert.equal(s.a.starts,1);assert.equal(s.l.state,'Waiting for Game');await s.l.tick();assert.equal(s.l.state,'Waiting for Game');s.a.verified=true;await s.l.tick();assert.equal(s.l.state,'Running');assert.match(s.l.compatibility,/checks passed/);await s.l.tick();assert.equal(s.a.starts,1);});
test('wrong installation or mod never attaches',async t=>{const s=setup(t);await s.l.save({...c,enableDamageNumbers:true});for(const p of [{...game,exe:'D:\\Other\\D2R.exe'},{...game,commandLine:'D2R.exe -mod Other -txt'}]){s.a.games=[p];await s.l.tick();s.advance();await s.l.tick();assert.equal(s.l.state,'Waiting for Game');assert.equal(s.a.starts,0);}});
test('multiple games stop managed companion; never attach ambiguously',async t=>{const s=setup(t);await enabled(s);s.a.games.push({...game,pid:88,exe:'D:\\Other\\D2R.exe'});await s.l.tick();assert.equal(s.a.stops,1);assert.equal(s.l.state,'Error');assert.match(s.l.message,/Multiple/);});
test('missing companion does not block game launch and does not retry loop',async t=>{const s=setup(t);s.a.fail=true;await enabled(s);assert.equal(s.l.state,'Error');await s.l.tick();assert.equal(s.a.starts,1);assert.equal((await s.l.launchGame()).alreadyRunning,true);await s.l.retry();await s.l.tick();assert.equal(s.a.starts,2);});
test('disable persists; only owned process stops; game exit cleans up',async t=>{const s=setup(t);await enabled(s);await s.l.disable();assert.equal(s.a.stops,1);assert.equal(s.l.state,'Disabled');assert.equal(new Launcher(s.options).config.enableDamageNumbers,false);await enabled(s);s.a.games=[];await s.l.tick();assert.equal(s.a.stops,2);assert.equal(s.l.state,'Waiting for Game');assert.equal(s.l.owned,null);});
test('crash requires explicit retry; no restart storm',async t=>{const s=setup(t);await enabled(s);s.a.alive=false;await s.l.tick();await s.l.tick();assert.equal(s.a.starts,1);assert.equal(s.l.state,'Error');});
test('external companion blocks duplicate launch without taking ownership',async t=>{const s=setup(t);s.a.companions=[{pid:333}];await enabled(s);assert.equal(s.a.starts,0);assert.equal(s.a.stops,0);assert.equal(s.l.state,'Error');});
test('changed PID start time stops old companion, then waits before new one',async t=>{const s=setup(t);await enabled(s);s.a.games=[{...game,started:'different'}];await s.l.tick();assert.equal(s.a.stops,1);assert.equal(s.a.starts,1);s.advance();await s.l.tick();assert.equal(s.a.starts,2);});
test('INI styling preserves calibration/hash/memory settings without duplicate sections',()=>{const source='[Compatibility]\r\nD2RHash=keep\r\n[ProjectionCalibration]\r\nSamples=10\r\n[Memory]\r\nCustomOffset=keep\r\n[Overlay]\r\nFontSize=38\r\n';const out=patchIni(source,{Overlay:{FontSize:26,ShowDpsNumber:0},Colors:{Normal:'218,198,150'}});assert.match(out,/D2RHash=keep/);assert.match(out,/CustomOffset=keep/);assert.match(out,/Samples=10/);assert.match(out,/FontSize=26/);assert.equal((out.match(/\[Overlay\]/g)||[]).length,1);});
test('HTTP API rejects cross origin/tokenless mutations; wiki and editor and home serve',async t=>{const s=setup(t);const root=path.resolve(__dirname,'..');const suite=createSuite({suiteRoot:root,stateDir:s.dir,adapter:s.a,port:0,monitor:false});await new Promise(resolve=>suite.server.listen(0,'127.0.0.1',resolve));t.after(()=>suite.close());const base='http://127.0.0.1:'+suite.server.address().port;
 for(const page of ['/','/index.html','/wiki/index.html'])assert.equal((await fetch(base+page)).status,200);
 let res=await fetch(base+'/api/status');const status=await res.json();assert.equal(status.config.enableDamageNumbers,false);
 const post=(headers={},data=c)=>fetch(base+'/api/settings',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
 assert.equal((await post()).status,403);assert.equal((await post({'X-D2PLUS-Token':status.token,Origin:'https://unrelated.example'})).status,403);
 assert.equal((await post({'X-D2PLUS-Token':status.token})).status,200);
 assert.equal((await fetch(base+'/api/status',{headers:{Origin:'https://unrelated.example'}})).status,403);
 assert.equal(await new Promise((resolve,reject)=>{const req=require('node:http').get(base+'/api/status',{headers:{Host:'attacker.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);}),403);
 assert.equal((await fetch(base+'/%2e%2e%2fscripts/launcher-core.cjs')).status,404);
 const result=await (await fetch(base+'/api/status')).json();assert.equal(result.config.arguments,c.arguments);
});

test('home and direct launcher routes resolve the JavaScript and stylesheet they advertise',async t=>{
 const s=setup(t),suite=createSuite({suiteRoot:path.resolve(__dirname,'..'),stateDir:s.dir,adapter:s.a,port:0,monitor:false});
 await new Promise(resolve=>suite.server.listen(0,'127.0.0.1',resolve));t.after(()=>suite.close());
 const base='http://127.0.0.1:'+suite.server.address().port;
 for(const route of ['/','/launcher/','/launcher/index.html']) {
  const html=await(await fetch(base+route)).text();let count=0;
  for(const match of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css)(?:\?[^"#]*)?)"/g)) {
   const url=new URL(match[1],base+route),response=await fetch(url);assert.equal(response.status,200,url.href);assert.match(response.headers.get('content-type'),/text\/(javascript|css)/);count++;
  }
  assert.equal(count,2);
 }
});

test('map reset persists, preserves custom arguments and changes only launch arguments',async t=>{
 const s=setup(t);await s.l.save({...c,resetOfflineMaps:true});const again=new Launcher(s.options);
 assert.equal(again.config.resetOfflineMaps,true);await again.launchGame();
 assert.equal(s.a.launched.arguments,c.arguments+' -resetofflinemaps');assert.equal(again.config.arguments,c.arguments);
});
test('map switch deduplicates standalone flags without altering quoted values',()=>{
 const {mapArguments}=require('../scripts/map-options.cjs');
 const input='-mod "My Mod" -x "value -resetofflinemaps" -RESETOFFLINEMAPS -txt "-resetofflinemaps"';
 assert.equal(mapArguments(input,false),'-mod "My Mod" -x "value -resetofflinemaps"  -txt ');
 assert.equal(mapArguments(input,true),'-mod "My Mod" -x "value -resetofflinemaps"  -txt -resetofflinemaps');
});
