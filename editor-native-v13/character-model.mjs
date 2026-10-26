// Shared character rules for creation, the form and the export gate.
export const CLASS_CODES = ['ama','sor','nec','pal','bar','dru','ass','war'];
export function validName(name) { return /^[A-Za-z][A-Za-z_-]{1,14}$/.test(name); }
export function experienceAt(gd, code, level) {
  const key=gd.charStats[code].class.toLowerCase();
  const xp=gd.experience[level-1]?.[key] ?? gd.experience[level-1]?.amazon;
  if (!Number.isInteger(xp)) throw new Error('The D2PLUS experience threshold is missing.');
  return xp;
}
export function derivedVitals(base, level, attrs) {
  const vit=attrs.vitality-base.vit,eng=attrs.energy-base.int;
  return {hp:base.vit+base.hpadd+(level-1)*base.lifeperlevel/4+vit*base.lifepervitality/4,
    mana:base.int+(level-1)*base.manaperlevel/4+eng*base.manapermagic/4,
    stamina:base.stamina+(level-1)*base.staminaperlevel/4+vit*base.staminapervitality/4};
}
export function validateCharacterFields(gd, save) {
  if (!validName(save.header.name)) throw new Error('Name must be 2–15 letters, with optional hyphens or underscores.');
  const level=save.attributes.level;
  if (!Number.isInteger(level)||level<1||level>100||save.header.level!==level) throw new Error('Character level must be a matching whole number from 1 to 100.');
  const code=CLASS_CODES[save.header.class_id] || CLASS_CODES.find(c=>gd.charStats[c]?.class===save.header.class);
  if(!code)throw new Error('The character class is not supported by this data pack.');
  const minimum=experienceAt(gd,code,level),next=experienceAt(gd,code,level+1);
  if(save.attributes.experience<minimum||save.attributes.experience>=next)throw new Error(`Experience does not match level ${level}. Use Stats → Repair experience for this level, then export again.`);
  const keys={strength:'strength',dexterity:'dexterity',vitality:'vitality',energy:'energy',unused_stats:'statpts',unused_skill_points:'newskills',experience:'experience',gold:'gold',stashed_gold:'goldbank',current_hp:'hitpoints',max_hp:'maxhp',current_mana:'mana',max_mana:'maxmana',current_stamina:'stamina',max_stamina:'maxstamina'};
  for(const [view,stat]of Object.entries(keys)){
    const n=save.attributes[view],bits=gd.itemStatCost[stat]?.csvbits,fixed=/hp|mana|stamina/.test(view)&&!view.includes('gold');
    const limit=Math.floor((2**bits-1)/(fixed?256:1));
    if(!Number.isInteger(n)||n<0||n>limit)throw new Error(`${view.replaceAll('_',' ')} must be a whole number from 0 to ${limit}.`);
  }
  if(save.attributes.gold>level*10000||save.attributes.stashed_gold>2500000)throw new Error('Gold exceeds the character carry limit or 2,500,000 personal stash limit.');
  // Native current resources can exceed saved base maxima due to equipped
  // items and buffs. Preserve these legitimate values; bit-range checks above
  // still reject overflows. Do not silently strip the bonuses on export.
  for(const skill of save.skills){if(!Number.isInteger(skill.points)||skill.points<0||skill.points>(gd.skills[skill.id]?.maxlvl||20))throw new Error(`${skill.name} is outside its hard-point limit.`);}
}
