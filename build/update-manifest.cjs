'use strict';
// Release-side tool. Private signing material stays outside the repository and
// every package. Blob names are content-addressed and reusable across releases.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {pipeline}=require('node:stream/promises');
const {allowedFile,decode,sha}=require('../desktop/update-protocol.cjs');
const {digest}=require('../scripts/gameplay-integrity.cjs');
async function build({root,gameIndex,gameRoot,overlays=[],output,keyFile,generation,tag,version,previousFile=null,createKey=false,blobs=false}){
 if(!Number.isSafeInteger(generation)||generation<1||!/^v[\w.-]+$/.test(tag))throw Error('Invalid release identity.');
 fs.mkdirSync(output,{recursive:true});
 const existingChannel=path.join(root,'updates/channel.json');
 if(fs.existsSync(existingChannel)&&!fs.existsSync(keyFile))throw Error('Restore the existing update signing key; do not silently rotate the installed trust key.');
 if(!fs.existsSync(keyFile)){
  if(!createKey)throw Error('Signing key is missing; creation must be explicit.');
  fs.mkdirSync(path.dirname(keyFile),{recursive:true});const {privateKey}=crypto.generateKeyPairSync('ed25519');
  fs.writeFileSync(keyFile,privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600,flag:'wx'});
 }
 const key=crypto.createPrivateKey(fs.readFileSync(keyFile)),publicKey=crypto.createPublicKey(key).export({type:'spki',format:'pem'});
 if(fs.existsSync(existingChannel)&&JSON.parse(fs.readFileSync(existingChannel)).publicKey!==publicKey)throw Error('Signing key does not match the established update channel.');
 const channel={schemaVersion:1,manifestUrl:'https://raw.githubusercontent.com/D2Plus-D2R/D2PLUS-Launcher/main/updates/current.json',publicKey};
 const previous=previousFile?decode(JSON.parse(fs.readFileSync(previousFile)),channel):null;
 if(previous&&generation<=previous.generation)throw Error('Release generation must increase.');
 const old=new Map((previous?.files||[]).map(r=>[r.area+'/'+r.path,r]));
 const files=[],sources=new Map();
 function visit(folder){
  for(const d of fs.readdirSync(folder,{withFileTypes:true})){
   if(['__pycache__','node_modules','.git','.cache','.DS_Store'].includes(d.name)||d.name.endsWith('.pyc'))continue;
   const absolute=path.join(folder,d.name);if(d.isSymbolicLink())throw Error('Do not package source junctions.');
   if(d.isDirectory())visit(absolute);
   else if(d.isFile()){
    const relative=path.relative(root,absolute).split(path.sep).join('/');
    const immutable=['desktop/bootstrap.cjs','desktop/update-protocol.cjs','desktop/update-apply.cjs'].includes(relative);
    const row={area:'launcher',path:relative,...(immutable?{immutable:true}:{})};if(allowedFile(row)){files.push(row);sources.set(row.area+'/'+row.path,absolute);}
   }
  }
 }
 for(const dir of ['desktop','scripts','docs','companion','licenses'])visit(path.join(root,dir));
 for(const name of ['package.json','gameplay/manifest.json','gameplay/release.json','gameplay/encounter-integrity.json']){
  const row={area:'launcher',path:name};files.push(row);sources.set(row.area+'/'+row.path,path.join(root,name));
 }
 for(const row of JSON.parse(fs.readFileSync(gameIndex)).files){
  const next={area:'game',path:row.path,size:row.size,sha256:row.sha256};files.push(next);
  const candidates=[...overlays.map(p=>path.join(p,row.path)),path.join(gameRoot,row.path)];
  sources.set('game/'+row.path,candidates.find(p=>fs.existsSync(p)));
 }
 files.sort((a,b)=>(a.area+'/'+a.path).localeCompare(b.area+'/'+b.path));
 let reused=0,created=0,pack=null,packNumber=0;
 function finishPack(){
  if(!pack)return;
  fs.closeSync(pack.fd);const hash=crypto.createHash('sha256'),fd=fs.openSync(pack.file,'r'),buf=Buffer.alloc(1024*1024);
  try{let n;while((n=fs.readSync(fd,buf,0,buf.length,null)))hash.update(buf.subarray(0,n));}finally{fs.closeSync(fd);}
  const h=hash.digest('hex'),name=h+'.bin',target=path.join(output,name);
  if(fs.existsSync(target))fs.unlinkSync(pack.file);else fs.renameSync(pack.file,target);
  for(const entry of pack.entries)Object.assign(entry,{url:'https://github.com/D2Plus-D2R/D2PLUS-Launcher/releases/download/'+tag+'/'+name,packSize:pack.size,packSHA256:h});
  pack=null;
 }
 for(const row of files){
  const file=sources.get(row.area+'/'+row.path);if(!file)throw Error('Missing update source: '+row.path);
  const stat=fs.statSync(file),hash=await digest(file);
  if(row.area==='game'&&(row.size!==stat.size||row.sha256!==hash))throw Error('Game index does not match update source: '+row.path);
  row.size=stat.size;row.sha256=hash;
  if(row.immutable)continue;
  const prior=old.get(row.area+'/'+row.path);
  if(prior?.sha256===row.sha256&&prior.download){row.download=prior.download;reused++;continue;}
  if(!blobs)continue;
  const temp=path.join(output,'.chunk-'+row.sha256+'.gz');
  await pipeline(fs.createReadStream(file),zlib.createGzip({level:6}),fs.createWriteStream(temp));
  const size=fs.statSync(temp).size;
  if(pack&&pack.size+size>64*1024**2)finishPack();
  if(!pack){const file=path.join(output,'.pack-'+packNumber++);pack={file,fd:fs.openSync(file,'w'),size:0,entries:[]};}
  row.download={offset:pack.size,size,sha256:await digest(temp)};
  for await(const chunk of fs.createReadStream(temp)){let offset=0;while(offset<chunk.length)offset+=fs.writeSync(pack.fd,chunk,offset,chunk.length-offset);}
  pack.size+=size;pack.entries.push(row.download);fs.unlinkSync(temp);created++;
 }
 finishPack();
 const payload=Buffer.from(JSON.stringify({schemaVersion:1,generation,version,publishedAt:new Date().toISOString(),files}));
 const envelope={payload:payload.toString('base64'),signature:crypto.sign(null,payload,key).toString('base64')};
 decode(envelope,channel);
 fs.mkdirSync(path.join(root,'updates'),{recursive:true});
 fs.writeFileSync(path.join(root,'updates/channel.json'),JSON.stringify(channel,null,2)+'\n');
 fs.writeFileSync(path.join(root,'updates/current.json'),JSON.stringify(envelope));
 fs.writeFileSync(path.join(output,'d2plus-update.json'),JSON.stringify(envelope));
 const report={generation,version,files:files.length,createdChunks:created,reusedChunks:reused,createdPacks:packNumber,privateKeyIncluded:false,manifestSHA256:sha(payload)};
 fs.writeFileSync(path.join(output,'UPDATE-READY.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));return report;
}
if(require.main===module){
 const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));build(config).catch(e=>{console.error(e.message);process.exitCode=1;});
}
module.exports={build};
