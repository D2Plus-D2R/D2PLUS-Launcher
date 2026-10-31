/**
 * d2r-saver — Blizzless D2R v105 save file reader/writer library.
 *
 * @packageDocumentation
 */
import { GameData } from './game-data.js';
import { detectFormat } from './detect.js';
import { readD2S } from './d2s-reader.js';
import { readD2I } from './d2i-reader.js';
import { writeD2S } from './d2s-writer.js';
import { writeStash, buildStashWritePages, patchStashPage, } from './d2i-writer.js';
import { extractItemD2S, extractItemD2I, } from './extract-item.js';
import { insertItemD2S, insertItemD2I, } from './insert-item.js';
import { readSave } from './read-save.js';
import { serializeItem, deserializeItem, } from './item-serializer.js';
import { getItemIconPath, getItemIconSD } from './item-icon.js';
import { toTradeDTO } from './item-dto.js';
import { canPlaceItem, findFreeSlot, findFreeSlotInStash } from './placement.js';
import { D2RSaverError, ErrorCode } from './errors.js';
// ─── Re-exports ─────────────────────────────────────────────────
export { GameData } from './game-data.js';
export { D2RSaverError, ErrorCode } from './errors.js';
export { StashGrid } from './grid.js';
// D2PLUS template factory uses the same property interpretation as the parser.
export { uniqueStats, addProp } from './item.js';
export { itemGetTypes } from './item-types.js';
/**
 * Main facade for all d2r-saver operations.
 *
 * Holds a `GameData` instance and delegates to internal modules.
 *
 * @example
 * ```ts
 * const saver = await D2RSaver.create({ dataPath: './data.json', stringsPath: './strings.json' });
 * const result = saver.readD2S(buffer);
 * ```
 */
export class D2RSaver {
    /** Internal game data reference. */
    gd;
    constructor(gd) {
        this.gd = gd;
    }
    // ── Factory methods ─────────────────────────────────────────
    /**
     * Create a D2RSaver by loading game data from file paths.
     *
     * @param options  Paths to data.json and strings.json.
     */
    static async create(options) {
        const gd = await GameData.fromFile(options.dataPath, options.stringsPath);
        return new D2RSaver(gd);
    }
    /**
     * Create a D2RSaver from pre-parsed JSON objects.
     *
     * @param rawData   Parsed data.json content.
     * @param locale    Parsed strings.json content.
     */
    static fromData(rawData, locale) {
        const gd = GameData.fromRaw(rawData, locale);
        return new D2RSaver(gd);
    }
    // ── Format detection ────────────────────────────────────────
    /**
     * Detect file format.
     *
     * @throws {D2RSaverError} INVALID_FORMAT if file is unrecognized.
     */
    detectFormat(buffer) {
        const result = detectFormat(buffer);
        if (!result) {
            throw new D2RSaverError(ErrorCode.INVALID_FORMAT, 'File is not a valid Blizzless v105 d2s or d2i.');
        }
        return result;
    }
    // ── Reading ─────────────────────────────────────────────────
    /** Read a .d2s character save file. */
    readD2S(buffer) {
        return readD2S(buffer, this.gd);
    }
    /** Read a .d2i shared stash file. */
    readD2I(buffer) {
        return readD2I(buffer, this.gd);
    }
    /** Auto-detect format and read a save file. */
    readSave(buffer) {
        return readSave(buffer, this.gd);
    }
    // ── Item serialization ──────────────────────────────────────
    /** Serialize an item to a portable token (`d2r1:<base64>`). */
    serializeItem(item, allItems) {
        return serializeItem(item, allItems, this.gd);
    }
    /** Deserialize an item from a portable token. */
    deserializeItem(token) {
        return deserializeItem(token, this.gd);
    }
    // ── Placement helpers ───────────────────────────────────────
    /** Get the grid size of an item in cells. */
    getItemSize(item) {
        const base = this.gd.items[item.base];
        return {
            width: base?.invwidth ?? 1,
            height: base?.invheight ?? 1,
        };
    }
    /** Check if an item can be placed at a position on a grid. */
    canPlaceItem(grid, x, y, item) {
        return canPlaceItem(grid, x, y, item, this.gd);
    }
    /** Find the first free slot for an item on a grid. */
    findFreeSlot(grid, item) {
        return findFreeSlot(grid, item, this.gd);
    }
    /** Find the first free slot for an item across multiple stash grids. */
    findFreeSlotInStash(grids, item) {
        return findFreeSlotInStash(grids, item, this.gd);
    }
    // ── Item operations ─────────────────────────────────────────
    /**
     * Extract an item from a .d2s save file.
     *
     * @param buffer  Original file buffer.
     * @param itemId  Item ID to extract.
     */
    extractItemD2S(buffer, itemId) {
        return extractItemD2S(buffer, itemId, this.gd);
    }
    /**
     * Extract an item from a .d2i shared stash.
     *
     * @param buffer     Original file buffer.
     * @param pageIndex  Page index.
     * @param x          X position in grid.
     * @param y          Y position in grid.
     */
    extractItemD2I(buffer, pageIndex, x, y) {
        return extractItemD2I(buffer, pageIndex, x, y, this.gd);
    }
    /**
     * Insert an item into a .d2s save file.
     *
     * @param buffer          Original file buffer.
     * @param item            Item to insert.
     * @param allItemsForItem All related items (including socketed sub-items).
     * @param target          Target container: 'stash' | 'inventory' | 'cube'.
     * @param position        Optional specific position. Auto-finds if omitted.
     */
    insertItemD2S(buffer, item, allItemsForItem, target, position) {
        return insertItemD2S(buffer, item, allItemsForItem, target, this.gd, position);
    }
    /**
     * Insert an item into a .d2i shared stash.
     *
     * @param buffer          Original file buffer.
     * @param item            Item to insert.
     * @param allItemsForItem All related items (including socketed sub-items).
     * @param target          Optional specific target page and position.
     */
    insertItemD2I(buffer, item, allItemsForItem, target) {
        return insertItemD2I(buffer, item, allItemsForItem, this.gd, target);
    }
    // ── Writing ─────────────────────────────────────────────────
    /**
     * Re-serialise a complete .d2s from a (possibly edited) profile + items.
     * Lossless: the parsed profile must carry rawHeader/attributes (from readD2S);
     * apply edits by mutating `profile.attributes` (raw values) before calling.
     */
    writeD2S(profile, items, name) {
        return writeD2S({ profile, items, gd: this.gd, name });
    }
    /** Convert parsed stash pages back to writable pages (for writeStash). */
    buildStashWritePages(pages, allItems) {
        return buildStashWritePages(pages, allItems, this.gd);
    }
    /** Re-serialise a complete .d2i shared stash from writable pages. */
    writeStash(pages, allItems) {
        return writeStash(pages, allItems, this.gd);
    }
    /** Patch a single .d2i sector (e.g. to change its gold) by raw sector index. */
    patchStashPage(buffer, pageIndex, newPage, allItems) {
        return patchStashPage(buffer, pageIndex, newPage, allItems, this.gd);
    }
    // ── Icons ───────────────────────────────────────────────────
    /** Get the HD icon path key for an item. */
    getItemIconPath(item) {
        return getItemIconPath(item, this.gd);
    }
    /** Get the SD (invfile) icon name for an item. */
    getItemIconSD(item) {
        return getItemIconSD(item, this.gd);
    }
    // ── Trade DTO ───────────────────────────────────────────────
    /** Convert an item to a TradeItemDTO for the backend. */
    toTradeDTO(item, allItems) {
        return toTradeDTO(item, allItems, this.gd);
    }
}
//# sourceMappingURL=index.js.map
export { applyOathTemplate, checkOathPlacement } from './oath-templates.js';
