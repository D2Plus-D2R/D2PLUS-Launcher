/**
 * Item DTO — converts internal ParsedItem to a portable trade DTO.
 *
 * TradeItemDTO is the format sent to the backend for the trade system.
 */
import { getItemIconPath } from './item-icon.js';
import { serializeItem } from './item-serializer.js';
// ─── Public API ─────────────────────────────────────────────────
/**
 * Convert a parsed item to a TradeItemDTO.
 *
 * @param item      The parsed item.
 * @param allItems  All items dict (for socketed sub-item lookup and serialization).
 * @param gd        GameData instance.
 */
export function toTradeDTO(item, allItems, gd) {
    const baseEntry = gd.items[item.base];
    const base = baseEntry ? baseEntry : undefined;
    const { w, h } = getItemSize(base);
    // Resolve display name
    const displayName = resolveDisplayName(item, gd);
    // Build socketed sub-DTOs
    const socketedDTOs = [];
    if (item.socketedItems) {
        for (const sid of item.socketedItems) {
            const sockItem = allItems[sid];
            if (sockItem) {
                socketedDTOs.push(toTradeDTO(sockItem, allItems, gd));
            }
        }
    }
    // Serialize token
    const token = serializeItem(item, allItems, gd);
    return {
        token,
        // Stable per-item identity: the persistent 32-bit item id as 8-char hex (null for simple items).
        guid: typeof item.guid === "number" ? (item.guid >>> 0).toString(16).padStart(8, "0") : null,
        baseCode: item.base,
        displayName,
        quality: item.quality,
        // Simple items (gems, runes, potions, scrolls) carry no ilvl in the binary
        // format — surface 0 in the DTO so downstream consumers can rely on `number`.
        ilvl: item.ilvl ?? 0,
        ethereal: item.ethereal,
        sockets: item.sockets,
        uniqueId: item.unique,
        width: w,
        height: h,
        iconPath: getItemIconPath(item, gd),
        stats: { ...item.stats },
        socketedItems: socketedDTOs,
    };
}
// ─── Helpers ────────────────────────────────────────────────────
/** Get item dimensions from base data. */
function getItemSize(base) {
    const w = base?.invwidth || 1;
    const h = base?.invheight || 1;
    return { w, h };
}
/** Resolve human-readable display name. */
function resolveDisplayName(item, gd) {
    // If item has an explicit name (rare/crafted)
    if (item.name)
        return item.name;
    // Unique/set/runeword items: look up in GameData
    if (item.unique) {
        const name = lookupName(item.unique, gd);
        if (name)
            return name;
    }
    const base = localizedBaseName(item, gd);
    // Magic items: in-game name is "<prefix> <base> <suffix>" (e.g. "Glowing Ring of the
    // Whale"). The affix codes are read straight from the binary, so this works even when
    // the stat solver fails to reconstruct the actual mods.
    if (item.magicPrefixCode || item.magicSuffixCode) {
        const prefix = affixWord(gd.magicPrefix?.[item.magicPrefixCode ?? ''], gd);
        const suffix = affixWord(gd.magicSuffix?.[item.magicSuffixCode ?? ''], gd);
        const full = [prefix, base, suffix].filter(Boolean).join(' ').trim();
        if (full)
            return full;
    }
    return base;
}
/** Resolve a magic affix entry's localized display word (e.g. "Glowing", "of the Whale"). */
function affixWord(entry, gd) {
    const key = entry?.name;
    if (!key)
        return '';
    return gd.locale.strings[key] || key;
}
/** Localized base-item name from the locale, falling back to the raw base code. */
function localizedBaseName(item, gd) {
    const baseEntry = gd.items[item.base];
    const base = baseEntry ? baseEntry : undefined;
    const namestr = base?.namestr;
    if (namestr) {
        return gd.locale.strings[namestr] || namestr;
    }
    return item.base;
}
/** Look up an item name from the locale by its unique/set/runeword key. */
function lookupName(key, gd) {
    // Try direct locale lookup
    const direct = gd.locale.strings[key];
    if (direct)
        return direct;
    // Try uniqueItems / setItems tables if available. The name key lives in the `index`
    // column (e.g. unique117.index = "Nokozan Relic"), NOT `namestr` — without this every
    // unique/set fell through to its base name ("Amulet", "Ring", …).
    const tables = ['uniqueItems', 'setItems'];
    for (const table of tables) {
        const dict = gd[table];
        if (dict?.[key]) {
            const nameStr = (dict[key].index ?? dict[key].namestr ?? dict[key].name);
            if (nameStr) {
                const localized = gd.locale.strings[nameStr];
                if (localized)
                    return localized;
                return nameStr;
            }
        }
    }
    return null;
}
//# sourceMappingURL=item-dto.js.map