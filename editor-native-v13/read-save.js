/**
 * Universal save file reader — auto-detects format and parses.
 */
import { detectFormat } from './detect.js';
import { readD2S } from './d2s-reader.js';
import { readD2I } from './d2i-reader.js';
import { D2RSaverError, ErrorCode } from './errors.js';
// ─── Public API ─────────────────────────────────────────────────
/**
 * Detect format and parse a save file buffer.
 *
 * @param buffer  Raw file bytes.
 * @param gd      GameData instance.
 * @returns Discriminated union with `type` and parsed `data`.
 * @throws {D2RSaverError} INVALID_FORMAT if file cannot be detected.
 */
export function readSave(buffer, gd) {
    const format = detectFormat(buffer);
    if (!format) {
        throw new D2RSaverError(ErrorCode.INVALID_FORMAT, 'File is not a valid Blizzless v105 d2s or d2i.');
    }
    if (format.type === 'd2s') {
        return { type: 'd2s', data: readD2S(buffer, gd) };
    }
    return { type: 'd2i', data: readD2I(buffer, gd) };
}
//# sourceMappingURL=read-save.js.map