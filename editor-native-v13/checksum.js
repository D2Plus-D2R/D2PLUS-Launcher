/**
 * D2S checksum — compute and patch the rolling checksum used by D2R save files.
 *
 * Ported from d2planner `fixHeader()` in writed2s.js.
 *
 * Format layout (byte offsets):
 *   0x00  magic   (4 bytes, "aa 55 aa 55")
 *   0x04  version (4 bytes)
 *   0x08  filesize (4 bytes)  ← written by fixHeader
 *   0x0C  checksum (4 bytes)  ← written by fixHeader
 */
/** Byte offset of the file-size field. */
const OFFSET_FILESIZE = 0x08;
/** Byte offset of the checksum field. */
const OFFSET_CHECKSUM = 0x0c;
/**
 * Write the file size at offset 0x08 and compute + write the rolling checksum
 * at offset 0x0C. Must be called **after** all other data has been written.
 *
 * @param writer The `BitWriter` that contains the fully-written save data.
 */
export function fixHeader(writer) {
    const eof = Math.ceil(writer.offset / 8);
    // Write file size at 0x08
    writer.seekByte(OFFSET_FILESIZE).writeUInt32(eof);
    // Zero out the checksum field before computing
    writer.seekByte(OFFSET_CHECKSUM).writeUInt32(0);
    // Compute rolling checksum over the entire file
    let checksum = 0;
    for (let i = 0; i < eof; i++) {
        let byte = writer.seekByte(i).peekBytes(1)[0];
        if (checksum & 0x80000000) {
            byte += 1;
        }
        checksum = (byte + checksum * 2) >>> 0;
    }
    // Write checksum at 0x0C
    writer.seekByte(OFFSET_CHECKSUM).writeUInt32(checksum);
}
/**
 * Compute the checksum for a packed byte array (e.g. from `writer.toArray()`).
 * The checksum field at 0x0C is treated as zero during computation.
 *
 * @param data Complete file bytes.
 * @returns The 32-bit rolling checksum.
 */
export function computeChecksum(data) {
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
        let byte = data[i];
        // Skip the checksum field (4 bytes at 0x0C)
        if (i >= OFFSET_CHECKSUM && i < OFFSET_CHECKSUM + 4) {
            byte = 0;
        }
        if (checksum & 0x80000000) {
            byte += 1;
        }
        checksum = (byte + checksum * 2) >>> 0;
    }
    return checksum;
}
//# sourceMappingURL=checksum.js.map