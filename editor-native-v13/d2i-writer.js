/**
 * D2I (shared stash) writer — Blizzless v105 only.
 *
 * **New functionality** — d2planner has no writeStash() equivalent.
 * Reverse-engineered from the parseStash() reader and the binary format:
 *
 *   [0x00] Magic:      0xAA55AA55  (4 bytes)
 *   [0x04] Mode:       uint32 = 2  (4 bytes)
 *   [0x08] Version:    uint32 = 105 (4 bytes)
 *   [0x0C] Gold:       uint32      (4 bytes)
 *   [0x10] SectorSize: uint32      (4 bytes) — patched after writing items
 *   [0x14] PageType:   uint8       (1 byte)
 *   [0x15] Padding:    zeros       (43 bytes → total header = 64 bytes)
 *   [0x40] Items:      JM header + items (via writeItemList)
 *
 * Supports:
 *   - writeStash()     — full rewrite of all pages
 *   - patchStashPage() — incremental patch: replace one page, leave rest as-is
 */
import { BitWriter } from './binary-writer.js';
import { writeItemList } from './item-writer.js';
// ─── Constants ──────────────────────────────────────────────────
/** D2I magic signature (same as D2S). */
const D2I_MAGIC = 0xaa55aa55;
/** D2I mode field (always 2 in real files). */
const D2I_MODE = 2;
/** Blizzless version. */
const D2I_VERSION = 105;
/** D2I page header size in bytes. */
const PAGE_HEADER_SIZE = 64;
/** Default stash columns. */
const STASH_COLUMNS = 16;
/**
 * Write a complete .d2i file from an array of pages.
 *
 * @param pages  Array of page descriptions with items.
 * @param allItems  All items (for socketed item lookups).
 * @param gd  GameData instance.
 * @returns  Raw file bytes.
 */
export function writeStash(pages, allItems, gd) {
    const sectors = [];
    for (const page of pages) {
        sectors.push(writeStashSector(page, allItems, gd));
    }
    // Concatenate all sectors
    const totalSize = sectors.reduce((sum, s) => sum + s.length, 0);
    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const sector of sectors) {
        result.set(sector, offset);
        offset += sector.length;
    }
    return result;
}
/**
 * Build WriteStashPage entries from parsed D2IStashPage + items.
 *
 * Converts the reader's page model back to writable entries.
 * Extended sub-pages (gems/runes/misc) are merged back into a single
 * extended page with pageType=1.
 */
export function buildStashWritePages(pages, allItems, gd) {
    const result = [];
    let i = 0;
    while (i < pages.length) {
        const page = pages[i];
        if (typeof page.pageType === 'number') {
            // Normal page (type 0) or other numeric type
            const entries = buildStashEntries(page.stash, allItems, gd);
            result.push({
                pageType: page.pageType,
                gold: page.gold,
                entries,
            });
            i++;
        }
        else {
            // Extended virtual sub-pages: collect all consecutive sub-pages
            // that share the same original offset (gems, runes, misc)
            const extEntries = [];
            const baseOffset = page.offset;
            let extGold = 0;
            while (i < pages.length) {
                const subPage = pages[i];
                if (typeof subPage.pageType === 'number')
                    break;
                if (subPage.offset !== baseOffset && extEntries.length > 0)
                    break;
                if (subPage.gold > 0)
                    extGold = subPage.gold;
                // Collect items from each sub-page
                const entriesToAdd = buildExtendedEntries(subPage, allItems, gd);
                extEntries.push(...entriesToAdd);
                i++;
            }
            result.push({
                pageType: 1,
                gold: extGold,
                entries: extEntries,
            });
        }
    }
    return result;
}
/**
 * Incremental patch: replace one page in an existing .d2i file.
 *
 * Copies all sectors as-is, but re-writes the target page.
 *
 * @param originalBuffer  The original .d2i file bytes.
 * @param pageIndex  The zero-based page index to replace (in raw sector order, ignoring pageType=2 skips).
 * @param newPage  The new page content.
 * @param allItems  All items (for socketed item lookups).
 * @param gd  GameData instance.
 * @returns  New file bytes with the patched page.
 */
export function patchStashPage(originalBuffer, pageIndex, newPage, allItems, gd) {
    const sectors = [];
    let offset = 0;
    let sectorIndex = 0;
    while (offset < originalBuffer.length) {
        if (offset + PAGE_HEADER_SIZE > originalBuffer.length)
            break;
        const dv = new DataView(originalBuffer.buffer, originalBuffer.byteOffset + offset);
        const magic = dv.getUint32(0, true);
        if (magic !== D2I_MAGIC)
            break;
        const sectorSize = dv.getUint32(16, true);
        if (sectorSize < PAGE_HEADER_SIZE)
            break;
        if (sectorIndex === pageIndex) {
            // Replace this sector
            sectors.push(writeStashSector(newPage, allItems, gd));
        }
        else {
            // Copy original sector as-is
            sectors.push(originalBuffer.slice(offset, offset + sectorSize));
        }
        offset += sectorSize;
        sectorIndex++;
    }
    // Concatenate
    const totalSize = sectors.reduce((sum, s) => sum + s.length, 0);
    const result = new Uint8Array(totalSize);
    let writeOffset = 0;
    for (const sector of sectors) {
        result.set(sector, writeOffset);
        writeOffset += sector.length;
    }
    return result;
}
// ─── Internal ───────────────────────────────────────────────────
/**
 * Write a single D2I page sector (header + items).
 */
function writeStashSector(page, allItems, gd) {
    // Write item list first to know its size
    const itemBytes = writeItemList(page.entries, allItems, gd);
    const totalSize = PAGE_HEADER_SIZE + itemBytes.length;
    const writer = new BitWriter();
    // Header
    writer.writeUInt32(D2I_MAGIC); // 0x00: magic
    writer.writeUInt32(D2I_MODE); // 0x04: mode
    writer.writeUInt32(D2I_VERSION); // 0x08: version
    writer.writeUInt32(page.gold); // 0x0C: gold
    writer.writeUInt32(totalSize); // 0x10: sectorSize
    writer.writeUInt8(page.pageType); // 0x14: pageType
    // Padding: 43 zero bytes (0x15 to 0x3F)
    writer.writeBytes(new Uint8Array(43));
    // Items (JM header + entries)
    writer.writeBytes(itemBytes);
    return writer.toArray();
}
/**
 * Build item write entries from a normal stash page's slot array.
 */
function buildStashEntries(stash, allItems, gd) {
    const entries = [];
    const columns = gd.info?.stash?.columns || STASH_COLUMNS;
    for (let slot = 0; slot < stash.length; slot++) {
        const id = stash[slot];
        if (id == null)
            continue;
        const item = allItems[id];
        if (!item)
            continue;
        const x = slot % columns;
        const y = Math.floor(slot / columns);
        entries.push({
            item,
            location: { loc: 0, equip: 0, x, y, storage: 5 },
        });
    }
    return entries;
}
/**
 * Build item write entries from an extended virtual sub-page.
 *
 * Extended pages store items at stash location with position (0,0).
 * All items are just listed sequentially — position doesn't really matter
 * for extended pages since the game unpacks them by type.
 */
function buildExtendedEntries(subPage, allItems, _gd) {
    const entries = [];
    const stash = subPage.stash;
    const quantities = subPage.quantities;
    for (let i = 0; i < stash.length; i++) {
        const id = stash[i];
        if (id == null)
            continue;
        const item = allItems[id];
        if (!item)
            continue;
        // Get quantity from the sub-page
        const qty = Array.isArray(quantities)
            ? quantities[i]
            : quantities?.[i];
        const entryItem = qty != null && qty !== item.quantity
            ? { ...item, quantity: qty }
            : item;
        entries.push({
            item: entryItem,
            location: { loc: 0, equip: 0, x: 0, y: 0, storage: 5 },
        });
    }
    return entries;
}
//# sourceMappingURL=d2i-writer.js.map