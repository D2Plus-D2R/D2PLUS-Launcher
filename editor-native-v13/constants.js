/**
 * Enums & constants for Blizzless D2R v105 save format.
 */
// ─── Item Quality ───────────────────────────────────────────────
export var ItemQuality;
(function (ItemQuality) {
    ItemQuality[ItemQuality["LOW"] = 1] = "LOW";
    ItemQuality[ItemQuality["NORMAL"] = 2] = "NORMAL";
    ItemQuality[ItemQuality["SUPERIOR"] = 3] = "SUPERIOR";
    ItemQuality[ItemQuality["MAGIC"] = 4] = "MAGIC";
    ItemQuality[ItemQuality["SET"] = 5] = "SET";
    ItemQuality[ItemQuality["RARE"] = 6] = "RARE";
    ItemQuality[ItemQuality["UNIQUE"] = 7] = "UNIQUE";
    ItemQuality[ItemQuality["CRAFTED"] = 8] = "CRAFTED";
})(ItemQuality || (ItemQuality = {}));
// ─── Location / Storage ─────────────────────────────────────────
/** Where the item is in the save file (3-bit location field). */
export var LocationType;
(function (LocationType) {
    /** Stored in a location grid (inventory, cube, stash). */
    LocationType[LocationType["STORED"] = 0] = "STORED";
    /** Equipped on body. */
    LocationType[LocationType["EQUIPPED"] = 1] = "EQUIPPED";
    /** In belt. */
    LocationType[LocationType["BELT"] = 2] = "BELT";
    /** Socketed inside another item. */
    LocationType[LocationType["SOCKETED"] = 6] = "SOCKETED";
})(LocationType || (LocationType = {}));
/** Storage grid identifier (3-bit field for STORED items). */
export var StorageType;
(function (StorageType) {
    StorageType[StorageType["NONE"] = 0] = "NONE";
    StorageType[StorageType["INVENTORY"] = 1] = "INVENTORY";
    StorageType[StorageType["CUBE"] = 4] = "CUBE";
    StorageType[StorageType["STASH"] = 5] = "STASH";
})(StorageType || (StorageType = {}));
/** Body slot index for equipped items (4-bit bodyloc field). */
export var BodyLocation;
(function (BodyLocation) {
    BodyLocation[BodyLocation["NONE"] = 0] = "NONE";
    BodyLocation[BodyLocation["HEAD"] = 1] = "HEAD";
    BodyLocation[BodyLocation["NECK"] = 2] = "NECK";
    BodyLocation[BodyLocation["TORSO"] = 3] = "TORSO";
    BodyLocation[BodyLocation["RIGHT_HAND"] = 4] = "RIGHT_HAND";
    BodyLocation[BodyLocation["LEFT_HAND"] = 5] = "LEFT_HAND";
    BodyLocation[BodyLocation["RIGHT_RING"] = 6] = "RIGHT_RING";
    BodyLocation[BodyLocation["LEFT_RING"] = 7] = "LEFT_RING";
    BodyLocation[BodyLocation["WAIST"] = 8] = "WAIST";
    BodyLocation[BodyLocation["FEET"] = 9] = "FEET";
    BodyLocation[BodyLocation["GLOVES"] = 10] = "GLOVES";
})(BodyLocation || (BodyLocation = {}));
// ─── File format ────────────────────────────────────────────────
/** D2S magic signature. */
export const D2S_MAGIC = 0xaa55aa55;
/** D2I (stash) magic signature. */
export const D2I_MAGIC = 0x00535344; // "DST\0" in LE
/** Only supported version. */
export const BLIZZLESS_VERSION = 105;
// ─── Grid dimensions (Blizzless) ────────────────────────────────
export const STASH_WIDTH = 16;
export const STASH_HEIGHT = 13;
export const INVENTORY_WIDTH = 10;
export const INVENTORY_HEIGHT = 4;
export const CUBE_WIDTH = 3;
export const CUBE_HEIGHT = 4;
// ─── D2S section markers (v105 — no "JM" per-item headers) ─────
/** Section marker in d2s: item list section. */
export const SECTION_ITEMS = 0x4a4d; // "JM"
/** Section marker in d2s: character stats. */
export const SECTION_STATS = 0x6766; // "gf"
/** Section marker in d2s: extended section (v105). */
export const SECTION_EXTENDED = 0x666c; // "fl"
// ─── Portability token prefix ───────────────────────────────────
/** Prefix for serialized item tokens. */
export const TOKEN_PREFIX = 'd2r1:';
// ─── Character classes ──────────────────────────────────────────
export var CharacterClass;
(function (CharacterClass) {
    CharacterClass[CharacterClass["AMAZON"] = 0] = "AMAZON";
    CharacterClass[CharacterClass["SORCERESS"] = 1] = "SORCERESS";
    CharacterClass[CharacterClass["NECROMANCER"] = 2] = "NECROMANCER";
    CharacterClass[CharacterClass["PALADIN"] = 3] = "PALADIN";
    CharacterClass[CharacterClass["BARBARIAN"] = 4] = "BARBARIAN";
    CharacterClass[CharacterClass["DRUID"] = 5] = "DRUID";
    CharacterClass[CharacterClass["ASSASSIN"] = 6] = "ASSASSIN";
})(CharacterClass || (CharacterClass = {}));
export const CLASS_NAMES = {
    [CharacterClass.AMAZON]: 'Amazon',
    [CharacterClass.SORCERESS]: 'Sorceress',
    [CharacterClass.NECROMANCER]: 'Necromancer',
    [CharacterClass.PALADIN]: 'Paladin',
    [CharacterClass.BARBARIAN]: 'Barbarian',
    [CharacterClass.DRUID]: 'Druid',
    [CharacterClass.ASSASSIN]: 'Assassin',
};
//# sourceMappingURL=constants.js.map