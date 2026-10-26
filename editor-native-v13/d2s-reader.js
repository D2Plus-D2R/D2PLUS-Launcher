/**
 * D2S (character save) reader — Blizzless v105 only.
 *
 * Ported from d2planner/src/logic/binary/index.js → parseCharacter().
 * Simplified: v105 only — all offsets use v105 values.
 *
 * Uses GameData instead of global Data singleton.
 */
import { captureNativeItems } from './native-item-preservation.js';
import { BinaryReader } from './binary-reader.js';
import { GameData } from './game-data.js';
import { detectFormat } from './detect.js';
import { createItemParser } from './item-parser.js';
// ─── Reader ─────────────────────────────────────────────────────
/**
 * Parse a .d2s character file.
 *
 * @param data Raw file bytes
 * @param gd   GameData instance
 */
export function readD2S(data, gd) {
    const warnings = [];
    const fmt = detectFormat(data);
    if (!fmt || fmt.type !== 'd2s')
        throw Error('invalid d2s header');
    const reader = new BinaryReader(data);
    reader.seek(16);
    const result = {};
    // Preserve the fixed 833-byte v105 header verbatim for lossless round-tripping.
    // (The stats section always starts at offset 833 in this format.)
    result.rawHeader = Array.from(data.subarray(0, 833));
    // v105: 4 zero bytes at offset 0x10
    reader.skip(4);
    // Name might be at offset 299 (v105)
    if (!result.name) {
        const savedPos = reader.bitpos;
        reader.seek(299);
        result.name = reader.utf8(16);
        reader.bitpos = savedPos;
    }
    // Class at offset 24 (v105)
    reader.seek(24);
    const classId = reader.read8();
    result.class = GameData.classes[classId] || `unknown_${classId}`;
    // Merc data at offset 163 (v105)
    reader.seek(163);
    const mercId = reader.read32();
    if (mercId) {
        result.mercName = reader.read16();
        result.merc = reader.read16().toString();
        const mercXP = reader.read32();
        const mercData = gd.hireling[result.merc]?.[0];
        if (mercData) {
            let L = mercData.level;
            const M = mercData.explvl;
            while (L < 98 && M * (L + 1) * (L + 1) * (L + 2) <= mercXP) {
                L += 1;
            }
            result.mercLevel = L;
        }
    }
    // Quests
    function readQuestTable() {
        return {
            denofevil: (reader.byte(2) & 1) !== 0,
            radamentslair: (reader.byte(18) & 1) !== 0,
            thegoldenbird: (reader.byte(40) & 1) !== 0,
            lamessenstome: (reader.byte(34) & 1) !== 0,
            thefallenangel: (reader.byte(50) & 1) !== 0,
            prisonofice: (reader.byte(74) & 1) !== 0,
        };
    }
    result.quests = [];
    reader.seek(413); // v105 quest offset normal
    result.quests.push(readQuestTable());
    reader.seek(509); // nightmare
    result.quests.push(readQuestTable());
    reader.seek(605); // hell
    result.quests.push(readQuestTable());
    // Character stats at offset 833 (v105)
    reader.seek(833);
    if (reader.read16() !== 0x6667)
        throw Error('invalid stats header');
    // Build stat map
    const statMap = new Map();
    for (const key in gd.itemStatCost) {
        statMap.set(gd.itemStatCost[key].id, key);
    }
    const charStats = {};
    while (true) {
        const statId = reader.bits(9);
        if (statId === 511)
            break;
        const stat = statMap.get(statId);
        if (!stat)
            throw Error(`unknown stat code ${statId}`);
        charStats[stat] = reader.bits(gd.itemStatCost[stat].csvbits ?? 0);
    }
    reader.align();
    const classStats = gd.charStats[result.class];
    result.stats = {
        str: charStats.strength - (classStats?.str || 0),
        dex: charStats.dexterity - (classStats?.dex || 0),
        int: charStats.energy - (classStats?.int || 0),
        vit: charStats.vitality - (classStats?.vit || 0),
    };
    result.level = charStats.level;
    result.gold = charStats.gold ?? 0;
    result.goldStash = charStats.goldbank ?? 0;
    result.attributes = charStats;
    // Skills
    if (reader.read16() !== 0x6669)
        throw Error('invalid skills header');
    result.skills = {};
    // v105 stores the number of class skill bytes in the fixed header at
    // offset 0x1a. Mods such as D2PLUS append class skills, so the historical
    // fixed 30-byte assumption shifts every item that follows the skill block.
    const skillCount = data[0x1a] || 30;
    const skillIds = Object.values(gd.skills)
        .filter(skill => skill.charclass === result.class)
        .map(skill => Number(skill.id))
        .filter(Number.isFinite)
        .sort((a, b) => a - b)
        .slice(0, skillCount);
    if (skillIds.length !== skillCount) {
        warnings.push(`Skill layout declares ${skillCount} entries, but game data provides ${skillIds.length}.`);
    }
    for (let i = 0; i < skillCount; ++i) {
        const level = reader.read8();
        const skillId = skillIds[i];
        if (level && skillId != null)
            result.skills[skillId] = level;
    }
    // Items
    result.rawPlayerStart = reader.bitpos >> 3;
    const ctx = createItemParser(reader, gd);
    result.items = {};
    result.inventory = [];
    result.cube = [];
    result.stash = [];
    result.belt = [];
    try {
        ctx.parseItemList((id, location, slot) => {
            if (location === 'body')
                result.items[slot] = id;
            if (location === 'inventory')
                result.inventory[slot] = id;
            if (location === 'cube')
                result.cube[slot] = id;
            if (location === 'stash')
                result.stash[slot] = id;
            if (location === 'belt')
                result.belt[slot] = id;
        });
        // Corpses — captured verbatim so the writer preserves corpse items.
        const corpseStart = reader.bitpos >> 3;
        result.rawPlayerEnd = corpseStart;
        if (reader.read16() !== 0x4d4a)
            throw Error('invalid item table header');
        const corpses = reader.read16();
        reader.skip(corpses * 12);
        for (let i = 0; i < corpses; ++i) {
            ctx.parseItemList(() => null);
        }
        result.rawCorpse = Array.from(reader.buffer.subarray(corpseStart, reader.bitpos >> 3));
        // Hireling items
        if (!reader.eof()) {
            if (reader.read16() !== 0x666a)
                throw Error('invalid hireling header');
            result.mercItems = {};
            if (reader.byte(0) === 0x4a && reader.byte(1) === 0x4d) {
                ctx.parseItemList((id, location, slot) => {
                    if (mercId && location === 'body')
                        result.mercItems[slot] = id;
                });
            }
        }
        // Iron golem — captured verbatim so the writer preserves the golem item.
        if (!reader.eof()) {
            const golemStart = reader.bitpos >> 3;
            if (reader.read16() !== 0x666b)
                throw Error('invalid iron golem header');
            if (reader.read8()) {
                ctx.parseItem(ctx.nextId(), id => { result.ironGolem = typeof id === 'number' ? id : 0; });
            }
            result.rawGolem = Array.from(reader.buffer.subarray(golemStart, reader.bitpos >> 3));
        }
        // Preserve extra sections (0x666c warlock demon data) as raw bytes,
        // and best-effort parse the bind-demon descriptor.
        if (!reader.eof()) {
            const bytePos = reader.bitpos >> 3;
            result.extraSections = Array.from(reader.buffer.subarray(bytePos));
            try {
                if (reader.read16() === 1 && reader.read16() === 0x666c) {
                    const count = reader.read16();
                    if (count > 0) {
                        reader.read16(); // entrySize
                        const idType = reader.read16(); // 1=normal monster by hcidx, 2=super unique
                        const binaryId = reader.read16();
                        const monId = binaryId - 1; // hcidx (1-indexed in binary)
                        reader.read16(); // skip
                        const monType = reader.read16(); // 8=unique, 12=champion
                        reader.read16(); // skip
                        reader.read8(); // diff
                        reader.skip(11);
                        const area = reader.read32();
                        const level = reader.read32();
                        reader.skip(48);
                        let monClass;
                        let demonId;
                        let monsterType;
                        if (idType === 2) {
                            const su = gd.superUniques?.[String(monId)];
                            monClass = su?.class;
                            demonId = String(monId);
                            monsterType = 'super';
                        }
                        else if (idType === 1) {
                            const entry = Object.entries(gd.monsters).find(([, v]) => v?.hcidx === monId);
                            monClass = entry?.[0];
                            demonId = monClass;
                            monsterType = monType === 12 ? 'champion' : 'unique';
                        }
                        if (monClass && demonId && monsterType) {
                            result.bindDemon = {
                                revive: 'bind',
                                id: demonId,
                                monsterType,
                                monster: monClass,
                                area,
                                level,
                                unit: `bind_${monClass}`,
                                group: 'binddemon',
                                minion: monType !== 16,
                                skill: '382',
                            };
                            const presetMods = idType === 2
                                ? [
                                    gd.uniqueMods?.[gd.superUniques?.[String(monId)]?.mod1 ?? '']?.uniquemod,
                                    gd.uniqueMods?.[gd.superUniques?.[String(monId)]?.mod2 ?? '']?.uniquemod,
                                    gd.uniqueMods?.[gd.superUniques?.[String(monId)]?.mod3 ?? '']?.uniquemod,
                                ].filter(Boolean)
                                : [];
                            const allMods = new Set();
                            for (let m = 0; m < 8; m++) {
                                const um = gd.uniqueMods?.[String(reader.read8())]?.uniquemod;
                                if (um)
                                    allMods.add(um);
                            }
                            const demonMods = [...allMods].filter(m => !presetMods.includes(m));
                            if (demonMods.length)
                                result.bindDemon.mods = demonMods;
                        }
                    }
                }
            }
            catch {
                // best-effort; non-critical
            }
        }
    }
    catch (e) {
        const warning = `Item parsing error (some items may be missing): ${e.message}`;
        warnings.push(warning);
    }
    if(!warnings.length)captureNativeItems(ctx.items,data);
    return {
        profile: result,
        items: ctx.items,
        warnings,
    };
}
//# sourceMappingURL=d2s-reader.js.map