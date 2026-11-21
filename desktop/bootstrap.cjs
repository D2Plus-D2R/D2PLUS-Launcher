'use strict';
// Stable entry point: apply a verified pending transaction before loading the
// launcher application. Electron/runtime replacement still uses an installer.
const path=require('node:path'),fs=require('node:fs');
const {app,dialog}=require('electron');
const root=path.resolve(__dirname,'..'),stateDir=path.join(process.env.LOCALAPPDATA,'D2PLUS','OfflineSuite');
if(!app.requestSingleInstanceLock())app.quit();
else{
 app.d2plusBootstrapLock=true;
 try{
  const result=require('./update-apply.cjs').applyPending({root,stateDir});
  if(result.applied)console.log('D2PLUS update applied:',result.generation);
  require('./main.cjs');
 }catch(e){
  if(e.safeToContinue){
   const dir=path.join(stateDir,'updates'),pending=path.join(dir,'pending.json');
   fs.renameSync(pending,path.join(dir,'failed-'+Date.now()+'.json'));
   fs.writeFileSync(path.join(dir,'last-error.json'),JSON.stringify({message:e.message,time:new Date().toISOString()}));
   require('./main.cjs');
  }else app.whenReady().then(()=>{dialog.showErrorBox('D2PLUS update needs attention',e.message+'\nThe launcher has stopped to preserve the installation. Restart to retry recovery.');app.quit();});
 }
}
