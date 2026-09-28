// D2PLUS Offline Suite 1.0.0-beta.1. Dependency-free, testable launcher policy.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const VERSION = '0.0.2-alpha';
const DEFAULTS = Object.freeze({gameExe:'', modDirectory:'', arguments:'', workingDirectory:'',
  d2rmmExe:'', setupComplete:false, enableDamageNumbers:false, companionExe:'', showDps:false, dpsX:85, dpsY:15, fontSize:26});
const norm = s => path.win32.normalize(String(s || '')).replace(/\\+$/, '').toLowerCase();
const identity = p => `${p.pid}:${p.started}`;
// Windows command-line quoting: backslashes before double quotes follow CommandLineToArgvW rules.
function splitWindowsCommandLine(input) {
  const result=[]; let i=0;
  while(i<input.length) {
    while(/[ \t]/.test(input[i] || '\0')) i++;
    if(i>=input.length) break;
    let value='', quoted=false;
    while(i<input.length) {
      if(!quoted && /[ \t]/.test(input[i])) break;
      let slashes=0; while(input[i]==='\\') {slashes++;i++;}
      if(input[i]==='"') {
        value+='\\'.repeat(Math.floor(slashes/2));
        if(slashes%2) {value+='"';i++;}
        else if(quoted && input[i+1]==='"') {value+='"';i+=2;}
        else {quoted=!quoted;i++;}
      } else {value+='\\'.repeat(slashes);if(i<input.length) value+=input[i++];}
    }
    if(quoted) throw new Error('Unclosed double quote in launch arguments.');
    result.push(value);
  }
  return result;
}
function modName(args) {
  const tokens=splitWindowsCommandLine(args); const indices=tokens.map((x,i)=>x.toLowerCase()==='-mod'?i:-1).filter(i=>i>=0);
  if(indices.length!==1 || !tokens[indices[0]+1] || tokens[indices[0]+1].startsWith('-')) throw new Error('Exactly one -mod NAME argument is required. Import your working shortcut or enter its full arguments.');
  const name=tokens[indices[0]+1];
  if(!/^[\w .-]+$/.test(name) || name==='.' || name==='..') throw new Error('Unsupported mod name. Use the exact installed folder name (letters, numbers, spaces, dots, dashes, underscores).');
  return name;
}
function validateConfig(value) {
  const out={};
  for(const key of Object.keys(DEFAULTS)) {
    const v=value[key]===undefined?DEFAULTS[key]:value[key];
    if(typeof DEFAULTS[key]==='string') {
      if(typeof v!=='string'||v.length>16000||/[\x00-\x1f]/.test(v)) throw new Error(`Invalid ${key}.`);
      out[key]=key==='arguments'?v:v.trim().replace(/^"(.*)"$/, '$1');
    } else if(typeof DEFAULTS[key]==='boolean') {
      if(typeof v!=='boolean') throw new Error(`Invalid ${key}.`);out[key]=v;
    } else {
      const n=Number(v), min=key==='fontSize'?16:0, max=key==='fontSize'?48:100;
      if(!Number.isFinite(n)||n<min||n>max) throw new Error(`Invalid ${key} (${min}–${max}).`);out[key]=n;
    }
  }
  return out;
}
function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.tmp-'+crypto.randomBytes(6).toString('hex');
  try {fs.writeFileSync(temp,content);fs.renameSync(temp,file);} finally {if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
function patchIni(text, changes) {
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);let section=''; const left=new Map();
  for(const [s,values]of Object.entries(changes))for(const [k,v]of Object.entries(values))left.set(`${s.toLowerCase()}/${k.toLowerCase()}`,{s,k,v});
  const output=lines.map(line=>{const header=line.match(/^\s*\[([^\]]+)\]/);if(header)section=header[1].toLowerCase();
    const match=line.match(/^\s*([^;#=]+?)\s*=/);if(match){const key=section+'/'+match[1].toLowerCase();const change=left.get(key);if(change){left.delete(key);return `${change.k}=${change.v}`;}}return line;});
  const sections={};for(const c of left.values())(sections[c.s]??=[]).push(`${c.k}=${c.v}`);
  // Insert new keys into existing sections (Windows INI APIs do not reliably merge duplicate sections).
  for(const [s,values] of Object.entries(sections)) {
    const idx=output.findIndex(l=>l.trim().toLowerCase()===`[${s.toLowerCase()}]`);
    if(idx>=0)output.splice(idx+1,0,...values);else output.push('',`[${s}]`,...values);
  }
  return output.join('\r\n');
}
class Launcher {
  constructor({adapter,settingsFile,suiteRoot,now=()=>Date.now()}) {
    this.adapter=adapter;this.settingsFile=settingsFile;this.suiteRoot=suiteRoot;this.now=now;
    this.config={...DEFAULTS};this.message='';this.state='Disabled';this.compatibility='Not checked on this installation.';
    this.owned=null;this.attempt=null;this.pendingLaunchUntil=0;this.queue=Promise.resolve();this.revision=0;
    try {if(fs.existsSync(settingsFile))this.config=validateConfig(JSON.parse(fs.readFileSync(settingsFile,'utf8')));}catch(e){this.message='Settings could not be loaded; defaults used: '+e.message;}
    this.state=this.config.enableDamageNumbers?'Waiting for Game':'Disabled';
  }
  serialize(fn) {const p=this.queue.then(fn);this.queue=p.catch(()=>{});return p;}
  companionPath(){return this.config.companionExe||path.join(this.suiteRoot,'companion','D2PLUSDamageNumbers.exe');}
  snapshot(){return {version:VERSION,config:this.config,state:this.state,message:this.message,compatibility:this.compatibility,
    game:this.game||null,exeInfo:this.exeInfo||null,platform:this.adapter.platform,companionPath:this.companionPath()};}
  async save(changes) {
    const next=validateConfig({...this.config,...changes});
    if(fs.existsSync(this.settingsFile)&&!fs.existsSync(this.settingsFile+'.before-prototype'))fs.copyFileSync(this.settingsFile,this.settingsFile+'.before-prototype');
    atomicWrite(this.settingsFile,JSON.stringify(next,null,2)+'\n');
    await this.stopOwned();this.config=next;this.revision++;this.attempt=null;this.readyIdentity=null;this.readySince=0;
    this.compatibility='Not checked for the current game session.';
    this.state=next.enableDamageNumbers?'Waiting for Game':'Disabled';this.message='Settings saved.';
    return this.snapshot();
  }
  async stopOwned(){if(this.owned){await this.adapter.stopCompanion(this.owned);this.owned=null;}}
  async disable(){return this.save({enableDamageNumbers:false});}
  async retry(){await this.stopOwned();this.attempt=null;this.state=this.config.enableDamageNumbers?'Waiting for Game':'Disabled';this.message='Retry requested.';return this.snapshot();}
  async inspect(){this.exeInfo=await this.adapter.inspectExe(this.config.gameExe);return this.exeInfo;}
  async validateGame(){
    const c=this.config;if(!c.gameExe || !path.win32.isAbsolute(c.gameExe))throw new Error('Select your D2R executable first.');
    if(!/\.exe$/i.test(c.gameExe))throw new Error('Game executable must be an EXE.');
    const name=modName(c.arguments);
    if(!c.modDirectory||!path.win32.isAbsolute(c.modDirectory))throw new Error('Select the installed mod output folder.');
    const expected=path.win32.join(path.win32.dirname(c.gameExe),'mods',name);
    if(norm(c.modDirectory)!==norm(expected))throw new Error(`The -mod argument resolves to ${expected}. Select that output folder (junctions are allowed).`);
    await this.adapter.validateFiles(c,path.win32.join(c.modDirectory,`${name}.mpq`));return name;
  }
  matching(p){try{return norm(p.exe)===norm(this.config.gameExe)&&modName(p.commandLine).toLowerCase()===modName(this.config.arguments).toLowerCase();}catch{return false;}}
  async launchGame(){
    await this.validateGame();const all=await this.adapter.processes(this.companionPath());
    const matches=all.games.filter(p=>this.matching(p));
    if(matches.length>1)throw new Error('Multiple configured D2R instances exist. Close extras before launching.');
    if(matches.length===1){this.message='D2PLUS is already running.';return {alreadyRunning:true,pid:matches[0].pid};}
    if(all.games.some(p=>norm(p.exe)===norm(this.config.gameExe)||!p.exe))throw new Error('A D2R instance from this installation (or with unreadable identity) is already running. Close it first.');
    if(this.now()<this.pendingLaunchUntil)return {launchPending:true};
    this.pendingLaunchUntil=this.now()+30000;
    try {const result=await this.adapter.launchGame(this.config);this.message='D2PLUS launched. Damage numbers will start if enabled and ready.';return result;}
    catch(e){this.pendingLaunchUntil=0;throw e;}
  }
  async tick(){
    if(!this.config.enableDamageNumbers){await this.stopOwned();this.state='Disabled';return;}
    if(this.adapter.platform!=='win32'){this.state='Error';this.message='Game and companion launching require Windows. Wiki and editor remain available.';return;}
    try {
      await this.validateGame();const all=await this.adapter.processes(this.companionPath());
      if(all.games.length>1){await this.stopOwned();this.state='Error';this.message='Multiple D2R instances detected. Close all but your configured offline D2PLUS game; no companion is attached.';this.game=null;return;}
      const game=all.games.find(p=>this.matching(p));this.game=game||null;
      if(!game){await this.stopOwned();this.readyIdentity=null;this.attempt=null;this.state='Waiting for Game';this.compatibility='Not checked for a current matching game.';this.message=all.games.length?'Another D2R installation or mod is running. Waiting for the configured D2PLUS game.':'Waiting for your configured offline D2PLUS game.';return;}
      if(!game.started||!game.exe||!game.commandLine)throw new Error('Cannot verify game identity. Run suite and D2R with the same permissions.');
      const key=identity(game);
      if(this.owned && this.owned.gameKey!==key)await this.stopOwned();
      if(this.owned){
        const evidence=await this.adapter.companionStatus(this.owned);
        if(!evidence.alive){this.owned=null;this.state='Error';this.message='Companion exited or failed. Check its message/log; use Retry after fixing it.';this.compatibility='This session is not currently verified.';return;}
        if(evidence.error)throw new Error(evidence.error);
        if(evidence.verified){this.state='Running';this.compatibility='Upstream startup memory checks passed for this game process. Gameplay accuracy still needs in-game testing.';this.message='Damage numbers companion is running.';}
        else if(!this.owned.integrated){this.state='Running';this.compatibility='User-supplied process is running; its memory checks cannot be verified by this suite.';this.message='Companion process started. Check its own warnings and overlay.';}
        else {this.state=this.now()-this.owned.launchedAt>240000?'Error':'Waiting for Game';this.message=evidence.waiting?'Enter an unpaused offline single-player game. The companion waits up to 3 minutes for the original memory checks to pass.':'Companion is checking compatibility. Check any companion dialog. If it remains here, stop it and inspect the log.';}
        return;
      }
      if(this.attempt===key){this.state='Error';return;}
      if(!game.window){this.state='Waiting for Game';this.message='D2R is starting; waiting for its window.';return;}
      if(this.readyIdentity!==key){this.readyIdentity=key;this.readySince=this.now();}
      if(this.now()-this.readySince<4000){this.state='Waiting for Game';this.message='Waiting for the D2R window to settle.';return;}
      if(all.companions.length){this.state='Error';this.message='A damage companion is already running outside this launcher. Close it before retrying. The suite will not take control of it.';return;}
      this.attempt=key;
      const launched=await this.adapter.startCompanion(this.companionPath(),game,this.config);
      this.owned={...launched,gameKey:key,launchedAt:this.now()};this.state='Waiting for Game';this.message='Companion started; waiting for its compatibility checks.';
    }catch(e){await this.stopOwned().catch(()=>{});this.state='Error';this.message=e.message;this.compatibility='Not verified for the current session.';}
  }
  async shutdown(){await this.stopOwned();}
}
module.exports={Launcher,DEFAULTS,VERSION,validateConfig,splitWindowsCommandLine,modName,norm,atomicWrite,patchIni};
