'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {pipeline}=require('node:stream/promises'),{Readable,Transform}=require('node:stream');
const {channelAt,decode,officialUrl,destination,sha,atomic}=require('../desktop/update-protocol.cjs');
const {digest}=require('./gameplay-integrity.cjs');
class UpdateService {
 constructor({launcher,stateDir,fetchImpl=fetch}){Object.assign(this,{launcher,stateDir,fetchImpl});this.root=launcher.suiteRoot;this.dir=path.join(stateDir,'updates');this.job={state:'Idle',message:'Scan files or check for updates.',checked:0,total:0,downloaded:0};this.task=null;this.closing=false;
  if(fs.existsSync(path.join(this.dir,'pending.json')))this.job={...this.job,state:'Ready',message:'A verified update is staged. Close D2R and restart the launcher to apply it.'};
  else if(fs.existsSync(path.join(this.dir,'last-error.json'))){try{const error=JSON.parse(fs.readFileSync(path.join(this.dir,'last-error.json')));this.job={...this.job,state:'Error',message:'The last update was rolled back: '+error.message};}catch{}}
 }
 snapshot(){return {...this.job,automatic:this.launcher.config.automaticUpdates};}
 roots(){
  const c=this.launcher.config;let game=null;
  if(c.gameExe&&c.modDirectory){
   const name=path.win32.basename(c.modDirectory);
   if(path.win32.normalize(path.win32.dirname(c.modDirectory)).toLowerCase()!==path.win32.join(path.win32.dirname(c.gameExe),'mods').toLowerCase()||!/^[\w .-]+$/.test(name)||['.','..'].includes(name))throw Error('Choose a valid installed mod output before scanning game files.');
   game=path.join(c.modDirectory,name+'.mpq');
  }
  return {launcher:this.root,game};
 }
 start(mode='check'){
  if(this.task||this.job.state==='Ready')return this.snapshot();
  this.task=this.run(mode).catch(e=>{this.job.state='Error';this.job.message=e.message;}).finally(()=>{this.task=null;});return this.snapshot();
 }
 async get(url,signal,headers={}){
  for(let n=0;n<6;n++){
   const response=await this.fetchImpl(officialUrl(url),{redirect:'manual',signal,headers:{'User-Agent':'D2PLUS-Launcher-Updater',...headers}});
   if([301,302,303,307,308].includes(response.status)){const next=response.headers.get('location');if(!next)throw Error('Missing release redirect.');await response.body?.cancel();url=new URL(next,url).href;continue;}
   return response;
  }throw Error('Too many update redirects.');
 }
 async manifest(remote){
  const channel=channelAt(this.root);let envelope,offline=false;
  if(remote){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
   try{
    const r=await this.get(channel.manifestUrl,controller.signal);
    if(!r.ok)throw Error('Update feed HTTP '+r.status);
    let body='',size=0;for await(const chunk of Readable.fromWeb(r.body)){size+=chunk.length;if(size>12*1024*1024)throw Error('Update manifest too large.');body+=chunk.toString('utf8');}
    envelope=JSON.parse(body);decode(envelope,channel);
   }catch(e){
    // Unavailable feed keeps the offline scanner usable. Invalid signatures or
    // malformed successful responses are errors, never an excuse to downgrade.
    if(e.message.includes('signature')||e.message.includes('Invalid')||e.message.includes('too large')||e instanceof SyntaxError)throw e;
    offline=true;
   }finally{clearTimeout(timer);}
  }
  const installed=JSON.parse(fs.readFileSync(path.join(this.root,'updates/current.json'),'utf8'));
  const current=decode(installed,channel);
  if(!envelope)envelope=installed;
  const manifest=decode(envelope,channel);
  if(manifest.generation<current.generation)throw Error('Refusing an older update generation.');
  if(manifest.generation===current.generation&&sha(Buffer.from(envelope.payload,'base64'))!==sha(Buffer.from(installed.payload,'base64')))throw Error('The published update generation changed unexpectedly.');
  return {envelope,manifest,offline};
 }
 async run(mode){
  this.job={state:'Scanning',message:'Checking installed files…',checked:0,total:0,downloaded:0};
  const {envelope,manifest,offline}=await this.manifest(mode!=='scan'),roots=this.roots(),changed=[];
  this.job.version=manifest.version;this.job.total=manifest.files.filter(r=>roots[r.area]).length;
  for(const row of manifest.files){
   if(this.closing)throw Error('Update scan cancelled on close.');
   const root=roots[row.area];if(!root)continue;
   const file=destination(root,row),stat=await fs.promises.stat(file).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
   const before=stat?.isFile()?await digest(file):null;
   if(stat&&!stat.isFile())throw Error('Expected a file at '+row.path);
   if(!stat||stat.size!==row.size||before!==row.sha256)changed.push({row,before});
   this.job.checked++;
  }
  this.job.missingOrChanged=changed.length;this.job.files=changed.slice(0,100).map(x=>({area:x.row.area,path:x.row.path,status:x.before?'Changed':'Missing',bytes:x.row.size}));
  if(!changed.length){this.job.state='Current';this.job.message=offline?'Installed files verified. Online update feed is unavailable.':'All installed files match the signed release.';return;}
  if(mode==='scan'){this.job.state='Repair available';this.job.message=changed.length+' missing or changed files found. Use Check & update to repair them.';return;}
  if(changed.some(x=>!x.row.download)){this.job.state='Repair available';this.job.message='Scan complete. Download locations for these files are not published yet; existing files were preserved.';return;}
  const processes=await this.launcher.adapter.processes(this.launcher.companionPath());
  if(processes.games.length){this.job.state='Waiting for game';this.job.message='Close D2R, then check for updates again.';return;}
  const bytes=changed.reduce((n,x)=>n+x.row.size,0),downloadBytes=changed.reduce((n,x)=>n+x.row.download.size,0);
  fs.mkdirSync(this.dir,{recursive:true});
  const volumes=new Map();
  function reserve(root,size){const st=fs.statSync(root),key=st.dev;if(!volumes.has(key))volumes.set(key,{root,bytes:0});volumes.get(key).bytes+=size;}
  const largestPack=Math.max(0,...changed.map(x=>x.row.download.packSize||0));
  reserve(this.dir,bytes*2+downloadBytes+largestPack+64*1024**2);
  for(const {row} of changed)reserve(roots[row.area],row.size);
  for(const v of volumes.values()){const s=fs.statfsSync(v.root);if(s.bavail*s.bsize<v.bytes)throw Error('Not enough free space to stage this update and its rollback copy.');}
  const operation=path.join(this.dir,'stage-'+crypto.randomBytes(12).toString('hex'));fs.mkdirSync(operation);
  this.job.state='Downloading';this.job.message='Downloading verified update files…';this.job.downloadBytes=downloadBytes;
  // Group reused ranges by pack. A server that ignores Range costs at most one
  // bounded pack download, rather than redownloading it for every small file.
  changed.sort((a,b)=>a.row.download.url.localeCompare(b.row.download.url));
  let cachedPack=null;
  try{
   for(let i=0;i<changed.length;i++){
    if(this.closing)throw Error('Update cancelled on close.');
    const {row}=changed[i],file=path.join(operation,i+'.file'),packed=file+'.gz',controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10*60*1000);
    this.downloadController=controller;
    try{
     const d=row.download,range=d.offset!==undefined;
     if(cachedPack&&cachedPack.url!==d.url){fs.unlinkSync(cachedPack.file);cachedPack=null;}
     let body;
     if(cachedPack){body=fs.createReadStream(cachedPack.file,{start:d.offset,end:d.offset+d.size-1});}
     else{
      const r=await this.get(d.url,controller.signal,range?{Range:`bytes=${d.offset}-${d.offset+d.size-1}`}:{ });
      if(!r.ok||!r.body)throw Error('File download failed (HTTP '+r.status+').');
      if(range&&r.status===200){
       const full=path.join(operation,'download.pack');let received=0;const hash=crypto.createHash('sha256');
       await pipeline(Readable.fromWeb(r.body),new Transform({transform:(chunk,enc,cb)=>{received+=chunk.length;if(received>d.packSize)return cb(Error('Update pack exceeds signed size.'));hash.update(chunk);cb(null,chunk);}}),fs.createWriteStream(full),{signal:controller.signal});
       if(received!==d.packSize||hash.digest('hex')!==d.packSHA256)throw Error('Update pack checksum mismatch.');
       cachedPack={url:d.url,file:full};body=fs.createReadStream(full,{start:d.offset,end:d.offset+d.size-1});
      }else{
       if(range&&(r.status!==206||r.headers.get('content-range')!==`bytes ${d.offset}-${d.offset+d.size-1}/${d.packSize}`))throw Error('Update server returned an incorrect byte range.');
       body=Readable.fromWeb(r.body);
      }
     }
     let compressed=0;const hash=crypto.createHash('sha256');
     await pipeline(body,new Transform({transform:(chunk,enc,cb)=>{compressed+=chunk.length;this.job.downloaded+=chunk.length;if(compressed>row.download.size)return cb(Error('Update download exceeds its signed size.'));hash.update(chunk);cb(null,chunk);}}),fs.createWriteStream(packed),{signal:controller.signal});
     if(compressed!==row.download.size||hash.digest('hex')!==row.download.sha256)throw Error('Compressed update checksum mismatch.');
     let expanded=0;
     await pipeline(fs.createReadStream(packed),zlib.createGunzip(),new Transform({transform(chunk,enc,cb){expanded+=chunk.length;if(expanded>row.size)return cb(Error('Update extraction exceeds its signed size.'));cb(null,chunk);}}),fs.createWriteStream(file));
     if(expanded!==row.size||await digest(file)!==row.sha256)throw Error('Update file checksum mismatch: '+row.path);
     fs.unlinkSync(packed);
    }finally{clearTimeout(timer);}
   }
   if(cachedPack){fs.unlinkSync(cachedPack.file);cachedPack=null;}
   const pending={schemaVersion:1,suiteRoot:path.resolve(this.root),roots,operation,changes:changed.map(({row,before},i)=>({area:row.area,path:row.path,before,source:i+'.file'})),envelope};
   atomic(path.join(this.dir,'pending.json'),JSON.stringify(pending));
   this.job.state='Ready';this.job.message='Verified update ready. Restart the launcher to apply it; rollback copies will be kept.';
  }catch(e){
   // This random task-owned stage has never been promoted into the installation.
   if(path.dirname(operation)===this.dir&&path.basename(operation).startsWith('stage-'))fs.rmSync(operation,{recursive:true,force:true});throw e;
  }
 }
 async close(){this.closing=true;this.downloadController?.abort();await this.task;}
 discard(){
  if(this.task)throw Error('Wait for the current scan or download to finish.');
  const file=path.join(this.dir,'pending.json');
  if(fs.existsSync(file)){
   const p=JSON.parse(fs.readFileSync(file,'utf8'));
   if(p.suiteRoot!==path.resolve(this.root)||path.dirname(p.operation)!==this.dir||!/^stage-[a-f0-9]{24}$/.test(path.basename(p.operation))||fs.existsSync(path.join(p.operation,'journal.json')))throw Error('Restart the launcher to recover the pending transaction first.');
   fs.rmSync(p.operation,{recursive:true,force:true});fs.unlinkSync(file);
  }
  this.job={state:'Idle',message:'Staged update discarded. Installed files were preserved.',checked:0,total:0,downloaded:0};return this.snapshot();
 }
}
module.exports={UpdateService};
