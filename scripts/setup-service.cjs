'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Readable}=require('node:stream'),{pipeline}=require('node:stream/promises');
const {powershell}=require('./windows-adapter.cjs');
const CATALOG=Object.freeze({
 d2rmm:{name:'D2RMM 1.9.1 for Windows',page:'https://github.com/olegbl/d2rmm/releases',url:'https://github.com/olegbl/d2rmm/releases/download/v1.9.1/D2RMM.1.9.1.zip',file:'D2RMM.1.9.1.zip',sha256:'b6f93d8b777c25f80ec80ed9429865a9c55c8d5797601362ed51f39cec4271b7'},
 game:{name:'Diablo II: Resurrected',page:'https://diablo2.blizzard.com/'},
 damage:{name:'D2R Damage Numbers',page:'https://github.com/Fr4nsson/D2RDamageNumbers'}
});
class SetupService {
 constructor({launcher,adapter,stateDir,fetchImpl=fetch}){Object.assign(this,{launcher,adapter,stateDir,fetchImpl});this.job=null;this.controller=null;this.task=null;}
 snapshot(){return {download:this.job,catalog:CATALOG};}
 async scanMods(exe){if(this.adapter.platform!=='win32')throw Error('Folder detection is available on Windows.');if(typeof exe!=='string'||!path.win32.isAbsolute(exe))throw Error('Select D2R.exe first.');const root=path.win32.join(path.win32.dirname(exe),'mods');const entries=await fs.promises.readdir(root,{withFileTypes:true}).catch(()=>[]);const found=[];for(const e of entries){if(!e.isDirectory())continue;const directory=path.join(root,e.name);if(fs.existsSync(path.join(directory,e.name+'.mpq')))found.push({name:e.name,directory});}return {mods:found};}
 async check(){const c=this.launcher.config;let gameError='',exeInfo=null;try{await this.launcher.validateGame();exeInfo=await this.launcher.inspect();}catch(e){gameError=e.message;}
 return {gameReady:!gameError,gameError,exeInfo,d2rmmReady:!!c.d2rmmExe&&fs.existsSync(c.d2rmmExe),companionReady:fs.existsSync(this.launcher.companionPath()),wikiReady:fs.existsSync(path.join(this.launcher.suiteRoot,'docs/wiki/index.html')),editorReady:fs.existsSync(path.join(this.launcher.suiteRoot,'docs/index.html'))};}
 async open(kind){if(kind==='d2rmm'){const exe=this.launcher.config.d2rmmExe;if(!exe||!path.win32.isAbsolute(exe)||!exe.toLowerCase().endsWith('.exe')||!fs.existsSync(exe))throw Error('Choose your D2RMM executable in Setup first.');return powershell("$i=[Diagnostics.ProcessStartInfo]::new();$i.FileName=$d.path;$i.WorkingDirectory=[IO.Path]::GetDirectoryName($d.path);$i.UseShellExecute=$true;[void][Diagnostics.Process]::Start($i);'{}'",{path:exe});}
 if(kind==='downloads'){fs.mkdirSync(path.join(this.stateDir,'downloads'),{recursive:true});return powershell("[void][Diagnostics.Process]::Start('explorer.exe', ('\"'+$d.path+'\"')); '{}'",{path:path.join(this.stateDir,'downloads')});}
 if(!CATALOG[kind])throw Error('Unknown component.');return powershell("Start-Process -FilePath $d.url; '{}'",{url:CATALOG[kind].page});}
 startDownload(id){const item=CATALOG[id];if(!item?.url)throw Error('This component is obtained from its official page.');if(this.job?.state==='Downloading')return this.snapshot();this.controller=new AbortController();this.job={id,name:item.name,state:'Downloading',bytes:0,total:0,message:'Connecting to the official release…'};this.task=this.download(item,this.controller.signal).catch(e=>{this.job.state='Error';this.job.message=e.name==='AbortError'?'Download cancelled.':e.message;});return this.snapshot();}
 async download(item,signal){const dir=path.join(this.stateDir,'downloads');fs.mkdirSync(dir,{recursive:true});const dest=path.join(dir,item.file),temp=dest+'.partial';const hash=crypto.createHash('sha256');const timer=setTimeout(()=>this.controller.abort(),20*60*1000);
 try{const response=await this.fetchImpl(item.url,{signal,headers:{'User-Agent':'D2PLUS-Launcher/0.1.0'}});if(!response.ok||!response.body)throw Error('Download failed (HTTP '+response.status+'). Use the official download page.');this.job.total=Number(response.headers.get('content-length'))||0;this.job.message='Downloading official ZIP; it will not run automatically.';
 const body=Readable.fromWeb(response.body);body.on('data',chunk=>{hash.update(chunk);this.job.bytes+=chunk.length;if(this.job.bytes>1024*1024*1024)this.controller.abort();});await pipeline(body,fs.createWriteStream(temp),{signal});
 if(hash.digest('hex')!==item.sha256)throw Error('Checksum mismatch. Download discarded; use the official release page.');if(fs.existsSync(dest))fs.unlinkSync(dest);fs.renameSync(temp,dest);this.job.state='Complete';this.job.path=dest;this.job.message='Verified ZIP downloaded. Open Downloads, extract it to your chosen folder, then Browse for D2RMM.exe.';
 }finally{clearTimeout(timer);if(fs.existsSync(temp))fs.unlinkSync(temp);}}
 cancel(){this.controller?.abort();return this.snapshot();}
 async close(){this.controller?.abort();await this.task;}
}
module.exports={SetupService,CATALOG};
