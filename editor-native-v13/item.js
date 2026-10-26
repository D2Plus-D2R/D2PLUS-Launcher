/**
 * Item stat computation — computing stats from mods, properties, gems, etc.
 *
 * Ported from d2planner/src/logic/item.js.
 * Provides: addProp, modsToStats, uniqueStats, runewordStats, gemStats, formatStr, addValues.
 *
 * Uses GameData instead of global Data singleton.
 */
import { isSubType, itemMaxSockets } from './item-types.js';
/**
 * Format a localized string template with positional %d/%s/%i/%N replacements.
 */
export function formatStr(fmt, ...values) {
    if (fmt == null)
        return '';
    let i = 0;
    return fmt.replace(/%(\+)?([ids%\d])/g, (_m, plus, chr) => {
        if (chr === '%')
            return chr;
        let value = (chr === 'd' || chr === 's' || chr === 'i')
            ? values[i++]
            : values[parseInt(chr)];
        if (plus && !isNaN(value) && parseInt(value) > 0) {
            value = '+' + value;
        }
        return String(value);
    });
}
/**
 * Add two stat values (numbers or ranges), returning the sum.
 */
export function addValues(dst, src) {
    const dobj = dst != null && typeof dst === 'object';
    const sobj = src != null && typeof src === 'object';
    if (dobj || sobj) {
        if (dst == null)
            return src != null ? { ...src } : undefined;
        if (src == null)
            return dst;
        const d = dobj ? dst : { min: dst, max: dst };
        if (sobj) {
            const s = src;
            d.min += s.min;
            d.max += s.max;
        }
        else {
            d.min += src;
            d.max += src;
        }
        return d;
    }
    else if (dst != null) {
        return dst + (src || 0);
    }
    else {
        return src;
    }
}
// ─── addProp ────────────────────────────────────────────────────
/**
 * Apply a property (from Properties.txt) to the stats object.
 * Ported from d2planner addProp().
 */
export function addProp(gd, stats, id, param, min, max, value, item) {
    // propertyGroups: id refers to a group (e.g. "skilltab-war"). Expand it to
    // the concrete picked option from `item.propertyIndex` (parser-recovered)
    // or default to option 1, then recurse with the resolved mod's mod1code.
    const pg = id && gd.propertyGroups?.[id];
    if (pg) {
        // Value-based pg pick template (e.g. "{0}" or "{1}") — preserve as marker.
        if (typeof value === 'string' && /{(\d+)}/.test(value)) {
            const m = value.match(/{(\d+)}/);
            stats[`pgpick#${m[1]}`] = 1;
            return;
        }
        const optIdx = item?.propertyIndex?.[id] ?? (typeof value === 'number' ? Math.round(value) : 0);
        const mod = gd.mods[`${id}:${optIdx + 1}`];
        if (mod) {
            const statValue = item?.propertyIndex != null && typeof value === 'number'
                ? value
                : mod.mod1max;
            addProp(gd, stats, mod.mod1code, mod.mod1param, mod.mod1min, mod.mod1max, statValue, item);
        }
        return;
    }
    const prop = gd.properties[id];
    if (!prop)
        return;
    const ilvl = item?.ilvl ?? 99;
    const base = item?.base;
    let last = 0;
    function addStat(stat, p, v) {
        last = v;
        if (p != null)
            stat = `${stat}#${p}`;
        if (stat === 'item_numsockets' && !isNaN(v) && item && base) {
            const baseItem = gd.items[base];
            if (baseItem) {
                v = Math.min(v, itemMaxSockets(gd, baseItem));
            }
        }
        stats[stat] = addValues(stats[stat], v);
        if (stat === 'poisonlength') {
            stats.poison_count = (stats.poison_count || 0) + 1;
        }
    }
    function statFunc(set, val, func, stat) {
        switch (func) {
            case 3:
                addStat(stat, null, last);
                break;
            case 5:
                addStat('mindamage', null, value);
                break;
            case 6:
                addStat('maxdamage', null, value);
                break;
            case 7:
                if (!isNaN(value)) {
                    const baseItem = base ? gd.items[base] : undefined;
                    if (baseItem && isSubType(gd, baseItem.type, 'weap') &&
                        (baseItem['2handmaxdam'] || baseItem.maxdam || 0) * value < 100) {
                        addStat('maxdamage', null, 1);
                    }
                    else {
                        addStat('item_mindamage_percent', null, value);
                        addStat('item_maxdamage_percent', null, value);
                    }
                }
                else {
                    addStat('item_mindamage_percent', null, value);
                    addStat('item_maxdamage_percent', null, value);
                }
                break;
            case 10:
                addStat(stat, param, value);
                break;
            case 11:
                if (max === 0) {
                    const skill = gd.skills[param];
                    const reqlvl = skill?.reqlevel ?? 0;
                    const calcMax = Math.round((ilvl - reqlvl + 1) / 3.9);
                    addStat(stat, `${param}#${Math.max(1, Math.min(63, calcMax))}`, min);
                }
                else {
                    addStat(stat, `${param}#${max}`, min);
                }
                break;
            case 12:
                addStat(stat, `${param}#x`, value);
                break;
            case 14:
                addStat(stat, null, param != null ? param : value);
                break;
            case 15:
                addStat(stat, null, min);
                break;
            case 16:
                addStat(stat, null, max);
                break;
            case 17:
                addStat(stat, null, param != null ? param : value);
                break;
            case 19:
                if (min < 0 && max < 0 && gd.skills[param]) {
                    const skill = gd.skills[param];
                    const reqlvl = skill.reqlevel ?? 0;
                    const slvl = Math.max(1, Math.floor((ilvl - reqlvl) / Math.floor((99 - reqlvl) / (-max))));
                    const charges = Math.floor(-min * slvl / 8) + (-min);
                    addStat(stat, `${param}#${slvl}`, charges);
                }
                else {
                    addStat(stat, `${param}#${max}`, min);
                }
                break;
            case 20:
                stats.item_indesctructible = 1;
                break;
            case 21:
                addStat(stat, val, value);
                break;
            case 22:
            case 24:
                addStat(stat, param, value);
                break;
            case 23:
                stats.item_ethereal = 1;
                break;
            case 36:
                addStat(stat, `${val}#x`, value);
                break;
            default:
                addStat(stat, null, set == null ? value : set);
                break;
        }
    }
    const p = prop;
    if (p.func1)
        statFunc(p.set1, p.val1, p.func1, p.stat1);
    if (p.func2)
        statFunc(p.set2, p.val2, p.func2, p.stat2);
    if (p.func3)
        statFunc(p.set3, p.val3, p.func3, p.stat3);
    if (p.func4)
        statFunc(p.set4, p.val4, p.func4, p.stat4);
    if (p.func5)
        statFunc(p.set5, p.val5, p.func5, p.stat5);
    if (p.func6)
        statFunc(p.set6, p.val6, p.func6, p.stat6);
    if (p.func7)
        statFunc(p.set7, p.val7, p.func7, p.stat7);
}
// ─── modsToStats ────────────────────────────────────────────────
/**
 * Compute stats from a set of mods (affix id → array of values).
 * Ported from d2planner modsToStats().
 */
export function modsToStats(gd, stats, mods, item) {
    function addMod(mod, values) {
        const affix = gd.mods[mod];
        if (!affix)
            return;
        const a = affix;
        if (a.mod1code)
            addProp(gd, stats, a.mod1code, a.mod1param, a.mod1min, a.mod1max, values[0], item);
        if (a.mod2code)
            addProp(gd, stats, a.mod2code, a.mod2param, a.mod2min, a.mod2max, values[1], item);
        if (a.mod3code)
            addProp(gd, stats, a.mod3code, a.mod3param, a.mod3min, a.mod3max, values[2], item);
        if (a.mod4code)
            addProp(gd, stats, a.mod4code, a.mod4param, a.mod4min, a.mod4max, values[3], item);
        if (a.mod5code)
            addProp(gd, stats, a.mod5code, a.mod5param, a.mod5min, a.mod5max, values[4], item);
    }
    const numpsn = stats.poison_count || 0;
    for (const mod in mods) {
        addMod(mod, mods[mod]);
    }
    if (stats.poison_count) {
        stats.poison_count = Math.min(stats.poison_count, numpsn + 1);
    }
    return stats;
}
// ─── uniqueStats ────────────────────────────────────────────────
/**
 * Compute stats from a unique/set item definition.
 * Ported from d2planner uniqueStats().
 */
export function uniqueStats(gd, stats, uniq, values, item) {
    for (let i = 1; i <= 12; ++i) {
        if (uniq[`prop${i}`]) {
            const min = uniq[`min${i}`];
            const max = uniq[`max${i}`];
            addProp(gd, stats, uniq[`prop${i}`], uniq[`par${i}`], min, max, values ? values[i - 1] : (min === max ? max : ''), item);
        }
    }
    // Set-specific additional properties
    if (!uniq.addfunc && uniq.set) {
        for (let i = 1; i <= 5; ++i) {
            if (uniq[`aprop${i}a`]) {
                addProp(gd, stats, uniq[`aprop${i}a`], uniq[`apar${i}a`], uniq[`amin${i}a`], uniq[`amax${i}a`], uniq[`amax${i}a`], item);
            }
            if (uniq[`aprop${i}b`]) {
                addProp(gd, stats, uniq[`aprop${i}b`], uniq[`apar${i}b`], uniq[`amin${i}b`], uniq[`amax${i}b`], uniq[`amax${i}b`], item);
            }
        }
    }
    return stats;
}
// ─── runewordStats ──────────────────────────────────────────────
/**
 * Compute stats from a runeword definition.
 * Ported from d2planner runewordStats().
 */
export function runewordStats(gd, stats, uniq, values, item) {
    for (let i = 1; i <= 7; ++i) {
        if (uniq[`t1code${i}`] && uniq[`t1code${i}`] !== 'ethereal') {
            const min = uniq[`t1min${i}`];
            const max = uniq[`t1max${i}`];
            const param = uniq[`t1param${i}`];
            const v = values ? values[i - 1] : (min === max ? max : '');
            addProp(gd, stats, uniq[`t1code${i}`], param, min, max, v, item);
        }
    }
    return stats;
}
// ─── gemStats ───────────────────────────────────────────────────
/**
 * Apply gem/rune/jewel stats to the stat object based on the equipment slot type.
 * Ported from d2planner gemStats().
 */
export function gemStats(gd, stats, code, types) {
    const gem = gd.gems[code];
    if (!gem)
        return stats;
    const g = gem;
    if (types.has('weap')) {
        if (g.weaponmod1code)
            addProp(gd, stats, g.weaponmod1code, g.weaponmod1param, g.weaponmod1min, g.weaponmod1max, g.weaponmod1max);
        if (g.weaponmod2code)
            addProp(gd, stats, g.weaponmod2code, g.weaponmod2param, g.weaponmod2min, g.weaponmod2max, g.weaponmod2max);
        if (g.weaponmod3code)
            addProp(gd, stats, g.weaponmod3code, g.weaponmod3param, g.weaponmod3min, g.weaponmod3max, g.weaponmod3max);
    }
    else if (types.has('shld')) {
        if (g.shieldmod1code)
            addProp(gd, stats, g.shieldmod1code, g.shieldmod1param, g.shieldmod1min, g.shieldmod1max, g.shieldmod1max);
        if (g.shieldmod2code)
            addProp(gd, stats, g.shieldmod2code, g.shieldmod2param, g.shieldmod2min, g.shieldmod2max, g.shieldmod2max);
        if (g.shieldmod3code)
            addProp(gd, stats, g.shieldmod3code, g.shieldmod3param, g.shieldmod3min, g.shieldmod3max, g.shieldmod3max);
    }
    else if (types.has('helm') || types.has('tors')) {
        if (g.helmmod1code) {
            const min1 = g.helmmod1min ?? g.helmod1min;
            const max1 = g.helmmod1max ?? g.helmod1max;
            const param1 = g.helmmod1param ?? g.helmod1param;
            addProp(gd, stats, g.helmmod1code, param1, min1, max1, max1);
        }
        if (g.helmmod2code) {
            const min2 = g.helmmod2min ?? g.helmod2min;
            const max2 = g.helmmod2max ?? g.helmod2max;
            const param2 = g.helmmod2param ?? g.helmod2param;
            addProp(gd, stats, g.helmmod2code, param2, min2, max2, max2);
        }
        if (g.helmmod3code) {
            const min3 = g.helmmod3min ?? g.helmod3min;
            const max3 = g.helmmod3max ?? g.helmod3max;
            const param3 = g.helmmod3param ?? g.helmod3param;
            addProp(gd, stats, g.helmmod3code, param3, min3, max3, max3);
        }
    }
    return stats;
}
//# sourceMappingURL=item.js.map