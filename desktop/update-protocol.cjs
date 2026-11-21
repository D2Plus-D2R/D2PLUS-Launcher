'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PREFIXES=['desktop/','scripts/','docs/','companion/','licenses/','gameplay/'];
const IMMUTABLE=new Set(['desktop/bootstrap.cjs','desktop/update-protocol.cjs','desktop/update-apply.cjs']);
function safeRelative(value){
 if(typeof value!=='string'||value.length>500||value.includes('\\')||/[:\x00-\x1f]/.test(value)||value.split('/').some(p=>!p||p==='.'||p==='..'||/[. ]$/.test(p)||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(p)))throw Error('Unsafe update path.');
 return value;
}
function allowedFile(row){
 safeRelative(row.path);
 const basename=row.path.split('/').pop();
 if(/^\.env(?:\.|$)/i.test(basename)||/^(?:connection|credentials)\.json$/i.test(basename)||/\.(?:keystore|pfx|p12|jks)$/i.test(basename))return false;
 if(row.area==='game')return row.path.startsWith('data/')&&!/\.(d2s|d2i|key|pem)$/i.test(row.path);
 if(row.area==='launcher'&&IMMUTABLE.has(row.path))return row.immutable===true&&!row.download;
 return row.area==='launcher'&&(row.path==='package.json'||PREFIXES.some(p=>row.path.startsWith(p)))&&!/\.(zip|d2s|d2i|key|pem)$/i.test(row.path);
}
function channelAt(root){return JSON.parse(fs.readFileSync(path.join(root,'updates/channel.json'),'utf8'));}
function decode(envelope,channel){
 if(typeof envelope?.payload!=='string'||envelope.payload.length>12*1024*1024||typeof envelope.signature!=='string')throw Error('Invalid signed update manifest.');
 const bytes=Buffer.from(envelope.payload,'base64');
 if(!crypto.verify(null,bytes,channel.publicKey,Buffer.from(envelope.signature,'base64')))throw Error('Update signature verification failed.');
 const manifest=JSON.parse(bytes);
 if(manifest.schemaVersion!==1||!Number.isSafeInteger(manifest.generation)||manifest.generation<1||!Array.isArray(manifest.files)||!manifest.files.length||manifest.files.length>20000)throw Error('Invalid update inventory.');
 const seen=new Set();let total=0;
 for(const row of manifest.files){
  if(!allowedFile(row)||!Number.isSafeInteger(row.size)||row.size<0||row.size>4*1024**3||!/^[a-f0-9]{64}$/.test(row.sha256))throw Error('Invalid update file.');
  const key=(row.area+'/'+row.path).toLowerCase();if(seen.has(key))throw Error('Duplicate update destination.');seen.add(key);
  total+=row.size;if(total>16*1024**3)throw Error('Update inventory exceeds size limit.');
  if(row.download){
   const d=row.download;
   if(!Number.isSafeInteger(d.size)||d.size<1||d.size>4*1024**3||!/^[a-f0-9]{64}$/.test(d.sha256))throw Error('Invalid download fingerprint.');officialUrl(d.url);
   if(d.offset!==undefined&&(!Number.isSafeInteger(d.offset)||d.offset<0||!Number.isSafeInteger(d.packSize)||d.packSize<d.offset+d.size||d.packSize>4*1024**3||!/^[a-f0-9]{64}$/.test(d.packSHA256)))throw Error('Invalid update pack range.');
  }
 }
 return manifest;
}
function officialUrl(value){
 const u=new URL(value);
 if(u.protocol!=='https:'||u.username||u.password||!['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com','raw.githubusercontent.com'].includes(u.hostname))throw Error('Update URL must use the official release host.');
 if(u.hostname==='github.com'&&!u.pathname.startsWith('/D2Plus-D2R/D2PLUS-Launcher/releases/'))throw Error('Unexpected release repository.');
 if(u.hostname==='raw.githubusercontent.com'&&u.pathname!=='/D2Plus-D2R/D2PLUS-Launcher/main/updates/current.json')throw Error('Unexpected update channel.');
 return u.href;
}
function destination(root,row){
 safeRelative(row.path);const file=path.resolve(root,...row.path.split('/'));
 if(!file.startsWith(path.resolve(root)+path.sep))throw Error('Update escaped its installation.');
 let current=path.dirname(file);
 while(current!==path.resolve(root)){
  if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('Update path contains a junction or symbolic link.');current=path.dirname(current);
 }
 if(fs.existsSync(file)&&fs.lstatSync(file).isSymbolicLink())throw Error('Update target is a symbolic link.');
 return file;
}
function sha(buffer){return crypto.createHash('sha256').update(buffer).digest('hex');}
function atomic(file,body){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.update-'+crypto.randomBytes(6).toString('hex');try{const fd=fs.openSync(tmp,'wx');try{fs.writeFileSync(fd,body);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(tmp,file);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}}
module.exports={safeRelative,allowedFile,channelAt,decode,officialUrl,destination,sha,atomic};
