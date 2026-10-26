/**
 * StashGrid — occupancy grid for inventory/stash/cube placement.
 *
 * Ported from d2planner/src/logic/inventory.js, cleaned up as a class.
 * Uses GameData for item base dimensions (invwidth, invheight).
 */
// ─── StashGrid ──────────────────────────────────────────────────
/**
 * A 2D occupancy grid for a storage area.
 *
 * Each cell is either free (0) or occupied (non-zero).
 * Items occupy rectangular regions based on their `invwidth × invheight`.
 */
export class StashGrid {
    rows;
    columns;
    /** Flat occupancy array: `cells[y * columns + x]`. 0 = free, else item ID. */
    cells;
    constructor(rowsOrSize, columns) {
        if (typeof rowsOrSize === 'object') {
            this.rows = rowsOrSize.rows;
            this.columns = rowsOrSize.columns;
        }
        else {
            this.rows = rowsOrSize;
            this.columns = columns;
        }
        this.cells = new Float64Array(this.rows * this.columns);
    }
    // ─── Query ──────────────────────────────────────────────────
    /** Check if a rectangular area is completely free. */
    isFree(x, y, width, height) {
        if (x < 0 || y < 0 || x + width > this.columns || y + height > this.rows)
            return false;
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                if (this.cells[(y + dy) * this.columns + (x + dx)] !== 0)
                    return false;
            }
        }
        return true;
    }
    /** Get the item ID at a cell, or 0 if free. */
    at(x, y) {
        if (x < 0 || y < 0 || x >= this.columns || y >= this.rows)
            return 0;
        return this.cells[y * this.columns + x];
    }
    // ─── Mutation ─────────────────────────────────────────────────
    /** Mark a rectangular area as occupied by `itemId`. */
    occupy(x, y, width, height, itemId = 1) {
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                this.cells[(y + dy) * this.columns + (x + dx)] = itemId;
            }
        }
    }
    /** Free a rectangular area. */
    free(x, y, width, height) {
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                this.cells[(y + dy) * this.columns + (x + dx)] = 0;
            }
        }
    }
    /** Clear the entire grid. */
    clear() {
        this.cells.fill(0);
    }
    // ─── Placement search ────────────────────────────────────────
    /**
     * Find the first free slot (top-left corner) for an item of the given size.
     * Scans left-to-right, top-to-bottom.
     *
     * @returns `{ x, y }` or `null` if no space.
     */
    findFreeSlot(width, height) {
        for (let y = 0; y <= this.rows - height; y++) {
            for (let x = 0; x <= this.columns - width; x++) {
                if (this.isFree(x, y, width, height))
                    return { x, y };
            }
        }
        return null;
    }
    // ─── Populate from items ──────────────────────────────────────
    /**
     * Populate the grid from a slot array (as returned by d2i/d2s readers).
     *
     * @param slots Sparse array: `slots[slot] = itemId`. Slot = `y * columns + x`.
     * @param items All items keyed by ID.
     * @param gd GameData for item base dimensions.
     */
    populate(slots, items, gd) {
        this.clear();
        for (let slot = 0; slot < slots.length; slot++) {
            const id = slots[slot];
            if (id == null)
                continue;
            const item = items[id];
            if (!item)
                continue;
            const baseItem = gd.items[item.base];
            const w = baseItem?.invwidth || 1;
            const h = baseItem?.invheight || 1;
            const x = slot % this.columns;
            const y = Math.floor(slot / this.columns);
            // Grid stores numeric IDs; map preset string codes to a hashed numeric
            // sentinel so the grid can still mark cells occupied.
            const numericId = typeof id === 'number'
                ? id
                : id.split('').reduce((s, c) => s * 31 + c.charCodeAt(0), 1) & 0x7fffffff;
            this.occupy(x, y, w, h, numericId);
        }
    }
}
//# sourceMappingURL=grid.js.map