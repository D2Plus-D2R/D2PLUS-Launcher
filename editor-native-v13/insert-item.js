/**
 * Insert item into a save file — places an item and returns a patched buffer.
 *
 * Works with both .d2s and .d2i files.
 */
import { readD2S } from './d2s-reader.js';
import { writeD2S } from './d2s-writer.js';
import { readD2I } from './d2i-reader.js';
import { patchStashPage } from './d2i-writer.js';
import { buildGrid, findFreeSlot, canPlaceItem } from './placement.js';
import { STASH, INVENTORY, CUBE } from './dimensions.js';
// ─── insertItemD2S ──────────────────────────────────────────────
/**
 * Insert an item into a .d2s character save.
 *
 * If `position` is provided, attempts to place at that exact location.
 * Otherwise, finds the first available slot.
 *
 * @param buffer  Original .d2s file bytes.
 * @param item    The item to insert.
 * @param allItemsForItem  All items for the item (e.g. socketed sub-items).
 * @param target  Where to place: 'stash', 'inventory', or 'cube'.
 * @param gd      GameData instance.
 * @param position  Optional specific position `{ x, y }`.
 */
export function insertItemD2S(buffer, item, allItemsForItem, target, gd, position) {
    const { profile, items } = readD2S(buffer, gd);
    const { size, slots } = getTargetInfo(profile, target);
    // Build occupancy grid
    const grid = buildGrid(size, slots, items, gd);
    // Determine placement position
    let x;
    let y;
    if (position) {
        if (!canPlaceItem(grid, position.x, position.y, item, gd)) {
            throw new Error(`NO_SPACE: cannot place item at (${position.x}, ${position.y}) in ${target}`);
        }
        x = position.x;
        y = position.y;
    }
    else {
        const slot = findFreeSlot(grid, item, gd);
        if (!slot) {
            throw new Error(`NO_SPACE: no free slot for item in ${target}`);
        }
        x = slot.x;
        y = slot.y;
    }
    // Assign new unique item ID
    const maxId = Math.max(0, ...Object.keys(items).filter(k => !isNaN(Number(k))).map(Number));
    const newId = maxId + 1;
    const newItem = { ...item, itemId: newId };
    // Register item and its sockets in the save's items dict
    items[newId] = newItem;
    let nextSocketId = newId + 1;
    if (item.socketedItems) {
        const newSocketedIds = [];
        for (const oldSid of item.socketedItems) {
            const sockItem = allItemsForItem[oldSid];
            if (sockItem) {
                items[nextSocketId] = { ...sockItem, itemId: nextSocketId };
                newSocketedIds.push(nextSocketId);
                nextSocketId++;
            }
        }
        newItem.socketedItems = newSocketedIds;
    }
    // Place in the slot array
    const slotIndex = y * size.columns + x;
    slots[slotIndex] = newId;
    // Rewrite D2S
    const newBuffer = writeD2S({ profile: profile, items, gd });
    return { newBuffer, position: { x, y } };
}
// ─── insertItemD2I ──────────────────────────────────────────────
/**
 * Insert an item into a .d2i stash page.
 *
 * If `position` is provided, attempts to place at that exact location on the
 * specified page. Otherwise, finds the first available slot across normal pages.
 *
 * @param buffer  Original .d2i file bytes.
 * @param item    The item to insert.
 * @param allItemsForItem  All items for the item (e.g. socketed sub-items).
 * @param gd      GameData instance.
 * @param target  Optional { pageIndex, x, y } for exact placement.
 */
export function insertItemD2I(buffer, item, allItemsForItem, gd, target) {
    const { pages, items } = readD2I(buffer, gd);
    // Filter to normal pages only (pageType=0)
    const normalPages = pages.filter(p => p.pageType === 0);
    let targetPage;
    let x;
    let y;
    if (target) {
        // Exact placement
        targetPage = pages[target.pageIndex];
        if (!targetPage)
            throw new Error(`PAGE_NOT_FOUND: page ${target.pageIndex} not found`);
        if (targetPage.pageType !== 0)
            throw new Error('INVALID_PAGE: can only insert into normal pages');
        const grid = buildGrid(STASH, targetPage.stash, items, gd);
        if (!canPlaceItem(grid, target.x, target.y, item, gd)) {
            throw new Error(`NO_SPACE: cannot place item at (${target.x}, ${target.y}) on page ${target.pageIndex}`);
        }
        x = target.x;
        y = target.y;
    }
    else {
        // Auto-find slot across normal pages
        let found = false;
        targetPage = normalPages[0]; // default
        x = 0;
        y = 0;
        for (const page of normalPages) {
            const grid = buildGrid(STASH, page.stash, items, gd);
            const slot = findFreeSlot(grid, item, gd);
            if (slot) {
                targetPage = page;
                x = slot.x;
                y = slot.y;
                found = true;
                break;
            }
        }
        if (!found) {
            throw new Error('NO_SPACE: no free slot for item in any stash page');
        }
    }
    // Assign new unique item ID
    const maxId = Math.max(0, ...Object.keys(items).filter(k => !isNaN(Number(k))).map(Number));
    const newId = maxId + 1;
    const newItem = { ...item, itemId: newId };
    // Register item and its sockets
    items[newId] = newItem;
    let nextSocketId = newId + 1;
    if (item.socketedItems) {
        const newSocketedIds = [];
        for (const oldSid of item.socketedItems) {
            const sockItem = allItemsForItem[oldSid];
            if (sockItem) {
                items[nextSocketId] = { ...sockItem, itemId: nextSocketId };
                newSocketedIds.push(nextSocketId);
                nextSocketId++;
            }
        }
        newItem.socketedItems = newSocketedIds;
    }
    // Place in stash array
    const slotIndex = y * 16 + x; // STASH columns = 16
    targetPage.stash[slotIndex] = newId;
    // Build write page and patch
    const writePage = buildWritePageFromStash(targetPage, items, gd);
    const rawPageIndex = findRawPageIndex(pages, targetPage.index);
    const newBuffer = patchStashPage(buffer, rawPageIndex, writePage, items, gd);
    return { newBuffer, position: { x, y }, pageIndex: targetPage.index };
}
// ─── Helpers ────────────────────────────────────────────────────
/** Get target grid info from a D2S profile. */
function getTargetInfo(profile, target) {
    switch (target) {
        case 'stash':
            return { size: STASH, slots: profile.stash };
        case 'inventory':
            return { size: INVENTORY, slots: profile.inventory };
        case 'cube':
            return { size: CUBE, slots: profile.cube };
        default:
            throw new Error(`INVALID_TARGET: unknown target '${target}'`);
    }
}
/** Build a WriteStashPage from a D2IStashPage's current stash array. */
function buildWritePageFromStash(page, items, gd) {
    const entries = [];
    const columns = 16; // STASH.columns
    for (let slot = 0; slot < page.stash.length; slot++) {
        const id = page.stash[slot];
        if (id == null)
            continue;
        const item = items[id];
        if (!item)
            continue;
        // Skip socketed sub-items
        const isSocketed = Object.values(items).some(i => i.socketedItems?.includes(id));
        if (isSocketed)
            continue;
        const x = slot % columns;
        const y = Math.floor(slot / columns);
        const location = { loc: 0, equip: 0, x, y, storage: 5 };
        entries.push({ item, location });
    }
    return {
        pageType: typeof page.pageType === 'number' ? page.pageType : 0,
        gold: page.gold,
        entries,
    };
}
/** Find the raw sector index for a page in the d2i file. */
function findRawPageIndex(pages, targetPageIndex) {
    const targetOffset = pages[targetPageIndex].offset;
    const seenOffsets = new Set();
    for (let i = 0; i < pages.length; i++) {
        const off = pages[i].offset;
        if (off === targetOffset)
            return seenOffsets.size;
        seenOffsets.add(off);
    }
    return targetPageIndex;
}
//# sourceMappingURL=insert-item.js.map