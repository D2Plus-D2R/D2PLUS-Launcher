// Independent v105 bitstream walker; legacy ID 468 is read only for a guarded repair.
const codes={'0':[223,8],'1':[31,7],'2':[12,6],'3':[91,7],'4':[95,8],'5':[104,8],'6':[123,7],'7':[30,5],'8':[8,6],'9':[14,5],' ':[1,2],a:[15,5],b:[10,4],c:[2,5],d:[35,6],e:[3,6],f:[50,6],g:[11,5],h:[24,5],i:[63,7],j:[232,9],k:[18,6],l:[23,5],m:[22,5],n:[44,6],o:[127,7],p:[19,5],q:[155,8],r:[7,5],s:[4,4],t:[6,5],u:[16,5],v:[59,7],w:[0,5],x:[28,5],y:[40,7],z:[27,8]};
const paired=new Map([[17,1],[48,1],[50,1],[52,1],[54,2],[57,2]]);
export function inspectNativeSave(bytes, gd, {legacyFire=false}={}){
 const bases={...gd.armor,...gd.weapons,...gd.misc};
 const statByID=new Map(Object.entries(gd.itemStatCost).map(([name,s])=>[s.id,{name,...s}]));
 if(legacyFire)statByID.set(468,{name:"legacy_fire_alias",savebits:3,saveparambits:3});
 const records=[];
 const b=new Uint8Array(bytes),view=new DataView(b.buffer);let bit=0;
 const fail=m=>{throw Error(`${m} at bit ${bit} (byte ${Math.floor(bit/8)})`);};
 const read=n=>{if(!Number.isInteger(n)||n<0||bit+n>b.length*8)fail('Invalid/truncated field');let v=0;for(let i=0;i<n;i++,bit++)v+=((b[bit>>3]>>(bit%8))&1)*2**i;return v;};
 const skip=n=>{read(n);};const align=()=>{bit=Math.ceil(bit/8)*8;};
 const marker=s=>{align();for(const c of s)if(read(8)!==c.charCodeAt(0))fail('Expected '+s);};
 const types=base=>{const found=new Set();const add=t=>{if(!t||found.has(t))return;found.add(t);add(gd.itemTypes[t]?.equiv1);add(gd.itemTypes[t]?.equiv2);};add(base.type);add(base.type2);return found;};
 const hchar=()=>{let v=0;for(let n=1;n<=9;n++){v+=read(1)*2**(n-1);for(const [c,[code,len]]of Object.entries(codes))if(len===n&&code===v)return c;}fail('Invalid Huffman code');};
 const realm=()=>{if(read(1))skip(128);};
 const stashStack=()=>{if(read(1))read(8);};
 const statList=()=>{const out=[];for(let n=0;n<1024;n++){const bitOffset=bit,id=read(9);if(id===511)return out;const s=statByID.get(id);if(!s||!s.savebits)fail('Unknown/nonserializable item stat '+id);const layer=read(s.saveparambits||0),value=read(s.savebits)-(s.saveadd||0);out.push({id,layer,value,bitOffset,bitEnd:bit});for(let j=1;j<=(paired.get(id)||0);j++){const next=statByID.get(id+j);if(!next?.savebits)fail('Missing paired stat');out.push({id:id+j,layer:0,value:read(next.savebits)-(next.saveadd||0)});}}fail('Unterminated stats');};
 const item=()=>{
  align();const start=bit/8,flags=read(32),compact=!!(flags&0x200000),version=read(3),mode=read(3);
  if(mode===3||mode===5){skip(32);}else{skip(15);}
  if(flags&0x10000)fail('Ear unsupported by this diagnostic');
  const code=hchar()+hchar()+hchar()+hchar();if(code[3]!==' '||!bases[code.trim()])fail('Unknown base '+JSON.stringify(code));
  const base=bases[code.trim()],t=types(base);let count=0,quality=2,identity=null,stats=[],extraStats=[];
  if(compact){
   if(t.has('gold')){skip(read(1)?32:12);skip(1);}
   if(base.quest&&base.questdiffcheck){const s=gd.itemStatCost.questitemdifficulty;skip(s.savebits);}
   realm();stashStack();
  }else{
   count=read(3);skip(32);const level=read(7);if(!level)fail('Item level zero');quality=read(4);if(quality<1||quality>9)fail('Invalid quality '+quality);
   if(read(1))skip(3);if(read(1))skip(11);
   if(quality===1||quality===3)skip(3);
   else if(quality===4)skip(22);
   else if(quality===5||quality===7){identity=read(12);const rows=quality===5?gd.setItems:gd.uniqueItems,prefix=quality===5?'set':'unique';const row=rows[prefix+identity]||rows[prefix+String(identity).padStart(3,'0')];if(!row||(row.code||row.item)!==base.code)fail('Quality/base identity mismatch '+identity);}
   else if(quality===6||quality===8){skip(16);for(let i=0;i<6;i++)if(read(1))skip(11);}
   else if(quality===2){if(t.has('char'))skip(12);else if(t.has('body'))skip(10);else if(t.has('book')||t.has('scro'))skip(5);}
   else if(quality===9)skip(16);
   if(flags&0x4000000)skip(16);
   if(flags&0x1000000){let n=0;while(read(8)){if(++n>15)fail('Long personalized name');}}
   realm();
   if(t.has('armo'))skip(gd.itemStatCost.armorclass.savebits);
   if(t.has('armo')||t.has('weap')){const s=gd.itemStatCost.maxdurability;const max=read(s.savebits)-(s.saveadd||0);if(max>0)skip(gd.itemStatCost.durability.savebits);}
   else if(t.has('gold')){skip(read(1)?32:12);skip(1);}
   if(read(1))skip(9);if(flags&0x800)skip(gd.itemStatCost.item_numsockets.savebits);
   const mask=quality===5?read(5):0;stats=statList();for(let i=0;i<5;i++)if(mask&(1<<i))extraStats.push(...statList());if(flags&0x4000000)extraStats.push(...statList());
   if(flags&0x10000000){skip(16);const compactChronicle=!!(flags&0x20000000);if(!compactChronicle)skip(32);const n=compactChronicle?1:Math.min(read(4),8);skip(n*64);}
   stashStack();
  }
  const bitEnd=bit;align();const end=bit/8,record={start,end,bitEnd,code:base.code,compact,version,quality,identity,stats,extraStats};records.push(record);for(let i=0;i<count;i++)item();return record;
 };
 let sum=0;for(let i=0;i<b.length;i++)sum=(sum*2+(i>=12&&i<16?0:b[i])+(sum>>>31))>>>0;
 if(view.getUint32(0,true)!==0xaa55aa55||view.getUint32(4,true)!==105||view.getUint32(8,true)!==b.length||view.getUint32(12,true)!==sum)fail('Invalid header/size/checksum');
 bit=833*8;marker('gf');const attributes=[];for(let n=0;n<512;n++){const id=read(9);if(id===511)break;const s=statByID.get(id);if(!s?.csvbits)fail('Invalid character stat '+id);const bitOffset=bit;attributes.push({id,value:read(s.csvbits),bitOffset,width:s.csvbits});}
 align();const skillsStart=bit/8;marker('if');skip(b[26]*8);const itemsStart=bit/8;
 const list=()=>{marker('JM');const n=read(16),items=[];for(let i=0;i<n;i++){try{items.push(item());}catch(e){fail(`Item ${i+1}/${n}: ${e.message}`);}}return items;};
 const items=list();const itemsEnd=bit/8;marker('JM');const corpses=read(16);for(let i=0;i<corpses;i++){skip(96);list();}
 marker('jf');if(view.getUint32(163,true))list();marker('kf');if(read(8))item();
 const tailStart=Math.ceil(bit/8);if(b[248]===3){if(read(16)!==1)fail('Unexpected demon version');marker('lf');if(read(16)!==0)fail('Nonempty demon unsupported by this diagnostic');}
 if(bit!==b.length*8)fail('Trailing bytes');
 return{name:new TextDecoder().decode(b.slice(299,395)).split('\0')[0],level:b[27],attributes,items,records,sections:{stats:833,skills:skillsStart,items:itemsStart,itemsEnd},tailStart,structuralCheck:'passed',gameAcceptanceVerified:false};
}

// Remove only the redundant foreign fire-skill stat emitted by earlier editor
// builds. Never re-roll or serialize gear; preserve every other meaningful bit.
export function repairLegacyFireStats(bytes, gd) {
 const source=new Uint8Array(bytes),before=inspectNativeSave(source,gd,{legacyFire:true});
 const changes=[],chunks=[];let cursor=0;
 for(const record of before.records.sort((a,b)=>a.start-b.start)) {
  const bad=[...record.stats,...record.extraStats].filter(s=>s.id===468);
  if(!bad.length)continue;
  if(bad.length!==1 || record.extraStats.some(s=>s.id===468) || bad[0].layer!==0
    || !record.stats.some(s=>s.id===126&&s.layer===1&&s.value===bad[0].value))
    throw Error('Legacy fire stat is not a proven duplicate; automatic repair refused.');
  const remove=bad[0],bits=[];
  for(let bit=record.start*8;bit<record.bitEnd;bit++) {
   if(bit>=remove.bitOffset&&bit<remove.bitEnd)continue;
   bits.push((source[bit>>3]>>(bit%8))&1);
  }
  const fixed=new Uint8Array(Math.ceil(bits.length/8));bits.forEach((v,i)=>fixed[i>>3]|=v<<(i%8));
  chunks.push(source.slice(cursor,record.start),fixed);cursor=record.end;
  changes.push({base:record.code,identity:record.identity,removedStat:468,retainedStat:126,fireSkills:remove.value,removedBits:remove.bitEnd-remove.bitOffset});
 }
 if(!changes.length)return {bytes:source,changes:[]};
 chunks.push(source.slice(cursor));const output=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;
 for(const c of chunks){output.set(c,offset);offset+=c.length;}
 const view=new DataView(output.buffer);view.setUint32(8,output.length,true);view.setUint32(12,0,true);
 let sum=0;for(const v of output)sum=(sum*2+v+(sum>>>31))>>>0;view.setUint32(12,sum,true);
 inspectNativeSave(output,gd); // strict native re-parse, no legacy exception
 return {bytes:output,changes};
}
