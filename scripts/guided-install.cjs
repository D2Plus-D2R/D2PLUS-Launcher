'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {powershell}=require('./windows-adapter.cjs');
const {buildArguments}=require('./arguments-helper.cjs');
function installationPlan(config){
 if(!path.win32.isAbsolute(config.gameExe)||path.win32.basename(config.gameExe).toLowerCase()!=='d2r.exe')throw Error('Choose your installed D2R.exe in the Game step first.');
 const root=path.win32.dirname(config.gameExe),mods=path.win32.join(root,'mods');
 const destination=config.modDirectory||path.win32.join(mods,'D2RMM');
 if(path.win32.dirname(destination).toLowerCase()!==mods.toLowerCase())throw Error('The mod output must be directly inside this game’s mods folder.');
 const modName=path.win32.basename(destination);
 if(!/^[a-zA-Z0-9_-]+$/.test(modName))throw Error('Guided installation needs a mod folder name with letters, numbers, underscores or dashes.');
 return {gameExe:config.gameExe,directory:destination,modName,arguments:buildArguments(destination,config.arguments||'').arguments};
}
async function installSnapshot({launcher,stateDir,archive,sha256,execute=powershell}){
 const plan=installationPlan(launcher.config);
 const processes=await launcher.adapter.processes(launcher.companionPath());
 if(processes.games.length)throw Error('Close Diablo II: Resurrected before installing.');
 if(!fs.existsSync(archive))throw Error('The bundled gameplay package is missing. Reinstall the complete launcher.');
 const actual=crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
 if(actual!==sha256)throw Error('Gameplay package checksum mismatch. Reinstall the complete launcher.');
 const dir=path.join(stateDir,'install');fs.mkdirSync(dir,{recursive:true});
 const requestFile=path.join(dir,'request-'+crypto.randomBytes(8).toString('hex')+'.json');
 const script=path.join(__dirname,'install-snapshot.ps1');
 fs.writeFileSync(requestFile,JSON.stringify({...plan,archive,sha256}));
 try{
  const result=await execute('& $d.script -RequestFile $d.requestFile',{script,requestFile},300000);
  if(!result?.installed)throw Error('Installation did not finish.');
  try{await launcher.save({modDirectory:plan.directory,arguments:plan.arguments,workingDirectory:path.win32.dirname(plan.gameExe),setupComplete:true});}
  catch(e){throw Error('Game files installed, but settings could not be saved. Choose '+plan.directory+' in Setup. '+e.message);}
  return result;
 }finally{fs.unlinkSync(requestFile);}
}
module.exports={installationPlan,installSnapshot};
