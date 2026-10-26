// v105 section layout cross-checked against D2SSharp's Character, ActQuests,
// QuestSection and WaypointSection models. Preserve unexposed quest bits.
export const DIFFICULTIES=['Normal','Nightmare','Hell'];
export const ACTS=[
 {name:'Act I',intro:0,end:7,quests:[[1,'Den of Evil'],[2,"Sisters’ Burial Grounds"],[3,'Tools of the Trade'],[4,'The Search for Cain'],[5,'The Forgotten Tower'],[6,'Sisters to the Slaughter']],waypoints:['Rogue Encampment','Cold Plains','Stony Field','Dark Wood','Black Marsh','Outer Cloister','Jail Level 1','Inner Cloister','Catacombs Level 2']},
 {name:'Act II',intro:8,end:15,quests:[[9,"Radament’s Lair"],[10,'The Horadric Staff'],[11,'Tainted Sun'],[12,'Arcane Sanctuary'],[13,'The Summoner'],[14,'The Seven Tombs']],waypoints:['Lut Gholein','Sewers Level 2','Dry Hills','Halls of the Dead Level 2','Far Oasis','Lost City','Palace Cellar Level 1','Arcane Sanctuary','Canyon of the Magi']},
 {name:'Act III',intro:16,end:23,quests:[[17,"Lam Esen’s Tome"],[18,"Khalim’s Will"],[19,'Blade of the Old Religion'],[20,'The Golden Bird'],[21,'The Blackened Temple'],[22,'The Guardian']],waypoints:['Kurast Docks','Spider Forest','Great Marsh','Flayer Jungle','Lower Kurast','Kurast Bazaar','Upper Kurast','Travincal','Durance of Hate Level 2']},
 {name:'Act IV',intro:24,end:28,quests:[[25,'The Fallen Angel'],[26,"Terror’s End"],[27,"Hell’s Forge"]],waypoints:['Pandemonium Fortress','City of the Damned','River of Flame']},
 {name:'Act V',intro:32,end:41,quests:[[35,'Siege on Harrogath'],[36,'Rescue on Mount Arreat'],[37,'Prison of Ice'],[38,'Betrayal of Harrogath'],[39,'Rite of Passage'],[40,'Eve of Destruction']],waypoints:['Harrogath','Frigid Highlands','Arreat Plateau','Crystalline Passage','Halls of Pain','Glacial Trail','Frozen Tundra',"The Ancients’ Way",'Worldstone Keep Level 2']},
];
let next=0;for(const a of ACTS){a.firstWaypoint=next;next+=a.waypoints.length;}
export function readProgression(h){
 return {progression:h[21]&31,towns:Array.from(h.slice(152,155)),
 quests:DIFFICULTIES.map((_,d)=>Array.from({length:48},(_,i)=>h[413+d*96+i*2]|h[414+d*96+i*2]<<8)),
 waypoints:DIFFICULTIES.map((_,d)=>Array.from({length:39},(_,i)=>!!(h[711+d*24+(i>>3)]&(1<<(i%8)))))};
}
export function validateProgression(p){
 if(!p||!Number.isInteger(p.progression)||p.progression<0||p.progression>15)throw Error('Campaign progression must be between 0 and 15.');
 if(p.towns?.length!==3||p.towns.some(n=>!Number.isInteger(n)||n<0||n>132))throw Error('Invalid saved town/difficulty.');
 for(const key of ['quests','waypoints'])if(p[key]?.length!==3||p[key].some(a=>a.length!==(key==='quests'?48:39)||a.some(n=>key==='quests'?(!Number.isInteger(n)||n<0||n>65535):typeof n!=='boolean')))throw Error('Invalid campaign section.');
}
export function writeProgression(h,p){
 validateProgression(p);h[21]=(h[21]&224)|p.progression;
 p.towns.forEach((n,i)=>h[152+i]=n);
 for(let d=0;d<3;d++){
  p.quests[d].forEach((n,i)=>{h[413+d*96+i*2]=n&255;h[414+d*96+i*2]=n>>8;});
  p.waypoints[d].forEach((enabled,i)=>{const at=711+d*24+(i>>3),bit=1<<(i%8);h[at]=enabled?h[at]|bit:h[at]&~bit;});
 }
}
export function setQuest(p,d,slot,complete){
 const mask=0x1001|(slot===37?0x80:0);p.quests[d][slot]=complete?p.quests[d][slot]|mask:p.quests[d][slot]&~mask;
}
export function completeDifficulty(p,d){
 for(const a of ACTS){p.quests[d][a.intro]|=1;p.quests[d][a.end]|=1;for(const [slot]of a.quests)setQuest(p,d,slot,true);}
 p.progression=Math.max(p.progression,(d+1)*5);
}
export function unlockWaypoints(p,d){p.waypoints[d].fill(true);}
export function endgameProgression(h){const p=readProgression(h);for(let d=0;d<3;d++){completeDifficulty(p,d);unlockWaypoints(p,d);}writeProgression(h,p);}
