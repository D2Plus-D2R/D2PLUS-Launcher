/**
 * Item binary writer — writes items to D2R v105 save format.
 *
 * Ported from d2planner/src/logic/binary/writed2s.js →
 *   writeItem(), writeItemList(), writeItemStats().
 * Simplified: Blizzless v105 only (D2R=true, V105=true).
 *
 * Uses GameData instead of global Data/Locale singletons.
 */
import { reuseNativeItem } from './native-item-preservation.js';
import { BitWriter } from './binary-writer.js';
import { presetItemIds, itemGetTypes } from './item-types.js';
import { modsToStats, runewordStats } from './item.js';
// ─── Constants ──────────────────────────────────────────────────
/** Reverse map: body slot name → numeric location index. */
const bodyLocMap = {
    head: 1, neck: 2, tors: 3, rarm: 4, larm: 5,
    rrin: 6, lrin: 7, belt: 8, feet: 9, glov: 10,
    rarm2: 11, larm2: 12,
};
/** Quality enum → file quality code (4-bit field). */
const qualityToFileBits = {
    1: 1, // LOW
    2: 2, // NORMAL
    3: 3, // SUPERIOR
    4: 4, // MAGIC
    5: 5, // SET
    6: 6, // RARE
    7: 7, // UNIQUE
    8: 8, // CRAFTED
};
/** Stats that require consecutive follow-up stat writes. */
const followStats = {
    item_maxdamage_percent: 1,
    firemindam: 1,
    lightmindam: 1,
    magicmindam: 1,
    coldmindam: 2,
    poisonmindam: 2,
};
// ─── writeItemList ──────────────────────────────────────────────
/**
 * Write a JM-prefixed item list.
 *
 * Takes an array of item entries (item + location) and all items
 * (for socketed item lookups). Returns the raw bytes.
 */
export function writeItemList(entries, allItems, gd) {
    const writer = new BitWriter();
    writer.writeString('JM', 2);
    writer.writeUInt16(entries.length);
    for (const e of entries) {
        const bytes = writeItem(e.item, e.location, allItems, gd);
        writer.writeBytes(bytes, bytes.length * 8);
    }
    return writer.toArray();
}
// ─── writeItem ──────────────────────────────────────────────────
/**
 * Write a single item to binary format.
 *
 * Returns raw bytes for the item (includes socketed sub-items).
 */
export function writeItem(item, loc, allItems, gd) {
    const original=reuseNativeItem(item,loc,allItems);if(original)return original;
    const writer = new BitWriter();
    // Determine simple flag from item type (matches maxroll behaviour): potions,
    // gems, scrolls, runes have no stat block.
    const baseTypes = itemGetTypes(gd, item.base);
    const isSimple = !!item.compact || !!gd.items[item.base]?.compactsave || !!item.ear
        || isItemSimple(item, baseTypes)
        || baseTypes.has('poti') || baseTypes.has('gem')
        || baseTypes.has('scro') || baseTypes.has('rune');
    const runeword = item.unique?.startsWith('runeword') ?? false;
    /**
     * A runeword struck on a superior base — d2planner writes quality=3 (SUPERIOR)
     * + the 3-bit superior mod, instead of quality=2 (NORMAL).
     */
    const isSuperiorBase = runeword && item.superior != null;
    // ═══════════ FLAGS (35 bits) ═══════════
    writeZeroBits(writer, 4);
    writer.writeBit(item.unidentified ? 0 : 1); // identified
    writeZeroBits(writer, 6);
    writer.writeBit(item.sockets > 0 ? 1 : 0); // socketed
    writeZeroBits(writer, 4);
    writer.writeBit(item.ear ? 1 : 0); // ear
    writeZeroBits(writer, 4);
    writer.writeBit(isSimple ? 1 : 0); // simple
    writer.writeBit(item.ethereal ? 1 : 0); // ethereal
    writer.writeBit(1); // justsaved = 1
    writer.writeBit(item.personalized ? 1 : 0); // personalized
    writer.writeBit(0); // unknown
    writer.writeBit(runeword ? 1 : 0); // runeword
    writeZeroBits(writer, 5); // remaining unknown bits
    // v105: 3 bits after flags
    writer.writeUInt16(0b101, 3);
    // ═══════════ LOCATION (18 bits) ═══════════
    writer.writeUInt8(loc.loc, 3);
    writer.writeUInt8(loc.equip, 4);
    writer.writeUInt8(loc.x, 4);
    writer.writeUInt8(loc.y, 4);
    writer.writeUInt8(loc.storage, 3);
    // ═══════════ BASE CODE (Huffman) ═══════════
    const baseStr = item.base + ' ';
    for (const ch of baseStr) {
        writer.writeChar(ch);
    }
    // ═══════════ SOCKETED COUNT ═══════════
    const socketedCount = item.socketedItems?.filter(Boolean).length || 0;
    if(isSimple){if(gd.items[item.base]?.quest && gd.items[item.base]?.questdiffcheck)writer.writeUInt8(item.questDifficulty||0,gd.itemStatCost.questitemdifficulty.savebits);writer.writeBit(0);}else writer.writeUInt8(socketedCount,3);
    // ═══════════ COMPLEX ITEM FIELDS (skipped for simple) ═══════════
    if (isSimple) {
        // Simple items go straight to the post-stats quantity field below.
    }
    else {
        // (closed before V105 post-stats quantity block)
        writer.writeUInt32(item.guid ?? item.itemId ?? 0, 32); // preserve the saved GUID, not the parser's local key
        writer.writeUInt8(item.ilvl, 7); // item level
        // Runeword: quality field stores SUPERIOR (3) for a superior runeword base,
        // NORMAL (2) otherwise.
        const quality = runeword ? (isSuperiorBase ? 3 : 2) : (qualityToFileBits[item.quality] || 0);
        writer.writeUInt8(quality, 4); // quality
        // Custom icon
        if (item.iconIndex) {
            writer.writeUInt8(1, 1);
            writer.writeUInt8(item.iconIndex, 3);
        }
        else {
            writer.writeUInt8(0, 1);
        }
        // Class-specific
        writer.writeUInt8(0, 1);
        // Quality-specific data. Runeword on a superior base also writes the
        // SUPERIOR 3-bit mod (0) after the quality byte.
        const qualityRaw = item.quality === 9 ? 2 : item.quality;
        writeQualityData(writer, item, qualityRaw, gd);
        if (runeword && isSuperiorBase)
            writer.writeUInt8(0, 3);
        // Runeword ID
        if (runeword) {
            writer.writeUInt16(item.nativeRunewordId ?? Number(item.unique?.replace('runeword', '') || 0), 12);
            writer.writeUInt8(item.nativeRunewordExtra||0, 4);
        }
        // Personalized name
        if (item.personalized) {
            const name = (typeof item.personalized === 'string' ? item.personalized : '').substring(0, 15);
            for (let i = 0; i < name.length; i++) {
                writer.writeUInt8(name.charCodeAt(i), 8);
            }
            writer.writeUInt8(0, 8);
        }
        const types = itemGetTypes(gd, item.base);
        // Book type
        if (types.has('book')) {
            writer.writeUInt8(item.base === 'ibk' ? 1 : 0, 5);
        }
        // Timestamp
        writer.writeUInt8(0, 1);
        // Defense (armor)
        if (types.has('armo')) {
            writer.writeUInt16((item.defense || 0) + 10, 11);
        }
        // Durability (armor or weapon)
        if (types.has('weap') || types.has('armo')) {
            const baseItem = gd.items[item.base];
            const maxDur = (baseItem?.nodurability || item.stats?.item_indesctructible) ? 0 : (baseItem?.durability || 0);
            writer.writeUInt16(maxDur, 8);
            if (maxDur > 0) {
                writer.writeUInt16(maxDur, 9);
            }
        }
        // V105 pre-stats quantity: 1-bit flag + 9-bit value. Always written for V105,
        // gated by the base item being stackable (matches d2planner-HEAD writeItem).
        const baseItem = gd.items[item.base];
        const stackable = !!baseItem?.stackable;
        writer.writeBit(stackable ? 1 : 0);
        if (stackable)
            writer.writeUInt16(item.quantity || 1, 9);
        // Socket count (4-bit)
        if (item.sockets > 0) {
            writer.writeUInt8(item.sockets, 4);
        }
        // Set property list flags — write the actual setflags field rather than
        // synthesising it from stats.length.
        if (qualityRaw === 5) { // SET
            writer.writeUInt8(item.setflags || 0, 5);
        }
        // ═══════════ STATS ═══════════
        if (runeword) {
            const runewordData = gd.runes[item.unique];
            const rwStats = {};
            if (runewordData) {
                runewordStats(gd, rwStats, runewordData, item.uniqueValues, item);
            }
            const baseStats = {};
            if (item.auto)
                modsToStats(gd, baseStats, item.auto, item);
            if (item.superior)
                modsToStats(gd, baseStats, item.superior, item);
            if (item.staff)
                modsToStats(gd, baseStats, item.staff, item);
            writeItemStats(writer, item.savedBaseStats || baseStats, gd);
            writeItemStats(writer, item.savedRunewordStats || rwStats, gd);
        }
        else {
            const storedStats = { ...(item.stats || {}) };
            // The parser adds the implicit blunt-weapon bonus for display.
            // It is not a saved modifier and must not grow by 50% each export.
            if (types.has('blun')) {
                storedStats.item_undeaddamage_percent = (storedStats.item_undeaddamage_percent || 0) - 50;
                if (!storedStats.item_undeaddamage_percent) delete storedStats.item_undeaddamage_percent;
            }
            writeItemStats(writer, storedStats, gd);
            // Empty set-bonus stat sections for each active setflag bit — terminator only.
            if (qualityRaw === 5 && item.setflags) {
                for (let bit = 0; bit < 5; bit++) {
                    if (item.setflags & (1 << bit))
                        writeItemStats(writer, item.setBonusStats?.[bit] || {}, gd);
                }
            }
        }
    } // end if(!isSimple) — complex item body
    // ═══════════ V105 POST-STATS QUANTITY (both simple + complex) ═══════════
    // 1-bit flag + 8-bit value, gated by base.stackable && item.quantity.
    const _postBase = gd.items[item.base];
    const _postQty = item.stackQuantity || 0;
    writer.writeBit(_postQty ? 1 : 0);
    if (_postQty)
        writer.writeUInt8(_postQty, 8);
    writer.align();
    // Write socketed sub-items
    writeSocketedItems(writer, item, allItems, gd);
    return writer.toArray();
}
// ─── Quality-specific data ──────────────────────────────────────
function writeQualityData(writer, item, qualityRaw, gd) {
    switch (qualityRaw) {
        case 1: // LOW
            writer.writeUInt8(0, 3);
            break;
        case 2: // NORMAL
            break;
        case 3: { // SUPERIOR
            writer.writeUInt8(0, 3);
            break;
        }
        case 4: { // MAGIC
            let mp = 0;
            let ms = 0;
            for (const k in item.mods || {}) {
                if (!mp && k.includes('mp'))
                    mp = +k.slice(2);
                else if (!ms && k.includes('ms'))
                    ms = +k.slice(2);
            }
            writer.writeUInt16(mp, 11);
            writer.writeUInt16(ms, 11);
            break;
        }
        case 5: // SET
            writer.writeUInt16(Number(item.unique?.replace('set', '') || 0), 12);
            break;
        case 7: // UNIQUE
            writer.writeUInt16(Number(item.unique?.replace('unique', '') || 0), 12);
            break;
        case 6: // RARE
        case 8: { // CRAFTED
            const mods = Object.keys(item.mods || {});
            const mpMods = mods.filter(k => k.startsWith('mp')).map(k => +k.slice(2));
            const msMods = mods.filter(k => k.startsWith('ms')).map(k => +k.slice(2));
            const { rarePrefix, rareSuffix } = findRareNames(item.name || '', gd);
            writer.writeUInt8(rarePrefix + 156, 8);
            writer.writeUInt8(rareSuffix + 1, 8);
            for (let i = 0; i < 3; i++) {
                if (mpMods[i]) {
                    writer.writeBit(1);
                    writer.writeUInt16(mpMods[i], 11);
                }
                else {
                    writer.writeBit(0);
                }
                if (msMods[i]) {
                    writer.writeBit(1);
                    writer.writeUInt16(msMods[i], 11);
                }
                else {
                    writer.writeBit(0);
                }
            }
            break;
        }
    }
}
// ─── Stat writing ─────────────────────────────────────────────
/**
 * Write all stats for an item, terminated by 0x1ff (511).
 */
function writeItemStats(writer, stats, gd) {
    const processed = new Set();
    // Remove poison_count — it's not written
    const cleanStats = { ...stats };
    delete cleanStats.poison_count;
    // Sort by stat ID for deterministic output
    const sortedKeys = Object.keys(cleanStats).sort((a, b) => getStatId(a, gd) - getStatId(b, gd));
    for (const stat of sortedKeys) {
        if (processed.has(stat))
            continue;
        if (stat === 'item_numsockets')
            continue; // written in dedicated field
        writeStat(writer, cleanStats, stat, processed, gd);
    }
    // End-of-stats marker
    writer.writeUInt16(0x1ff, 9);
}
/** Get the numeric stat ID from a stat key (may have #params). */
function getStatId(stat, gd) {
    const statName = stat.split('#')[0];
    return gd.itemStatCost[statName]?.id ?? 999;
}
/**
 * Write a single stat entry including any follow-up stats.
 */
function writeStat(writer, stats, stat, processed, gd) {
    const [statName, p1, p2] = stat.split('#');
    const itemStat = gd.itemStatCost[statName];
    if (!itemStat)
        return;
    writer.writeUInt16(itemStat.id, 9);
    processed.add(stat);
    const followCount = followStats[statName] || 0;
    for (let i = 0; i <= followCount; i++) {
        // Find the stat entry at id + i
        const entries = Object.entries(gd.itemStatCost);
        const found = entries.find(([, s]) => s.id === itemStat.id + i);
        if (!found)
            break;
        const [statName2, itemStat2] = found;
        const stat2 = i === 0 ? stat : [statName2, p1, p2].filter(Boolean).join('#');
        if (i > 0)
            processed.add(stat2);
        writeStatValue(writer, stats, stat2, statName, p1, p2, itemStat2, i > 0);
    }
}
/**
 * Write a single stat value (base or follow-up).
 */
function writeStatValue(writer, stats, stat, statName, p1, p2, itemStat, isFollowStat) {
    let value = Number(stats[stat] || 0);
    let param = 0;
    if (itemStat.saveparambits) {
        const statParam = !isFollowStat
            ? getStatParamAndValue(statName, p1, p2, value, stats, stat)
            : { param: Number(p1 || 0), value };
        param = statParam.param;
        value = statParam.value;
        writer.writeUInt32(param, itemStat.saveparambits);
    }
    if (itemStat.saveadd)
        value += itemStat.saveadd;
    if (itemStat.savebits) {
        writer.writeUInt32(value, itemStat.savebits);
    }
}
/**
 * Encode param + value for special stat types (skill-on-event, charged skill, etc).
 */
function getStatParamAndValue(statName, p1, p2, value, stats, statKey) {
    switch (statName) {
        case 'item_skillonattack':
        case 'item_skillonkill':
        case 'item_skillondeath':
        case 'item_skillonhit':
        case 'item_skillonlevelup':
        case 'item_skillongethit': {
            const skillId = Number(p1 || 0);
            const level = Number(p2 || 0);
            const chance = value;
            return { param: (skillId << 6) | (level & 0x3f), value: chance };
        }
        case 'item_charged_skill': {
            const param1 = Number(p1 || 0);
            const param2 = Number(p2 || 0);
            const charges = Number(stats[statKey] || 0);
            const maxCharges = Number(stats[statKey] || 0);
            return { param: (param1 << 6) | (param2 & 0x3f), value: (charges << 8) | (maxCharges & 0xff) };
        }
        case 'item_addskill_tab': {
            const tab = Number(p1 || 0);
            return { param: (Math.floor(tab / 3) << 3) | (tab % 3), value };
        }
        default:
            return { param: Number(p1 || 0), value };
    }
}
// ─── Helpers ────────────────────────────────────────────────────
/** Determine if an item should be written as "simple" (no complex stat block). */
function isItemSimple(item, types) {
    // Plain weapons/armor still need their level, durability and defense fields.
    if (types.has('weap') || types.has('armo')) return false;
    // Simple items: presetItemIds that aren't uniquified
    if (presetItemIds.has(item.base) && !item.unique)
        return true;
    // Items explicitly marked simple (quality 2 with no stats)
    if (item.quality === 2 && !item.unique && Object.keys(item.stats || {}).length === 0)
        return true;
    return false;
}
/** Write N zero bits. */
function writeZeroBits(writer, count) {
    for (let i = 0; i < count; i++) {
        writer.writeBit(0);
    }
}
/** Write socketed sub-items. */
function writeSocketedItems(writer, item, allItems, gd) {
    if (item.sockets > 0 && item.socketedItems) {
        for (const s of item.socketedItems) {
            const socketItem = allItems[s] ?? {
                itemId: 0,
                base: String(s),
                quality: 2,
                ilvl: 1,
                unidentified: false,
                ethereal: false,
                socketed: false,
                sockets: 0,
                socketedItems: [],
                stats: {},
                binaryOffset: { start: 0, end: 0 },
            };
            const socketLoc = { loc: 6, equip: 0, x: 0, y: 0, storage: 0 };
            const bytes = writeItem(socketItem, socketLoc, allItems, gd);
            writer.writeBytes(bytes, bytes.length * 8);
        }
    }
}
/** Find rare prefix/suffix IDs from a name string. */
function findRareNames(name, gd) {
    if (!name)
        return { rarePrefix: 0, rareSuffix: 0 };
    const [pName, sName] = name.split(' ', 2);
    let rarePrefix = 0;
    let rareSuffix = 0;
    for (const [id, v] of Object.entries(gd.rarePrefix)) {
        const resolvedName = gd.locale.strings[v.name] || v.name;
        if (resolvedName === pName) {
            rarePrefix = Number(id);
            break;
        }
    }
    for (const [id, v] of Object.entries(gd.rareSuffix)) {
        const resolvedName = gd.locale.strings[v.name] || v.name;
        if (resolvedName === sName) {
            rareSuffix = Number(id);
            break;
        }
    }
    return { rarePrefix, rareSuffix };
}
// ─── Convenience: build entries from a profile ──────────────────
/**
 * Build write entries from a profile's inventory layout (stash, inventory, cube, belt, body, merc).
 * This collects items from their slots and prepares them for writeItemList().
 */
export function buildWriteEntries(profile, allItems, gd, merc = false) {
    const entries = [];
    const socketed = new Set();
    // Collect socketed item IDs to exclude them from top-level entries
    for (const item of Object.values(allItems)) {
        if (item?.socketedItems) {
            for (const s of item.socketedItems) {
                if (!presetItemIds.has(String(s)))
                    socketed.add(s);
            }
        }
    }
    const push = (id, loc) => {
        if (id == null)
            return;
        if (socketed.has(id))
            return;
        const key = typeof id === 'number' ? id : id;
        if (allItems[key]) {
            entries.push({ item: { ...allItems[key], itemId: allItems[key].itemId }, location: loc });
        }
        else if (presetItemIds.has(String(id))) {
            entries.push({
                item: {
                    itemId: 0,
                    base: String(id),
                    quality: 2,
                    ilvl: 1,
                    unidentified: false,
                    ethereal: false,
                    socketed: false,
                    sockets: 0,
                    socketedItems: [],
                    stats: {},
                    binaryOffset: { start: 0, end: 0 },
                },
                location: loc,
            });
        }
    };
    const inventoryColumns = gd.info?.inventory?.columns || 10;
    const cubeColumns = gd.info?.cube?.columns || 3;
    const stashColumns = gd.info?.stash?.columns || 16;
    if (merc) {
        for (const slot in profile.mercItems || {}) {
            const id = profile.mercItems[slot];
            push(id, { loc: 1, equip: bodyLocMap[slot] || 0, x: bodyLocMap[slot] || 0, y: 0, storage: 0 });
        }
    }
    else {
        for (const slot in profile.items || {}) {
            const id = profile.items[slot];
            push(id, { loc: 1, equip: bodyLocMap[slot] || 0, x: bodyLocMap[slot] || 0, y: 0, storage: 0 });
        }
        (profile.inventory || []).forEach((id, i) => push(id, { loc: 0, equip: 0, x: i % inventoryColumns, y: (i / inventoryColumns) | 0, storage: 1 }));
        // cube: location=0, storage=4 (matches d2planner-HEAD: loc:0 storage:4)
        (profile.cube || []).forEach((id, i) => push(id, { loc: 0, equip: 0, x: i % cubeColumns, y: (i / cubeColumns) | 0, storage: 4 }));
        (profile.stash || []).forEach((id, i) => push(id, { loc: 0, equip: 0, x: i % stashColumns, y: (i / stashColumns) | 0, storage: 5 }));
        (profile.belt || []).forEach((id, i) => push(id, { loc: 2, equip: 0, x: i, y: 0, storage: 0 }));
    }
    return entries;
}
//# sourceMappingURL=item-writer.js.map
