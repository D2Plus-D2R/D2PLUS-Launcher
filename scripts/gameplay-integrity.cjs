'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const REPAIR='Open Setup and use Install Alpha V2.0b to restore the verified package (your current mod output is backed up). Custom D2RMM output must use a supported D2PLUS asset set.';
const fail=detail=>new Error('D2PLUS installation check failed: '+detail+'. '+REPAIR);
async function digest(file){
 const hash=crypto.createHash('sha256');
 for await(const chunk of fs.createReadStream(file))hash.update(chunk);
 return hash.digest('hex');
}
function safePath(root,relative){
 if(typeof relative!=='string'||!relative||relative.includes('\\')||relative.includes(':')||relative.split('/').some(p=>!p||p==='.'||p==='..'))throw fail('invalid integrity path');
 const file=path.resolve(root,...relative.split('/'));
 if(!file.startsWith(path.resolve(root)+path.sep))throw fail('integrity path outside the mod');
 return file;
}
class GameplayIntegrity {
 constructor(suiteRoot){this.manifestFile=path.join(suiteRoot,'gameplay/encounter-integrity.json');this.cached=null;}
 async verify(mpq,{force=false}={}){
  try{return await this._verify(mpq,force);}catch(e){this.cached=null;if(e.message.startsWith('D2PLUS installation check failed:'))throw e;throw fail(e.code==='ENOENT'?'missing encounter asset or verification metadata':e.message);}
 }
 async _verify(mpq,force){
  const manifestBytes=await fs.promises.readFile(this.manifestFile);
  let manifest=JSON.parse(manifestBytes);
  if(manifest.schemaVersion!==1||!manifest.common?.length||!manifest.profiles?.length)throw fail('invalid integrity metadata');
  const modRoot=path.dirname(mpq),receiptFile=path.join(modRoot,'D2PLUS-INSTALL-RECEIPT.json');
  const inventoryFile=path.join(modRoot,'INSTALL_MANIFEST.json');
  let deltaReceipt=null;
  if(fs.existsSync(receiptFile)){
   if((await fs.promises.stat(receiptFile)).size>65536)throw fail('oversized installation receipt');
   const receipt=JSON.parse(await fs.promises.readFile(receiptFile,'utf8'));
   if(receipt.schemaVersion===2){
    const protocol=require('../desktop/update-protocol.cjs');
    const envelope=JSON.parse(await fs.promises.readFile(path.join(path.dirname(path.dirname(this.manifestFile)),'updates/current.json'),'utf8'));
    const signed=protocol.decode(envelope,protocol.channelAt(path.dirname(path.dirname(this.manifestFile))));
    if(receipt.generation!==signed.generation||receipt.manifestSHA256!==protocol.sha(Buffer.from(envelope.payload,'base64'))||receipt.modName.toLowerCase()!==path.basename(modRoot).toLowerCase())throw fail('update receipt does not match the signed release');
    const gameFiles=new Map(signed.files.filter(r=>r.area==='game').map(r=>[r.path,r]));
    const paths=new Set([...manifest.common,...manifest.profiles.flatMap(p=>p.files)].map(r=>r.path));
    const files=[...paths].map(p=>gameFiles.get(p));
    if(files.some(r=>!r))throw fail('signed update is missing encounter fingerprints');
    manifest={schemaVersion:1,common:files,profiles:[{id:'signed-update-'+signed.generation,files:[]}]};deltaReceipt=receipt;
   }
  }
  const all=[...manifest.common,...manifest.profiles.flatMap(p=>p.files)];
  const unique=new Map();
  for(const row of all){
   if(!Number.isSafeInteger(row.size)||row.size<0||!/^[a-f0-9]{64}$/.test(row.sha256))throw fail('invalid file fingerprint');
   unique.set(row.path,safePath(mpq,row.path));
  }
  // Only metadata is retained between monitor ticks, never asset contents.
  // An explicit Launch or Check always rehashes, even when timestamps match.
  const signature=[crypto.createHash('sha256').update(manifestBytes).digest('hex'),path.resolve(mpq)];
  for(const file of [...unique.values(),receiptFile,inventoryFile]){
   const st=await fs.promises.stat(file).catch(e=>{if(e.code==='ENOENT'&&(file===receiptFile||file===inventoryFile))return null;throw e;});
   if(st&&!st.isFile())throw fail('expected a file: '+path.basename(file));
   signature.push(st?`${file}:${st.dev}:${st.ino}:${st.size}:${st.mtimeMs}:${st.ctimeMs}`:file+':missing');
  }
  const key=JSON.stringify(signature);
  if(!force&&this.cached?.key===key)return this.cached.result;
  const actual=new Map();
  for(const [relative,file] of unique)actual.set(relative,{size:(await fs.promises.stat(file)).size,sha256:await digest(file)});
  const matches=row=>{const a=actual.get(row.path);return a.size===row.size&&a.sha256===row.sha256;};
  const bad=manifest.common.find(row=>!matches(row));
  if(bad)throw fail('changed or incomplete '+bad.path);
  const profile=manifest.profiles.find(p=>p.files.every(matches));
  if(!profile)throw fail('mixed or changed Warden textures/cache');
  let receipt=deltaReceipt;
  if(!deltaReceipt&&fs.existsSync(receiptFile)){
   if((await fs.promises.stat(receiptFile)).size>65536)throw fail('oversized installation receipt');
   receipt=JSON.parse(await fs.promises.readFile(receiptFile,'utf8'));
   if(receipt.schemaVersion!==1||receipt.modName.toLowerCase()!==path.basename(modRoot).toLowerCase()||receipt.archiveSHA256!==manifest.archiveSHA256||receipt.manifestSHA256!==manifest.installManifestSHA256||await digest(inventoryFile)!==receipt.manifestSHA256)throw fail('installation receipt does not match this gameplay release');
  }
  const result={verified:true,profile:profile.id,checkedFiles:unique.size,installation:receipt?'guided':'verified-manual'};
  this.cached={key,result};return result;
 }
}
module.exports={GameplayIntegrity,digest,safePath};
