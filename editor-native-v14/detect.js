/**
 * Save file format detection — Blizzless v105 only.
 *
 * Ported from d2planner/src/logic/binary/index.js → detectFormat().
 * Simplified: only accepts version 105.
 */
import { D2S_MAGIC, BLIZZLESS_VERSION } from './constants.js';
/**
 * Read a 32-bit LE unsigned int at the given byte offset.
 */
function readU32(data, offset) {
    return (data[offset] |
        (data[offset + 1] << 8) |
        (data[offset + 2] << 16) |
        (data[offset + 3] << 24)) >>> 0;
}
/**
 * Detect whether `data` is a valid Blizzless v105 .d2s or .d2i file.
 *
 * @returns Format info or `null` if not recognized / unsupported version.
 */
export function detectFormat(data) {
    if (data.length < 16)
        return null;
    const magic = readU32(data, 0);
    if (magic !== D2S_MAGIC)
        return null;
    // Check d2s version at offset 4
    const d2sVersion = readU32(data, 4);
    if (d2sVersion === BLIZZLESS_VERSION) {
        return { type: 'd2s', version: BLIZZLESS_VERSION };
    }
    // Check d2i version at offset 8
    const d2iVersion = readU32(data, 8);
    if (d2iVersion === BLIZZLESS_VERSION) {
        return { type: 'd2i', version: BLIZZLESS_VERSION };
    }
    return null;
}
//# sourceMappingURL=detect.js.map