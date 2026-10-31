/**
 * Inventory grid dimensions — Blizzless v105.
 *
 * Constants and helpers for stash/inventory/cube grid sizes.
 */
// ─── Grid dimensions (Blizzless) ────────────────────────────────
/** Shared stash grid dimensions. */
export const STASH = { rows: 13, columns: 16 };
/** Character inventory grid dimensions. */
export const INVENTORY = { rows: 4, columns: 10 };
/** Horadric cube grid dimensions. */
export const CUBE = { rows: 4, columns: 3 };
/** Belt grid (4 columns, variable rows depending on belt type). */
export const BELT = { rows: 4, columns: 4 };
/** Extended page misc tab (d2i type=1, virtual sub-page). */
export const EXTENDED_MISC = { rows: 10, columns: 10 };
/**
 * Get grid dimensions for a storage type.
 *
 * @param storage  Storage type: 'inventory' | 'cube' | 'stash' | 'belt'
 */
export function getGridSize(storage) {
    switch (storage) {
        case 'inventory': return INVENTORY;
        case 'cube': return CUBE;
        case 'stash': return STASH;
        case 'belt': return BELT;
    }
}
//# sourceMappingURL=dimensions.js.map