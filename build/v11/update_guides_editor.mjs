import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';
const W=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i,'$1')),R=path.join(W,'launcher');const read=p=>JSON.parse(fs.readFileSync(path.join(R,p),'utf8'));const write=(p,v)=>fs.writeFileSync(path.join(R,p),JSON.stringify(v)+'\n');
const data=read('docs/d2plus/build-guides.json'),wiki=read('docs/wiki/database.json');
const physical=new Set(['build-1','build-4','build-13','build-17','build-18','build-19','build-23']);const attacks=new Set(['build-2','build-3','build-8','build-16','build-27','build-war-3']);const traps=new Set(['build-25','build-26']);const summons=new Set(['build-9','build-24','build-war-1']);
for(const g of data.guides){
 let targets=[],caveat='';
 if(physical.has(g.id)){targets=['Unique weapon: 12–15% Increased Attack Speed if it reaches your next attack breakpoint; otherwise 35–50% Enhanced Damage.','A strong paired weapon result is 8–10% Increased Attack Speed with 20–30% Enhanced Damage. Crushing Blow 8–12% is an alternative for boss fights.'];caveat='Enhanced Damage here is a weapon modifier. Deadly Strike does not add its chance to Critical Strike as one guaranteed combined roll; check your existing gear before chasing it.';}
 else if(attacks.has(g.id)||g.id==='build-28'){targets=['Unique weapon outside the wand/staff/orb pool: 12–15% Increased Attack Speed when it improves your main attack animation.','For a two-bonus weapon outcome, aim for 8–10% Increased Attack Speed plus 6–8 All Resistances; it gives speed and defense without relying on physical damage.'];caveat='Weapon Enhanced Damage, Crushing Blow and Deadly Strike are not general spell or elemental-damage multipliers. Favor attack speed and survival for your elemental or magic damage package.';}
 else if(traps.has(g.id)){targets=['Unique claw: 12–15% Increased Attack Speed, or the paired 8–10% Increased Attack Speed + 6–8 All Resistances, if it improves trap placement.','Unique armor or jewelry: 12–16 All Resistances, 30–40 Life, or 20–25% Faster Hit Recovery.'];caveat='Trap laying uses attack-speed rules. Faster Cast Rate helps cast-based utility but does not replace Increased Attack Speed for laying traps. Weapon Enhanced Damage, Crushing Blow and Deadly Strike do not increase trap spell damage.';}
 else{targets=['Unique wand, staff or Sorceress orb: 10–15% Faster Cast Rate if it crosses a useful cast breakpoint. The paired 8–10% Faster Cast Rate + 15–20 Mana is another strong outcome.','Unique armor, ring or amulet: the 5–8% Faster Cast Rate + 6–8 All Resistances pair can finish a breakpoint. Otherwise prioritize 12–16 All Resistances or 30–40 Life.'];caveat=summons.has(g.id)?'Faster Cast Rate improves your own casting and repositioning. Attack speed, Enhanced Damage, Crushing Blow and Deadly Strike on your equipment do not become your summons’ damage bonuses.':'Faster Cast Rate is useful only for skills and animations that use it; it does not remove skill delays. A sword or dagger used by a caster still uses the ordinary weapon pool and cannot roll the wand/staff/orb Faster Cast Rate bonus.';}
 if(!traps.has(g.id))targets.push('Other eligible unique slots: fill resistance gaps first, then choose Life or Faster Hit Recovery. Physical Damage Reduced by 4–6% is useful when you already meet the other goals.');
 targets.push('Unique jewel: reduced bonuses such as 6–8 All Resistances, 15–20 Life or 10–12% Faster Hit Recovery. Check the jewel pool before spending a sigil.');
 if(g.id==='build-13')caveat+=' For Smite, Crushing Blow is useful; weapon Enhanced Damage and Deadly Strike are not substitutes for Smite-specific damage scaling.';
 if(g.id==='build-28')caveat+=' Dragon Talon and Blade Fury have different damage rules; a weapon Enhanced Damage roll is not a universal kick-damage increase.';
 const a={targets,caution:caveat,planning:'Use Accursed on eligible unique pieces only. Sets, runewords and other qualities cannot use it. Do not replace a strong set/runeword merely to obtain an Accursed slot. The listed pairs are real outcomes; arbitrary bonus combinations are not available.',risk:'Each attempt has a 25% chance to become a random rare of the same base, 40% for one boon and 35% for two. Keep a spare unique and finish your core build before risking a valuable roll.'};
 g.accursed=a;g.source='D2PLUS Alpha V1.1';g.testProfile='Alpha V1.1 · data-reviewed; Accursed in-game testing pending';
 // Existing character-creator templates display module notes as part of the full guide.
 g.moduleNotes=(g.moduleNotes||[]).filter(x=>!x.startsWith('Accursed targets:'));g.moduleNotes.push('Accursed targets: '+targets.slice(0,2).join(' ')+' '+caveat);
 const w=wiki.guides.find(x=>x.id===g.id);assert(w,g.id);Object.assign(w,{accursed:a,source:g.source,testProfile:g.testProfile,moduleNotes:g.moduleNotes});
}
write('docs/d2plus/build-guides.json',data);write('docs/wiki/database.json',wiki);fs.writeFileSync(path.join(R,'docs/wiki/data.js'),'window.D2PLUS_DATA = '+JSON.stringify(wiki)+';\n');
let app=fs.readFileSync(path.join(R,'docs/wiki/app.js'),'utf8');const anchor='<section class="card"><h2>Breakpoint rules</h2>';
assert(app.includes(anchor));app=app.replace(anchor,'<section class="card"><h2>Accursed targets</h2>${guideList(guide.accursed?.targets)}<p>${esc(guide.accursed?.caution||\'\')}</p><p>${esc(guide.accursed?.planning||\'\')}</p><p class="meta">${esc(guide.accursed?.risk||\'\')}</p><a href="accursed.html">Complete Accursed guide →</a></section>'+anchor);fs.writeFileSync(path.join(R,'docs/wiki/app.js'),app);
app=fs.readFileSync(path.join(R,'docs/mobile/app.js'),'utf8').replace("'priorities','breakpoints'","'priorities','accursed','breakpoints'").replace("pointPlan:'Skill point plan'","accursed:'Accursed targets',pointPlan:'Skill point plan'");fs.writeFileSync(path.join(R,'docs/mobile/app.js'),app);
// Replace the two embedded JSON imports in the existing production Vue bundle.
// The surrounding compiled UI and native save serializer remain byte-for-byte unchanged.
let replaced=[];
for(const filename of fs.readdirSync(path.join(R,'docs/js')).filter(n=>/^app\..*\.js$/.test(n))){let code=fs.readFileSync(path.join(R,'docs/js',filename),'utf8');
 code=code.replace(/JSON\.parse\('((?:\\.|[^'\\])*)'\)/g,expression=>{
  const obj=vm.runInNewContext(expression);let changed=false;
  if(obj.e?.[0]?.pointPlan){obj.e=data.guides;changed=true;replaced.push(filename+':guides');}
  if(obj.schema&&obj.uniques&&obj.custom){
   const gd=read('docs/d2plus/v105_data.json');const ids=new Map(Object.entries(gd.uniqueItems).map(([id,r])=>[r.index,id]));const sets=new Map(Object.entries(gd.setItems).map(([id,r])=>[r.index,id]));
   for(const record of wiki.records){if(!record.art?.src?.startsWith('assets/v11/'))continue;const art={...record.art,src:'wiki/'+record.art.src};const id=record.kind==='Unique'?ids.get(record.sourceKey):record.kind==='Set piece'?sets.get(record.sourceKey):null;
    if(id)(record.kind==='Unique'?obj.uniques:obj.sets)[id]={...(record.kind==='Unique'?obj.uniques:obj.sets)[id],...art};
    if(/^r\d\d$/.test(record.art.baseCode||''))obj.custom[record.art.baseCode]={...obj.custom[record.art.baseCode],...art};
   }
   obj.custom.acs={src:'wiki/assets/v11/accursed_ritual_sigil.png',width:98,height:98,source:'D2PLUS Alpha V1.1'};
   obj.custom.box={src:'d2plus/art/custom/cube-v11.png',width:196,height:196,source:'D2PLUS Alpha V1.1'};
   fs.writeFileSync(path.join(W,'editor-art-manifest.json'),JSON.stringify(obj,null,2));changed=true;replaced.push(filename+':art');
  }
  return changed?'JSON.parse('+JSON.stringify(JSON.stringify(obj))+')':expression;
 });
 code=code.replaceAll('AlphaV1.0','AlphaV1.1').replaceAll('Alpha V1.0','Alpha V1.1');fs.writeFileSync(path.join(R,'docs/js',filename),code);
}
assert(replaced.some(x=>x.endsWith(':guides'))&&replaced.some(x=>x.endsWith(':art')));
fs.copyFileSync(path.join(W,'art-final/cube-enlarged.png'),path.join(R,'docs/d2plus/art/custom/cube-v11.png'));
let index=fs.readFileSync(path.join(R,'docs/index.html'),'utf8').replaceAll('AlphaV1.0','AlphaV1.1');
index=index.replace('</body>','<script src="./d2plus/accursed-editor.js"></script></body>');fs.writeFileSync(path.join(R,'docs/index.html'),index);
fs.writeFileSync(path.join(W,'guide-editor-validation.json'),JSON.stringify({buildGuides:data.guides.length,embeddedImportsReplaced:replaced,statData:'native IDs 373/374, unchanged existing save widths',newItem:'acs',art:'36 top-tier uniques, 28 sets, 41 runes, 18 sunders, sigil and cube',inGameTested:false},null,2));
console.log('Updated',data.guides.length,'build guides and editor artwork/data imports.');
