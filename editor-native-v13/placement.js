/**
 * Placement logic — inventory/stash item placement helpers.
 *
 * Ported from d2planner/src/logic/inventory.js.
 * Uses GameData for item base dimensions.
 */
import { StashGrid } from './grid.js';
// ─── Public API ─────────────────────────────────────────────────
/**
 * Check if an item can be placed at a specific position in a grid.
 *
 * @param grid  The occupancy grid.
 * @param x     Column position.
 * @param y     Row position.
 * @param item  The item to check.
 * @param gd    GameData for item dimensions.
 */
export function canPlaceItem(grid, x, y, item, gd) {
    const { w, h } = getItemSize(item, gd);
    return grid.isFree(x, y, w, h);
}
/**
 * Find a free slot for an item in a grid.
 *
 * @param grid  The occupancy grid.
 * @param item  The item to place.
 * @param gd    GameData for item dimensions.
 * @returns  `{ x, y }` or `null` if no space.
 */
export function findFreeSlot(grid, item, gd) {
    const { w, h } = getItemSize(item, gd);
    return grid.findFreeSlot(w, h);
}
/**
 * Find a free slot for an item across multiple stash pages.
 *
 * @param grids  Array of grids, one per stash page.
 * @param item   The item to place.
 * @param gd     GameData for item dimensions.
 * @returns  `{ pageIndex, x, y }` or `null` if no space in any page.
 */
export function findFreeSlotInStash(grids, item, gd) {
    for (let i = 0; i < grids.length; i++) {
        const slot = findFreeSlot(grids[i], item, gd);
        if (slot)
            return { pageIndex: i, ...slot };
    }
    return null;
}
/**
 * Place an item in a grid, marking cells as occupied.
 *
 * @returns `true` if placed, `false` if the space is not free.
 */
export function placeItem(grid, x, y, item, gd, itemId = 1) {
    const { w, h } = getItemSize(item, gd);
    if (!grid.isFree(x, y, w, h))
        return false;
    grid.occupy(x, y, w, h, itemId);
    return true;
}
/**
 * Remove an item from a grid, freeing its cells.
 */
export function removeItem(grid, x, y, item, gd) {
    const { w, h } = getItemSize(item, gd);
    grid.free(x, y, w, h);
}
/**
 * Build a StashGrid populated from a slot array.
 *
 * @param size  Grid dimensions.
 * @param slots  Sparse array: `slots[index] = itemId`.
 * @param items  All items keyed by ID.
 * @param gd  GameData for item dimensions.
 */
export function buildGrid(size, slots, items, gd) {
    const grid = new StashGrid(size);
    grid.populate(slots, items, gd);
    return grid;
}
// ─── Internal ───────────────────────────────────────────────────
/** Get item width and height from GameData. */
function getItemSize(item, gd) {
    const baseItem = gd.items[item.base];
    const w = baseItem?.invwidth || 1;
    const h = baseItem?.invheight || 1;
    return { w, h };
}
//# sourceMappingURL=placement.js.map