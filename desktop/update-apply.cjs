'use strict';
// Stable bootstrap transaction engine. Ordinary updates cannot replace this file.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {decode,channelAt,destination,atomic,sha}=require('./update-protocol.cjs');
function fileHash(file){
 if(!fs.existsSync(file))return null;
 const fd=fs.openSync(file,'r'),buffer=Buffer.alloc(128*1024),hash=crypto.createHash('sha256');
 try{let n;while((n=fs.readSync(fd,buffer,0,buffer.length,null)))hash.update(buffer.subarray(0,n));}finally{fs.closeSync(fd);}
 return hash.digest('hex');
}
function gameRunning(){
 if(process.platform!=='win32')throw Error('Update application requires Windows.');
 const r=spawnSync(path.join(process.env.SystemRoot||'C:\\Windows','System32/tasklist.exe'),['/FO','CSV','/NH'],{windowsHide:true,encoding:'utf8',maxBuffer:8*1024**2});
 if(r.error||r.status!==0)throw Error('Could not verify whether D2R is running.');
 return r.stdout.split(/\r?\n/).some(line=>/^"(?:D2R|Diablo II Resurrected)\.exe"/i.test(line));
}
function replaceFrom(source,target,expected){
 fs.mkdirSync(path.dirname(target),{recursive:true});const temp=target+'.d2plus-update-'+crypto.randomBytes(8).toString('hex');
 try{fs.copyFileSync(source,temp);if(fileHash(temp)!==expected)throw Error('Update copy verification failed.');const fd=fs.openSync(temp,'r+');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,target);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
function context(root,stateDir,pending){
 const dir=path.join(stateDir,'updates'),channel=channelAt(root),manifest=decode(pending.envelope,channel);
 if(pending.schemaVersion!==1||pending.suiteRoot!==path.resolve(root)||pending.roots.launcher!==root||path.dirname(pending.operation)!==dir||!/^stage-[a-f0-9]{24}$/.test(path.basename(pending.operation)))throw Error('Invalid pending update location.');
 const config=JSON.parse(fs.readFileSync(path.join(stateDir,'settings.json'),'utf8'));
 let game=null;
 if(config.gameExe&&config.modDirectory){
  const name=path.win32.basename(config.modDirectory);
  if(path.win32.normalize(path.win32.dirname(config.modDirectory)).toLowerCase()!==path.win32.join(path.win32.dirname(config.gameExe),'mods').toLowerCase()||!/^[\w .-]+$/.test(name)||['.','..'].includes(name))throw Error('Invalid configured game update root.');
  game=path.join(config.modDirectory,name+'.mpq');
 }
 if(pending.roots.game!==game)throw Error('Game configuration changed after update staging; rescan before applying.');
 const currentFile=path.join(root,'updates/current.json');
 const current=decode(JSON.parse(fs.readFileSync(currentFile,'utf8')),channel);
 if(manifest.generation<current.generation)throw Error('Refusing update downgrade.');
 const inventory=new Map(manifest.files.map(r=>[r.area+'/'+r.path,r]));
 if(!Array.isArray(pending.changes)||!pending.changes.length)throw Error('Empty pending update.');
 const seen=new Set();
 const rows=pending.changes.map(change=>{
  const row=inventory.get(change.area+'/'+change.path),key=(change.area+'/'+change.path).toLowerCase();
  if(!row||row.immutable||seen.has(key)||!/^\d+\.file$/.test(change.source)||!(change.before===null||/^[a-f0-9]{64}$/.test(change.before)))throw Error('Pending update differs from signed inventory.');
  seen.add(key);const dest=destination(pending.roots[row.area],row);
  return {...change,row,dest,sourceFile:path.join(pending.operation,change.source),backup:path.join(pending.operation,'backup',change.source)};
 });
 return {rows,manifest,currentFile,dir,receiptFile:game?path.join(path.dirname(game),'D2PLUS-INSTALL-RECEIPT.json'):null};
}
function restore(ctx,journal){
 for(const row of [...ctx.rows].reverse()){
  const now=fileHash(row.dest);
  if(now===row.before)continue;
  if(now!==row.row.sha256)throw Error('Update recovery found an external file change: '+row.path);
  if(row.before===null){fs.unlinkSync(row.dest);continue;}
  if(fileHash(row.backup)!==row.before)throw Error('Update rollback backup is missing or corrupt.');
  replaceFrom(row.backup,row.dest,row.before);
 }
 atomic(ctx.currentFile,journal.oldCurrent);
 if(ctx.receiptFile){if(journal.oldReceipt===null){if(fs.existsSync(ctx.receiptFile))fs.unlinkSync(ctx.receiptFile);}else atomic(ctx.receiptFile,journal.oldReceipt);}
}
function applyPending({root,stateDir,isGameRunning=gameRunning,afterWrite=()=>{}}){
 const dir=path.join(stateDir,'updates'),pendingFile=path.join(dir,'pending.json');
 if(!fs.existsSync(pendingFile))return {applied:false};
 if(isGameRunning())return {applied:false,waitingForGame:true};
 const pending=JSON.parse(fs.readFileSync(pendingFile,'utf8')),ctx=context(root,stateDir,pending);
 const journalFile=path.join(pending.operation,'journal.json');
 if(fs.existsSync(journalFile)){
  const journal=JSON.parse(fs.readFileSync(journalFile,'utf8'));
  if(journal.state!=='complete'){restore(ctx,journal);fs.unlinkSync(journalFile);return {applied:false,recovered:true};}
  fs.unlinkSync(pendingFile);return {applied:true,generation:ctx.manifest.generation};
 }
 try{
  for(const row of ctx.rows){
   if(fileHash(row.dest)!==row.before)throw Error('Installed files changed since the scan: '+row.path);
   if(fileHash(row.sourceFile)!==row.row.sha256||fs.statSync(row.sourceFile).size!==row.row.size)throw Error('Staged update checksum mismatch.');
  }
 }catch(error){error.safeToContinue=true;throw error;}
 // Snapshot every predecessor before the first live write.
 for(const row of ctx.rows)if(row.before!==null){fs.mkdirSync(path.dirname(row.backup),{recursive:true});fs.copyFileSync(row.dest,row.backup);if(fileHash(row.backup)!==row.before)throw Error('Rollback copy verification failed.');const fd=fs.openSync(row.backup,'r+');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
 const journal={state:'applying',oldCurrent:fs.readFileSync(ctx.currentFile,'utf8'),oldReceipt:ctx.receiptFile&&fs.existsSync(ctx.receiptFile)?fs.readFileSync(ctx.receiptFile,'utf8'):null};
 atomic(journalFile,JSON.stringify(journal));
 try{
  for(const row of ctx.rows){
   // Staged files are bounded by the signed inventory. Copy in chunks so a
   // large material asset never becomes one giant JavaScript allocation.
   replaceFrom(row.sourceFile,row.dest,row.row.sha256);
   afterWrite(row);
  }
  if(ctx.receiptFile&&ctx.rows.some(r=>r.area==='game'))atomic(ctx.receiptFile,JSON.stringify({schemaVersion:2,generation:ctx.manifest.generation,manifestSHA256:sha(Buffer.from(pending.envelope.payload,'base64')),modName:path.basename(path.dirname(pending.roots.game)),installedAt:new Date().toISOString()}));
  atomic(ctx.currentFile,JSON.stringify(pending.envelope));
  journal.state='complete';atomic(journalFile,JSON.stringify(journal));fs.unlinkSync(pendingFile);
  return {applied:true,generation:ctx.manifest.generation,files:ctx.rows.length,backup:pending.operation};
 }catch(error){restore(ctx,journal);fs.unlinkSync(journalFile);error.safeToContinue=true;throw error;}
}
module.exports={applyPending,fileHash,gameRunning};
