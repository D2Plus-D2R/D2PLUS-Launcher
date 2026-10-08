# D2PLUS skill changes and build possibilities compared with Reign of the Warlock

**A reference for the Alpha v0.8.2 development cycle.** This page compares current Diablo II: Resurrected, Reign of the Warlock, with the D2PLUS Alpha v0.7 baseline plus the October 7 All Classes Classic Pack. It covers the numerical rebalance, the class overhauls, all 24 added passives, and the seven native-slot prototypes. Comparison checked October 8, 2026.

The important change is how a character can spend its points. D2PLUS moves part of a skill's power into its own ranks, adds small passive investments, and gives several underused slots a different job. This creates room for mixed damage, summon support, sustain, and weapon flexibility. It also removes some familiar abilities, so a successful build must account for what it loses.

**Evidence and status.** Implemented mechanics below come from the packaged skill tables and the Classic Pack installer. The older D2PLUS 1.0.7 white paper supplies the documented rationale for the original numerical layer. Explanations for the later prototypes are design analysis, rather than quotations from a developer decision log. Build examples are opportunities to test, not claims of proven endgame performance. The combined pack reports automated validation of all 256 class-switch combinations and explicitly records that it has not been tested in the game runtime.

**How to read the numbers.** A hard rank is a point spent in a skill. Effective skill level includes applicable bonuses from equipment. Examples use effective level 20 for normal skills and five purchased ranks for the new passives, before equipment. Chance and resistance changes are percentage points. The game runs at 25 frames per second. Damage, radius, leech, and attack speed still pass through native engine rules.

## The current D2R baseline

The latest released patch located for this comparison is **3.3**, rolled out from August 18, 2026. Its skill fixes include Bind Demon bonus damage, Sigil: Death mana and fire-skill handling, Miasma Chain collision, and Leap's landing animation. These fixes belong to Blizzard's baseline, not D2PLUS. The item changes labeled Ladder only are not assumed to apply to an offline modded character. [Blizzard Patch 3.3](https://news.blizzard.com/en-us/article/24296140/diablo-ii-resurrected-ladder-season-15-now-live)

Current D2R already contains years of class improvements. In particular, Hydra has no casting delay, Plague Javelin has a one-second local delay, Immolation Arrow has a 0.6-second local delay, Fist of the Heavens has a 0.4-second local delay, and Blade Sentinel has a one-second local delay. The audited D2PLUS tables retain those timings. The older white paper's proposed delay reductions are therefore not the active difference from current Reign of the Warlock. Fire Claws already has only Firestorm and Molten Boulder as damage synergies in current D2R. [Blizzard Patch 2.4](https://news.blizzard.com/en-us/article/23788293/diablo-ii-resurrected-patch-2-4-ladder-now-live)

Cold Mastery's reduced effectiveness after an immunity is broken is an existing D2R rule. Do not assume that a newly added resistance-piercing passive itself breaks immunity or bypasses that rule. [Blizzard Patch 2.6](https://news.blizzard.com/en-us/article/23899624/diablo-ii-resurrected-ladder-season-three-has-concluded)

Traps benefiting from elemental skill-damage modifiers and the revised Next Hit Delay system also predate D2PLUS. These make the new Assassin fire passive useful, but the underlying support is a Blizzard change. [Blizzard Patch 2.7](https://news.blizzard.com/en-us/article/23938388/diablo-ii-resurrected-ladder-season-4-has-concluded)

### What D2PLUS adds on top

| Layer | What is actually in the audited packages | Build consequence |
| --- | --- | --- |
| Original numerical rebalance | A historical 56-skill program, eight skills for each original class. Several slots are subsequently replaced. | More power from a main skill's own levels, with revised synergy weights. |
| Barbarian overhaul | Six weapon-mastery slots become general combat passives; Shout, Battle Cry, and War Cry receive new identities. | Weapon choice and elemental casting become meaningful parts of Barbarian planning. |
| Druid overhaul | Permafrost, Ravage, Blight Creeper, and Spirit of the Gale. | Cold mastery, sustained shapeshifting, physical support, and attack support. |
| Added passives | Three new skills per class, including Warlock; five purchasable ranks each. | Small point packages can address accuracy, mana, defense, damage, or sustain. |
| Classic Pack gameplay | Seven replacements across the original classes, including an update to Primordial Infusion. | New active roles using existing native skill behavior. |
| Classic Pack artwork | 33 icons per class, 264 in total, with standard and low-end atlases. | Clearer visual identity. Replacing an icon does not itself change that skill's mechanics. |

The counts overlap. The 56 historical edits, the replacement slots, and the icon count should not be added together as a count of new abilities. The pack's 55 passive icons include native passives; there are **24 added passive skills**, not 55 new ones.

## Why the skill changes exist

The original white paper describes four connected goals: improve underused skills, reduce excessive dependence on synergies, remove practical friction, and supply equipment that supports the resulting builds. The current packages extend this approach with new combat roles.

1. **Make partial investment useful.** Stronger base scaling lets a character use a second attack or utility skill before spending every remaining point on its synergies. A reduced synergy coefficient is a redistribution of power, not an automatic increase at every investment level.
2. **Let the class cover more than one damage type.** Storm Lance, Storm Cry, Judgment, Shadow Rift, and the Druid support skills give different answers to resistant packs. An additional damage type does not guarantee that every immune monster becomes killable.
3. **Give support skills a combat job.** Soul Harvest competes for corpses, Ancestral Standard rewards holding a position, and Bloodroot trades offensive vine support for healing. Their costs are part of their identity.
4. **Reduce dependence on a narrow equipment list.** Accuracy, mana recovery, modest elemental bonuses, and broad weapon support can solve a problem with skill points. This can make room for an unusual rare, unique, craft, or runeword.
5. **Keep changes inside usable native systems.** The prototypes reuse chaining strikes, Thunder Storm pulses, Redemption, Mind Blast, Fist of the Heavens, wards, and vines. This is why their packaged behavior is sometimes narrower than the original concept.

The main opportunity is a build that has a strong core plus a second useful tool. The main balancing risk is that several bonuses can accumulate on the same character. Point freedom, stronger gear, resistance reduction, and sustain need to be assessed together.

## Amazon

### What changes compared with current D2R

The familiar bow, poison-javelin, and spear roles remain. D2PLUS changes their numerical scaling and adds three small passives. The Classic Pack replaces **Power Strike with Storm Lance**. Lightning Strike remains a separate skill and supplies Storm Lance's synergy.

| Skill | Confirmed D2PLUS behavior | Reason and build opening |
| --- | --- | --- |
| Magic Arrow | Attack-rating bonus starts at 20% and gains 12% per additional level. Flat damage growth uses larger steps at higher skill levels. | Gives a magic-arrow specialist a more useful independent attack and a bow build a possible resistant-target tool. The whole arrow is not converted to magic damage. |
| Exploding Arrow | Fire Arrow contributes 10% damage per hard rank. Direct explosion damage receives stronger level-growth steps. | Makes the fire bow less dependent on maximizing its supporting arrow immediately. Pierce and pack positioning remain important. |
| Immolation Arrow | Exploding Arrow contributes 8% per hard rank. Direct fire damage scaling is raised. The local delay remains 15 frames, or 0.6 seconds. | Supports a fire bow that alternates ground fire with another attack. The current delay is not a new D2PLUS improvement. |
| Freezing Arrow | Cold Arrow contributes 8% per hard rank, with increased base cold growth. | Creates room for physical bow investment, Valkyrie support, or utility. Mana consumption still needs an answer. |
| Poison Javelin | Plague Javelin contributes 8% per hard rank; poison growth is increased. The audited local delay is 15 frames. | Makes early poison investment and a poison secondary attack more useful. Poison damage is a duration-based effect, not instant damage on every cloud frame. |
| Plague Javelin | Poison Javelin contributes 8% per hard rank; stronger poison growth. One-second local delay is retained. | Supports poison plus spear or lightning play. Recasting does not mean every overlapping poison application stacks into independent full damage. |
| Impale | Revised durability-related parameters and higher listed attack-rating growth are packaged in the row. Native attack behavior is retained. | A deliberate heavy spear hit can complement a pack-clearing attack. Its practical value depends on native hit handling and attack speed, not just the listed AR field. |
| Fend | Skill damage bonus is 100% plus 15% per additional level. Listed AR starts at 50% and gains 12% per level. | Strengthens the physical spear role and creates a reason to mix Fend with lightning support. It still rewards survivability while committed to an attack sequence. |

### Storm Lance replacing Power Strike

**Implemented role:** a weapon-based melee lightning strike that chains to nearby enemies. It uses Lightning Strike behavior, not a straight beam. It retains the Power Strike slot, level-six requirement, and native prerequisites.

- Fixed mana cost: 4.
- Weapon source damage: 100%.
- Listed attack-rating bonus: 40% plus 10% per additional level.
- Chain-target formula: `min(2 + level / 5, 8)`. At level 20 the displayed calculation gives six targets; level 30 reaches eight.
- Lightning Strike supplies 5% lightning damage per hard rank.

**Design rationale:** give the early melee lightning slot a clear pack-clearing identity while leaving Fend available for physical attacks. This creates a spear path that does not have to begin as a throwing build.

**Doors it opens:** a Storm Lance and Fend spear Amazon; a lightning spear specialist supported by Valkyrie; or a poison spear hybrid that spreads poison and switches to direct hits. The tradeoff is losing the original Power Strike behavior in that slot. Existing hard-point references to the Power Strike slot remain relevant to other native synergy formulas.

### Added Amazon passives

| Passive | Unlock | Five-rank effect | Why spend points |
| --- | --- | --- | --- |
| Thread the Needle | Level 12 | +10 percentage points of piercing attack chance. | Help projectile builds reach useful pierce totals with more equipment freedom. Pierce does not benefit every melee strike or missile identically. |
| Hunters Discipline | Level 6 | +60% attack rating. | Improve weapon hit reliability for bows and spears without treating AR as guaranteed hits. |
| Storm Conduit | Level 24 | +10% lightning skill damage. | Small support investment for lightning attacks. It supplies damage, not enemy resistance reduction. |

**First builds to test:** Storm Lance/Fend, poison/Fend, and fire/cold bow hybrids. Start with one primary attack and one complementary tool; avoid spreading points evenly across every damage type.

## Sorceress

### Numerical changes

D2PLUS keeps the Sorceress's fire, cold, lightning, and Enchant roles, with revised base growth on selected skills. The pack changes Thunder Storm into **Arcane Tempest**. Blizzard's existing mana, targeting, mastery, and immunity rules remain relevant.

| Skill | Confirmed D2PLUS behavior | Reason and build opening |
| --- | --- | --- |
| Inferno | Warmth contributes 8% damage per hard rank. The row contains increased fire-damage growth and a revised range-growth parameter. | Makes channeling a more self-contained investment. It still exposes the caster while standing and aiming. |
| Blaze | Stronger fire growth; the current synergy formula reads Warmth at 3% per hard rank. The retained Fire Wall parameter is not used by that formula. | Supports mobile fire pressure with spare points elsewhere. Do not plan a Fire Wall synergy that the active formula does not contain. |
| Hydra | Fire Bolt and Fire Ball each contribute 2% per hard rank; stronger base damage growth. The current table has no casting delay. | Makes Hydra more attractive as a supporting fire skill alongside another element. No-delay deployment already exists in current D2R. |
| Nova | Increased base lightning growth; Static Field remains a 5% hard-rank synergy. | Gives partial Nova investment a stronger starting point. Close-range exposure and mana demand still define the build. |
| Thunder Storm | The base mod improves pulse timing and lightning growth. With the Sorceress pack enabled, Arcane Tempest supersedes this version. | The active reference is the replacement below, rather than the older long-duration storm tuning. |
| Frost Nova | Blizzard and Frozen Orb each contribute 6% per hard rank, with stronger base cold growth. | A cold close-range attack can be considered alongside mobility, defense, or a second element. It is not automatically competitive with a fully specialized Blizzard build. |
| Glacial Spike | Ice Bolt, Ice Blast, and Frozen Orb each contribute 3% per hard rank; base damage growth is increased. | Gives a freeze-focused caster more room for another damage lane. Freeze-resistant enemies still require a plan. |
| Enchant | Warmth contributes 6% per hard rank; increased fire growth and AR scaling of 25% plus 12% per additional level. | Supports melee or ranged Enchant play with more flexible point allocation. Equipment, attack speed, and physical survivability remain essential. |

### Arcane Tempest replacing Thunder Storm

**Implemented role:** a short-duration storm buff that follows the Sorceress and strikes **one nearby enemy per pulse**. It has no splash in this version.

| Property | Packaged formula | Level-20 example |
| --- | --- | --- |
| Mana | Fixed 24 | 24 mana per activation |
| Duration | `(200 + min(level, 40) × 5) / 25` seconds | 12 seconds |
| Pulse interval | `max(12, 35 − level) / 25` seconds | 0.6 seconds |
| Synergy | Static Field hard ranks × 4% | +80% damage with 20 hard ranks |

Pulse spacing stops improving at 0.48 seconds from effective level 23. Duration reaches its 16-second cap at level 40. Lightning Mastery and applicable lightning bonuses remain part of its damage calculation.

**Design rationale:** turn a background maintenance spell into a buff worth refreshing during active combat. Its value comes from repeat strikes while the player casts or attacks with something else.

**Doors it opens:** a lightning caster weaving Arcane Tempest between Nova or Lightning casts, an Enchant Sorceress carrying a separate lightning source, or a mixed-element caster using a small storm investment. The tradeoff is more frequent recasting. It does not provide a screen-wide lightning pulse or guaranteed hits on every enemy.

### Added Sorceress passives

| Passive | Unlock | Five-rank effect | Why spend points |
| --- | --- | --- | --- |
| Emberguard | Level 12 | +40% defense. | Help a melee Enchant or exposed caster build. Defense is not percentage damage reduction and is affected by native movement rules. |
| Static Reservoir | Level 12 | +40% mana regeneration. | Support sustained casting; it does not increase maximum mana. |
| Wintercraft | Level 24 | +10% cold skill damage. | Adds a direct cold-damage bonus alongside Cold Mastery's different resistance-reduction role. |

**First builds to test:** Hydra/cold, Arcane Tempest/Nova, Enchant/Arcane Tempest, and Frost Nova with a modest secondary element. Mana recovery should be evaluated over a full pack clear, not only in town.

## Necromancer

### Numerical changes

The numerical layer gives bone attacks more damage from their own levels, strengthens several summons, and supports Poison Dagger. The Classic Pack replaces the Weaken curse with **Soul Harvest**. Amplify Damage, Decrepify, Lower Resist, and the other unchanged curses keep their own roles.

| Skill | Confirmed D2PLUS behavior | Reason and build opening |
| --- | --- | --- |
| Teeth | Each of Bone Wall, Bone Prison, Bone Spear, and Bone Spirit contributes 6% per hard rank. Base growth is increased. | Makes a spreading bone attack more useful without immediately buying every synergy. |
| Bone Spear | Four native damage synergies contribute 4% each; increased base damage growth. | Opens bone/summon or bone/curse combinations. Spending fewer synergy points still lowers the maximum available damage. |
| Bone Spirit | Four native damage synergies contribute 4% each; increased base growth. | Gives a focused magic attack a place in a build with a larger utility budget. |
| Poison Dagger | Poison Explosion and Poison Nova each contribute 10% per hard rank; significantly increased poison growth. | Creates a more credible dagger-based poison identity. A successful hit, poison duration, and survival in melee still matter. |
| Raise Skeletal Mage | Count is capped at 12; the formula reaches that cap by effective level 18. Missile skill level is Skeleton Mastery level plus Mage level. Life and defense parameters are increased. | Supports an elemental army as a larger portion of the character's offense. Owner-only elemental bonuses should not be assumed to transfer to every mage. |
| Blood Golem | Increased native damage scaling and revised healing-related parameters; its hard ranks provide 8% life synergy to other golems where their formulas reference it. | Makes golem investment a possible sustain or durability choice rather than only a prerequisite. |
| Fire Golem | Holy Fire level calculation is `min(12 + 2 × (level − 1), 35)`; increased fire growth and an 8% damage synergy contribution to other golems where referenced. | Encourages a fire-golem role with more meaningful investment. A stronger pet is not equivalent to adding the same damage directly to the owner. |
| Revive | Fixed mana cost 35. Duration is 4,500 + 125 frames per additional level, reaching 275 seconds at level 20. Its native movement-speed bonus is +65%. | Reduces maintenance pressure for a revived army and creates room for a casting secondary skill. Revives still require suitable corpses and native AI. |

### Soul Harvest replacing Weaken

**Implemented role:** Redemption-style corpse recovery. Keep the skill selected on right click to consume nearby corpses for life and mana. It does not use soul stacks.

- Recovery pulse: every 25 frames, or one second.
- Recovery chance: `min(25 + 2 × level, 85)%`, or 65% at level 20.
- Life and mana recovered per successfully consumed corpse: `8 + 2 × level`, or 48 of each at level 20.
- Radius calculation: `min(8 + level / 4, 16)` in the native table's range units.
- No mana cost for maintaining the skill.

**Design rationale:** give the Necromancer a skill-based recovery option that matches his corpse economy. It rewards obtaining the first kills and deciding when a corpse is more valuable as recovery than as damage or a summon.

**Doors it opens:** a bone caster recovering between casts, a Poison Dagger fighter refilling after a group dies, or a summoner using leftover corpses after the army is established. The important cost is consuming the same corpses needed for Corpse Explosion, skeletons, and Revive. It offers little recovery in a boss encounter with no usable corpses. Weaken's original outgoing-damage debuff is lost from that slot.

### Added Necromancer passives

| Passive | Unlock | Five-rank effect | Why spend points |
| --- | --- | --- | --- |
| Grave Meditation | Level 6 | +40% mana regeneration. | Helps sustained bone, poison, or corpse-based casting. It is regeneration, not +40% maximum mana. |
| Venom Lore | Level 24 | +10% poison skill damage. | A compact damage package for poison attacks. It is separate from Lower Resist and resistance piercing. |
| Deathless Covenant | Level 24 | +10 points to the native passive summon-resistance stat. | Intended to support summon durability. Confirm which pets receive the stat rather than treating it as universal owner resistance. |

**A point-allocation example:** level-20 Bone Spear in the audited table has 284–300 base magic damage before synergies and other bonuses. Twenty hard ranks in Bone Wall and twenty in Bone Prison provide +160%, giving about 738–780 before further modifiers. This is a calculation example, not a finished build recommendation. It illustrates why a player may stop at two synergies and put later points into an army, recovery, or curses.

**First builds to test:** bone/skeleton, mage/Corpse Explosion, Poison Dagger/Soul Harvest, and a Revive-supported bone caster.

## Paladin

### Numerical changes

D2PLUS supports several Paladin roles beyond a single primary attack: Sacrifice, Charge, Vengeance, holy casting, and anti-undead support. The Classic Pack changes Conversion into **Judgment**.

| Skill | Confirmed D2PLUS behavior | Reason and build opening |
| --- | --- | --- |
| Sacrifice | Damage starts at +220%, then gains 20% per additional level. Redemption and Fanaticism synergies are 8% and 4%. Native self-damage uses `max(1, 8 − level / 5)` percent. | Supports a deliberate heavy physical attack. At level 20, the formula gives 4% recoil; this is not a fixed 5% recoil skill, and leech does not make all targets safe. |
| Charge | Damage starts at +130%, then gains 30% per additional level. Might and Vigor contribute 14% each per hard rank. Mana cost is 7. | Strengthens a mobile weapon build while reducing dependence on maximizing both supporting auras. |
| Holy Bolt | Increased base magic growth; Fist of the Heavens contributes 20% per hard rank. Prayer supplies the healing synergy. | Supports holy offense and healing with a smaller synergy multiplier. The current formula does not contain a Blessed Hammer damage synergy. |
| Thorns | Return-damage scaling is 400% plus 50% per additional level. The native flat retaliation component remains a separate part of the aura. | Supports a retaliation role, but incoming attacks and monster damage determine its value. It is not passive invulnerability. |
| Vengeance | Each element starts at 85% of the relevant weapon base, plus 8% per additional level. Corresponding Resist auras contribute 8% each; Salvation contributes 4% to all three. | Allows more flexible resistance-aura investment. Weapon base damage and hit reliability still matter; arbitrary flat elemental bonuses do not all become the base for Vengeance scaling. |
| Conversion | Base-mod chance and duration are revised. With the Paladin pack enabled, Judgment supersedes Conversion. | The active role becomes holy spell damage rather than temporary monster recruitment. |
| Sanctuary | Increased anti-undead damage and AR scaling, with improved magic pulse growth. Cleansing supplies a 5% hard-rank damage synergy. | Opens a more focused anti-undead weapon or support build. Its target-specific strengths do not apply to every monster. |
| Fist of the Heavens | Increased primary lightning growth; Holy Shock contributes 10% per hard rank. The 10-frame local delay remains 0.4 seconds. | Makes lightning investment more rewarding. The current casting speed and piercing holy bolts already belong to D2R. |

### Judgment replacing Conversion

**Implemented role:** a delayed **magic-damage column** using Fist of the Heavens behavior, with released holy bolts. It is a spell, not a weapon strike, melee explosion, or conversion effect.

- Fixed mana cost: 12.
- Local delay: 20 frames, or 0.8 seconds.
- Primary magic-damage base starts at 80–120, with increasing growth steps.
- Holy Bolt contributes 5% primary damage per hard rank.
- The inherited secondary-effect count/range calculation is replaced with `min(3 + level / 5, 9)`.
- Original Conversion level requirement, skill slot, and prerequisites are retained.

**Design rationale:** give an underused melee-control slot a holy offensive identity without trying to create an unsupported engine behavior. Shared Holy Bolt investment offers a connection to a holy-caster build.

**Doors it opens:** a holy caster using Judgment alongside Holy Bolt or Fist of the Heavens, or a weapon Paladin carrying a separate magic attack for selected targets. Weapon damage, Crushing Blow, and Deadly Strike do not increase the primary spell simply because the caster is holding a strong weapon. Conviction's elemental resistance reduction does not enhance magic damage. Holy-bolt secondary targeting still needs to be respected; do not assume that every beast receives the same secondary damage as demons and undead.

### Added Paladin passives

| Passive | Unlock | Five-rank effect | Why spend points |
| --- | --- | --- | --- |
| Measured Strikes | Level 6 | +60% attack rating. | Help Charge, Zeal, Vengeance, or Sacrifice connect. It does not add value to an attack that already bypasses normal hit checks. |
| Storm Zeal | Level 24 | +10% lightning skill damage. | Supports Holy Shock and other applicable lightning damage, including the primary lightning component of Fist of the Heavens. It does not scale Judgment's magic column. |
| Purity of Blood | Level 12 | +25 percentage points of poison resistance. | Relieve a resistance requirement on equipment. It does not raise maximum poison resistance by 25 points. |

**First builds to test:** Judgment/Holy Bolt, Fist of the Heavens/Judgment, flexible Vengeance, and Charge with a deliberate support aura.

## Barbarian

The Barbarian has the largest identity change. Current D2R divides much of weapon mastery by weapon family. D2PLUS reuses those slots for broad physical mastery, elemental mastery, sustain, movement, and attack effects. The result is a larger set of decisions around the same weapon.

### Six mastery slot replacements

| Current D2R slot | D2PLUS skill | Confirmed level-20 example | Why it exists and what it enables |
| --- | --- | --- | --- |
| Blade Mastery | Arms Master | +192% AR, +123% physical damage, plus diminishing critical-strike chance. Weapon-family restriction is cleared. | Let the character change weapon family without rebuilding the physical mastery investment. This is the primary physical foundation. |
| Axe Mastery | Primal Weapon Mastery | +80% fire/cold/lightning skill damage, +60% poison, +40% magic; a melee AR stat; up to 5% fire/cold/lightning/poison pierce from hard points; 0–40 added fire, cold, and lightning attack damage. | Supports elemental weapons, Storm Cry, and appropriate supernatural damage. It is a broad damage passive, not a Static Discharge proc. |
| Mace Mastery | Blood Thirst | 12% life stolen per hit and +45% maximum life. | Give a physical attacker a skill-based sustain and life option. Leech follows physical attack damage, target drain effectiveness, and difficulty rules. Storm Cry does not become a leeching attack. |
| Polearm Mastery | Colossal Might | +60 Strength and 25% Crushing Blow. | Support heavy weapon requirements and percentage-health attack pressure. Crushing Blow is not a spell-damage multiplier. |
| Throwing Mastery | Wind Runner | +45% faster run/walk and +45% faster hit recovery. | Make mobility and recovery purchasable combat priorities. The former throwing mastery's quantity and pierce benefits are no longer supplied by this slot. |
| Spear Mastery | Savage Instinct | 45% Open Wounds and 25% Deadly Strike. | Supply persistent physical pressure and double-damage chance through points rather than only gear. Critical Strike and Deadly Strike do not combine into a guaranteed four-times-damage hit. |

Primal Weapon Mastery's elemental bonuses increase applicable damage; they do not convert all physical damage into elements. Its resistance pierce uses hard ranks and caps at 5%. Flat added attack damage, spell bonuses, weapon source damage, and resistance reduction are different stages of a damage calculation.

### Warcry replacements

| Current D2R slot | D2PLUS skill | Implemented role | Build consequence |
| --- | --- | --- | --- |
| Shout | Primordial Infusion | Temporary fire and cold attack damage for the Barbarian and nearby allies, plus lightning skill damage. | Supports elemental attacks and lightning casting. The original Shout defense bonus is removed. |
| Battle Cry | Shattering Roar | Fire, cold, and lightning resistance debuff: −20 points, then another −2 per additional level. Level 20 gives −58. | Gives elemental attacks and Storm Cry a resistance-reduction tool. It does not retain Battle Cry's original defense and outgoing-damage reduction, and it does not reduce poison resistance. |
| War Cry | Storm Cry | Lightning nova using the existing cry's stun logic; physical damage is cleared. Howl, Taunt, and the Battle Cry slot each provide 4% damage per hard rank. | Creates a lightning singer archetype. Resistance handling replaces the old physical-damage problem. Howl remains Howl; Blood Thirst is a different slot. |
| Grim Ward | Ancestral Standard | With the pack enabled, a corpse-anchored slowing ward with physical resistance reduction. | Supports physical damage in a held combat area instead of scattering enemies with fear. |

The Storm Cry installation report sets the warcry missile range from 16 to 32 and uses an electric-nova resource. That is a packaged range change; the report still calls for in-game confirmation of the visible radius. Its audited elemental base is **24–425 at effective level 20 before synergies, mastery, and other bonuses**. Actual damage and resistance handling should be measured before this becomes an endgame build recommendation.

### Primordial Infusion in the latest pack

| Effective level | Added fire attack damage | Added cold attack damage | Lightning skill damage |
| --- | --- | --- | --- |
| 20 | 200–400 | 75–150 | +20% |
| 30 | 400–800 | 150–300 | +20% |

Fire and cold growth doubles above effective level 20. Cold length is 50 frames before target and difficulty adjustments. Lightning skill damage increases by one point per level and caps at +20%. The native Shout duration and its Battle Orders/Battle Command duration synergies are retained.

**Design rationale:** replace a purely defensive maintenance cry with an offensive support buff that rewards effective skill levels. **Build openings:** elemental Frenzy, mixed physical/elemental weapon attacks, Storm Cry support, and allied attack support. Fire and cold attack damage do not become fire and cold spell-damage bonuses. The loss of Shout defense needs to be covered elsewhere.

### Ancestral Standard in the latest pack

The ward requires a corpse and lasts 20 seconds. Enemy movement/attack slow and physical resistance reduction both use `min(10 + level, 35)`, giving 30% at level 20 and a 35% cap at level 25. It uses native ward visuals and has no ally stat buff in this version.

**Design rationale:** provide a physical support area that keeps targets available to attack. **Build openings:** Concentrate, Frenzy, Whirlwind, or a physical companion working inside the ward. It has limited value before the first eligible corpse exists or against targets that do not receive its native effects. Do not assume that its debuff stacks freely with every physical curse.

### Remaining numerical attack changes

| Skill | Confirmed current D2PLUS tuning | Build opening |
| --- | --- | --- |
| Double Throw | Native base damage bonus is retained; Double Swing contributes 12% per hard rank. Listed AR is 30% plus 12% per additional level. | Throwing remains possible, but quantity management must be solved after the mastery-slot replacement. |
| Stun | Adds 8% damage per skill level before the Bash synergy, which contributes 6% per hard rank. | A control attack can deal useful physical damage without maximizing Bash first. |
| Leap Attack | Weapon damage bonus starts at 150% and gains 40% per additional level; Leap contributes 7% per hard rank. Native landing damage behavior remains. | Supports a mobile heavy hitter. The audited mana cost is 10, not the older white paper's proposed 9. |
| Concentrate | Native damage bonus starts at 100% and gains 8% per additional level. Battle Orders contributes 6% per hard rank; Bash remains a 5% synergy. | Gives a durable single-target fighter a stronger independent core. |
| Berserk | Native magic conversion damage starts at +180% and gains 18% per additional level. Howl and Battle Orders contribute 6% each. | Supports a magic-damage weapon option with a different synergy budget. Its native defense penalty remains relevant. |
| Historical Throwing Mastery, Grim Ward, and physical War Cry tuning | Superseded by Wind Runner, Ancestral Standard, and Storm Cry in the described setup. | These are part of the original 56-edit history, not extra active skills to add to a build. |

### Added Barbarian passives

| Passive | Unlock | Five-rank effect | Why spend points |
| --- | --- | --- | --- |
| Battle Instinct | Level 6 | +60% AR. | Help weapon attacks connect. |
| Killing Edge | Level 24 | +5 points of passive Critical Strike. | Additional physical double-damage chance; account for the existing mastery and Deadly Strike calculation. |
| Singers Breath | Level 12 | +50% mana regeneration. | Support repeated cries and spell-like attacks. |

**First builds to test:** elemental Frenzy with Primordial Infusion, a controlled physical fighter with Ancestral Standard, flexible-weapon Arms Master, and Storm Cry with Primal Weapon Mastery and Shattering Roar. The last is a balance candidate, not a proven clear-speed recommendation.

## Druid

The Druid changes create distinct choices between cold damage, physical support, attack support, and corpse healing. Several of these roles compete for the same native pet category.

### Baseline skill replacements

| Current D2R skill | D2PLUS skill | Confirmed behavior | Why it exists and what it enables |
| --- | --- | --- | --- |
| Arctic Blast | Permafrost | Passive +5% cold skill damage and +2 points cold pierce per effective level. Level 20 gives +100% damage and 40 points pierce. | Gives cold investment an ongoing mastery role rather than a channeling attack. Hurricane or a cold shapeshift hybrid can benefit where owner damage is affected. Arctic Blast is no longer an active beam. |
| Hunger | Ravage | Shapeshift attack damage bonus is +25% plus 10% per additional level, or +215% at level 20. Native life/mana-leech calculations remain. | Gives the recovery bite a positive physical-damage identity. It replaces Hunger, not Feral Rage. Crushing Blow, Open Wounds, and Ignore Target Defense are not added by this rework. |
| Solar Creeper | Blight Creeper | Poison vine plus an enemy debuff. Helper formula lowers defense by 50 plus 25 per additional level and physical resistance by `min(10 + level, 40)` points. | Supports physical summons, attacks, or Tornado where native debuff behavior applies. At level 20 the helper gives −525 flat defense and −30 physical resistance. The original mana-restoring Solar Creeper role is removed. |
| Spirit of Barbs | Spirit of the Gale | Summoned spirit supplies lightning attack damage and IAS. Level 20 aura values are 62–315 lightning attack damage and +30% item-type IAS; IAS caps at 40%. | Provides offensive attack support for the owner and eligible allies. It replaces reflected-damage support and is not a lightning spell-damage mastery. |

Blight Creeper does **not** replace Poison Creeper. Poison Creeper remains the native Rabies synergy. Spirit of the Gale shares the native spirit category with Oak Sage and Heart of Wolverine, so its offense has a life or physical-support opportunity cost. A pet's cold damage should not be assumed to inherit the owner's Permafrost and Heart of Winter bonuses without confirming the transfer.

### Remaining numerical changes

| Skill | Confirmed current D2PLUS tuning | Reason and build opening |
| --- | --- | --- |
| Raven | Revised flat growth and attack-count formula `20 + 2 × (level − 1)`; native summon synergies remain. | More attacks per summon support a Raven-focused army and reduce replacement pressure. |
| Summon Spirit Wolf | Physical damage-growth fields and the defense-scaling parameter are increased; the active damage lane is cold, using separate elemental fields. | The documented intent is stronger wolves. The physical-field edits do not establish a cold-damage buff, so cold damage should be checked separately. Summon defense remains a useful support role. |
| Molten Boulder | Increased physical and fire growth; Volcano contributes 8% to physical damage and Firestorm contributes 8% to fire damage per hard rank. | Encourages mixed damage without requiring the same point budget as a fully synergized fire tree. |
| Arctic Blast historical rebalance | Superseded by Permafrost. Its native slot can still be referenced by other skill formulas. | An investment in the renamed passive may still contribute to a native slot-based synergy such as Twister's stun calculation. |
| Rabies | Increased poison growth; Poison Creeper contributes 12% per hard rank. | Makes poison spreading a more independent companion to another shapeshift attack. |
| Fire Claws | Increased fire growth; Firestorm and Molten Boulder each contribute 8% per hard rank. | Creates space for shapeshift durability or summons. Current D2R already removed Fissure and Volcano as Fire Claws synergies, so that two-synergy structure is not a D2PLUS invention. |
| Twister | Increased physical growth; Tornado and Hurricane each contribute 6% per hard rank. | Gives a wind-control attack more base value. Permafrost's cold mastery does not increase Twister's physical damage. |
| Armageddon | Increased fire growth; Firestorm and Molten Boulder contribute 7% each to fire damage. Volcano contributes 18% to the physical component. | Supports a fire/physical background damage source in a hybrid. Its projectile behavior and coverage still determine practical damage. |

### Bloodroot replacing Carrion Vine in the latest pack

**Implemented role:** a durable corpse-eating healing vine. The pack clones a native corpse-recovery helper and increases summon-life growth. It does not create a physical eruption.

- Healing per consumed corpse: `min(5 + level, 15)%` of maximum life.
- Healing reaches its 15% cap at effective level 10.
- Summon life growth: `40 × (level − 1)%`, or +760% at level 20 before other life calculations.
- Shares the native one-vine limit.

**Design rationale:** offer recovery that keeps pace with a high-life Druid, while making the vine durable enough to remain part of combat. **Build openings:** a shapeshifter healing between attacks, a summoner using spare corpses, or a caster wanting a recovery pet.

The choice is significant: Bloodroot competes with Blight Creeper and Poison Creeper. A physical build may prefer Blight's debuff; a sustain build may prefer Bloodroot. There is no free combination of all three vines in this pack, and no corpse means no corpse-based healing.

### Added Druid passives

| Passive | Unlock | Five-rank effect | Why spend points |
| --- | --- | --- | --- |
| Wild Covenant | Level 24 | +10 points to the native passive summon-resistance stat. | Intended to improve army durability; verify transfer to each pet category. |
| Ironhide | Level 12 | +40% defense. | Help an exposed caster or shapeshifter. This is not physical damage reduction. |
| Heart of Winter | Level 24 | +10% cold skill damage. | Small support investment for applicable owner cold damage alongside Permafrost. |

**First builds to test:** Hurricane/shapeshift, Fire Claws/summons, Ravage with Spirit of the Gale, Tornado with Blight Creeper, and a summon army choosing deliberately between Blight and Bloodroot.

## Assassin

The numerical layer supports elemental martial arts, blades, and fire traps. The Classic Pack replaces Psychic Hammer with **Shadow Rift**. The ordinary Mind Blast slot remains available for its native control effects.

### Numerical changes

| Skill | Confirmed D2PLUS behavior | Reason and build opening |
| --- | --- | --- |
| Fists of Fire | Increased fire growth; Phoenix Strike contributes 8% per hard rank. | Supports a dedicated fire charge-up path with less dependence on maximizing Phoenix Strike first. |
| Claws of Thunder | Increased maximum lightning growth; Phoenix Strike contributes 6% per hard rank. | Supports lightning-focused martial arts and mixed charge-up planning. |
| Blades of Ice | Increased cold growth; Phoenix Strike contributes 6% per hard rank. | Makes cold control and damage a more independent choice. |
| Blade Sentinel | Stronger flat damage growth and 50% weapon source damage. One-second local delay remains. | Gives a blade build more skill-based damage, but its weapon fraction is below current vanilla's 75%. The old white paper's claim of a deployment-speed buff does not describe the active current comparison. |
| Blade Fury | Stronger flat damage growth; 75% weapon source damage. The firing-related parameter is changed to 4. Native blade synergies remain 10% each. | Supports sustained blade attacks. Verify actual firing cadence in game rather than treating a table parameter as a guaranteed attacks-per-second result. |
| Blade Shield | Stronger flat growth; 37.5% weapon source damage; pulse period is 20 frames, or 0.8 seconds. | Adds repeated close-range pressure, but its weapon fraction is below current vanilla's 75%. Whether it wins overall depends on weapon damage, flat skill damage, synergies, and uptime. |
| Wake of Fire | Increased base fire growth; Fire Blast and Wake of Inferno each contribute 5% per hard rank. | Makes fire traps more useful with a smaller supporting investment. |
| Wake of Inferno | Increased fire growth; Fire Blast and Wake of Fire each contribute 6% per hard rank. | Supports a focused fire-trap lane while retaining room for control or a secondary attack. |

The current game already supports relevant elemental bonuses on traps. Ember Discipline uses that established behavior. It does not require inventing a new trap-damage system.

### Shadow Rift replacing Psychic Hammer

**Implemented role:** an area magic blast with **outward knockback**, using Mind Blast behavior. Conversion and stun are explicitly cleared. It is not an inward pull or a lingering rift.

- Fixed mana cost: 6.
- Local delay: 15 frames, or 0.6 seconds.
- Magic base damage starts at 6–12, with increasing level-growth steps.
- No damage synergy is added in this prototype.
- Psychic Hammer's native level-one slot and prerequisites are retained.

**Design rationale:** give the early shadow slot a damage-and-spacing role that works alongside attacks or deployed traps. Using magic damage provides a different damage channel from fire or lightning.

**Doors it opens:** a fire trapper with a magic secondary cast; a blade user creating space before channeling; or martial arts with a ranged utility attack. Outward knockback can also push enemies out of traps, so placement matters. Ordinary Mind Blast remains the choice when native stun or conversion is wanted. Shadow Rift does not automatically bypass magic immunity.

### Added Assassin passives

| Passive | Unlock | Five-rank effect | Why spend points |
| --- | --- | --- | --- |
| Blade Guidance | Level 12 | +60% AR. | Help blade and weapon hit checks where AR applies. It is not a general trap-damage bonus. |
| Still Mind | Level 6 | +40% mana regeneration. | Support trap deployment, repeated casts, or sustained blade use. |
| Ember Discipline | Level 24 | +10% fire skill damage. | Compact support for fire martial arts and applicable fire traps. |

**First builds to test:** fire traps/Shadow Rift, blades with shadow utility, and single-element martial arts with a secondary tool. Compare blade builds using the same weapon against current vanilla before describing their changed source-damage fractions as buffs.

## Warlock

The Warlock is already a native Reign of the Warlock class. The latest Classic Pack preserves the D2PLUS baseline's existing Warlock gameplay and installs its artwork; it does not add an eighth prototype replacement. The distinctive D2PLUS skill changes here are three passives and an Energy-based addition to Cleave and Echoing Strike.

### Current vanilla behavior that must not be credited to D2PLUS

Patch 3.2 requires a grimoire in the other hand when a Warlock equips a two-handed weapon one-handed. Echoing Strike uses 90% weapon damage and its corrected damage bonuses combine additively; its always-hit bug was fixed. Demonic Mastery unlocks two demons at five hard ranks and three at ten, with a 25% attack-speed cap. Bind Demon requires ten hard ranks for champions, fifteen for uniques, and twenty for super uniques. A bound Conviction aura becomes Fanaticism. Blood Oath's damage-sharing value is 25% at level 20. Miasma Chains already has no casting delay, a five-to-ten active-chain limit, and a one-second Next Hit Delay per individual chain. These are current Blizzard mechanics. [Blizzard Patch 3.2](https://news.blizzard.com/en-us/article/24261478/diablo-ii-resurrected-ladder-season-14-has-concluded)

### Added Warlock passives

| Passive | Unlock | Five-rank effect | Build opening |
| --- | --- | --- | --- |
| Sigil Lord | Level 30 | +25% faster cast rate and +25% maximum mana. | Helps a manually cast Chaos or mixed caster reach a breakpoint and sustain larger costs. It does not automatically cast sigils. |
| Astral Communion | Level 30 | +100% mana regeneration; an additional Energy-based damage term for Cleave and Echoing Strike. | Gives Energy a direct offensive role for an Eldritch weapon caster. |
| Demonic Resonance | Level 30 | 15% Crushing Blow, 15% item-type IAS, and 5% physical damage reduction; effects cap at effective passive level five. | Supports the owner's attacks and durability while demons provide their separate native roles. |

### Astral Communion offensive formula

The added percentage in Cleave and Echoing Strike is:

`min(300, current Energy × Astral Communion hard ranks / 5)`

| Current Energy | One hard rank | Three hard ranks | Five hard ranks |
| --- | --- | --- | --- |
| 100 | +20% | +60% | +100% |
| 200 | +40% | +120% | +200% |
| 300 | +60% | +180% | +300% |
| 400 | +80% | +240% | +300% |

Current Energy includes applicable equipment bonuses. The passive's **hard ranks** control the fraction; bonus skill levels do not replace purchased ranks in this particular term. Native weapon-attribute scaling and other attack calculations remain in place. This is an added damage-percentage term, not necessarily a separate multiplicative final-damage bonus.

**Design rationale:** let a resource stat compete with the default choice of putting nearly every spare attribute point into Vitality. The mana-regeneration component also supports frequent Eldritch casting.

**Doors it opens:** Energy/Echoing Strike, Energy/Cleave, and an Eldritch attacker using demons for support. The tradeoff is the life lost by allocating attributes away from Vitality. Reaching the 300% cap does not establish that 300 Energy is the best complete build, because equipment, weapon damage, hit chance, breakpoints, and survival still matter.

Demonic Resonance's bonuses apply to the owner and do not depend on the number of active demons. It is not a dynamic demon-count aura or a blanket pet IAS/Crushing Blow buff. A pure caster also should not value owner Crushing Blow as though it enhances ordinary spell damage.

**First builds to test:** Energy/Echoing Strike, Cleave with a moderate Energy allocation, Chaos casting with Sigil Lord, and an attack/demon hybrid. The frozen mod baseline should be checked against the installed game version before assuming every later Blizzard table change has been inherited.

## The builds these changes could open

These are testable directions, not fixed best-in-slot guides. Each combines a primary role with one complementary investment and identifies the cost that could keep it balanced.

| Build direction | Skills that make it possible | What it gains | What still limits it |
| --- | --- | --- | --- |
| Lightning/physical spear Amazon | Storm Lance, Fend, Hunters Discipline | Pack chaining plus a physical attack using the same weapon. | Melee exposure, attack speed, and targets resistant to both damage channels. |
| Poison spear Amazon | Plague Javelin, Poison Javelin, Fend | Damage over time while direct attacks finish targets. | Poison application rules and the time spent switching roles. |
| Fire/cold bow Amazon | Exploding/Immolation Arrow, Freezing Arrow, Thread the Needle | Two elemental attacks and projectile support. | Mana cost, skill-point spread, and elemental resistance. |
| Hydra/cold Sorceress | Hydra, Wintercraft, a chosen cold attack | A deployed fire source alongside cold casting. | Maintaining enough damage in both lanes and avoiding a diluted point budget. |
| Storm Enchant Sorceress | Enchant, Arcane Tempest, Emberguard | Weapon fire with a separate lightning buff. | More recasting and the defenses needed for melee. |
| Bone/summon Necromancer | Bone Spear or Spirit, summons, Grave Meditation | A caster with a durable first-kill engine. | Less bone synergy investment and competing equipment priorities. |
| Corpse-sustain Necromancer | Soul Harvest, a primary damage skill | Skill-based life and mana recovery after kills. | Corpses consumed instead of exploded or summoned. |
| Holy Judgment caster | Judgment, Holy Bolt, Fist of the Heavens | Magic and lightning primary effects with shared holy investment. | Cast delay, mana, secondary-bolt targeting, and magic-resistant targets. |
| Flexible Avenger | Vengeance, resistance auras, Measured Strikes | Three weapon elements with adjustable synergy investment. | Weapon quality, accuracy, and attack cadence. |
| Elemental Frenzy Barbarian | Primal Weapon Mastery, Primordial Infusion, Shattering Roar | Weapon attacks with several damage channels and elemental support. | Lost defensive cry effects and investment competing with physical passives. |
| Physical ward Barbarian | Arms Master, Ancestral Standard, Concentrate/Frenzy | Physical offense in a controlled area. | A corpse is needed before the ward can help. |
| Lightning singer Barbarian | Storm Cry, Primal Weapon Mastery, Shattering Roar, Singers Breath | Lightning nova, resistance reduction, stun, and mana support. | Damage and resistance handling need testing; leech does not solve sustain. |
| Cold shapeshift Druid | Permafrost, Hurricane, a shapeshift attack | Cold background damage plus direct weapon attacks. | Point budget, cast restrictions, and owner/pet bonus separation. |
| Physical summon Druid | Summons, Blight Creeper, chosen spirit | Army support through enemy physical resistance reduction. | Vine and spirit choices exclude other support pets. |
| Sustain shapeshifter | Ravage, Bloodroot, Ironhide | Attack recovery plus corpse healing and defense. | Bloodroot requires corpses and replaces an offensive vine choice. |
| Fire trap/magic Assassin | Wake of Fire/Inferno, Shadow Rift, Ember Discipline | Fire deployment plus a magic spacing tool. | Knockback can push enemies out of a trap's ideal position. |
| Blade utility Assassin | Blade skills, Blade Guidance, shadow utility | Stronger flat skill damage with accuracy and control support. | Lower Sentinel/Shield weapon fractions can hurt high-damage weapon setups. |
| Energy Eldritch Warlock | Cleave/Echoing Strike, Astral Communion | A mana attribute becomes an offensive investment. | Less Vitality and continued dependence on weapons, hit chance, and breakpoints. |
| Attack/demon Warlock | Demonic Resonance, native demon skills, an attack | Owner attack pressure and physical protection alongside pets. | Owner bonuses are not pet bonuses, and demon maintenance still costs points. |

### What point freedom actually means

A five-rank passive costs five purchased points. Taking every added passive costs fifteen points before the rest of the tree. A hybrid also pays prerequisites and gives up the marginal damage of an unpurchased synergy. D2PLUS creates more options for spending a limited budget; it does not remove that budget.

Useful questions are: does the second skill solve a real encounter problem, does it share useful equipment with the first skill, and is its gain worth the lost main-skill damage? A weak secondary element that never finishes a resistant pack is less valuable than a defensive skill that keeps the primary attack active.

## Interactions that decide whether a build works

### Damage bonuses are not interchangeable

Weapon source damage, flat elemental attack damage, elemental skill-damage bonuses, ordinary enhanced damage, and enemy resistance reduction operate differently. A caster's held weapon does not automatically make a spell apply Crushing Blow, life leech, Open Wounds, or Deadly Strike. A summon does not automatically inherit every owner stat. Use the actual skill and missile behavior to establish the connection.

### Resistance reduction has a target and a rule

Shattering Roar reduces fire, cold, and lightning resistance. Blight Creeper and Ancestral Standard target physical resistance. Permafrost supplies cold pierce. These are distinct effects. None should be described as a universal immunity breaker without verifying native behavior against an immune target. Also check whether a debuff replaces another curse or effect instead of stacking with it.

### Corpse recovery is a resource choice

Soul Harvest, Bloodroot, Corpse Explosion, summons, and wards can want the same bodies. A full-health character may be better served by keeping a corpse for damage or a ward. A build that works after the first pack dies can still struggle to produce the first corpse against a boss or immune group.

### Breakpoints and effective skill levels matter

FCR, IAS, FHR, and FRW bonuses have native behavior and do not promise an equal percentage increase in real combat speed. A small FCR passive can be valuable if it crosses a breakpoint. Additional levels improve some formulas while others cap, and synergy formulas using hard ranks behave differently from ordinary level scaling.

### Replacements preserve slots, not every former role

The prototypes preserve native skill IDs, original requirements, and prerequisites. A native skill-point reference can therefore still refer to that slot after its display name changes. For example, the Battle Cry slot remains a Storm Cry synergy while displaying Shattering Roar. This is not an additional copy of Battle Cry.

Before a respec, check the replaced roles: Power Strike's original behavior, Weaken, Psychic Hammer, Conversion, Shout defense, Battle Cry's old debuffs, the separate Barbarian weapon masteries, Arctic Blast's beam, Solar Creeper's mana recovery, Hunger's original attack, and Spirit of Barbs retaliation. Their replacements can be useful while still creating real costs.

## What should be validated during Alpha v0.8.2

The page documents the packaged mechanics. The next step for balance is measured gameplay, especially where a prototype uses a donor function or pet helper.

| Test | What it should answer |
| --- | --- |
| Equal-gear, equal-level comparison with current D2R | Does partial investment improve, and what happens to the fully specialized ceiling? |
| Main attack versus one-synergy and two-synergy variants | Are spare points genuinely useful, or does the build still need every damage synergy? |
| Resistant and immune targets | Which debuffs apply, which immunities remain, and which damage channels can finish the encounter? |
| No-corpse boss start | Can Soul Harvest, Bloodroot, and Ancestral Standard builds function before recovery or ward support begins? |
| Blade builds with weak and strong weapons | Do flat scaling gains compensate for lower Sentinel and Shield weapon fractions at each gear stage? |
| Storm Cry damage and radius | Is the expanded missile footprint functional, and is lightning damage sufficient after investment? |
| Judgment primary and secondary damage | Do the cloned delay and bolt missiles use the intended skill references and target restrictions? |
| Bloodroot and summon-resistance transfer | Does healing match the percentage formula, and which pets receive the passive resistance stat? |
| Throwing Barbarian endurance | Is ammunition sustain acceptable after replacing Throwing Mastery with Wind Runner? |
| Primordial Infusion and Shattering Roar | Do buff transfer, resistance debuff, caps, recasting, and tooltip values match combat behavior? |
| Energy Warlock at several attribute allocations | Does offense improve enough to justify the life tradeoff without making maximum Energy the automatic choice? |

Useful results include clear time, first-kill time, boss time, potion use, deaths, mana downtime, and the exact equipment and point allocation. Those results can turn the build openings on this page into grounded recommendations.

### Which setup this page describes

Install the **All Classes Classic Pack after the full D2PLUS Alpha v0.7 base**. Its eight class switches default to on and control that class's additional prototype changes and artwork. The Warlock switch controls artwork while preserving existing gameplay. Disabling a switch leaves the corresponding D2PLUS base behavior; it does not restore vanilla D2R. Older overlapping individual class packs and icon addons should be disabled, as the consolidated package's README specifies.

This is documentation for the audited development stack, not a claim that every described change is already merged into a final Alpha v0.8.2 release.

## Sources and method

**D2PLUS primary implementation sources**

- D2PLUS Alpha v0.7 Complete D2RMM package: packaged `skills.txt`, `skilldesc.txt`, `missiles.txt`, `states.txt`, localization, and the Storm Cry and Warlock reports.
- D2PLUS All Classes Classic Pack: October 7 consolidated installer, README, per-class replacements, tooltip fixes, icon mapping, and gameplay validation report.
- D2PLUS 1.0.7 White Paper: historical 56-skill inventory and documented numerical-rebalance rationale. Older values and plans are used only where the current package confirms them.

**Blizzard primary comparison sources**

- [Patch 3.3 and Ladder Season 15](https://news.blizzard.com/en-us/article/24296140/diablo-ii-resurrected-ladder-season-15-now-live): latest released patch located, August 2026, including skill bug fixes and mode-specific item changes.
- [Patch 3.2 and Ladder Season 14](https://news.blizzard.com/en-us/article/24261478/diablo-ii-resurrected-ladder-season-14-has-concluded): current Warlock restrictions and major post-launch balancing.
- [Patch 2.4](https://news.blizzard.com/en-us/article/23788293/diablo-ii-resurrected-patch-2-4-ladder-now-live): established class changes that must not be presented as new D2PLUS features.
- [Patch 2.6](https://news.blizzard.com/en-us/article/23899624/diablo-ii-resurrected-ladder-season-three-has-concluded): Cold Mastery and related damage handling.
- [Patch 2.7](https://news.blizzard.com/en-us/article/23938388/diablo-ii-resurrected-ladder-season-4-has-concluded): trap elemental bonuses and Next Hit Delay rules.

The audit covers the named numerical program, subsequent replacements, all added passives, and the current consolidated pack. It does not claim an exhaustive byte-by-byte diff against a newly extracted vanilla 3.3 installation. Numerical examples are table calculations; in-game performance and donor-function behavior remain subjects for testing.
