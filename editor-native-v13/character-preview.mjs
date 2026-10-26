// v104+ PreviewData: four 12-byte equipped-item previews at offset 251.
// Layout independently checked against ResurrectedTrader/D2SSharp PreviewData,
// PreviewItem and Convert114ToD2R. The expansion mode lives at byte 248;
// do not infer it solely from the legacy status bit in modern saves.
export function rebuildCharacterPreview(profile,items){
 const h=profile.rawHeader;
 const write=(at,value,width)=>{for(let i=0;i<width;i++)h[at+i]=(value>>>(i*8))&255;};
 for(const [i,slot]of ['rarm','larm','tors','head'].entries()){
  const at=251+i*12,key=profile.items[slot],item=items[key];
  for(let j=0;j<12;j++)h[at+j]=0;
  if(!item)continue;
  const code=item.base.padEnd(4,' ');for(let j=0;j<4;j++)h[at+j]=code.charCodeAt(j);
  h[at+4]=255;h[at+5]=item.quality||2;
  const id=item.unique?.match(/^(?:unique|set)(\d+)$/);write(at+6,id?Number(id[1]):item.superior||0,2);
  write(at+8,slot==='rarm'?4:0,4);
 }
}
