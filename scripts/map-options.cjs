'use strict';
// Change only the standalone map-reset switch, preserving other argument bytes.
function mapArguments(input,enabled){
 const ranges=[];let i=0;
 while(i<input.length){
  while(i<input.length&&/[ \t]/.test(input[i]))i++;
  const start=i;let quoted=false;
  while(i<input.length){
   if(!quoted&&/[ \t]/.test(input[i]))break;
   if(input[i]==='\\'){
    let count=0;while(input[i]==='\\'){count++;i++;}
    if(input[i]==='"'){if(count%2===0)quoted=!quoted;i++;}
   }else if(input[i]==='"'){quoted=!quoted;i++;}else i++;
  }
  if(i>start){const raw=input.slice(start,i);if(/^"?-resetofflinemaps"?$/i.test(raw))ranges.push([start,i]);}
 }
 let result=input;for(const [start,end] of ranges.reverse())result=result.slice(0,start)+result.slice(end);
 if(enabled)result+=(result&&!/[ \t]$/.test(result)?' ':'')+'-resetofflinemaps';
 return result;
}
module.exports={mapArguments};
