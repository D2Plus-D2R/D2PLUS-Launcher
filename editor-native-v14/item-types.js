/**
 * Item type hierarchy — type checking and inheritance.
 *
 * Ported from d2planner/src/logic/itemTypes.js.
 * Provides:
 *  - isSubType(type, what) — recursive equiv1/equiv2 walk
 *  - itemGetTypes(id) — all types for an item (type + type2, extended)
 *  - presetItemIds — list of preset (stackable/consumable) item codes
 *
 * Uses GameData instead of global Data singleton.
 */
/**
 * Check whether `type` is a subtype of `what` (recursive via equiv1/equiv2 chains).
 */
export function isSubType(gd, type, what) {
    if (type === what)
        return true;
    const info = gd.itemTypes[type];
    if (!info)
        return false;
    return ((!!info.equiv1 && isSubType(gd, info.equiv1, what)) ||
        (!!info.equiv2 && isSubType(gd, info.equiv2, what)));
}
/**
 * Extend a Set<string> by adding `type` and all its equiv parents recursively.
 */
function extendType(gd, types, type) {
    if (types.has(type))
        return types;
    const info = gd.itemTypes[type];
    if (!info)
        return types;
    types.add(type);
    if (info.equiv1)
        extendType(gd, types, info.equiv1);
    if (info.equiv2)
        extendType(gd, types, info.equiv2);
    return types;
}
/**
 * Get the full set of types (including parent chain) for a given item by base code.
 */
export function itemGetTypes(gd, id) {
    const item = gd.items[id];
    const types = new Set();
    if (!item)
        return types;
    if (item.type)
        extendType(gd, types, item.type);
    if (item.type2) {
        extendType(gd, types, item.type2);
    }
    return types;
}
/**
 * Determine the item equipment "supertype" for quality-item matching.
 * Used for superior/runeword quality item lookup.
 */
export function itemGetType(types) {
    if (types.has('scep'))
        return 'scepter';
    if (types.has('wand'))
        return 'wand';
    if (types.has('staf'))
        return 'staff';
    if (types.has('miss'))
        return 'bow';
    if (types.has('shld'))
        return 'shield';
    if (types.has('boot'))
        return 'boots';
    if (types.has('glov'))
        return 'gloves';
    if (types.has('belt'))
        return 'belt';
    if (types.has('weap'))
        return 'weapon';
    if (types.has('armo'))
        return 'armor';
    return undefined;
}
/**
 * Preset item codes — items that are identified by their base code alone
 * (consumables, gems, runes, quest items, etc.).
 */
export const presetItemIds = new Set([
    'aqv', 'cqv', 'tbk', 'ibk', 'box',
    'gps', 'ops', 'gpm', 'opm', 'gpl', 'opl',
    'r01', 'r02', 'r03', 'r04', 'r05',
    'r06', 'r07', 'r08', 'r09', 'r10',
    'r11', 'r12', 'r13', 'r14', 'r15',
    'r16', 'r17', 'r18', 'r19', 'r20',
    'r21', 'r22', 'r23', 'r24', 'r25',
    'r26', 'r27', 'r28', 'r29', 'r30',
    'r31', 'r32', 'r33',
    '04r', '14r', '29r', '32r',
    'gcv', 'gfv', 'gsv', 'gzv', 'gpv',
    'gcy', 'gfy', 'gsy', 'gly', 'gpy',
    'gcb', 'gfb', 'gsb', 'glb', 'gpb',
    'gcg', 'gfg', 'gsg', 'glg', 'gpg',
    'gcr', 'gfr', 'gsr', 'glr', 'gpr',
    'gcw', 'gfw', 'gsw', 'glw', 'gpw',
    'skc', 'skf', 'sku', 'skl', 'skz',
    'vps', 'yps', 'wms',
    'tsc', 'isc', 'key',
    'hp1', 'hp2', 'hp3', 'hp4', 'hp5',
    'mp1', 'mp2', 'mp3', 'mp4', 'mp5',
    'rvs', 'rvl',
    'pk1', 'pk2', 'pk3', 'dhn', 'bey', 'mbr',
    'toa', 'tes', 'ceh', 'bet', 'fed',
    'xa1', 'xa2', 'xa3', 'xa4', 'xa5',
    'ua1', 'ua2', 'ua3', 'ua4', 'ua5',
    'cr1', 'cr2', 'cr3',
    'jwd', // Disenchanted Jewel (blizzless)
]);
/**
 * Check whether a mod/affix can be applied to an item.
 * Ported from d2planner/src/logic/item.js → itemCheckMod().
 */
export function itemCheckMod(gd, mod, item, types, quality) {
    if (mod.level > 99)
        return false;
    if (mod.sockets && !itemMaxSockets(gd, item))
        return false;
    if (mod.armor != null) {
        return true;
    }
    if (mod.input1) {
        const p = mod.input1.split(',');
        const o = mod.output?.split(',');
        if (p.includes('sock'))
            return false;
        const q = o?.includes('usetype') ? o : p;
        if (q.includes('nor') && quality !== 2)
            return false; // NORMAL
        if (q.includes('hiq') && quality !== 3)
            return false; // SUPERIOR
        if (q.includes('low') && quality !== 1)
            return false; // LOW
        if (q.includes('mag') && quality !== 4 && quality !== 8)
            return false; // MAGIC or CRAFTED
        if (q.includes('rar') && quality !== 6)
            return false; // RARE
        if (q.includes('uni') && quality !== 7)
            return false; // UNIQUE
        if (q.includes('set') && quality !== 5)
            return false; // SET
        if (q.includes('crf') && quality !== 8)
            return false; // CRAFTED
        if (p.includes('upg')) {
            if (item.normcode !== p[0] && item.ubercode !== p[0] && item.ultracode !== p[0])
                return false;
        }
        else {
            if (item.code !== p[0] && !types.has(p[0]))
                return false;
        }
    }
    else {
        if (mod.classspecific) {
            const type = gd.itemTypes[item.type];
            if (type?.class && type.class !== mod.classspecific)
                return false;
        }
        const itypes = [mod.itype1, mod.itype2, mod.itype3, mod.itype4, mod.itype5, mod.itype6, mod.itype7];
        if (!itypes.some(t => t && types.has(t)))
            return false;
        const etypes = [mod.etype1, mod.etype2, mod.etype3, mod.etype4, mod.etype5];
        if (etypes.some(t => t && types.has(t)))
            return false;
        if (!mod.rare && (quality === 6 || quality === 8))
            return false; // RARE or CRAFTED
    }
    return true;
}
/**
 * Get max sockets for a base item (accounting for quality).
 */
export function itemMaxSockets(gd, base, quality) {
    if (!base || !base.hasinv)
        return 0;
    const type = gd.itemTypes[base.type];
    if (!type)
        return 0;
    const maxsockets = Math.min(base.gemsockets, type.maxsock40, base.invwidth * base.invheight);
    switch (quality) {
        case 4: // MAGIC
            return Math.min(2, maxsockets);
        case 6: // RARE
        case 5: // SET
        case 7: // UNIQUE
        case 8: // CRAFTED
            return Math.min(1, maxsockets);
        default:
            return maxsockets;
    }
}
//# sourceMappingURL=item-types.js.map