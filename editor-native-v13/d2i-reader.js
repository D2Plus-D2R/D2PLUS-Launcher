/**
 * D2I (shared stash) reader — Blizzless v105 only.
 *
 * Ported from d2planner/src/logic/binary/index.js → parseStash().
 * Simplified: v105 only — all version branches removed.
 *
 * Uses GameData instead of global Data singleton.
 */
import { BinaryReader } from './binary-reader.js';
import { detectFormat } from './detect.js';
import { createItemParser } from './item-parser.js';
import { isSubType } from './item-types.js';
// Minimum bytes a single D2I page occupies (header + item-list start at byte 64). A sector
// smaller than this can't be a real page; we treat it as corruption and stop. This also
// guarantees the page cursor strictly advances each iteration — without it a malformed file
// reporting sectorSize 0 (or any value < 64) would loop forever (CPU/hang DoS). Mirrors the
// identical guard in the writer (`d2i-writer.ts`).
const PAGE_HEADER_SIZE = 64;
// ─── Reader ─────────────────────────────────────────────────────
/**
 * Parse a .d2i shared stash file.
 *
 * @param data Raw file bytes
 * @param gd   GameData instance
 */
export function readD2I(data, gd) {
    const buffer = new Uint8Array(data);
    const pages = [];
    const allItems = {};
    const warnings = [];
    let offset = 0;
    let nextItemId = 1;
    while (offset < buffer.length) {
        if (offset + PAGE_HEADER_SIZE > buffer.length)
            break;
        const pageData = buffer.subarray(offset);
        const reader = new BinaryReader(pageData);
        const fmt = detectFormat(pageData);
        if (!fmt || fmt.type !== 'd2i')
            break;
        // D2I page header: magic(4) + ?(4) + version(4) + gold(4) + sectorSize(4) + pageType(1)
        reader.seek(12);
        const gold = reader.read32();
        const sectorSize = reader.read32();
        const pageType = reader.read8();
        // Guard against a malformed/hostile sector size: a value below one page header would
        // never advance `offset`, hanging the parser in an infinite loop (CPU/hang DoS). Stop
        // and surface a warning instead — we keep whatever pages parsed cleanly before it.
        if (sectorSize < PAGE_HEADER_SIZE) {
            warnings.push(`Malformed D2I page at offset ${offset}: sectorSize ${sectorSize} < ${PAGE_HEADER_SIZE}; stopping parse.`);
            break;
        }
        if (pageType === 2) {
            // Metadata page — skip entirely
            offset += sectorSize;
            continue;
        }
        // Items start at byte 64
        reader.seek(64);
        if (pageType === 1) {
            // Extended page: split into 3 virtual tabs (gems, runes, materials)
            parseExtendedPage(reader, gd, gold, offset, sectorSize, pages, allItems, warnings, nextItemId);
            // Update nextItemId from the items that were just parsed
            for (const key of Object.keys(allItems)) {
                const id = Number(key);
                if (id >= nextItemId)
                    nextItemId = id + 1;
            }
        }
        else {
            // Normal stash page
            parseNormalPage(reader, gd, gold, pageType, offset, sectorSize, pages, allItems, warnings, nextItemId);
            for (const key of Object.keys(allItems)) {
                const id = Number(key);
                if (id >= nextItemId)
                    nextItemId = id + 1;
            }
        }
        offset += sectorSize;
    }
    return { pages, items: allItems, warnings };
}
// ─── Normal page ────────────────────────────────────────────────
function parseNormalPage(reader, gd, gold, pageType, offset, sectorSize, pages, allItems, warnings, nextItemId) {
    const stash = [];
    const ctx = createItemParser(reader, gd, nextItemId);
    try {
        ctx.parseItemList((id, location, slot) => {
            if (location === 'stash' && slot !== undefined) {
                stash[slot] = id;
            }
        });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const warning = `Stash page ${pages.length} parsing error: ${msg}`;
        warnings.push(warning);
    }
    finally {
        Object.assign(allItems, ctx.items);
    }
    pages.push({
        index: pages.length,
        pageType,
        gold,
        stash,
        offset,
        sectorSize,
    });
}
// ─── Extended page ──────────────────────────────────────────────
function parseExtendedPage(reader, gd, gold, offset, sectorSize, pages, allItems, warnings, nextItemId) {
    const gems = [];
    const runes = [];
    const misc = [];
    const gemQty = [];
    const runeQty = [];
    const ctx = createItemParser(reader, gd, nextItemId);
    try {
        const handler = (id, location, _slot, item) => {
            if (location === 'stash') {
                const base = item?.base || (typeof id === 'number' ? ctx.items[id]?.base : undefined);
                if (!base)
                    return;
                const itemEntry = gd.items[base];
                const type = itemEntry?.type;
                const qty = item?.quantity || ctx.items[id]?.quantity || 0;
                if (!qty)
                    return;
                if (type && isSubType(gd, type, 'gem')) {
                    gems.push(id);
                    gemQty.push(qty);
                }
                else if (type && isSubType(gd, type, 'rune')) {
                    runes.push(id);
                    runeQty.push(qty);
                }
                else {
                    misc.push({ id, qty });
                }
            }
        };
        ctx.parseItemList(handler);
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const warning = `Stash page ${pages.length} (extended) parsing error: ${msg}`;
        warnings.push(warning);
    }
    finally {
        Object.assign(allItems, ctx.items);
    }
    // Pack misc items into a grid respecting actual item sizes
    const miscStash = [];
    const miscQty = {};
    const miscCols = 10;
    const occupied = new Set();
    let miscMaxRow = 0;
    for (const { id, qty } of misc) {
        const baseCode = allItems[id]?.base;
        const baseItem = baseCode
            ? gd.items[baseCode]
            : undefined;
        const w = baseItem?.invwidth || 1;
        const h = baseItem?.invheight || 1;
        for (let slot = 0;; slot++) {
            const x = slot % miscCols;
            const y = Math.floor(slot / miscCols);
            if (x + w > miscCols)
                continue;
            let fits = true;
            for (let dy = 0; dy < h && fits; dy++) {
                for (let dx = 0; dx < w && fits; dx++) {
                    if (occupied.has((y + dy) * miscCols + (x + dx)))
                        fits = false;
                }
            }
            if (fits) {
                miscStash[slot] = id;
                miscQty[slot] = qty;
                for (let dy = 0; dy < h; dy++) {
                    for (let dx = 0; dx < w; dx++) {
                        occupied.add((y + dy) * miscCols + (x + dx));
                        miscMaxRow = Math.max(miscMaxRow, y + dy);
                    }
                }
                break;
            }
        }
    }
    const miscRows = misc.length ? miscMaxRow + 1 : 1;
    pages.push({
        index: pages.length,
        pageType: 'gems',
        gold,
        stash: gems,
        quantities: gemQty,
        offset,
        sectorSize,
    });
    pages.push({
        index: pages.length,
        pageType: 'runes',
        gold: 0,
        stash: runes,
        quantities: runeQty,
        offset,
        sectorSize,
    });
    pages.push({
        index: pages.length,
        pageType: 'misc',
        gold: 0,
        stash: miscStash,
        quantities: miscQty,
        rows: miscRows,
        offset,
        sectorSize,
    });
}
//# sourceMappingURL=d2i-reader.js.map