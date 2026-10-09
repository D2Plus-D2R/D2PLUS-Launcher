"""Reviewed AlphaV0.8.2 guide plans, with explicit native prerequisites."""
from pathlib import Path
import json,re,copy,collections
R=Path(__file__).resolve().parents[1];W=R/'docs/wiki';E=R/'docs/d2plus'
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
d=read(W/'database.json');gd=read(E/'v105_data.json');c=read(E/'constants_105.json');renames=read(R/'release-inputs/name-map-v082.json')
classes={'Amazon':'ama','Sorceress':'sor','Necromancer':'nec','Paladin':'pal','Barbarian':'bar','Druid':'dru','Assassin':'ass','Warlock':'war'}
def norm(s):return re.sub('[^a-z0-9]','',s.lower())
lookup={(s.get('charclass'),norm(n)):int(i) for i,s in gd['skills'].items() if s.get('charclass') in classes.values() and int(i)<len(c['skills']) and c['skills'][int(i)] for n in [s['skill'],c['skills'][int(i)]['s']]}
def resolve(code,name):return lookup[(code,norm(renames.get(name,name)))]
def translated(v):
 if isinstance(v,list):return [translated(x) for x in v]
 if isinstance(v,dict):return {k:translated(x) for k,x in v.items()}
 if isinstance(v,str):
  for a,b in sorted(renames.items(),key=lambda x:-len(x[0])):
   if a!=b:v=re.sub(r'(?<![\w])'+re.escape(a)+r'(?![\w])',lambda m:b,v)
  return v.replace('live Beta 3 findings','your equipment and playtesting').replace('D2PLUS v1.1 Beta build','D2PLUS AlphaV0.8.2').replace('Expedition Test 0.3','AlphaV0.8.2')
 return v
# Ordered priorities: offense first; low-point utility and every prerequisite are explicit.
plans={
'build-1':'Strafe:20|Penetrate:20|Valkyrie:20|Pierce:5|Critical Strike:10|Decoy:5|Thread the Needle:5|Hunters Discipline:5',
'build-2':'Storm Lance:20|Lightning Strike:20|Charged Strike:20|Valkyrie:10|Decoy:5|Fend:10|Storm Conduit:5|Hunters Discipline:1',
'build-3':'Poison Javelin:20|Plague Javelin:20|Valkyrie:20|Decoy:15|Pierce:5|Thread the Needle:5|Hunters Discipline:1',
'build-4':'Fend:20|Penetrate:20|Valkyrie:20|Critical Strike:10|Decoy:10|Jab:1|Storm Lance:1|Hunters Discipline:5',
'build-5':'Fire Ball:20|Meteor:20|Fire Bolt:20|Fire Mastery:20|Warmth:5|Static Field:1|Teleport:1|Static Reservoir:5',
'build-6':'Frozen Orb:20|Cold Mastery:10|Fire Ball:20|Fire Bolt:20|Fire Mastery:10|Teleport:1|Static Field:1|Warmth:1|Static Reservoir:5|Wintercraft:5',
'build-7':'Nova:20|Lightning Mastery:20|Static Field:20|Arcane Tempest:20|Teleport:1|Warmth:5|Static Reservoir:5',
'build-8':'Enchant:20|Warmth:20|Fire Mastery:20|Arcane Tempest:15|Lightning Mastery:5|Teleport:1|Static Field:1|Emberguard:3|Static Reservoir:2',
'build-9':'Raise Skeleton:20|Skeleton Mastery:20|Corpse Explosion:20|Golem Mastery:10|Summon Resist:5|Amplify Damage:1|Decrepify:1|Clay Golem:1|Soul Harvest:1|Grave Meditation:3|Deathless Covenant:5',
'build-10':'Poison Nova:20|Poison Explosion:20|Poison Dagger:20|Corpse Explosion:10|Lower Resist:5|Clay Golem:1|Golem Mastery:1|Summon Resist:1|Soul Harvest:1|Grave Meditation:5|Venom Lore:5',
'build-11':'Bone Spear:20|Bone Wall:20|Bone Prison:20|Teeth:20|Bone Armor:1|Corpse Explosion:1|Amplify Damage:1|Decrepify:1|Clay Golem:1|Soul Harvest:1|Grave Meditation:5',
'build-12':'Corpse Explosion:20|Raise Skeleton:20|Skeleton Mastery:20|Amplify Damage:5|Golem Mastery:10|Summon Resist:5|Clay Golem:1|Decrepify:1|Soul Harvest:1|Grave Meditation:5|Deathless Covenant:3',
'build-13':'Zeal:20|Fanaticism:20|Sacrifice:20|Holy Shield:15|Defiance:10|Measured Strikes:5|Purity of Blood:2',
'build-14':'Blessed Hammer:20|Concentration:20|Vigor:20|Blessed Aim:20|Holy Shield:5|Purity of Blood:3',
'build-15':'Judgment:20|Holy Bolt:20|Fist of the Heavens:20|Holy Shock:15|Conviction:5|Holy Shield:5|Storm Zeal:3|Purity of Blood:2',
'build-16':'Vengeance:20|Conviction:20|Resist Fire:15|Resist Cold:15|Resist Lightning:15|Holy Shield:1|Measured Strikes:5|Storm Zeal:3|Purity of Blood:2',
'build-17':'Whirlwind:20|Battle Orders:20|Arms Master:20|Primordial Infusion:10|Natural Resistance:5|Ancestral Standard:1|Find Item:5|Battle Command:1|Blood Thirst:1|Battle Instinct:5|Killing Edge:5',
'build-18':'Frenzy:20|Battle Orders:20|Double Swing:20|Arms Master:20|Taunt:5|Natural Resistance:1|Ancestral Standard:1|Battle Command:1|Blood Thirst:1|Battle Instinct:5|Killing Edge:5',
'build-19':'Double Throw:20|Double Swing:20|Arms Master:20|Battle Orders:20|Wind Runner:3|Primordial Infusion:1|Natural Resistance:1|Ancestral Standard:1|Battle Command:1|Battle Instinct:5|Killing Edge:4',
'build-20':'Storm Cry:20|Howl:20|Taunt:15|Battle Orders:20|Shattering Roar:10|Primal Weapon Mastery:5|Primordial Infusion:1|Natural Resistance:1|Battle Command:1|Singers Breath:5',
'build-bar-elemental-roar':'Storm Cry:20|Shattering Roar:20|Primal Weapon Mastery:20|Battle Orders:15|Primordial Infusion:10|Howl:5|Taunt:1|Natural Resistance:1|Battle Command:1|Singers Breath:5',
'build-21':'Fissure:20|Volcano:20|Firestorm:20|Molten Boulder:20|Oak Sage:5|Bloodroot:1|Blight Creeper:1|Ironhide:1',
'build-22':'Tornado:20|Hurricane:20|Cyclone Armor:20|Twister:10|Permafrost:15|Oak Sage:1|Bloodroot:1|Heart of Winter:5',
'build-23':'Fury:20|Lycanthropy:20|Werewolf:15|Feral Rage:10|Ravage:5|Blight Creeper:10|Oak Sage:5|Bloodroot:1|Ironhide:5',
'build-24':'Summon Spirit Wolf:20|Summon Dire Wolf:20|Summon Grizzly:20|Raven:10|Spirit of the Gale:10|Blight Creeper:10|Bloodroot:1|Wild Covenant:5|Ironhide:1',
'build-25':'Lightning Sentry:20|Death Sentry:20|Charged Bolt Sentry:20|Shock Web:20|Fire Blast:5|Cloak of Shadows:1|Mind Blast:1|Shadow Rift:1|Fade:1|Burst of Speed:1|Still Mind:5',
'build-26':'Wake of Fire:20|Wake of Inferno:20|Fire Blast:20|Death Sentry:15|Lightning Sentry:5|Cloak of Shadows:1|Mind Blast:1|Shadow Rift:1|Fade:1|Burst of Speed:1|Still Mind:5|Ember Discipline:5',
'build-27':'Phoenix Strike:20|Claws of Thunder:20|Fists of Fire:20|Blades of Ice:20|Weapon Block:3|Dragon Talon:1|Fade:1|Burst of Speed:1|Shadow Rift:1|Blade Guidance:3|Still Mind:2|Ember Discipline:5',
'build-28':'Dragon Talon:20|Blade Fury:20|Venom:20|Death Sentry:15|Fade:5|Cloak of Shadows:1|Mind Blast:1|Shadow Rift:1|Blade Guidance:5|Still Mind:2',
'build-war-1':'Summon Goatman:20|Demonic Mastery:20|Summon Tainted:20|Summon Defiler:20|Blood Oath:5|Bind Demon:1|Death Mark:1|Blood Boil:1|Engorge:1|Consume:1|Sigil Lord:5|Astral Communion:1|Demonic Resonance:1',
'build-war-2':'Blood Boil:20|Blood Oath:20|Engorge:20|Consume:20|Summon Goatman:5|Demonic Mastery:1|Death Mark:1|Summon Tainted:1|Summon Defiler:1|Bind Demon:1|Sigil Lord:5|Astral Communion:5|Demonic Resonance:1',
'build-war-3':'Echoing Strike:20|Mirrored Blades:20|Blade Warp:20|Cleave:10|Eldritch Blast:1|Psychic Ward:5|Levitate:5|Hex Bane:1|Hex Purge:1|Astral Communion:5|Demonic Resonance:5|Sigil Lord:1',
'build-war-4':'Abyss:20|Miasma Bolt:20|Miasma Chains:20|Enhanced Entropy:20|Sigil Lethargy:1|Sigil Rancor:1|Sigil Death:1|Levitate:1|Cleave:1|Psychic Ward:5|Sigil Lord:5|Astral Communion:5|Demonic Resonance:1',
}
classnotes={
'Amazon':['Storm Lance is a ranged release aimed at the cursor. Primary bolts gain 50% weapon damage; its chains use 25% skill lightning, not another weapon strike. Total skill levels 10 and 20 add bolts, up to three.','Storm Lance requires a spear-type weapon in the skill table. Test your intended base before investing in a runeword; the javelin-throwing Lightning Fury plan is a separate loadout.','Storm Conduit supports lightning damage. Hunters Discipline supports attack-rating checks; it does not turn a spell-like lightning hit into an attack-rating build.'],
'Sorceress':['Arcane Tempest follows you and strikes one nearby enemy per pulse. It has a short duration; refresh it before engaging. This version has no splash damage.','Arcane Tempest gains lightning damage from hard points in Static Field. Choose its investment alongside Lightning Mastery; do not describe it as a chance-to-cast effect.','Wintercraft benefits cold damage, Static Reservoir restores mana, and Emberguard adds defense. They do not replace resistances or sufficient life.'],
'Necromancer':['Soul Harvest must stay selected on right click to consume nearby corpses for life and mana. Swap away when saving corpses for summons or Corpse Explosion; it does not create soul stacks.','One point in Soul Harvest is the starting sustain option. Extra ranks compete with damage and summon investment; buy more only if recovery limits the build.','Deathless Covenant supplies summon resistance. Grave Meditation restores your mana; Venom Lore supports poison damage, not physical skeleton damage.'],
'Paladin':['Judgment is a delayed magic spell that releases holy bolts. It replaces Conversion and gains magic damage from Holy Bolt hard points; it does not make a weapon strike.','Storm Zeal supports lightning damage. It does not multiply Judgment magic damage; the Judgment/Fist hybrid invests only three ranks for its lightning half.','Measured Strikes belongs in attack-rating builds such as Zeal and Vengeance, rather than a hammer or Judgment caster.'],
'Barbarian':['Arms Master covers physical attacks with all weapon types. Primal Weapon Mastery supports elemental, poison and magic damage; the old individual weapon-masteries plan is obsolete.','Primordial Infusion adds fire/cold attack damage and up to 20% lightning skill damage. It no longer provides the old Shout defense bonus.','Ancestral Standard uses a corpse to create a ward that slows enemies and lowers physical resistance. It does not grant an ally buff and competes with Find Item for corpses.','Shattering Roar lowers fire, lightning and cold resistance. Storm Cry deals lightning damage. Life leech, Crushing Blow and attack rating do not scale a Storm Cry cast.'],
'Druid':['Bloodroot is a durable healing vine that consumes corpses. Blight Creeper periodically poisons and lowers enemy defense and physical resistance without consuming corpses. Choose the active vine for recovery or damage support; they share the native one-vine limit.','Permafrost improves cold damage and cold resistance piercing. It supports Hurricane, while Tornado remains physical.','Spirit of the Gale grants lightning attack damage and attack speed. Ravage is a shapeshift attack with life/mana steal; do not assume extra Crushing Blow, Open Wounds or Ignore Target Defense.'],
'Assassin':['Shadow Rift is an area magic blast with outward knockback. Use one point to create distance; it does not pull, stun or convert enemies.','Use Cloak of Shadows and Mind Blast for their distinct control roles. Pushing a pack out of an established trap field with Shadow Rift can lower damage.','Blade Guidance supports attack-rating checks, Still Mind restores mana, and Ember Discipline improves fire skill damage. Trap placement speed and spell cast speed are distinct considerations.'],
'Warlock':['Sigil Lord gives 5% faster cast rate and 5% maximum mana per rank. Sigils are placed manually; this version does not automatically cast them.','Astral Communion supplies 20% mana regeneration per rank. Its hard ranks add Cleave/Echoing Strike damage based on Energy, capped at 300%; do not transfer that claim to every Warlock spell.','Demonic Resonance always affects the hero, independent of active demons: per rank, 3% Crushing Blow, 3% attack speed and 1% physical damage reduction, up to five ranks. These bonuses do not transfer to summoned demons.'],
}
edits={
'build-2':dict(core='Storm Lance → Lightning Strike synergy → Storm Conduit; Charged Strike for close targets',lane='Ranged spear / lightning',style='Ranged lightning',early='Level with Jab, then unlock Storm Lance at level 6. Equip a compatible spear and aim bolts toward the cursor without walking into melee.',mid='Max Storm Lance and then Lightning Strike for its listed lightning synergy. Total skill levels 10 and 20 add primary bolts. Add Valkyrie and Decoy for space to fire.',late='Finish Charged Strike as a close-range alternative, then improve the summon screen. Compare weapon damage as well as skill levels because primary Storm Lance bolts carry 50% weapon contribution.',rotation=['Place Decoy and refresh Valkyrie before engaging.','Aim Storm Lance down the approach lane from range.','Use Charged Strike only when safe at close range; reposition before being surrounded.','Use Fend for a physical fallback and the companion against resistant targets.'],priorities=['Lightning skill levels and Storm Conduit','Spear damage for the primary bolt weapon component','Mana sustain, resistances and hit recovery','Verify release speed with the equipped base; do not assume old melee Power Strike breakpoints'],risk='The primary bolt and chain have different damage sources. Four-frame missile hit delay limits repeated hits; extra bolts do not guarantee every bolt damages the same target.'),
'build-7':dict(core='Nova + Arcane Tempest → Static Field synergy → Lightning Mastery',early='Use available lightning skills and Static Field while gathering mana and cast speed. Save Teleport access without starving your main attack.',mid='Unlock Arcane Tempest at level 24, then maintain it while casting Nova. Max Nova, Lightning Mastery and Static Field before finishing Tempest.',late='Complete Arcane Tempest for supplemental single-target pressure. This plan uses life and resistances rather than a fully developed Energy Shield package.',rotation=['Refresh Arcane Tempest before the pull.','Use Static Field within a safe range when effective.','Cast Nova while the companion holds the closest enemies.','Teleport to reset spacing and refresh the short Tempest duration.']),
'build-8':dict(core='Enchant → Warmth → Fire Mastery; Arcane Tempest supplemental lightning',mid='Max Enchant and its Warmth/Fire Mastery support, then add Arcane Tempest once mana and lightning skill support allow frequent recasts.',late='Use a strong attack-speed weapon and keep Enchant active. Arcane Tempest is supplemental single-target lightning; the plan does not assume it triggers from weapon hits.',rotation=['Cast Enchant and refresh Arcane Tempest.','Attack from the edge of the fight and keep the companion engaged.','Use Static Field when safe; Teleport out before recovery fails.','Recast Tempest between short engagements.']),
'build-15':dict(core='Judgment + Holy Bolt → Fist of the Heavens / Holy Shock; Conviction support',lane='Judgment / holy caster',early='Start with Holy Bolt and its early prerequisites. Build mana and faster cast rate instead of weapon attack rating.',mid='Unlock Judgment at level 24. Max Holy Bolt and Judgment for magic damage, then develop Fist of the Heavens and Holy Shock.',late='Complete the Fist hybrid for lightning coverage and keep Conviction active when using that half. Conviction does not reduce magic resistance for Judgment.',rotation=['Refresh Holy Shield and hold position behind the companion.','Place Judgment on a target that will remain in the delayed impact area.','Use Holy Bolt or Fist of the Heavens while repositioning.','Keep Conviction for lightning support; do not count it as a Judgment multiplier.'],risk='Judgment is delayed. Moving enemies can leave its impact area; attack speed, life leech and weapon damage are not its damage engine.'),
'build-17':dict(core='Whirlwind → Arms Master → Battle Orders; Ancestral Standard support'),
'build-18':dict(core='Frenzy → Arms Master → Double Swing; Battle Orders and corpse-ward support'),
'build-19':dict(core='Double Throw → Arms Master → Double Swing → Battle Orders',rotation=['Refresh Battle Orders, Battle Command and Primordial Infusion.','Hold behind the companion and throw along a clear lane.','Use an available corpse for Ancestral Standard when physical resistance is the obstacle.','Reposition with Wind Runner; this Barbarian has no Decoy or Valkyrie.']),
'build-20':dict(core='Storm Cry → Howl / Taunt → Shattering Roar; Battle Orders sustain',rotation=['Refresh Battle Orders, Battle Command and Primordial Infusion.','Apply Shattering Roar to the approaching pack.','Cast Storm Cry from safe close range and reposition during recovery.','Use the companion for lightning-resistant targets; weapon life leech does not sustain the cry.']),
'build-bar-elemental-roar':dict(core='Storm Cry → Shattering Roar → Primal Weapon Mastery → Primordial Infusion',rotation=['Refresh Battle Orders, Battle Command and Primordial Infusion.','Apply Shattering Roar before repeatedly casting Storm Cry.','Keep enough mana to retreat and refresh buffs.','Use the companion when lightning resistance defeats the current setup.']),
'build-24':dict(rotation=['Summon wolves and Grizzly before a difficult area.','Choose Spirit of the Gale for the attack-focused army.','Keep Blight Creeper for resistance/defense pressure; switch to Bloodroot only when healing is needed.','Use Raven and recast endangered summons while the army secures kills.']),
'build-war-1':dict(rotation=['Summon the demons and establish the companion front line.','Use Death Mark to direct the army onto a dangerous target.','Feed a corpse with Engorge when a demon needs healing or empowerment.','Recast lost demons; hero Crushing Blow and attack speed do not buff the army.']),
'build-war-2':dict(rotation=['Maintain demons and use Death Mark to position the target demon.','Use Blood Boil when enemies surround it.','Recover and empower with Engorge, retaining corpses for the next exchange.','Use Consume deliberately and replace the sacrificed demon.']),
}
gearadd={'build-1':['Leadcrow','Witherstring'],'build-4':['Bonesnap','Swordguard'],'build-5':['Razorswitch','Skull Collector'],'build-6':['Skull Collector'],'build-7':['Skull Collector'],'build-8':['Hellmouth'],'build-13':['Swordguard','Black Hades'],'build-17':['Black Hades','Corpsemourn'],'build-18':['Hellmouth','Atma’s Wail'],'build-21':['Skull Collector']}
itemnames={norm(r['name']):r for r in d['records'] if r['kind'] in ('Unique','Set','Set piece','Runeword')}
audits=[]
for original in d['guides']:
 g=translated(original);code=classes[g['hero']];g.update(edits.get(g['id'],{}));g['source']='D2PLUS AlphaV0.8.2';g['testProfile']='AlphaV0.8.2 · data-reviewed';g['reviewedVersion']='0.8.2-alpha'
 target={};ordered=[]
 for entry in plans[g['id']].split('|'):
  n,p=entry.rsplit(':',1);i=resolve(code,n);p=int(p);assert p<=gd['skills'][str(i)].get('maxlvl',20);target[i]=p;ordered.append(i)
 def prereqs(i,seen):
  assert i not in seen,'Cyclic prerequisite'
  for key in ('reqskill1','reqskill2','reqskill3'):
   j=gd['skills'][str(i)].get(key)
   if j:
    assert gd['skills'][str(j)].get('charclass')==code
    if j not in target:target[j]=1
    prereqs(j,seen|{i})
 for i in list(target):prereqs(i,set())
 total=sum(target.values());assert total<=111,(g['id'],total)
 g['pointPlan']=[{'skill':c['skills'][i]['s'],'skillId':i,'points':p,'reason':('Required access to the selected skills.' if i not in ordered else 'Core damage or synergy; prioritize before luxury ranks.' if p==20 else 'Support target; adjust after your main attack and required defenses.'),'module':'Prerequisite' if i not in ordered else ''} for i,p in target.items()]
 g['basePointPlan']=copy.deepcopy(g['pointPlan']);g['listedSkillPoints']=total;g['skillPointCap']=111
 g['passivePlan']=[{'name':c['skills'][int(i)]['s'],'reqlevel':s.get('reqlevel',1),'max':s.get('maxlvl',20),'points':target.get(int(i),0),'effect':next((r['note'] for r in d['records'] if r.get('skillId')==int(i)),''),'reason':'Included for this build’s damage or sustain.' if int(i) in target else 'Not required by the primary plan; revisit only for a specific equipment need.'} for i,s in gd['skills'].items() if s.get('charclass')==code and s['skill'].startswith('d2plus_cp_')]
 g['moduleNotes']=classnotes[g['hero']]+['Skill points include every listed prerequisite. The remaining reserve is optional; equipment skill bonuses do not count as allocated ranks.','Sovereign Wardens now have custom demon visuals, fiery claws and 20% more health. Prepare for their physical and fire damage alongside the act boss.']
 g['variants']=[f"Keep {g['pointPlan'][0]['skill']} as the primary plan. Spend reserve points on the support skill that addresses your actual damage or survival limit.",'A respec changes the point plan, not existing item rolls. Recheck item requirements and resistances before replacing a complete set.']
 if g['hero']=='Amazon':g['variants'].append('Lightning Fury uses a throwing-javelin loadout; the Storm Lance spear plan is a separate choice. Do not copy its weapon and speed assumptions unchanged.')
 if g['hero']=='Druid':g['variants'].append('Swap between Bloodroot healing and Blight Creeper pressure; the point plan grants access, not simultaneous active vines.')
 if g['hero']=='Necromancer':g['rotation'].append('Select Soul Harvest only after reserving the corpses needed for summons and Corpse Explosion.')
 if g['hero']=='Assassin':g['rotation'].append('Use Shadow Rift to make space when necessary; avoid scattering enemies out of your active traps or charge release.')
 for stage,textkey in [('early','early'),('mid','mid'),('late','late')]:
  g['stages'][stage]['summary']=g[textkey]
  for item in g['stages'][stage]['gear']:
   rec=itemnames.get(norm(item['name']))
   if rec:item['name']=rec['name'];item['reason']='Compare the current AlphaV0.8.2 properties, level requirement and full set bonuses with your equipped item. Existing items keep their saved rolls.'
  g['stages'][stage]['gear']=[x for x in g['stages'][stage]['gear'] if norm(x['name']) in itemnames]
 for name in gearadd.get(g['id'],[]):
  rec=itemnames.get(norm(name));assert rec,(g['id'],name)
  stage='early' if rec.get('level',0)<30 else 'mid' if rec.get('level',0)<60 else 'late'
  if not any(x['name']==rec['name'] for x in g['stages'][stage]['gear']):g['stages'][stage]['gear'].append({'name':rec['name'],'reason':'Rebalanced in AlphaV0.8.2; compare its current properties with the progression unique instead of dismissing the classic item.'})
 g['milestones']=[{'levels':'1–18','title':'Foundation','steps':[g['early'],'Buy prerequisites at their unlock levels; a level-100 plan is not a leveling allocation.']},{'levels':'19–35','title':'Core skills','steps':[g['mid']]},{'levels':'36–60','title':'Synergies and equipment','steps':['Develop the primary damage package and mana sustain before maximizing every passive.','Compare the rebalanced Dominion/Covenant pieces and classic uniques in the current catalog.']},{'levels':'61–85','title':'Hell transition','steps':[g['late'],'Recheck resistances before act bosses and their fiery Sovereign Warden escorts.']},{'levels':'86–100','title':'Finish the plan','steps':['Complete the explicit hard-point plan and spend the reserve only where your equipment needs it.','Compare capstone sets with mixed gear; a named set is not automatically the strongest choice.']}]
 original.clear();original.update(g)
 audits.append({'id':g['id'],'class':g['hero'],'points':total,'reserve':111-total,'prerequisitesIncluded':True,'skillIds':list(target)})
write(W/'database.json',d);(W/'data.js').write_text('window.D2PLUS_DATA = '+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
write(E/'build-guides.json',{'source':'D2PLUS AlphaV0.8.2 · data-reviewed October 9, 2026','guides':d['guides']})
write(W/'GUIDE_V082_AUDIT.json',{'version':'AlphaV0.8.2','guides':audits,'gameplayBenchmarked':False})
print(json.dumps(audits,indent=2))
