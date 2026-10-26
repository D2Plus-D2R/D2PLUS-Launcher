import {buildCatalog,createTemplate,validateItemStats} from './item-library.mjs';
import {itemGetTypes} from './index.js';
import {CLASS_CODES,validName,experienceAt,derivedVitals} from './character-model.mjs';
import {rebuildCharacterPreview} from './character-preview.mjs';
import {endgameProgression} from './progression.mjs';
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function skillName(gd,s){return gd.locale.strings[gd.skillDesc[s.skilldesc]?.strname]||s.skill;}
export function skillPlan(gd,code,guide,level=100,questPoints=0){
  const rows=Object.values(gd.skills).filter(s=>s.charclass===code),byName=new Map();
  rows.forEach(s=>{byName.set(norm(s.skill),s);byName.set(norm(skillName(gd,s)),s);});
  const targets=new Map(),notes=[];
  function want(row,points){if(row)targets.set(row.id,Math.max(targets.get(row.id)||0,Math.min(points,row.maxlvl||20)));}
  for(const p of guide.pointPlan){
    const exact=byName.get(norm(p.skill));if(exact){want(exact,p.points);continue;}
    // Guides contain utility budgets rather than exact allocations; name any
    // explicit skills and leave their remaining budget as earned quest points.
    const phrase=p.skill.toLowerCase();let found=false;
    for(const row of rows)if(phrase.includes(skillName(gd,row).toLowerCase())||phrase.includes(row.skill.toLowerCase())){want(row,1);found=true;}
    if(!found&&/curse/i.test(phrase))want(byName.get(norm('Amplify Damage')),1);
    if(!found&&/summon/i.test(phrase)){want(byName.get(norm('Clay Golem')),1);want(byName.get(norm('Summon Resist')),1);}
    if(/control|shadow utility/i.test(phrase)){for(const n of ['Burst of Speed','Cloak of Shadows','Mind Blast'])want(byName.get(norm(n)),1);}
    if(/finisher/i.test(phrase))want(byName.get(norm('Dragon Talon')),1);
    notes.push(`${p.skill}: the guide reserves ${p.points} points; this preset resolves named utility and required access skills.`);
  }
  const visiting=new Set();
  function prerequisites(id){if(visiting.has(id))throw new Error('Cyclic skill prerequisite.');visiting.add(id);const s=gd.skills[id];for(let i=1;i<=3;i++){const pre=s['reqskill'+i];if(pre){if(gd.skills[pre]?.charclass!==code)throw new Error('Invalid prerequisite class.');want(gd.skills[pre],1);prerequisites(pre);}}visiting.delete(id);}
  for(const id of [...targets.keys()])prerequisites(id);
  const skills={};let left=level-1+questPoints;
  for(const id of targets.keys()){if(gd.skills[id].reqlevel>level)continue;if(left<=0)break;skills[id]=1;left--;}
  // Keep each guide's recommended new passives before spending luxury ranks.
  const ordered=[...targets.keys()].sort((a,b)=>Number((gd.skills[b].maxlvl||20)<=5)-Number((gd.skills[a].maxlvl||20)<=5));
  for(const id of ordered){if(!skills[id])continue;const add=Math.min(left,targets.get(id)-skills[id],level-(gd.skills[id].reqlevel||1)+1-skills[id]);skills[id]+=add;left-=add;}
  const deferred=[...targets].filter(([id,n])=>(skills[id]||0)<n).map(([id,n])=>`${skillName(gd,gd.skills[id])}: ${skills[id]||0}/${n}`);
  return {skills,unspent:left,notes,deferred};
}
function header(gd,code,name,level,hardcore){
  // Own the fresh header explicitly: never use the upstream endgame defaults
  // and never embed or clone a user's save. Layout verified against the native
  // v105 fixture: quests 403, waypoints 701, NPC 781, stat marker 833.
  const b=new Uint8Array(833),v=new DataView(b.buffer);
  const str=(at,text)=>b.set(new TextEncoder().encode(text),at);
  v.setUint32(0,0xaa55aa55,true);v.setUint32(4,105,true);b[20]=hardcore?4:0;b[24]=CLASS_CODES.indexOf(code);b[25]=16;
  b[26]=Object.values(gd.skills).filter(s=>s.charclass===code).length;b[27]=level;
  v.setUint32(32,Math.floor(Date.now()/1000),true);v.setUint32(36,0xffffffff,true);
  for(let i=0;i<16;i++)v.setUint32(40+i*4,0xffff,true);
  b.fill(255,120,152);b[152]=128;b[248]=3;str(299,name);
  str(403,'Woo!');b.set([6,0,0,0,42,1],407);b[413]=1;
  str(701,'WS');b.set([1,0,0,0,80,0],703);
  for(let i=0;i<3;i++){b.set([2,1],709+i*24);b[711+i*24]=i===0?1:0;}
  b.set([1,119,52,0],781);
  return b;
}
export function createCharacter(saver,{name,code,hardcore=false,guide=null,endgame=!!guide}){
  const gd=saver.gd;
  if(!validName(name))throw new Error('Use 2–15 letters, hyphens or underscores; start with a letter.');
  if(!CLASS_CODES.includes(code)||!gd.charStats[code])throw new Error('Choose a supported class.');
  const level=guide?100:1,base=gd.charStats[code],catalog=buildCatalog(saver),byName=new Map(catalog.map(e=>[norm(e.name),e]));
  const plan=guide?skillPlan(gd,code,guide,level,endgame?12:0):{skills:{},unspent:0,notes:[],deferred:[]};
  const p={name,class:code,level,rawHeader:header(gd,code,name,level,hardcore),skills:plan.skills,items:{},inventory:[],stash:[],cube:[],belt:[]};
  const items={},equipment=[],alternatives=[],unavailable=[],seen=new Set();let next=1;
  function put(entry,target='stash',slot){
    const item=createTemplate(saver,entry),key=next++;item.guid=crypto.getRandomValues(new Uint32Array(1))[0]||1;item.itemId=key;items[key]=item;
    if(slot){p.items[slot]=key;equipment.push({name:entry.name,slot});return item;}
    const size=gd.info[target],b=gd.items[item.base];
    for(let y=0;y<=size.rows-b.invheight;y++)for(let x=0;x<=size.columns-b.invwidth;x++){
      let free=true;for(let dy=0;dy<b.invheight;dy++)for(let dx=0;dx<b.invwidth;dx++)if(seen.has(`${target}:${x+dx}:${y+dy}`))free=false;
      if(!free)continue;for(let dy=0;dy<b.invheight;dy++)for(let dx=0;dx<b.invwidth;dx++)seen.add(`${target}:${x+dx}:${y+dy}`);
      p[target][y*size.columns+x]=key;alternatives.push(entry.name);return item;
    }
    delete items[key];throw new Error(`No space for ${entry.name}.`);
  }
  put(catalog.find(e=>e.id==='base:box'),'inventory');
  if(!guide){
    const starters={ama:['jav','buc'],sor:['sst'],nec:['wnd','buc'],pal:['ssd','buc'],bar:['hax','buc'],dru:['clb','buc'],ass:['ktr','buc'],war:['ssd','buc']};
    starters[code].forEach((c,i)=>put(catalog.find(e=>e.id==='base:'+c),'inventory',i===0?'rarm':'larm'));
    for(let i=0;i<4;i++){const key=next++;const item=createTemplate(saver,catalog.find(e=>e.id==='base:hp1'));item.itemId=key;item.guid=crypto.getRandomValues(new Uint32Array(1))[0]||1;items[key]=item;p.belt[i]=key;}
    for(const c of ['tsc','isc'])put(catalog.find(e=>e.id==='base:'+c),'inventory');
  }else{
    const candidates=[];
    for(const g of guide.stages.late.gear){
      const direct=byName.get(norm(g.name));
      if(direct)candidates.push(direct);
      else {const set=catalog.filter(e=>e.category==='Sets'&&norm(e.set)===norm(g.name));if(set.length)candidates.push(...set);else unavailable.push(`${g.name}: reference only; no supported item template in the loaded data (including completed runewords/crafts).`);}
    }
    // Highest-tier guide item wins its slot; other listed options stay in stash.
    candidates.sort((a,b)=>Number(b.category==='Uniques'&&!!gd.weapons[b.base])-Number(a.category==='Uniques'&&!!gd.weapons[a.base])||b.level-a.level);
    const used=new Set();
    for(const entry of candidates){if(used.has(entry.id))continue;used.add(entry.id);
      try{
        const item=createTemplate(saver,entry),b=gd.items[item.base],types=itemGetTypes(gd,item.base);
        const allowedClass=[...types].map(t=>gd.itemTypes[t]?.class).find(Boolean);
        if(allowedClass&&allowedClass!==code){unavailable.push(`${entry.name}: restricted to another class.`);continue;}
        let slot=[...types].map(t=>gd.itemTypes[t]?.bodyloc1).find(Boolean);
        if(slot==='rrin'&&p.items.rrin&&!p.items.lrin)slot='lrin';
        if(slot==='rarm'&&p.items.rarm)slot=null;
        const weapon=p.items.rarm?gd.items[items[p.items.rarm].base]:null;
        if(slot==='larm'&&weapon?.['2handed'])slot=null;
        if(slot&&!p.items[slot])put(entry,'stash',slot);else put(entry,'stash');
      }catch(e){unavailable.push(`${entry.name}: ${e.message}`);}
    }
    // If an endgame weapon is outside the save's stat range, use the guide's
    // strongest supported mid-game weapon and clearly disclose that fallback.
    if(!p.items.rarm) for(const g of [...guide.stages.mid.gear].reverse()) {
      const e=byName.get(norm(g.name));if(!e||!gd.weapons[e.base])continue;
      const t=itemGetTypes(gd,e.base),allowed=[...t].map(t=>gd.itemTypes[t]?.class).find(Boolean);if(allowed&&allowed!==code)continue;
      try{put(e,'stash','rarm');unavailable.push(`Equipped ${e.name} from the guide's mid-game options because an endgame weapon could not be created.`);break;}catch{}
    }
    // Complete every wearable primary slot with a supported, disclosed fallback.
    const defaults={head:'Harlequin Crest',neck:"Mara's Kaleidoscope",tors:'Skin of the Vipermagi',rarm:'Wizardspike',rrin:'Raven Frost',lrin:'The Stone of Jordan',belt:'Arachnid Mesh',feet:'War Traveler',glov:'Magefist'};
    for(const [slot,label]of Object.entries(defaults))if(!p.items[slot]){
      const e=byName.get(norm(label));if(!e)throw Error('Missing fallback template: '+label);
      put(e,'stash',slot);plan.notes.push(`${slot}: ${label} fills a slot absent from the supported guide gear.`);
    }
    const main=gd.items[items[p.items.rarm].base],mainTypes=itemGetTypes(gd,main.code);
    if(!p.items.larm&&!main['2handed']&&!mainTypes.has('bow')&&!mainTypes.has('xbow'))put(byName.get(norm('Lidless Wall')),'stash','larm');
    // A separate supported weapon and shield make the swap set usable too.
    put(byName.get(norm('Wizardspike')),'stash','rarm2');put(byName.get(norm('Lidless Wall')),'stash','larm2');
    plan.notes.push('Weapon set II: Wizardspike and Lidless Wall. Two-handed primary weapons intentionally leave the offhand empty unless ammunition is required. Mercenary equipment is preserved on imports; presets begin without a hired mercenary.');
    const held=p.items.rarm?gd.items[items[p.items.rarm].base]:null;
    if(held) { const t=itemGetTypes(gd,held.code); const ammo=t.has('bow')?'aqv':t.has('xbow')?'cqv':null;
      if(ammo&&!p.items.larm)put({id:'base:'+ammo,name:gd.items[ammo].name},'inventory','larm');
    }
    // A small, explicitly disclosed practice kit for the guide's crafting economy.
    for(const c of ['cfe','svs','eap','edi','eem','eru','esa','esk','eto'])put(catalog.find(e=>e.id==='base:'+c),'inventory');
  }
  let strength=base.str,dexterity=base.dex,vitality=base.vit,energy=base.int;
  if(guide){for(const key of Object.values(p.items)){const item=items[key],b=gd.items[item.base];const req=(item.stats.item_req_percent||0)/100+1;strength=Math.max(strength,Math.ceil((b.reqstr||0)*req)-(item.ethereal?10:0));dexterity=Math.max(dexterity,Math.ceil((b.reqdex||0)*req)-(item.ethereal?10:0));}vitality+=((level-1)*base.statperlevel+(endgame?15:0))-(strength-base.str)-(dexterity-base.dex);if(vitality<base.vit)throw new Error('Equipment requirements exceed the attribute budget.');}
  const attrs={strength,dexterity,vitality,energy},v=derivedVitals(base,level,attrs);
  if(endgame){endgameProgression(p.rawHeader);v.hp+=60;}
  p.attributes={...attrs,statpts:0,newskills:plan.unspent,hitpoints:Math.round(v.hp*256),maxhp:Math.round(v.hp*256),mana:Math.round(v.mana*256),maxmana:Math.round(v.mana*256),stamina:Math.round(v.stamina*256),maxstamina:Math.round(v.stamina*256),level,experience:experienceAt(gd,code,level),gold:0,goldbank:0};
  for(const item of Object.values(items))validateItemStats(gd,item);
  rebuildCharacterPreview(p,items);
  const bytes=saver.writeD2S(p,items);
  return {bytes,report:{title:guide?.title||`${base.class} · fresh start`,guideId:guide?.id||null,level,equipment,alternatives,unavailable,notes:plan.notes,deferred:plan.deferred,
    campaign:endgame?'All difficulties, quests and waypoints completed. Includes 12 quest skill points, 15 attributes, 60 life and Anya scroll flags. One-time item/services rewards are marked claimed.':'Normal Act I. Quest rewards remain unclaimed; guide points beyond the level budget remain deferred.'}};
}
