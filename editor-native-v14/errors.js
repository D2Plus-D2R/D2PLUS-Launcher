/**
 * Typed error class for d2r-saver.
 *
 * All user-facing errors are instances of D2RSaverError with a machine-readable
 * `code` property for programmatic handling.
 */
// ─── Error codes ────────────────────────────────────────────────
/** Error code enum — all machine-readable error codes. */
export var ErrorCode;
(function (ErrorCode) {
    /** File is not a valid d2s or d2i. */
    ErrorCode["INVALID_FORMAT"] = "INVALID_FORMAT";
    /** Unrecognized or non-v105 file version. */
    ErrorCode["UNSUPPORTED_VERSION"] = "UNSUPPORTED_VERSION";
    /** Generic parse failure. */
    ErrorCode["PARSE_ERROR"] = "PARSE_ERROR";
    /** Checksum doesn't match (warning, usually non-blocking). */
    ErrorCode["CHECKSUM_MISMATCH"] = "CHECKSUM_MISMATCH";
    /** No free grid slot for placement. */
    ErrorCode["NO_FREE_SLOT"] = "NO_FREE_SLOT";
    /** Item with given ID not found. */
    ErrorCode["ITEM_NOT_FOUND"] = "ITEM_NOT_FOUND";
    /** Error during binary write. */
    ErrorCode["WRITE_ERROR"] = "WRITE_ERROR";
    /** Malformed portability token. */
    ErrorCode["INVALID_TOKEN"] = "INVALID_TOKEN";
    /** GameData has not been loaded yet. */
    ErrorCode["DATA_NOT_LOADED"] = "DATA_NOT_LOADED";
})(ErrorCode || (ErrorCode = {}));
// ─── Error class ────────────────────────────────────────────────
/**
 * Structured error thrown by d2r-saver operations.
 *
 * @example
 * ```ts
 * try {
 *   saver.extractItemD2S(buf, 999);
 * } catch (e) {
 *   if (e instanceof D2RSaverError && e.code === ErrorCode.ITEM_NOT_FOUND) {
 *     console.log('Item not found');
 *   }
 * }
 * ```
 */
export class D2RSaverError extends Error {
    name = 'D2RSaverError';
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
//# sourceMappingURL=errors.js.map