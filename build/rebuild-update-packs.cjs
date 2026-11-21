'use strict';
// Reconstruct the already-signed public update packs without the signing key.
// CI must reproduce every chunk/pack hash; it cannot silently re-sign changes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {pipeline}=require('node:stream/promises'),{Transform}=require('node:stream');
const {decode,channelAt}=require('../desktop/update-protocol.cjs'),{digest}=require('../scripts/gameplay-integrity.cjs');
async function rebuild({root,gameRoot,overlays=[],output,tag}){
 const envelope=JSON.parse(fs.readFileSync(path.join(root,'updates/current.json'))),manifest=decode(envelope,channelAt(root)),groups=new Map();
 for(const row of manifest.files){
  const d=row.download;if(!d||!d.url.includes('/releases/download/'+tag+'/'))continue;
  if(d.offset===undefined)throw Error('This release requires indexed update packs.');
  const name=new URL(d.url).pathname.split('/').pop();if(!/^[a-f0-9]{64}\.bin$/.test(name))throw Error('Invalid pack filename.');
  if(!groups.has(name))groups.set(name,[]);groups.get(name).push(row);
 }
 fs.mkdirSync(output,{recursive:true});let bytes=0;
 for(const [name,rows]of groups){
  rows.sort((a,b)=>a.download.offset-b.download.offset);const target=path.join(output,name),expected=rows[0].download;
  if(fs.existsSync(target)&&fs.statSync(target).size===expected.packSize&&await digest(target)===expected.packSHA256){bytes+=expected.packSize;continue;}
  const temp=target+'.partial';fs.writeFileSync(temp,'');let cursor=0;
  try{
   for(const row of rows){
    const d=row.download;if(d.offset!==cursor||d.packSize!==expected.packSize||d.packSHA256!==expected.packSHA256)throw Error('Incomplete signed pack inventory.');
    const choices=row.area==='launcher'?[path.join(root,row.path)]:[...overlays.map(p=>path.join(p,row.path)),path.join(gameRoot,row.path)];
    const source=choices.find(p=>fs.existsSync(p));if(!source||fs.statSync(source).size!==row.size)throw Error('Missing update source '+row.path);
    const raw=crypto.createHash('sha256'),compressed=crypto.createHash('sha256');let rawBytes=0,compressedBytes=0;
    await pipeline(fs.createReadStream(source),new Transform({transform(chunk,enc,cb){rawBytes+=chunk.length;raw.update(chunk);cb(null,chunk);}}),zlib.createGzip({level:6}),new Transform({transform(chunk,enc,cb){compressedBytes+=chunk.length;compressed.update(chunk);cb(null,chunk);}}),fs.createWriteStream(temp,{flags:'a'}));
    if(rawBytes!==row.size||raw.digest('hex')!==row.sha256||compressedBytes!==d.size||compressed.digest('hex')!==d.sha256)throw Error('Signed update chunk differs: '+row.path+' (check source bytes and pinned Node/zlib versions)');
    cursor+=compressedBytes;
   }
   if(cursor!==expected.packSize||await digest(temp)!==expected.packSHA256)throw Error('Signed update pack differs.');
   fs.renameSync(temp,target);bytes+=cursor;
  }finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
 }
 fs.copyFileSync(path.join(root,'updates/current.json'),path.join(output,'d2plus-update.json'));
 const report={generation:manifest.generation,signatureVerified:true,packs:groups.size,bytes,privateKeyRequired:false};
 fs.writeFileSync(path.join(output,'PACK-REBUILD-VERIFIED.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));return report;
}
if(require.main===module)rebuild(JSON.parse(fs.readFileSync(process.argv[2]))).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={rebuild};
