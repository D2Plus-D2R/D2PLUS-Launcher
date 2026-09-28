'use strict';
const {app,BrowserWindow,ipcMain,dialog,session,shell,screen}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const {createSuite}=require('../scripts/serve-editor.cjs');
const {allowedExternal,localUrl}=require('./policy.cjs');
app.setName('D2PLUS Launcher');app.setAppUserModelId('D2PLUS.Launcher');
let askingToClose=false;
let win,suite,origin='http://127.0.0.1:8080',quitting=false,closed=false;const children=new Set();
const singleton=app.requestSingleInstanceLock();if(!singleton)app.quit();
else{
 app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
 app.on('before-quit',e=>{if(closed)return;e.preventDefault();shutdown();});
 app.on('window-all-closed',()=>{shutdown();});
 app.whenReady().then(start).catch(e=>{dialog.showErrorBox('D2PLUS Launcher could not start',e.message);shutdown();});
}
function preferences(preload){return {nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,...(preload?{preload:path.join(__dirname,'preload.cjs')}:{})};}
function protect(w,isMain=false){w.webContents.on('will-navigate',(event,url)=>{if(!localUrl(url,origin)){event.preventDefault();if(allowedExternal(url))shell.openExternal(url).catch(()=>{});}});
 w.webContents.setWindowOpenHandler(({url})=>{if(localUrl(url,origin)){openTool(url);}else if(allowedExternal(url))shell.openExternal(url).catch(()=>{});return{action:'deny'};});
 w.webContents.on('will-attach-webview',e=>e.preventDefault());
 if(isMain)w.on('close',e=>{if(!closed){e.preventDefault();shutdown();}});
}
function openTool(url){for(const c of children){if(c.webContents.getURL().split('#')[0]===url.split('#')[0]){c.show();c.focus();return;}}
 const child=new BrowserWindow({width:1280,height:900,minWidth:800,minHeight:600,autoHideMenuBar:true,title:url.includes('/wiki/')?'D2PLUS Offline Wiki':'D2PLUS Hero Editor',backgroundColor:'#101211',webPreferences:preferences(false)});child.setMenu(null);children.add(child);protect(child);child.on('closed',()=>children.delete(child));child.loadURL(url);}
async function start(){
 session.defaultSession.setPermissionRequestHandler((_wc,_permission,cb)=>cb(false));session.defaultSession.setPermissionCheckHandler(()=>false);
 suite=createSuite({suiteRoot:path.resolve(__dirname,'..'),port:8080,monitor:true,onQuit:()=>shutdown()});
 await new Promise((resolve,reject)=>{suite.server.once('error',e=>reject(Error(e.code==='EADDRINUSE'?'Port 8080 is in use. Close the previous Offline Suite or launcher console, then open D2PLUS Launcher.exe again.':e.message)));suite.server.listen(8080,'127.0.0.1',resolve);});
 const area=screen.getPrimaryDisplay().workAreaSize;const scale=Math.min(1,area.width/1536,(area.height-30)/961);const width=Math.round(1536*scale),height=Math.round(961*scale);
 win=new BrowserWindow({width,height,minWidth:960,minHeight:601,useContentSize:true,frame:false,show:false,autoHideMenuBar:true,title:'D2PLUS Launcher',icon:path.join(__dirname,'../docs/img/icons/favicon.png'),backgroundColor:'#070908',webPreferences:preferences(true)});win.setMenu(null);protect(win,true);
 ipcMain.handle('d2plus-window',async(event,action)=>{if(event.sender!==win.webContents||!event.senderFrame||!localUrl(event.senderFrame.url,origin))throw Error('Window action rejected.');if(action==='minimize')win.minimize();else if(action==='maximize'){win.isMaximized()?win.unmaximize():win.maximize();}else if(action==='close')await shutdown();else throw Error('Unknown window action.');});
 win.once('ready-to-show',()=>win.show());await win.loadURL(origin+'/');
}
async function shutdown(){if(quitting||closed||askingToClose)return;if(children.size&&win&&!win.isDestroyed()){askingToClose=true;
 const answer=await dialog.showMessageBox(win,{type:'question',title:'Close D2PLUS Launcher?',message:'The wiki and hero editor windows will close too.',detail:'Export any character edits before closing. D2R itself will remain running.',buttons:['Keep launcher open','Close launcher'],defaultId:0,cancelId:0});askingToClose=false;if(answer.response!==1)return;
 }quitting=true;try{if(suite){await suite.close();}}catch(e){console.error(e.message);}closed=true;for(const c of children)c.destroy();children.clear();if(win&&!win.isDestroyed())win.destroy();app.quit();}
