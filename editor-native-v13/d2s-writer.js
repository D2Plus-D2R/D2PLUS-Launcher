/**
 * D2S (character save) writer — Blizzless v105 only.
 *
 * Ported from d2planner/src/logic/binary/writed2s.js → writeCharacter().
 * Simplified: v105 only — all version conditionals removed.
 *
 * Uses GameData instead of global Data/Locale/Store singletons.
 * Accepts an explicit profile + items dict instead of reading from state.
 */
import { BitWriter } from './binary-writer.js';
import { fixHeader } from './checksum.js';
import { GameData } from './game-data.js';
import { buildWriteEntries, writeItemList } from './item-writer.js';
// ─── Constants ──────────────────────────────────────────────────
/** Experience thresholds indexed by (level − 1). xp[0] = 0 means level 1. */
const xp = [
    0, 500, 1500, 3750, 7875, 14175, 22680, 32886, 44396, 57715,
    72144, 90180, 112725, 140906, 176132, 220165, 275207, 344008, 430010, 537513,
    671891, 839864, 1049830, 1312287, 1640359, 2050449, 2563061, 3203826, 3902260, 4663553,
    5493363, 6397855, 7383752, 8458379, 9629723, 10906488, 12298162, 13815086, 15468534, 17270791,
    19235252, 21376515, 23710491, 26254525, 29027522, 32050088, 35344686, 38935798, 42850109, 47116709,
    51767302, 56836449, 62361819, 68384473, 74949165, 82104680, 89904191, 98405658, 107672256, 117772849,
    128782495, 140783010, 153863570, 168121381, 183662396, 200602101, 219066380, 239192444, 261129853, 285041630,
    311105466, 339515048, 370481492, 404234916, 441026148, 481128591, 524840254, 572485967, 624419793, 681027665,
    742730244, 809986056, 883294891, 963201521, 1050299747, 1145236814, 1248718217, 1361512946, 1484459201, 1618470619,
    1764543065, 1923762030, 2097310703, 2286478756, 2492671933, 2717422497, 2962400612, 3229426756, 3520485254, 3837739017,
];
// ─── Public API ─────────────────────────────────────────────────
/**
 * Write a complete .d2s character save file (Blizzless v105).
 *
 * @returns Raw file bytes ready to be saved.
 */
export function writeD2S(opts) {
    const { profile, items, gd, name } = opts;
    const writer = new BitWriter();
    const classId = GameData.classes.indexOf(profile.class);
    if (classId < 0)
        throw new Error(`unknown class: ${profile.class}`);
    const skillIds = Object.values(gd.skills)
        .filter(skill => skill.charclass === profile.class)
        .map(skill => Number(skill.id))
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
    const skillCount = profile.rawHeader?.[0x1a] || skillIds.length || 30;
    if (skillIds.length < skillCount)
        throw new Error(`Skill layout declares ${skillCount} entries, but game data provides ${skillIds.length}.`);
    // ═══════════ HEADER ═══════════
    // Lossless path: copy the original fixed 833-byte v105 header verbatim when it
    // was captured by the reader. This preserves name, class, merc header, quests,
    // waypoints, appearance, difficulty, skill hotkeys, progression and timestamps
    // exactly. filesize + checksum (offsets 8/12) are re-patched by fixHeader.
    if (profile.rawHeader && profile.rawHeader.length >= 833) {
        writer.writeBytes(new Uint8Array(profile.rawHeader.slice(0, 833)));
    }
    else {
        writer.writeUInt32(0xaa55aa55); // 0x0000: magic
        writer.writeUInt32(105); // 0x0004: version
        writer.writeUInt32(0); // 0x0008: filesize (patched by fixHeader)
        writer.writeUInt32(0); // 0x000C: checksum (patched by fixHeader)
        writer.writeBytes(new Uint8Array(4)); // 0x0010: 4 zeros (v105 padding)
        // Status byte — v105: expansion=false
        const statusByte = writeStatus({
            hardcore: false,
            died: false,
            expansion: false,
            ladder: false,
        });
        writer.writeBytes(statusByte); // 0x0014
        writer.writeUInt8(15); // 0x0015: progression (15 = all acts complete)
        writer.writeUInt16(profile.weaponSet ?? 0); // 0x0016: active_arms
        writer.writeUInt8(classId); // 0x0018: class
        writer.writeBytes(new Uint8Array([0x10, skillCount])); // 0x0019: status extension + skill count
        writer.writeUInt8(profile.level || 1); // 0x001b: level
        writer.writeBytes(new Uint8Array(4)); // 0x001c: unknown zeros
        writer.writeUInt32(Math.floor(Date.now() / 1000)); // 0x0020: last_played (timestamp)
        writer.writeBytes(new Uint8Array([0xff, 0xff, 0xff, 0xff])); // 0x0024: unknown
        // Assigned skills (16 × 4 bytes = 64 bytes)
        writer.writeBytes(writeAssignedSkills()); // 0x0028
        // Left/right skills
        writer.writeUInt32(0); // 0x0068: left_skill  (Attack)
        writer.writeUInt32(0); // 0x006c: right_skill (Attack)
        writer.writeUInt32(0); // 0x0070: left_swap_skill
        writer.writeUInt32(0); // 0x0074: right_swap_skill
        // Char menu appearance (32 bytes)
        writer.writeBytes(writeDefaultAppearance()); // 0x0078: 16 graphics + 16 tints
        // Difficulty (3 bytes) — v105: {Normal:0, Nightmare:0, Hell:129}
        writer.writeUInt8(0); // Normal
        writer.writeUInt8(0); // Nightmare
        writer.writeUInt8(129); // Hell (0x81 = active + completed)
        // Map ID
        writer.writeUInt32(0); // 0x009b: map_id
        writer.writeBytes(new Uint8Array(2)); // 0x009f: unknown
        // Merc section
        writer.writeUInt16(0); // dead_merc
        if (profile.merc) {
            writer.writeUInt32(parseInt(profile.merc, 16) || 0); // merc_id
            writer.writeUInt16(profile.mercName || 0); // merc_name_id
            writer.writeUInt16(Number(profile.merc) || 0); // merc_type
            writer.writeUInt32(xp[(profile.mercLevel || 1) - 1] || 0); // merc_experience
        }
        else {
            writer.writeUInt32(0); // merc_id
            writer.writeUInt16(0); // merc_name_id
            writer.writeUInt16(0); // merc_type
            writer.writeUInt32(0); // merc_experience
        }
        // v105 extended block: 124 bytes + name(16) + 88 zeros
        const extBlock1 = new Uint8Array(124);
        extBlock1[73] = 0x03; // v105 expansion flag
        writer.writeBytes(extBlock1);
        writer.writeString(name || profile.name || '', 16);
        writer.writeBytes(new Uint8Array(88));
        // ═══════════ QUESTS ═══════════
        writer.writeString('Woo!', 4);
        writer.writeBytes(new Uint8Array([0x06, 0x00, 0x00, 0x00, 0x2a, 0x01]));
        writer.writeBytes(writeQuestsForDifficulty(profile.quests?.[0]));
        writer.writeBytes(writeQuestsForDifficulty(profile.quests?.[1]));
        writer.writeBytes(writeQuestsForDifficulty(profile.quests?.[2]));
        // ═══════════ WAYPOINTS ═══════════
        writer.writeString('WS', 2);
        writer.writeBytes(new Uint8Array([0x01, 0x00, 0x00, 0x00, 0x50, 0x00]));
        writer.writeBytes(writeWaypointData());
        // ═══════════ NPC DATA ═══════════
        writer.writeBytes(new Uint8Array([0x01, 0x77]));
        writer.writeUInt16(0x34);
        writer.writeBytes(new Uint8Array(0x30)); // blank NPC data
    } // end synthesised-header fallback
    // ═══════════ STATS ═══════════
    const statsBytes = writeCharacterStats(profile, gd, opts.charStats);
    writer.writeBytes(statsBytes);
    // ═══════════ SKILLS ═══════════
    writer.writeUInt16(0x6669);
    for (let i = 0; i < skillCount; i++) {
        writer.writeUInt8(profile.skills?.[skillIds[i]] || 0);
    }
    writer.align();
    // ═══════════ ITEMS ═══════════
    const playerEntries = buildWriteEntries(profile, items, gd, false);
    const playerItemBytes = writeItemList(playerEntries, items, gd);
    writer.writeBytes(playerItemBytes);
    // ═══════════ CORPSE ═══════════
    // Preserve corpse items verbatim when captured; otherwise emit "no corpse".
    if (profile.rawCorpse && profile.rawCorpse.length) {
        writer.writeBytes(new Uint8Array(profile.rawCorpse));
    }
    else {
        writer.writeUInt16(0x4d4a); // "JM"
        writer.writeUInt16(0); // 0 corpses
    }
    // ═══════════ MERC ITEMS ═══════════
    writer.writeUInt16(0x666a);
    if (profile.merc) {
        const mercEntries = buildWriteEntries(profile, items, gd, true);
        const mercItemBytes = writeItemList(mercEntries, items, gd);
        writer.writeBytes(mercItemBytes);
    }
    // ═══════════ IRON GOLEM ═══════════
    // Preserve the iron golem verbatim when captured; otherwise emit "no golem".
    if (profile.rawGolem && profile.rawGolem.length) {
        writer.writeBytes(new Uint8Array(profile.rawGolem));
    }
    else {
        writer.writeUInt16(0x666b);
        writer.writeUInt8(0);
    }
    // ═══════════ V105 EXTRA SECTIONS ═══════════
    // Preserve the source file's extra sections verbatim when they were captured
    // by the reader (e.g. warlock 0x666c bind-demon block). Otherwise write an
    // empty 0x666c marker.
    if (profile.extraSections && profile.extraSections.length) {
        writer.writeBytes(new Uint8Array(profile.extraSections));
    }
    else {
        writer.writeUInt16(1); // unknown flag/count
        writer.writeUInt16(0x666c); // v105 section marker
        writer.writeUInt16(0); // empty section data
    }
    // ═══════════ FINALIZE ═══════════
    fixHeader(writer);
    return writer.toArray();
}
// ─── Character Stats ────────────────────────────────────────────
/**
 * Build the binary stats section ("gf" header + stat entries + 0x1FF terminator).
 */
function writeCharacterStats(profile, gd, explicitStats) {
    const writer = new BitWriter();
    writer.writeString('gf', 2);
    // ── Faithful path ──────────────────────────────────────────────
    // When the parsed raw attribute map is available, re-emit every stat verbatim
    // (same stat id, csvbits width, and raw value — including the 8.8 fixed-point
    // life/mana/stamina) so gold, experience and all attributes round-trip exactly.
    // Targeted edits are applied by mutating profile.attributes before writeD2S.
    if (profile.attributes && Object.keys(profile.attributes).length) {
        for (const key of Object.keys(profile.attributes)) {
            const st = gd.itemStatCost[key];
            if (!st)
                continue;
            writer.writeUInt16(st.id, 9);
            writer.writeUInt32(profile.attributes[key] || 0, st.csvbits ?? 0);
        }
        writer.writeUInt16(0x1ff, 9);
        writer.align();
        return writer.toArray();
    }
    // ── Legacy synth path (brand-new characters without a parsed stat map) ──
    const classId = GameData.classes.indexOf(profile.class);
    const base = gd.charStats[profile.class];
    // Compute final stat values (base class + allocated points)
    const str = (base?.str ?? 0) + (profile.stats?.str ?? 0);
    const dex = (base?.dex ?? 0) + (profile.stats?.dex ?? 0);
    const eng = (base?.int ?? 0) + (profile.stats?.int ?? 0);
    const vit = (base?.vit ?? 0) + (profile.stats?.vit ?? 0);
    // Use explicit stats if provided, otherwise compute defaults
    const hp = explicitStats?.maxhp ?? computeHP(base, profile);
    const mana = explicitStats?.maxmana ?? computeMana(base, profile);
    const stamina = explicitStats?.maxstamina ?? computeStamina(base, profile);
    // Remaining stat/skill points
    const spentStatPts = (profile.stats?.str ?? 0) + (profile.stats?.dex ?? 0) +
        (profile.stats?.int ?? 0) + (profile.stats?.vit ?? 0);
    const totalStatPts = (profile.level - 1) * 5 + countQuestStatPoints(profile.quests);
    const statpts = explicitStats?.statpts ?? Math.max(0, totalStatPts - spentStatPts);
    const spentSkillPts = Object.values(profile.skills || {}).reduce((s, v) => s + v, 0);
    const totalSkillPts = (profile.level - 1) + countQuestSkillPoints(profile.quests);
    const newskills = explicitStats?.newskills ?? Math.max(0, totalSkillPts - spentSkillPts);
    const level = profile.level || 1;
    const experience = xp[level - 1] || 0;
    const statMap = [
        { key: 'strength', value: explicitStats?.strength ?? str },
        { key: 'energy', value: explicitStats?.energy ?? eng },
        { key: 'dexterity', value: explicitStats?.dexterity ?? dex },
        { key: 'vitality', value: explicitStats?.vitality ?? vit },
        { key: 'statpts', value: statpts },
        { key: 'newskills', value: newskills },
        { key: 'hitpoints', value: explicitStats?.hitpoints ?? hp },
        { key: 'maxhp', value: hp },
        { key: 'mana', value: explicitStats?.mana ?? mana },
        { key: 'maxmana', value: mana },
        { key: 'stamina', value: explicitStats?.stamina ?? stamina },
        { key: 'maxstamina', value: stamina },
        { key: 'level', value: level },
        { key: 'experience', value: experience },
        { key: 'gold', value: 990000 },
        { key: 'goldbank', value: 2500000 },
    ];
    for (let i = 0; i < statMap.length; i++) {
        const s = statMap[i];
        const stat = gd.itemStatCost[s.key];
        if (!stat)
            continue;
        let value = s.value || 0;
        // HP, mana, stamina (indices 6-11) are stored shifted left by 8
        if (i >= 6 && i <= 11)
            value <<= 8;
        writer.writeUInt16(stat.id, 9);
        writer.writeUInt32(value, stat.csvbits ?? 0);
    }
    // Terminator
    writer.writeUInt16(0x1ff, 9);
    writer.align();
    return writer.toArray();
}
// ─── Stat computation helpers ───────────────────────────────────
function computeHP(base, profile) {
    // base HP + vit × hpPerVit
    const baseHP = base?.hpl ?? 50;
    const hpPerVit = base?.['life_per_vitality'] ?? 3;
    return baseHP + (profile.stats?.vit ?? 0) * hpPerVit;
}
function computeMana(base, profile) {
    const baseMana = base?.mnl ?? 15;
    const manaPerEng = base?.['mana_per_magic'] ?? 2;
    return baseMana + (profile.stats?.int ?? 0) * manaPerEng;
}
function computeStamina(base, profile) {
    const baseStamina = base?.stl ?? 80;
    const stamPerVit = base?.['stamina_per_vitality'] ?? 1;
    return baseStamina + (profile.stats?.vit ?? 0) * stamPerVit;
}
/** Count stat points awarded by quests (Den of Evil × 3 difficulties). */
function countQuestStatPoints(quests) {
    if (!quests)
        return 0;
    let pts = 0;
    for (const diff of quests) {
        // Den of Evil rewards 5 stat points per difficulty in LoD
        // Lam Esen's Tome rewards 5 stat points per difficulty
        if (diff?.denofevil)
            pts += 5;
        if (diff?.lamessenstome)
            pts += 5;
    }
    return pts;
}
/** Count skill points awarded by quests. */
function countQuestSkillPoints(quests) {
    if (!quests)
        return 0;
    let pts = 0;
    for (const diff of quests) {
        // Radament's Lair rewards 1 skill point per difficulty
        // The Fallen Angel rewards 2 skill points per difficulty
        if (diff?.radamentslair)
            pts += 1;
        if (diff?.thefallenangel)
            pts += 2;
    }
    return pts;
}
// ─── Header helpers ─────────────────────────────────────────────
/** Encode status byte. */
function writeStatus(status) {
    const arr = new Uint8Array(1);
    if (status.hardcore)
        arr[0] |= 1 << 2;
    if (status.died)
        arr[0] |= 1 << 3;
    if (status.expansion)
        arr[0] |= 1 << 5;
    if (status.ladder)
        arr[0] |= 1 << 6;
    return arr;
}
/** 16 assigned skill slots × 4 bytes. Default: all empty (0xffff). */
function writeAssignedSkills() {
    const w = new BitWriter();
    for (let i = 0; i < 16; i++) {
        w.writeUInt32(0xffff);
    }
    return w.toArray();
}
/** Default character menu appearance — all 0xff (invisible). */
function writeDefaultAppearance() {
    const arr = new Uint8Array(32);
    arr.fill(0xff);
    return arr;
}
// ─── Quest helpers ──────────────────────────────────────────────
/**
 * Write 96 bytes of quest data for one difficulty.
 *
 * We write a simplified version: only the quests the reader cares about
 * (den_of_evil, radaments_lair, golden_bird, lam_esens_tome,
 * the_fallen_angel, prison_of_ice) are flagged. Everything else is zeroed.
 *
 * The reader checks byte(2)&1 for den_of_evil, byte(18)&1 for radaments_lair, etc.
 */
function writeQuestsForDifficulty(q) {
    const buf = new Uint8Array(96);
    if (!q)
        return buf;
    // Act I
    // introduced = 1 (16-bit at offset 0)
    buf[0] = 1;
    // den_of_evil: 2 bytes at offset 2 (quest 0) — byte(2) bit 0 = is_completed
    if (q.denofevil)
        buf[2] = 1;
    // sisters_to_the_slaughter: offset 12, mark act I completed at offset 14
    if (q.denofevil) {
        // Mark act I completed + introduced Act II
        buf[14] = 1; // act I completed
        buf[16] = 1; // act II introduced
    }
    // Act II
    // radaments_lair: 2 bytes at offset 18 (quest 0 of act II) — byte(18) bit 0
    if (q.radamentslair)
        buf[18] = 1;
    // the_seven_tombs completed → act II done + act III intro
    buf[30] = 0; // act II completed
    buf[32] = 1; // act III introduced
    // Act III
    // lam_esens_tome: offset 34 — byte(34) bit 0
    if (q.lamessenstome)
        buf[34] = 1;
    // the_golden_bird: offset 40 — byte(40) bit 0
    if (q.thegoldenbird)
        buf[40] = 1;
    // Act IV
    // introduced at offset 48
    buf[48] = 1;
    // the_fallen_angel: offset 50 — byte(50) bit 0
    if (q.thefallenangel)
        buf[50] = 1;
    // Act V
    // introduced
    buf[62] = 1;
    // prison_of_ice: offset 74 — byte(74) bit 0
    if (q.prisonofice)
        buf[74] = 1;
    return buf;
}
// ─── Waypoint helpers ───────────────────────────────────────────
/** Write 72 bytes of waypoint data (3 difficulties × 24 bytes). */
function writeWaypointData() {
    const w = new BitWriter();
    for (let i = 0; i < 3; i++) {
        w.writeBytes(writeWaypointsForDifficulty());
    }
    return w.toArray();
}
/** Write 24 bytes of waypoints for one difficulty — all waypoints enabled. */
function writeWaypointsForDifficulty() {
    const w = new BitWriter();
    w.writeBytes(new Uint8Array([0x02, 0x01])); // header
    // 39 waypoint bits — all enabled
    w.writeBytes(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x7f]));
    w.align();
    w.writeBytes(new Uint8Array(17)); // padding
    return w.toArray();
}
//# sourceMappingURL=d2s-writer.js.map