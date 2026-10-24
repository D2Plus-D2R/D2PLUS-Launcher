'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {modName,splitWindowsCommandLine}=require('./launcher-core.cjs');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function saveLocation(config,metadata,savedGames){
 const name=modName(config.arguments);
 const tokens=splitWindowsCommandLine(config.arguments);
 if(tokens.some(t=>/^-{1,2}(savepath|savedir)(=|$)/i.test(t)))throw Error('Custom save-directory arguments need manual verification. No backup was made.');
 const expected=path.win32.join(path.win32.dirname(config.gameExe),'mods',name);
 if(path.win32.normalize(config.modDirectory).toLowerCase()!==expected.toLowerCase())throw Error('The mod output and launch arguments do not match. Check Settings.');
 if(typeof metadata.savepath!=='string'||!metadata.savepath.trim())throw Error('The installed mod has no explicit savepath. Check modinfo.json before backing up.');
 const relative=metadata.savepath.replace(/[\\/]+$/,'');
 if(path.win32.isAbsolute(relative)||relative.split(/[\\/]/).some(p=>!p||p==='.'||p==='..'||/[<>:"|?*\x00-\x1f]/.test(p)))throw Error('The installed mod uses an unsupported savepath. No folder was guessed.');
 return path.win32.join(savedGames,'Diablo II Resurrected','mods',relative);
}
async function inventory(root,relative=''){
 const rows=[];
 for(const entry of await fs.readdir(path.join(root,relative),{withFileTypes:true})){
  const name=path.join(relative,entry.name),file=path.join(root,name),stat=await fs.lstat(file);
  if(stat.isSymbolicLink())throw Error('A linked file or folder was found in the saves. Back up that location manually.');
  if(stat.isDirectory())rows.push(...await inventory(root,name));
  else if(stat.isFile()){
   if(stat.size>512*1024*1024)throw Error('A save-folder file is too large for a quick backup. Back up the folder manually.');
   rows.push({path:name,size:stat.size,sha256:digest(await fs.readFile(file))});
  }
 }
 return rows.sort((a,b)=>a.path.localeCompare(b.path));
}
class SaveService{
 constructor({launcher,adapter,stateDir,openPath}){Object.assign(this,{launcher,adapter,stateDir,openPath});this.lastBackup=null;}
 async folder(){
  const c=this.launcher.config,name=modName(c.arguments);
  const metadata=JSON.parse((await fs.readFile(path.win32.join(c.modDirectory,name+'.mpq','modinfo.json'),'utf8')).replace(/^\uFEFF/,''));
  return saveLocation(c,metadata,await this.adapter.savedGamesFolder());
 }
 async status(){
  try{const folder=await this.folder(),s=await fs.stat(folder).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
   if(!this.lastBackup){try{this.lastBackup=JSON.parse(await fs.readFile(path.join(this.stateDir,'last-save-backup.json'),'utf8'));}catch{}}
   const last=this.lastBackup?.source===folder?this.lastBackup:null;
   return {folder,exists:!!s?.isDirectory(),message:s?'Includes characters and shared stash.':'This folder has not been created yet. Start and save an offline character first.',lastBackup:last};
  }catch(e){return {folder:null,exists:false,message:'Save folder unavailable: '+e.message,lastBackup:null};}
 }
 async open(){const s=await this.status();if(!s.exists)throw Error(s.message);await this.openPath(s.folder);return {folder:s.folder};}
 async requireClosed(){const p=await this.adapter.saveProcesses();if(p.length)throw Error('Save and close Diablo II: Resurrected before backing up your saves.');}
 async backup(){
  await this.requireClosed();
  const s=await this.status();if(!s.exists)throw Error(s.message);
  const source=await fs.realpath(s.folder),rows=await inventory(source);
  if(!rows.length)throw Error('The save folder is empty. No backup was created.');
  if(rows.reduce((n,r)=>n+r.size,0)>2*1024**3)throw Error('The save folder exceeds 2 GB. Back it up manually.');
  const base=path.join(this.stateDir,'save-backups');await fs.mkdir(base,{recursive:true});
  const realBase=await fs.realpath(base),rel=path.relative(source,realBase);
  if(!rel||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel)))throw Error('Backup destination must be outside the save folder.');
  const created=new Date().toISOString(),id=created.replace(/[:.]/g,'-')+'-'+crypto.randomBytes(4).toString('hex');
  const pending=path.join(base,'.incomplete-'+id),dest=path.join(base,id),files=path.join(pending,'files');
  await fs.mkdir(files,{recursive:true});
  // Incomplete copies are retained for diagnosis and are never advertised as successful backups.
  for(const row of rows){
   const original=path.join(source,row.path),target=path.join(files,row.path);
   await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(original,target,require('node:fs').constants.COPYFILE_EXCL);
   if(digest(await fs.readFile(target))!==row.sha256)throw Error('Saves changed while copying. Close the game and retry; the incomplete copy is not a verified backup.');
  }
  await this.requireClosed();
  if(JSON.stringify(await inventory(source))!==JSON.stringify(rows))throw Error('Saves changed during backup. Close the game and retry.');
  const result={source:s.folder,folder:dest,created,fileCount:rows.length,verified:true};
  await fs.writeFile(path.join(pending,'manifest.json'),JSON.stringify({...result,files:rows},null,2));
  await fs.writeFile(path.join(pending,'RESTORE.txt'),'Close D2R and the hero editor. Preserve your current save folder first. Copy the CONTENTS of the files folder into the original save folder listed in manifest.json. Restore the character and shared stash together. Do not copy manifest.json or RESTORE.txt into the game saves.\r\n');
  await fs.rename(pending,dest);this.lastBackup=result;
  await fs.writeFile(path.join(this.stateDir,'last-save-backup.json'),JSON.stringify(result,null,2));
  return result;
 }
 async openBackup(){const s=await this.status();if(!s.lastBackup)throw Error('No backup exists for this save folder yet.');await this.openPath(s.lastBackup.folder);return s.lastBackup;}
}
module.exports={SaveService,saveLocation,inventory};
