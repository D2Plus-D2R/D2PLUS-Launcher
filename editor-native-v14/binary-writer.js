/**
 * BitWriter — bit-level writer for D2R save files (Blizzless v105).
 *
 * Ported from d2planner/src/logic/binary/writer.js.
 * Stores individual bits in an expanded Uint8Array (1 bit per byte),
 * then packs them on `toArray()`.
 *
 * Also provides Huffman character writing via `writeChar()`.
 */
import { HUFFMAN_LOOKUP } from './huffman.js';
const DEFAULT_CAPACITY = 8192;
export class BitWriter {
    /** Expanded bit storage: each byte holds 0 or 1. */
    bits;
    /** Current write/seek offset in bits. */
    offset = 0;
    /** High-water mark — total bit length. */
    length = 0;
    constructor(capacity = DEFAULT_CAPACITY) {
        this.bits = new Uint8Array(capacity);
    }
    // ─── Primitive bit writes ─────────────────────────────────────
    /** Write a single bit (0 or 1). */
    writeBit(value) {
        if (this.offset >= this.bits.length) {
            const resized = new Uint8Array(this.bits.length + 8192);
            resized.set(this.bits, 0);
            this.bits = resized;
        }
        this.bits[this.offset++] = value ? 1 : 0;
        if (this.offset > this.length)
            this.length = this.offset;
        return this;
    }
    /** Write an array of bits (expanded form: each element is 0 or 1). */
    writeBits(bitsArray, numberOfBits) {
        for (let i = 0; i < numberOfBits; i++) {
            this.writeBit(bitsArray[i]);
        }
        return this;
    }
    /** Write raw bytes, optionally limiting to `numberOfBits` bits. */
    writeBytes(bytes, numberOfBits = bytes.length * 8) {
        const toWrite = new Uint8Array(numberOfBits);
        let acc = 0;
        for (let j = 0; j < bytes.length && acc < numberOfBits; j++) {
            for (let k = 0; k < 8 && acc < numberOfBits; k++) {
                toWrite[acc++] = (bytes[j] >> k) & 1;
            }
        }
        return this.writeBits(toWrite, numberOfBits);
    }
    /** Alias for `writeBytes`. */
    writeArray(bytes, numberOfBits) {
        return this.writeBytes(bytes, numberOfBits);
    }
    // ─── Typed writes (little-endian) ─────────────────────────────
    /** Write an unsigned 8-bit value. */
    writeUInt8(value, numberOfBits = 8) {
        const buffer = new Uint8Array(1);
        new DataView(buffer.buffer).setUint8(0, value);
        return this.writeBytes(buffer, numberOfBits);
    }
    /** Write an unsigned 16-bit value (little-endian). */
    writeUInt16(value, numberOfBits = 16) {
        const buffer = new Uint8Array(2);
        new DataView(buffer.buffer).setUint16(0, value, true);
        return this.writeBytes(buffer, numberOfBits);
    }
    /** Write an unsigned 32-bit value (little-endian). */
    writeUInt32(value, numberOfBits = 32) {
        const buffer = new Uint8Array(4);
        new DataView(buffer.buffer).setUint32(0, value, true);
        return this.writeBytes(buffer, numberOfBits);
    }
    /** Write a UTF-8 string, padded/truncated to `numberOfBytes` bytes. */
    writeString(value, numberOfBytes) {
        const encoded = new TextEncoder().encode(value);
        const padded = new Uint8Array(numberOfBytes);
        padded.set(encoded.subarray(0, numberOfBytes));
        return this.writeBytes(padded, numberOfBytes * 8);
    }
    // ─── MSB bit write (used for specific flag fields) ────────────
    /** Write `bits` bits of `value` in MSB-first order. */
    writeBitsNumber(value, bits) {
        for (let i = bits - 1; i >= 0; i--) {
            this.writeBit((value >> i) & 1);
        }
        return this;
    }
    // ─── Huffman writes ───────────────────────────────────────────
    /** Write one Huffman-encoded character (for item type codes). */
    writeChar(ch) {
        const entry = HUFFMAN_LOOKUP[ch];
        if (!entry)
            throw new Error(`writeChar: unsupported character '${ch}'`);
        return this.writeUInt16(entry.v, entry.l);
    }
    // ─── Positioning / Peek ───────────────────────────────────────
    /** Seek to an absolute bit offset. */
    seekBit(offset) {
        this.offset = offset;
        if (this.offset > this.length)
            this.length = this.offset;
        return this;
    }
    /** Seek to an absolute byte offset. */
    seekByte(offset) {
        return this.seekBit(offset * 8);
    }
    /** Peek at `count` packed bytes starting from current offset (does NOT advance). */
    peekBytes(count) {
        const buffer = new Uint8Array(count);
        let byteIndex = 0;
        let bitIndex = 0;
        for (let i = 0; i < count * 8; ++i) {
            if (this.bits[this.offset + i]) {
                buffer[byteIndex] |= (1 << bitIndex) & 0xff;
            }
            bitIndex++;
            if (bitIndex >= 8) {
                byteIndex++;
                bitIndex = 0;
            }
        }
        return buffer;
    }
    // ─── Alignment ────────────────────────────────────────────────
    /** Align offset to next byte boundary (skip forward). */
    align() {
        this.offset = (this.offset + 7) & ~7;
        if (this.offset > this.length)
            this.length = this.offset;
        return this;
    }
    // ─── Output ───────────────────────────────────────────────────
    /** Pack expanded bit storage into a compact Uint8Array. */
    toArray() {
        const byteLen = this.length > 0 ? Math.ceil(this.length / 8) : 0;
        const buffer = new Uint8Array(byteLen);
        let byteIndex = 0;
        let bitIndex = 0;
        for (let i = 0; i < this.length; ++i) {
            if (this.bits[i]) {
                buffer[byteIndex] |= (1 << bitIndex) & 0xff;
            }
            ++bitIndex;
            if (bitIndex >= 8) {
                ++byteIndex;
                bitIndex = 0;
            }
        }
        return buffer;
    }
}
//# sourceMappingURL=binary-writer.js.map