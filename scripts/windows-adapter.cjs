const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const {spawn}=require('node:child_process');const {atomicWrite,patchIni}=require('./launcher-core.cjs');
// User input is JSON in the environment, never interpolated into PowerShell source.
const PS_PREFIX=`$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $d=$env:D2PLUS_REQUEST | ConvertFrom-Json; `;
function powershell(script,data={},timeout=20000){
  if(process.platform!=='win32')return Promise.reject(new Error('This operation requires Windows.'));
  return new Promise((resolve,reject)=>{
    const executable=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
    const child=spawn(executable,['-NoLogo','-NoProfile','-NonInteractive','-STA','-EncodedCommand',Buffer.from(PS_PREFIX+script,'utf16le').toString('base64')],
      {windowsHide:true,env:{...process.env,D2PLUS_REQUEST:JSON.stringify(data)},stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='',done=false;
    const timer=setTimeout(()=>{child.kill();finish(new Error('Windows operation timed out. Close any hidden file picker and retry.'));},timeout);
    function finish(error,value){if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(value);}
    child.stdout.on('data',b=>{stdout+=b;if(stdout.length>2000000){child.kill();finish(new Error('Windows response too large.'));}});
    child.stderr.on('data',b=>{stderr+=b;});child.once('error',e=>finish(e));
    child.once('close',code=>{if(code!==0)finish(new Error(stderr.trim()||`Windows helper exited (${code}).`));else{try{finish(null,stdout.trim()?JSON.parse(stdout.trim().replace(/^\uFEFF/,'')):null);}catch{finish(new Error('Invalid Windows helper response.'));}}});
  });
}
const PROCESS_SCRIPT=`
$games=@(); $companions=@();
$names=@('D2R.exe','Diablo II Resurrected.exe','D2RDamageNumbers.exe','D2PLUSDamageNumbers.exe',[IO.Path]::GetFileName($d.companion));
foreach($p in @(Get-CimInstance Win32_Process | Where-Object { $_.Name -in $names })) {
 $start=''; $window=$false;
 try {$live=Get-Process -Id $p.ProcessId -ErrorAction Stop; $start=$live.StartTime.ToFileTimeUtc().ToString(); $window=$live.MainWindowHandle -ne 0} catch {}
 $record=@{pid=[int]$p.ProcessId;exe=[string]$p.ExecutablePath;commandLine=[string]$p.CommandLine;started=$start;window=$window};
 if($p.Name -in @('D2R.exe','Diablo II Resurrected.exe')) {$games+=,$record} else {$companions+=,$record}
}
@{games=@($games);companions=@($companions)} | ConvertTo-Json -Depth 4 -Compress
`;
class WindowsAdapter {
  constructor({suiteRoot,stateDir}){this.platform=process.platform;this.suiteRoot=suiteRoot;this.stateDir=stateDir;}
  async validateFiles(c,mpq){
    for(const [file,kind]of [[c.gameExe,'file'],[mpq,'directory'],[c.workingDirectory||path.win32.dirname(c.gameExe),'directory']]) {
      const stat=await fs.promises.stat(file).catch(()=>null);
      if(!stat||(kind==='file'?!stat.isFile():!stat.isDirectory()))throw new Error(`Missing ${kind}: ${file}. Apply your D2RMM options with Install Mods first.`);
    }
  }
  processes(companion){return powershell(PROCESS_SCRIPT,{companion});}
  inspectExe(exe){return powershell(`$f=Get-Item -LiteralPath $d.exe; if($f.PSIsContainer){throw 'Select an executable file'}; @{path=$f.FullName;fileVersion=$f.VersionInfo.FileVersion;productVersion=$f.VersionInfo.ProductVersion;sha256=(Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash;compatibility='Unverified until companion startup checks pass'} | ConvertTo-Json -Compress`,{exe},60000);}
  launchGame(c){return powershell(`$info=[Diagnostics.ProcessStartInfo]::new(); $info.FileName=$d.gameExe; $info.Arguments=$d.arguments; $info.WorkingDirectory=$d.workingDirectory; $info.UseShellExecute=$false; $p=[Diagnostics.Process]::Start($info); @{pid=$p.Id} | ConvertTo-Json -Compress`,{...c,workingDirectory:c.workingDirectory||path.win32.dirname(c.gameExe)});}
  pick(kind){return powershell(`Add-Type -AssemblyName System.Windows.Forms;
if($d.kind -eq 'folder'){$p=[Windows.Forms.FolderBrowserDialog]::new();$p.Description='Select a folder';if($p.ShowDialog() -eq 'OK'){@{path=$p.SelectedPath}|ConvertTo-Json -Compress}}
else {$p=[Windows.Forms.OpenFileDialog]::new();if($d.kind -eq 'shortcut'){$p.DereferenceLinks=$false};$p.Filter=if($d.kind -eq 'shortcut'){'Windows shortcut (*.lnk)|*.lnk'}else{'Executable (*.exe)|*.exe'};if($p.ShowDialog() -eq 'OK'){@{path=$p.FileName}|ConvertTo-Json -Compress}}`,{kind},120000);}
  importShortcut(file){return powershell(`if([IO.Path]::GetExtension($d.file) -ne '.lnk'){throw 'Choose a .lnk shortcut'}; if(!(Test-Path -LiteralPath $d.file -PathType Leaf)){throw 'Shortcut file does not exist'}; $shell=New-Object -ComObject WScript.Shell; $s=$shell.CreateShortcut($d.file); @{gameExe=$s.TargetPath;arguments=$s.Arguments;workingDirectory=$s.WorkingDirectory}|ConvertTo-Json -Compress`,{file});}
  async startCompanion(exe,game,c){
    const stat=await fs.promises.stat(exe).catch(()=>null);if(!stat?.isFile()||!exe.toLowerCase().endsWith('.exe'))throw new Error('Companion EXE is missing. Restore the bundled companion or select a user-supplied executable. The game, wiki and editor remain available.');
    const manifestPath=path.join(this.suiteRoot,'companion','BUILD.json');
    let integrated=false;
    try{const manifest=JSON.parse(fs.readFileSync(manifestPath));const hash=crypto.createHash('sha256').update(fs.readFileSync(exe)).digest('hex');integrated=hash===manifest.sha256;}catch{}
    const nonce=crypto.randomBytes(24).toString('hex'),statusFile=path.join(this.stateDir,'status',nonce+'.txt');
    fs.mkdirSync(path.dirname(statusFile),{recursive:true});
    // Stock user-supplied builds use their own INI beside the EXE. Preserve their calibration/check records.
    const configPath=integrated?path.join(this.stateDir,'companion','D2RDamageNumbers.ini'):path.join(path.dirname(exe),'D2RDamageNumbers.ini');
    let original='';if(fs.existsSync(configPath)){const b=fs.readFileSync(configPath);original=b[0]===255&&b[1]===254?b.subarray(2).toString('utf16le'):b.toString('utf8');}
    const changes={Overlay:{ShowDpsNumber:c.showDps?1:0,DpsNumberXPercent:c.dpsX,DpsNumberYPercent:c.dpsY,FontSize:c.fontSize,CritFontSize:c.fontSize+4,
      FontWeight:500,CritFontWeight:600,OutlineThickness:1,MaxActiveNumbers:64,PopStartScale:0.85,PopOvershootScale:1.1,CoalesceTickPop:0,RenderFps:60},
      Colors:{Normal:'218,198,150',Critical:'240,223,184',Outline:'18,16,14',Shadow:'18,16,14'},Test:{Enabled:0}};
    if(integrated){changes.Overlay.FontFile=path.join(this.suiteRoot,'companion','diablo4.ttf');changes.Overlay.FontFace='PT Serif';}
    try {atomicWrite(configPath,Buffer.from('\ufeff'+patchIni(original,changes),'utf16le'));}
    catch(e){throw new Error('Cannot write companion visual settings: '+e.message);}
    const env={...process.env};
    if(integrated)Object.assign(env,{D2PLUS_TARGET_PID:String(game.pid),D2PLUS_TARGET_EXE:game.exe,D2PLUS_TARGET_START:game.started,
      D2PLUS_PARENT_PID:String(process.pid),D2PLUS_STATUS_FILE:statusFile,D2PLUS_STATUS_NONCE:nonce,D2PLUS_CONFIG_PATH:configPath});
    const child=spawn(exe,[],{cwd:path.dirname(exe),env,windowsHide:false,stdio:'ignore'});
    const owned={child,integrated,statusFile,nonce,pid:child.pid,targetPid:game.pid,error:null,exited:false};
    child.on('error',e=>{owned.error=e.message;owned.exited=true;});child.on('exit',()=>{owned.exited=true;});
    await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});return owned;
  }
  async companionStatus(o){
    if(o.exited||o.child.exitCode!==null)return {alive:false};
    if(o.error)return {alive:true,error:o.error};
    let verified=false;
    if(o.integrated){try{const [nonce,pid,status]=fs.readFileSync(o.statusFile,'utf8').trim().split(/\r?\n/);if(nonce===o.nonce&&pid===String(o.targetPid)){verified=status==='running-memory-checks-passed';if(status==='waiting-offline-game')return {alive:true,verified:false,waiting:true};if(status.startsWith('error'))return {alive:true,error:`Companion rejected startup: ${status}. No memory-check bypass is available.`};}}catch{}}
    return {alive:true,verified};
  }
  async stopCompanion(o){
    if(!o.exited && o.child.exitCode===null) {
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Could not confirm companion stopped. Close it from its tray icon.')),5000);
        o.child.once('exit',()=>{clearTimeout(timer);resolve();});
        try{if(!o.child.kill()){clearTimeout(timer);reject(new Error('Could not stop the managed companion.'));}}catch(e){clearTimeout(timer);reject(e);}});
    }
    try{fs.unlinkSync(o.statusFile);}catch{}
  }
}
module.exports={WindowsAdapter,powershell,PROCESS_SCRIPT};
