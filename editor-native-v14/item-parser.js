/**
 * Item binary parser — reads items from D2R v105 save files.
 *
 * Ported from d2planner/src/logic/binary/index.js → createItemParser().
 * Simplified: Blizzless v105 only (D2R=true, V105=true, version=105).
 *
 * Uses GameData instead of global Data singleton.
 */
import { itemGetTypes, isSubType, presetItemIds } from './item-types.js';
import { parseParamStats, parseUniqueStats as parseUniqueStatsHelper, parseRunewordStats as parseRunewordStatsHelper, parseModStats as parseModStatsHelper, } from './item-stats-parser.js';
// ─── Constants ──────────────────────────────────────────────────
/** Maps the 4-bit quality field from the binary format to our Quality enum values. */
export const gameQualityMap = [0, 1, 2, 3, 4, 5, 6, 7, 8];
// Index:                     0  1  2  3  4  5  6  7  8
// Quality: none, LOW, NORMAL, SUPERIOR, MAGIC, SET, RARE, UNIQUE, CRAFTED
const QUALITY_LOW = 1;
const QUALITY_NORMAL = 2;
const QUALITY_SUPERIOR = 3;
const QUALITY_MAGIC = 4;
const QUALITY_SET = 5;
const QUALITY_RARE = 6;
const QUALITY_UNIQUE = 7;
const QUALITY_CRAFTED = 8;
const QUALITY_RUNEWORD = 9;
/** Maps body slot indices to slot names. */
const bodyMap = [
    null, 'head', 'neck', 'tors', 'rarm', 'larm',
    'rrin', 'lrin', 'belt', 'feet', 'glov', 'rarm2', 'larm2',
];
/** Zero-pad a number to 3 digits (for mod IDs like "mp001"). */
function mkid(n) {
    return n.toString().padStart(3, '0');
}
/**
 * Blizzless mod custom runewords whose in-game stored ID falls OUTSIDE the vanilla Eye() ranges
 * handled below, so the range-offset mapping would leave them unmapped (→ dropped as "unknown
 * runeword"). Map the raw stored ID → runes.json index explicitly. Extend as more custom runewords
 * are confirmed from real saves (read the raw `bits(12)` value the game stores, map it to the
 * `runeword###` key `runesToJson` derives from that runeword's `Runeword###` name).
 *   1396 → 325: "Nightfall" (Runeword300, El+Zod, necro head).
 */
const CUSTOM_RUNEWORD_IDS = {
    1396: 325,
    3749: 211, // D2PlusRuneword004: Shael + Xith + Tal, verified on Tanadyn
};
/**
 * Stats followed by N consecutive stat IDs in the binary stream.
 * (e.g. item_maxdamage_percent followed by 1 stat, coldmindam by 2.)
 */
const followStats = {
    item_maxdamage_percent: 1,
    firemindam: 1,
    lightmindam: 1,
    magicmindam: 1,
    coldmindam: 2,
    poisonmindam: 2,
};
// ─── extractValuesFromStats (fallback for unique/set/runeword) ──
/**
 * Build a `uniqueValues` array by walking a unique/set/runeword definition
 * and filling each `prop_i` slot from the item's actual binary stats.
 *
 * Used as a fallback when parseUniqueStats / parseRunewordStats can't solve.
 * For propertyGroups (pg) props, the picked option index is captured in
 * `propertyIndex[propName]` so the writer / tooltip can recover the option.
 */
function extractValuesFromStats(gd, def, codeKey, maxKey, binaryStats) {
    if (!def)
        return null;
    const result = [];
    const propertyIndex = {};
    for (let i = 1; i <= 12; i++) {
        const prop = def[codeKey + i];
        if (!prop)
            continue;
        const pg = gd.propertyGroups?.[prop];
        if (pg) {
            let foundOptIdx = 0;
            let foundValue = def[maxKey + i] ?? 0;
            for (let j = 1; gd.mods[`${prop}:${j}`]; j++) {
                const m = gd.mods[`${prop}:${j}`];
                const baseStat = gd.properties[m.mod1code]?.stat1;
                const key = m.mod1param != null ? `${baseStat}#${m.mod1param}` : baseStat;
                if (baseStat && key != null && binaryStats[key] != null) {
                    foundOptIdx = j - 1;
                    const raw = binaryStats[key];
                    foundValue = typeof raw === 'object'
                        ? (raw.min + raw.max) >> 1
                        : raw;
                    break;
                }
            }
            propertyIndex[prop] = foundOptIdx;
            result.push(foundValue);
            continue;
        }
        const statName = gd.properties[prop]?.stat1;
        const tmax = def[maxKey + i] ?? 0;
        let val = (statName && binaryStats[statName] != null
            ? binaryStats[statName]
            : tmax);
        val = typeof val === 'object'
            ? ((val.min + val.max) >> 1)
            : val;
        result.push(tmax > 0 ? Math.min(val, tmax) : val);
    }
    return { values: result, propertyIndex };
}
// ─── Stat helper ────────────────────────────────────────────────
/**
 * Add a stat value to the stats accumulator.
 * Handles special cases: skill-on-event encoding, addclass/single/aura skill params, enhanced damage max.
 */
function addStat(stats, stat, param, value) {
    let param2;
    switch (stat) {
        case 'item_skillonattack':
        case 'item_skillonkill':
        case 'item_skillondeath':
        case 'item_skillonhit':
        case 'item_skillonlevelup':
        case 'item_skillongethit':
            param2 = param & 63;
            param = param >> 6;
            stat = `${stat}#${param}#${param2}`;
            break;
        case 'item_charged_skill':
            value = value >> 8;
            param2 = param & 63;
            param = param >> 6;
            stat = `${stat}#${param}#${param2}`;
            break;
        case 'item_addclassskills':
        case 'item_nonclassskill':
        case 'state':
        case 'item_singleskill':
        case 'item_elemskill':
        case 'item_aura':
        case 'item_reanimate':
            stat = `${stat}#${param}`;
            break;
        case 'item_addskill_tab':
            param = (param >> 3) * 3 + (param & 7);
            stat = `${stat}#${param}`;
            break;
    }
    // Enhanced damage workaround: follow stats can read item_mindamage_percent
    // twice; summing would double-count. Use Math.max.
    if (stat === 'item_mindamage_percent' || stat === 'item_maxdamage_percent') {
        stats[stat] = Math.max(stats[stat] || 0, value);
        return;
    }
    stats[stat] = (stats[stat] || 0) + value;
}
// ─── createItemParser ───────────────────────────────────────────
/**
 * Create a parser context for reading items from a BinaryReader.
 * V105 only — no version branching.
 *
 * @param reader    BinaryReader positioned before item data
 * @param gd        GameData instance
 * @param initialId Starting item ID (default 0)
 * @param options   Parser options
 */
export function createItemParser(reader, gd, initialId = 0, options) {
    const forceStackable = options?.forceStackable ?? false;
    const items = {};
    let itemId = initialId;
    let listError = null;
    // Build stat map: numeric id → stat key
    const statMap = new Map();
    for (const key in gd.itemStatCost) {
        statMap.set(gd.itemStatCost[key].id, key);
    }
    function getStatInfo(stat) {
        return gd.itemStatCost[stat] || {};
    }
    function itemTypeTreeFilter(type) {
        const tradeableTypes = [
            'helm', 'tors', 'glov', 'boot', 'belt', 'shld',
            'amul', 'ring', 'jewl', 'char',
            'mele', 'miss', 'orb', 'comb',
        ];
        return tradeableTypes.some(t => isSubType(gd, type, t));
    }
    const inventoryColumns = gd.info?.inventory?.columns || 10;
    const cubeColumns = gd.info?.cube?.columns || 3;
    const stashColumns = gd.info?.stash?.columns || 16;
    function parseItem(idIn, handler) {
        const startBit = reader.bitpos;
        // ── Flags (35 bits, D2R v105) ─────────────────────────────
        reader.skipbits(4);
        const unidentified = !reader.bits(1);
        reader.skipbits(6);
        const socketed = !!reader.bits(1);
        reader.skipbits(4);
        const ear = !!reader.bits(1);
        reader.skipbits(4);
        const simple = !!reader.bits(1);
        const ethereal = !!reader.bits(1);
        reader.skipbits(1);
        const personalized = !!reader.bits(1);
        reader.skipbits(1);
        const runeword = !!reader.bits(1);
        // D2R: 1 unk + 1 extras flag + 6 unk
        reader.skipbits(1);
        const extras = reader.bits(1);
        reader.skipbits(6);
        const item = {
            itemId: typeof idIn === 'number' ? idIn : 0,
            unidentified,
            ethereal,
            socketed,
            sockets: 0,
            socketedItems: [],
            stats: {},
            binaryOffset: { start: startBit, end: 0 },
        };
        // ── Location ──────────────────────────────────────────────
        const location = reader.bits(3);
        const bodyloc = reader.bits(4);
        const invcol = reader.bits(4);
        const invrow = reader.bits(4);
        const storage = reader.bits(3);
        // ── Ear item ──────────────────────────────────────────────
        if (ear) {
            const earClass = reader.bits(3);
            const earLevel = reader.bits(7);
            const nameBytes = [];
            let ch;
            while ((ch = reader.bits(7)))
                nameBytes.push(ch);
            const earName = String.fromCharCode(...nameBytes);
            item.ear = { class: earClass, level: earLevel, name: earName };
            item.base = 'ear';
            item.quality = QUALITY_NORMAL;
            reader.align();
            item.binaryOffset.end = reader.bitpos;
            const earId = typeof idIn === 'number' ? idIn : 0;
            items[earId] = item;
            emitLocation(earId, location, bodyloc, storage, invrow, invcol, item, handler);
            return;
        }
        // ── Item code (Huffman: 3 letters + space) ────────────────
        const basea = reader.char();
        const baseb = reader.char();
        const basec = reader.char();
        const based = reader.char();
        if (based !== ' ')
            throw Error(`invalid item code`);
        const baseId = basea + baseb + basec;
        // Unknown bases are tolerated (parsed as generic) to match d2planner-HEAD.
        item.base = baseId;
        const base = (gd.items[baseId] || {});
        let socketedItemsCount = 0;
        if (simple) {
            // Compact quest items save a difficulty field before the realm flag.
            item.compact = true;
            if(base.quest && base.questdiffcheck)item.questDifficulty=reader.bits(gd.itemStatCost.questitemdifficulty.savebits);
            if(reader.bits(1))reader.skipbits(128);
            item.quality = QUALITY_NORMAL;
        }
        else {
            socketedItemsCount = reader.bits(3);
            const types = itemGetTypes(gd, baseId);
            // Persistent 32-bit D2 item id (GUID). `bits(32)` needs `>>> 0` because the accumulator is a
            // signed int32, so a high-bit-set value would come out negative. Same bit-advance as the old
            // `skipbits(32)`, so parser alignment is unchanged.
            item.guid = reader.bits(32) >>> 0; // item ID (persistent GUID)
            item.ilvl = reader.bits(7);
            const qualityRaw = gameQualityMap[reader.bits(4)];
            item.quality = runeword ? QUALITY_RUNEWORD : qualityRaw;
            if (reader.bits(1)) {
                item.iconIndex = reader.bits(3);
            }
            const mods = [];
            if (reader.bits(1)) {
                mods.push(`am${mkid(reader.bits(11))}`);
            }
            let modid;
            switch (qualityRaw) {
                case QUALITY_LOW:
                    reader.skipbits(3);
                    break;
                case QUALITY_NORMAL:
                    if (types.has('char'))
                        reader.skipbits(12);
                    break;
                case QUALITY_SUPERIOR:
                    mods.push(`qm${mkid(reader.bits(3))}`);
                    mods.pop(); // too many mismatches (mirrors d2planner)
                    break;
                case QUALITY_MAGIC: {
                    const p = reader.bits(11);
                    if (p) {
                        const c = `mp${mkid(p)}`;
                        mods.push(c);
                        item.magicPrefixCode = c;
                        (item.prefixCodes ??= []).push(c);
                    }
                    const s = reader.bits(11);
                    if (s) {
                        const c = `ms${mkid(s)}`;
                        mods.push(c);
                        item.magicSuffixCode = c;
                        (item.suffixCodes ??= []).push(c);
                    }
                    break;
                }
                case QUALITY_SET:
                    item.unique = `set${mkid(reader.bits(12))}`;
                    break;
                case QUALITY_UNIQUE:
                    item.unique = `unique${mkid(reader.bits(12))}`;
                    break;
                case QUALITY_RARE:
                case QUALITY_CRAFTED: {
                    const name1 = gd.rarePrefix[reader.bits(8) - 156]?.name;
                    const name2 = gd.rareSuffix[reader.bits(8) - 1]?.name;
                    item.name = `${gd.locale.strings[name1] || name1 || ''} ${gd.locale.strings[name2] || name2 || ''}`.trim();
                    // Up to 3 prefix + 3 suffix affix ids, interleaved. Capture every one into ordered
                    // code arrays so the backend can fill the Prefix/Suffix NAME slots (the stats stay flat
                    // in lot.mods — affixes are never re-attributed). magicPrefix/SuffixCode stay unset for
                    // rares (multi-affix), so single-code consumers must read prefixCodes/suffixCodes.
                    const pushPrefix = () => { const c = `mp${mkid(reader.bits(11))}`; mods.push(c); (item.prefixCodes ??= []).push(c); };
                    const pushSuffix = () => { const c = `ms${mkid(reader.bits(11))}`; mods.push(c); (item.suffixCodes ??= []).push(c); };
                    if (reader.bits(1))
                        pushPrefix();
                    if (reader.bits(1))
                        pushSuffix();
                    if (reader.bits(1))
                        pushPrefix();
                    if (reader.bits(1))
                        pushSuffix();
                    if (reader.bits(1))
                        pushPrefix();
                    if (reader.bits(1))
                        pushSuffix();
                    break;
                }
            }
            if (runeword) {
                let rwid = reader.bits(12);
                item.nativeRunewordId = rwid;
                item.nativeRunewordExtra = reader.bits(4);
                const fullId = rwid | (item.nativeRunewordExtra << 12);
                const canonical = Object.entries(gd.runes).find(([, row]) => row.nativefullid === fullId)?.[0];
                // Eye() mapping (maxroll): stored D2S runeword ID → sequential index.
                if (rwid === 2718)
                    rwid = 48;
                // Blizzless mod custom runewords with IDs outside the vanilla ranges (e.g. Nightfall=1396).
                else if (CUSTOM_RUNEWORD_IDS[rwid] != null)
                    rwid = CUSTOM_RUNEWORD_IDS[rwid];
                else if (rwid > 3194)
                    rwid -= 3194;
                else if (rwid > 2869)
                    rwid -= 2869;
                else if (rwid > 2588)
                    rwid -= 2588;
                item.unique = canonical ?? `runeword${mkid(rwid)}`;
            }
            if (personalized) {
                const bytes = [];
                let chr;
                while ((chr = reader.bits(8)))
                    bytes.push(chr);
                item.personalized = String.fromCharCode(...bytes);
            }
            if (types.has('book')) {
                reader.skipbits(5);
            }
            // D2R extended section flag
            if (reader.bits(1)) {
                reader.skipbits(types.has('misc') ? 128 : 3);
            }
            // ── Armor defense ─────────────────────────────────────
            if (types.has('armo')) {
                let minac = reader.bits(11) - 10;
                let maxac = minac;
                if (item.ethereal) {
                    minac = Math.ceil(minac / 1.5);
                    maxac = Math.ceil((maxac + 1) / 1.5) - 1;
                }
                const baseMaxAc = 'maxac' in base ? base.maxac : 0;
                const baseMinAc = 'minac' in base ? base.minac : 0;
                if (minac <= baseMaxAc + 1 && maxac >= baseMinAc) {
                    item.defense = (Math.max(minac, baseMinAc) + Math.min(maxac, baseMaxAc + 1)) >> 1;
                }
                else {
                    const minac2 = Math.ceil(minac / 1.5);
                    const maxac2 = Math.ceil((maxac + 1) / 1.5) - 1;
                    if (minac <= baseMaxAc && maxac >= baseMinAc) {
                        item.defense = (Math.max(minac2, baseMinAc) + Math.min(maxac2, baseMaxAc)) >> 1;
                        item.ethbugged = true;
                    }
                    else {
                        item.defense = (minac + maxac) >> 1;
                    }
                }
            }
            // ── Durability ────────────────────────────────────────
            if (types.has('weap') || types.has('armo')) {
                if (reader.bits(8))
                    reader.skipbits(9);
            }
            // ── V105 pre-stats quantity (1-bit flag + 9-bit value) ─
            if (reader.bits(1)) {
                item.quantity = reader.bits(9);
            }
            else if (forceStackable && !types.has('ques')) {
                // legacy fixture path — V105 never enters here
            }
            if (socketed)
                item.sockets = reader.bits(4);
            // ── Set flags ─────────────────────────────────────────
            const setflags = (qualityRaw === QUALITY_SET ? reader.bits(5) : 0);
            if (setflags)
                item.setflags = setflags;
            // ── Stats ─────────────────────────────────────────────
            const stats = {};
            function parseStats(target = stats) {
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    let id = reader.bits(9);
                    if (id === 511)
                        break;
                    const stat = statMap.get(id);
                    if (!stat)
                        throw Error(`unknown item stat code ${id}`);
                    const info = getStatInfo(stat);
                    if (!info)
                        throw Error(`unknown item stat code ${id}`);
                    const param = info.saveparambits ? reader.bits(info.saveparambits) : 0;
                    const value = reader.bits(info.savebits ?? 0) - (info.saveadd || 0);
                    addStat(target, stat, param, value);
                    let follow = followStats[stat] || 0;
                    while (follow--) {
                        const followStat = statMap.get(++id);
                        if (!followStat)
                            break;
                        const followInfo = getStatInfo(followStat) || {};
                        const followParam = followInfo.saveparambits ? reader.bits(followInfo.saveparambits) : 0;
                        const followValue = reader.bits(followInfo.savebits ?? 0) - (followInfo.saveadd || 0);
                        addStat(target, followStat, followParam, followValue);
                    }
                }
            }
            parseStats();
            if (qualityRaw === QUALITY_SET) {
                item.setBonusStats = Array.from({length: 5}, () => ({}));
                for (let bit = 0; bit < 5; bit++) if (setflags & (1 << bit)) parseStats(item.setBonusStats[bit]);
            }
            if (runeword) {
                item.savedBaseStats = { ...stats };
                item.savedRunewordStats = {};
                parseStats(item.savedRunewordStats);
                for (const [key,value] of Object.entries(item.savedRunewordStats)) {
                    stats[key] = key === 'item_mindamage_percent' || key === 'item_maxdamage_percent'
                        ? Math.max(stats[key] || 0, value) : (stats[key] || 0) + value;
                }
            }
            // Damage stat consolidation
            if (stats.mindamage || stats.secondary_mindamage || stats.item_throw_mindamage) {
                stats.mindamage = Math.max(...[stats.mindamage, stats.secondary_mindamage, stats.item_throw_mindamage].filter(Boolean));
                delete stats.secondary_mindamage;
                delete stats.item_throw_mindamage;
            }
            if (stats.maxdamage || stats.secondary_maxdamage || stats.item_throw_maxdamage) {
                stats.maxdamage = Math.max(...[stats.maxdamage, stats.secondary_maxdamage, stats.item_throw_maxdamage].filter(Boolean));
                delete stats.secondary_maxdamage;
                delete stats.item_throw_maxdamage;
            }
            item.stats = stats;
            // ── Resolve mod sources ───────────────────────────────
            const getStats = (src) => parseParamStats(gd, stats, src);
            if (item.quality === QUALITY_SET || item.quality === QUALITY_UNIQUE) {
                const parsed = parseUniqueStatsHelper(gd, item, getStats);
                if (parsed) {
                    item.uniqueValues = parsed.uniqueValues;
                    if (parsed.propertyIndex && Object.keys(parsed.propertyIndex).length) {
                        item.propertyIndex = parsed.propertyIndex;
                    }
                }
                else {
                    const def = (gd.uniqueItems[item.unique] || gd.setItems[item.unique]);
                    const extracted = extractValuesFromStats(gd, def, 'prop', 'max', stats);
                    if (extracted) {
                        item.uniqueValues = extracted.values;
                        if (Object.keys(extracted.propertyIndex).length)
                            item.propertyIndex = extracted.propertyIndex;
                    }
                }
            }
            else if (item.quality === QUALITY_RUNEWORD) {
                const parsed = parseRunewordStatsHelper(gd, item, null, getStats, mods);
                if (parsed) {
                    Object.assign(item, parsed);
                }
                else {
                    const def = gd.runes[item.unique];
                    const extracted = extractValuesFromStats(gd, def, 't1code', 't1max', stats);
                    if (extracted)
                        item.uniqueValues = extracted.values;
                }
            }
            else {
                // Type-mismatch guard: if any magic prefix/suffix is unknown or out of
                // type tree, skip the solver (it'd otherwise yield garbage) and mark custom.
                const hasMismatch = mods.some(mid => {
                    const isPfx = mid.startsWith('mp'), isSfx = mid.startsWith('ms');
                    if (!isPfx && !isSfx)
                        return false;
                    const modDef = isPfx
                        ? gd.magicPrefix[mid]
                        : gd.magicSuffix[mid];
                    if (!modDef)
                        return true;
                    const itypes = [modDef.itype1, modDef.itype2, modDef.itype3, modDef.itype4]
                        .filter(Boolean);
                    return itypes.length > 0 && !itypes.some(t => types.has(t));
                });
                if (hasMismatch) {
                    item.mods = {};
                    item.custom = true;
                }
                else {
                    // The brute-force affix solver can THROW on Blizzless data (e.g. a missing mod table
                    // like `crafted`, or an unhandled staffmod). A throw here used to abort the WHOLE
                    // item list (one bad item hid every item after it). Treat any solver failure as
                    // "unsolved" → the item keeps its raw stats (the backend rebuilds mods from those),
                    // it just isn't marked with reconstructed affixes.
                    let parsed = null;
                    try {
                        parsed = parseModStatsHelper(gd, item, null, null, null, getStats, mods);
                    }
                    catch {
                        parsed = null;
                    }
                    if (parsed) {
                        Object.assign(item, parsed);
                    }
                    else {
                        item.mods = mods.length ? {} : undefined;
                        if (Object.keys(stats).length)
                            item.custom = true;
                    }
                }
            }
            // Blunt weapon undead damage bonus
            if (types.has('blun')) {
                stats.item_undeaddamage_percent = (stats.item_undeaddamage_percent || 0) + 50;
            }
        }
        // ── Post-stats: D2R extras + chronicle + V105 quantity ───
        if (extras) {
            // Blizzless D2R "extras" block: a fixed 52-bit field whose bit 48 flags whether a 64-bit
            // chronicle-tracking record (a "found/identified by" stamp) follows. The chronicle's presence
            // is governed ONLY by that flag — NOT by quality or identified status: an unidentified misc
            // unique can carry it while an identified armor unique does not. The old "skip 64 for every
            // SET/UNIQUE/RUNEWORD" heuristic over-consumed 64 bits whenever the flag was 0, silently
            // misaligning EVERY following item in the list — later items were read as garbage or dropped
            // (e.g. an unidentified Eschuta's Temper vanishing from the save import). Verified against
            // real saves: the flag predicts 52 vs 116 bits for every observed extras=1 item.
            reader.skipbits(48);
            const hasChronicle = reader.bits(1); // bit 48 of the 52-bit extras block
            reader.skipbits(3); // remainder of the extras block
            if (hasChronicle)
                reader.skipbits(64);
        }
        // V105: post-stats quantity (1-bit flag + 8-bit value).
        if (reader.bits(1))
            item.stackQuantity = reader.bits(8);
        if(item.stackQuantity && !item.quantity)item.quantity=item.stackQuantity;
        reader.align();
        item.binaryOffset.end = reader.bitpos;
        // ── Socketed sub-items (recursive) ────────────────────────
        if (socketedItemsCount > 0) {
            item.socketedItems = [];
            for (let i = 0; i < socketedItemsCount; ++i) {
                parseItem(itemId++, (sockId) => {
                    // Preset items (runes/gems) emit their base code as id; non-preset
                    // sub-items emit numeric ids. Both are valid.
                    item.socketedItems.push(sockId);
                });
            }
        }
        // ── Validate / store / emit ───────────────────────────────
        if (item.unique && !(gd.uniqueItems[item.unique] || gd.setItems[item.unique] || gd.runes[item.unique])) {
            // Unknown unique/set/runeword: drop without registering, but the stream
            // has already been consumed correctly via socketed-item recursion above.
            return;
        }
        let effectiveId = idIn;
        if (presetItemIds.has(item.base) && !item.unique) {
            // Preset items (runes, gems, potions, etc.) are keyed by their base code
            // so the items dict can identify them by type. This matches the d2r-saver
            // convention and lets callers find e.g. r01 via items['r01'].
            // D2PLUS: keep a distinct key per instance (books and stacks may
            // share a base code but differ in quantity or socket placement).
            effectiveId = idIn;
            items[effectiveId] = item;
        }
        else if (gd.items[item.base] ||
            item.unique ||
            location === 6) {
            items[effectiveId] = item;
        }
        else {
            return;
        }
        emitLocation(effectiveId, location, bodyloc, storage, invrow, invcol, item, handler);
    }
    function emitLocation(id, location, bodyloc, storage, invrow, invcol, item, handler) {
        switch (location) {
            case 0:
            case 4: // Blizzless: crafting materials (e.g. Ingot) use location 4 with storage 5
                if (storage === 1)
                    handler(id, 'inventory', invrow * inventoryColumns + invcol, item);
                if (storage === 4)
                    handler(id, 'cube', invrow * cubeColumns + invcol, item);
                if (storage === 5)
                    handler(id, 'stash', invrow * stashColumns + invcol, item);
                break;
            case 1:
                if (bodyMap[bodyloc])
                    handler(id, 'body', bodyMap[bodyloc], item);
                break;
            case 2:
                handler(id, 'belt', invcol, item);
                break;
            case 6:
                handler(id);
                break;
        }
    }
    function parseItemList(handler) {
        if (reader.read16() !== 0x4d4a)
            throw Error('invalid item table header');
        const count = reader.read16();
        for (let i = 0; i < count; ++i) {
            try {
                parseItem(itemId++, handler);
            }
            catch (e) {
                throw Error(`item ${i + 1}/${count}: ${e.message}`);
            }
        }
    }
    function nextId() {
        return itemId++;
    }
    return {
        parseItem,
        parseItemList,
        items,
        nextId,
        get currentId() { return itemId; },
        get error() { return listError; },
    };
}
//# sourceMappingURL=item-parser.js.map
