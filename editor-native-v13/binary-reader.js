/**
 * BinaryReader — bit-level reader for D2R save files (Blizzless v105).
 *
 * Ported from d2planner/src/logic/binary/reader.js.
 * Supports byte-aligned reads, arbitrary-width bit reads,
 * and Huffman-decoded character reads for item codes.
 */
import { HUFFMAN_TREE } from './huffman.js';
const utf8Decoder = new TextDecoder('utf-8');
export class BinaryReader {
    /** Current position in bits */
    bitpos = 0;
    /** Underlying raw buffer */
    buffer;
    constructor(buffer) {
        this.buffer = buffer;
    }
    // ─── Byte-aligned reads (little-endian) ───────────────────────
    /** Read unsigned 8-bit integer (byte-aligned). */
    read8() {
        const value = this.buffer[this.bitpos >> 3];
        this.bitpos += 8;
        return value;
    }
    /** Read unsigned 16-bit integer, little-endian (byte-aligned). */
    read16() {
        const idx = this.bitpos >> 3;
        const value1 = this.buffer[idx];
        const value2 = this.buffer[idx + 1];
        this.bitpos += 16;
        return value1 | (value2 << 8);
    }
    /** Read unsigned 32-bit integer, little-endian (byte-aligned). */
    read32() {
        const idx = this.bitpos >> 3;
        const value1 = this.buffer[idx];
        const value2 = this.buffer[idx + 1];
        const value3 = this.buffer[idx + 2];
        const value4 = this.buffer[idx + 3];
        this.bitpos += 32;
        return (value1 | (value2 << 8) | (value3 << 16) | (value4 << 24)) >>> 0;
    }
    /** Peek at a byte at relative offset from current byte position (does NOT advance). */
    byte(offset) {
        return this.buffer[(this.bitpos >> 3) + offset];
    }
    // ─── String reads (byte-aligned) ──────────────────────────────
    /** Read a fixed-length ASCII string, stopping at the first NUL. */
    string(length) {
        const start = this.bitpos >> 3;
        const end = start + length;
        let index = this.buffer.indexOf(0, start);
        if (index < 0)
            index = end;
        else
            index = Math.min(index, end);
        const result = String.fromCharCode(...this.buffer.subarray(start, index));
        this.bitpos = end << 3;
        return result;
    }
    /** Read a fixed-length UTF-8 string, stopping at the first NUL. */
    utf8(length) {
        const start = this.bitpos >> 3;
        const end = start + length;
        let index = this.buffer.indexOf(0, start);
        if (index < 0)
            index = end;
        else
            index = Math.min(index, end);
        const result = utf8Decoder.decode(this.buffer.subarray(start, index));
        this.bitpos = end << 3;
        return result;
    }
    // ─── Positioning ──────────────────────────────────────────────
    /** Seek to an absolute byte position. */
    seek(pos) {
        this.bitpos = pos << 3;
    }
    /** Skip forward by `bytes` bytes. */
    skip(bytes) {
        this.bitpos += bytes << 3;
    }
    /** Align to the next byte boundary. */
    align() {
        this.bitpos = (this.bitpos + 7) & ~7;
    }
    // ─── Bit-level reads ─────────────────────────────────────────
    /** Read `count` bits as little-endian unsigned integer. */
    bits(count) {
        let result = 0;
        let shift = 0;
        let remaining = count;
        while (remaining) {
            const byteIdx = this.bitpos >> 3;
            const bit = this.bitpos & 7;
            const read = Math.min(remaining, 8 - bit);
            const value = (this.buffer[byteIdx] >> bit) & ((1 << read) - 1);
            result |= value << shift;
            shift += read;
            remaining -= read;
            this.bitpos += read;
        }
        return result >>> 0;
    }
    /** Read a single bit (0 or 1). */
    bit() {
        const result = (this.buffer[this.bitpos >> 3] >> (this.bitpos & 7)) & 1;
        this.bitpos += 1;
        return result;
    }
    /** Skip forward by `count` bits. */
    skipbits(count) {
        this.bitpos += count;
    }
    // ─── Huffman ──────────────────────────────────────────────────
    /** Read one Huffman-encoded character (for item type codes). */
    char() {
        let node = HUFFMAN_TREE;
        while (Array.isArray(node)) {
            node = node[this.bit()];
        }
        return node;
    }
    // ─── Utility ──────────────────────────────────────────────────
    /** Returns true when the reader has consumed the entire buffer. */
    eof() {
        return this.bitpos >= this.buffer.byteLength * 8;
    }
}
//# sourceMappingURL=binary-reader.js.map