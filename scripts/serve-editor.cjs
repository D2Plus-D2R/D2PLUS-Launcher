// D2PLUS Suite launcher + unchanged prebuilt wiki/editor. Node 18+; no npm install.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {Launcher,VERSION,modName}=require('./launcher-core.cjs');
const {WindowsAdapter,powershell}=require('./windows-adapter.cjs');
const {SetupService}=require('./setup-service.cjs');
function createSuite({suiteRoot=path.resolve(__dirname,'..'),stateDir=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'.local','share'),'D2PLUS','OfflineSuite'),adapter,port=8080,monitor=true,onQuit=null}={}) {
  const root=path.join(suiteRoot,'docs'),token=crypto.randomBytes(32).toString('hex');
  adapter=adapter||new WindowsAdapter({suiteRoot,stateDir});
  const launcher=new Launcher({adapter,suiteRoot,settingsFile:path.join(stateDir,'settings.json')});
  const setup=new SetupService({launcher,adapter,stateDir});
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.jpg':'image/jpeg','.ico':'image/x-icon'};
  const reply=(res,code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'});res.end(JSON.stringify(data));};
  const server=http.createServer(async(req,res)=>{
    const address=server.address();const allowed=`127.0.0.1:${address?.port||port}`;
    if(req.headers.host!==allowed){reply(res,403,{error:'Invalid host.'});return;}
    const origin=req.headers.origin;
    if(origin && origin!==`http://${allowed}`){reply(res,403,{error:'Cross-origin request rejected.'});return;}
    if(req.headers['sec-fetch-site'] && !['same-origin','none'].includes(req.headers['sec-fetch-site'])){reply(res,403,{error:'Cross-site request rejected.'});return;}
    let pathname;try{pathname=decodeURIComponent(new URL(req.url,`http://${allowed}`).pathname);}catch{reply(res,400,{error:'Bad URL.'});return;}
    if(pathname.startsWith('/api/')){
      try{
        if(req.method==='GET' && pathname==='/api/health'){reply(res,200,{app:'D2PLUS Offline Suite',version:VERSION});return;}
        if(req.method==='GET' && pathname==='/api/status'){reply(res,200,{...launcher.snapshot(),setup:setup.snapshot(),token});return;}
        if(req.method!=='POST'){reply(res,405,{error:'POST required.'});return;}
        if(req.headers['x-d2plus-token']!==token){reply(res,403,{error:'Missing launcher session token. Reload this page.'});return;}
        if(!String(req.headers['content-type']).startsWith('application/json')){reply(res,415,{error:'JSON required.'});return;}
        let body='';for await(const part of req){body+=part;if(body.length>65536)throw new Error('Request too large.');}
        const data=JSON.parse(body||'{}');
        const result=await launcher.serialize(async()=>{
          switch(pathname){
            case '/api/settings': {
              if(fs.existsSync(launcher.settingsFile)&&!fs.existsSync(launcher.settingsFile+'.before-prototype'))fs.copyFileSync(launcher.settingsFile,launcher.settingsFile+'.before-prototype');
              return launcher.save(data);
            }
            case '/api/build-arguments': return require('./arguments-helper.cjs').buildArguments(data.directory,data.arguments);
            case '/api/setup-check': return setup.check();
            case '/api/install-gameplay': return setup.install();
            case '/api/scan-mods': return setup.scanMods(data.gameExe);
            case '/api/open-component': return setup.open(data.component);
            case '/api/download': return setup.startDownload(data.component);
            case '/api/cancel-download': return setup.cancel();
            case '/api/quit': if(onQuit){setTimeout(()=>onQuit(),150);return {closing:true};}setTimeout(async()=>{if(timer)clearInterval(timer);await setup.close();try{await launcher.serialize(()=>launcher.shutdown());}catch(e){console.error(e.message);}server.close();},150);return {closing:true};
            case '/api/launch': return launcher.launchGame();
            case '/api/stop': return launcher.disable();
            case '/api/retry': return launcher.retry();
            case '/api/inspect': return launcher.inspect();
            case '/api/pick': if(!['exe','folder','shortcut'].includes(data.kind))throw new Error('Invalid picker.');return adapter.pick(data.kind);
            case '/api/import-shortcut': {
              const imported=await adapter.importShortcut(data.file);const name=modName(imported.arguments);
              imported.modDirectory=path.win32.join(path.win32.dirname(imported.gameExe),'mods',name);return imported;
            }
            default: throw new Error('Unknown action.');
          }
        });reply(res,200,result||{});
      }catch(e){reply(res,400,{error:e.message});}return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    let filename;
    try{
      filename=path.resolve(root,`.${pathname==='/'?'/launcher/index.html':pathname}`);
      const relative=path.relative(root,filename);
      if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error();
      if(fs.statSync(filename).isDirectory())filename=path.join(filename,'index.html');
      if(!fs.statSync(filename).isFile())throw new Error();
    }catch{res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',...(pathname==='/'||pathname.startsWith('/launcher/')?{'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"}:{})});
    if(req.method==='HEAD'){res.end();return;}
    const stream=fs.createReadStream(filename);stream.on('error',()=>res.destroy());stream.pipe(res);
  });
  let ticking=false;const timer=monitor?setInterval(()=>{if(ticking)return;ticking=true;launcher.serialize(()=>launcher.tick()).catch(e=>console.error(e.message)).finally(()=>{ticking=false;});},2000):null;
  server.on('close',()=>{if(timer)clearInterval(timer);});
  return {server,launcher,close:async()=>{if(timer)clearInterval(timer);await setup.close();await launcher.serialize(()=>launcher.shutdown());if(server.listening)await new Promise(resolve=>server.close(resolve));}};
}
if(require.main===module){
  const suite=createSuite();let stopping=false;
  const open=()=>{if(process.argv.includes('--open')&&process.platform==='win32')powershell(`$edge=@("$([Environment]::GetFolderPath('ProgramFilesX86'))\\Microsoft\\Edge\\Application\\msedge.exe","$([Environment]::GetFolderPath('ProgramFiles'))\\Microsoft\\Edge\\Application\\msedge.exe")|Where-Object {Test-Path -LiteralPath $_}|Select-Object -First 1; if($edge){Start-Process -FilePath $edge -ArgumentList '--app=http://127.0.0.1:8080/','--window-size=1440,960'}else{Start-Process 'http://127.0.0.1:8080/'}; '{}'`,{}).catch(e=>console.error('Open http://127.0.0.1:8080/ manually: '+e.message));};
  suite.server.listen(8080,'127.0.0.1',()=>{
    console.log(`D2PLUS Offline Suite ${VERSION}: http://127.0.0.1:8080/`);
    console.log('Wiki: /wiki/index.html | Hero editor: /index.html');
    console.log('Keep this window open for launch monitoring. Ctrl+C stops the companion and suite; D2R stays open.');open();
  });
  suite.server.on('error',e=>{
    if(e.code==='EADDRINUSE'){
      const req=http.get('http://127.0.0.1:8080/api/health',res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>{try{if(JSON.parse(text).app!=='D2PLUS Offline Suite')throw new Error();const running=JSON.parse(text);if(running.version!==VERSION){console.error('An older D2PLUS suite is still running on port 8080. Close its console, then start this updated suite again.');}else{console.log('Suite is already running.');open();}}catch{console.error('Port 8080 belongs to another application. Close it and try again.');}suite.server.emit('close');});});
      req.setTimeout(3000,()=>req.destroy());req.on('error',()=>{console.error('Port 8080 unavailable.');suite.server.emit('close');});
    }else{console.error(e.message);suite.server.emit('close');process.exitCode=1;}
  });
  async function stop(){if(stopping)return;stopping=true;try{await suite.close();}catch(e){console.error(e.message);}process.exit();}
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
module.exports={createSuite};
