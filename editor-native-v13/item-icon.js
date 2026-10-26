/**
 * Item icon path resolution — determines the HD icon key for an item.
 *
 * Ported from d2planner/src/logic/item.js → itemGetIconHD().
 */
// ─── Public API ─────────────────────────────────────────────────
/**
 * Get the HD icon path key for an item.
 *
 * Returns the icon identifier used in hditemlib.json for HD rendering.
 * The result can be passed to the frontend for icon display.
 *
 * @param item  The parsed item.
 * @param gd    GameData instance.
 * @returns Icon path string, or `null` if no icon is available.
 */
export function getItemIconPath(item, gd) {
    const baseEntry = gd.items[item.base];
    if (!baseEntry)
        return null;
    const base = baseEntry;
    let icon = base.hd;
    if (!icon)
        return null;
    // Unique/set items may have specific HD icons
    if (item.quality === 7 || item.quality === 5) {
        // quality 7 = UNIQUE, 5 = SET
        const specialItem = item.unique
            ? gd.uniqueItems[item.unique]
                ?? gd.setItems[item.unique]
            : undefined;
        const specialHd = specialItem?.hd;
        if (specialHd?.length) {
            const normcode = base.normcode;
            const ubercode = base.ubercode;
            const ultracode = base.ultracode;
            if (!normcode || normcode === item.base) {
                icon = specialHd[0];
            }
            else if (ubercode === item.base) {
                icon = specialHd[1] ?? specialHd[0];
            }
            else if (ultracode === item.base) {
                icon = specialHd[2] ?? specialHd[0];
            }
            else {
                icon = specialHd[0];
            }
        }
    }
    if (!icon)
        return null;
    // Variable inventory graphics (armor/weapons with multiple visual variants)
    const baseType = base.type;
    if (baseType) {
        const typeData = gd.itemTypes[baseType];
        if (typeData?.varinvgfx && icon === base.hd) {
            const varCount = typeData.varinvgfx;
            const index = ((item.iconIndex || 0) % varCount) + 1;
            icon = icon + index;
        }
    }
    return icon;
}
/**
 * Get the inventory file icon name for an item (SD, non-HD).
 *
 * @param item  The parsed item.
 * @param gd    GameData instance.
 * @returns Icon name string, or `null` if not found.
 */
export function getItemIconSD(item, gd) {
    const baseEntry2 = gd.items[item.base];
    if (!baseEntry2)
        return null;
    const base = baseEntry2;
    let icon = base.invfile;
    if (!icon)
        return null;
    // Variable inventory graphics
    const baseType = base.type;
    if (baseType) {
        const typeData = gd.itemTypes[baseType];
        if (typeData?.varinvgfx) {
            const varCount = typeData.varinvgfx;
            const index = ((item.iconIndex || 0) % varCount) + 1;
            const varIcon = typeData[`invgfx${index}`];
            if (varIcon)
                icon = varIcon;
        }
    }
    // Unique/set overrides
    if (item.quality === 7) {
        const uniq = item.unique ? gd.uniqueItems[item.unique] : undefined;
        icon = uniq?.invfile || base.uniqueinvfile || icon;
    }
    else if (item.quality === 5) {
        const setItem = item.unique ? gd.setItems[item.unique] : undefined;
        icon = setItem?.invfile || base.setinvfile || icon;
    }
    return icon || null;
}
//# sourceMappingURL=item-icon.js.map