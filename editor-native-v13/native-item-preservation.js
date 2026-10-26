// Preserve imported item records, including undocumented flags, Chronicle data,
// runeword IDs and durability, when the user has not changed the item itself.
function signature(item,items,seen=new Set()) {
 if(seen.has(item))throw Error('Cyclic socket contents');seen.add(item);
 const result=Object.fromEntries(Object.keys(item).sort().filter(k=>!k.startsWith('_native')&&!['binaryOffset','itemId'].includes(k)).map(k=>[k,item[k]]));
 result.socketedItems=(item.socketedItems||[]).map(id=>items[id]?signature(items[id],items,new Set(seen)):id);
 return JSON.stringify(result);
}
export function captureNativeItems(items,bytes){
 function end(item){return Math.max(item.binaryOffset.end,...(item.socketedItems||[]).map(id=>items[id]?end(items[id]):0));}
 for(const item of Object.values(items)){
  item._nativeBytes=Array.from(bytes.subarray(item.binaryOffset.start/8,end(item)/8));
  item._nativeSnapshot=signature(item,items);
 }
}
export function reuseNativeItem(item,loc,items){
 if(!item._nativeBytes||item._nativeSnapshot!==signature(item,items))return null;
 const bytes=Uint8Array.from(item._nativeBytes);
 for(const [at,n,value] of [[35,3,loc.loc],[38,4,loc.equip],[42,4,loc.x],[46,4,loc.y],[50,3,loc.storage]]){
  if(!Number.isInteger(value)||value<0||value>=2**n)throw Error('Invalid item location');
  for(let i=0;i<n;i++){const bit=at+i;bytes[bit>>3]=(bytes[bit>>3]&~(1<<(bit%8)))|(((value>>i)&1)<<(bit%8));}
 }
 return bytes;
}
