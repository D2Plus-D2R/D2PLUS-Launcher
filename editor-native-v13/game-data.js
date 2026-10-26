/**
 * GameData — central registry of processed game data tables.
 *
 * Replaces the d2planner `Data` singleton. Instead of a global,
 * GameData instances are created once and passed to all consumers.
 *
 * Ported from: d2planner/src/data/index.js + d2planner/src/data/load.js (processData).
 * Simplified: Blizzless v105 only — no version filtering, no browser/UI code.
 */
// ─── GameData class ─────────────────────────────────────────────
export class GameData {
    // ── Raw tables (from data.json, post-process) ───────────────
    armor;
    weapons;
    misc;
    itemStatCost;
    itemTypes;
    uniqueItems;
    setItems;
    sets;
    runes;
    magicPrefix;
    magicSuffix;
    autoMagic;
    crafted;
    qualityItems;
    gems;
    skills;
    properties;
    states;
    monsters;
    missiles;
    hireling;
    charStats;
    rarePrefix;
    rareSuffix;
    /** Property groups (e.g. random skill-tab grants). Expanded into `mods["<group>:N"]` at load. */
    propertyGroups;
    /** Unique-mod table (used by warlock bind-demon parsing). */
    uniqueMods;
    /** Super-unique monster table. */
    superUniques;
    info;
    strings;
    // ── Derived / computed ──────────────────────────────────────
    /** Merged map: armor + misc + weapons. */
    items;
    /** Merged map: autoMagic + magicPrefix + magicSuffix + crafted + qualityItems + staffMods. */
    mods;
    /** Generated staff mod affix definitions. */
    staffMods;
    /** skill.skill.toLowerCase() → SkillEntry */
    skillByName;
    /** state.state.toLowerCase() → StateEntry */
    stateByName;
    /** missile.missile.toLowerCase() → MissileEntry */
    missileByName;
    /** monster.hcidx → MonsterEntry */
    monsterById;
    /** Locale lookup tables. */
    locale;
    // ── Static class metadata ───────────────────────────────────
    static classes = ['ama', 'sor', 'nec', 'pal', 'bar', 'dru', 'ass', 'war'];
    static classNames = {
        ama: 'Amazon',
        sor: 'Sorceress',
        nec: 'Necromancer',
        pal: 'Paladin',
        bar: 'Barbarian',
        dru: 'Druid',
        ass: 'Assassin',
        war: 'Warlock',
    };
    static strClassSkillsStat = [
        'ModStr3a', 'ModStr3d', 'ModStr3c', 'ModStr3b', 'ModStr3e',
        'ModStre8a', 'ModStre8b', 'ModStrge9',
    ];
    static strClassOnly = [
        'AmaOnly', 'SorOnly', 'NecOnly', 'PalOnly',
        'BarOnly', 'DruOnly', 'AssOnly', 'WarOnly',
    ];
    static strSkilltabStat = [
        'StrSklTabItem3', 'StrSklTabItem2', 'StrSklTabItem1',
        'StrSklTabItem15', 'StrSklTabItem14', 'StrSklTabItem13',
        'StrSklTabItem8', 'StrSklTabItem7', 'StrSklTabItem9',
        'StrSklTabItem6', 'StrSklTabItem5', 'StrSklTabItem4',
        'StrSklTabItem11', 'StrSklTabItem12', 'StrSklTabItem10',
        'StrSklTabItem16', 'StrSklTabItem17', 'StrSklTabItem18',
        'StrSklTabItem19', 'StrSklTabItem20', 'StrSklTabItem21',
        'StrSklTabItem24', 'StrSklTabItem22', 'StrSklTabItem23',
    ];
    // ── Construction ────────────────────────────────────────────
    constructor() { }
    /**
     * Create GameData by loading from file system.
     */
    static async fromFile(dataPath, stringsPath) {
        // Lazy import so node:fs/promises + node:path only load when fromFile is
        // actually called (Node contexts). Browser consumers use fromRaw/fromData.
        // Browser builds use fromData/fromRaw and must not bundle loader.js,
        // which intentionally imports node:fs/promises and node:path.
        const { loadDataFromFile } = await import(/* webpackIgnore: true */ './loader.js');
        const loaded = await loadDataFromFile(dataPath, stringsPath);
        return GameData.fromLoaded(loaded);
    }
    /**
     * Create GameData from pre-parsed JSON objects.
     */
    static fromRaw(rawData, locale) {
        return GameData.fromLoaded({ rawData, locale });
    }
    /**
     * Internal: create and process from loaded data.
     */
    static fromLoaded(loaded) {
        const gd = new GameData();
        gd.processData(loaded.rawData, loaded.locale);
        return gd;
    }
    // ── processData ─────────────────────────────────────────────
    processData(rawData, locale) {
        // 1. Merge all raw tables onto this instance
        Object.assign(this, rawData);
        // 2. Stash defaults
        if (!this.info.stash) {
            this.info.stash = { rows: 13, columns: 16 }; // Blizzless dimensions
        }
        // 3. Locale setup
        this.locale = { strings: {}, istrings: [], stringi: {} };
        for (let index = 0; index < locale.length; ++index) {
            const entry = locale[index];
            if (entry) {
                this.locale.istrings[index] = entry[1];
                this.locale.strings[entry[0]] = entry[1];
                this.locale.stringi[entry[0]] = index;
            }
        }
        // 4. itemStatCost priority reorder
        this.reorderStatPriorities();
        // 5. Generate staff mods
        this.generateStaffMods();
        // 6. Version filtering — SKIPPED for Blizzless v105 (always latest)
        // (no GameVersion < 100 branch, no version filtering)
        // 7. Magic prefix/suffix filter (keep version > 0, Blizzless GameVersion = 100)
        this.magicPrefix = filterRows(this.magicPrefix, row => row.version > 0 && row.version <= 100);
        this.magicSuffix = filterRows(this.magicSuffix, row => row.version > 0 && row.version <= 100);
        // 8. Hireling filter (Blizzless uses version 100)
        for (const id in this.hireling) {
            const hirelings = this.hireling[id];
            if (Array.isArray(hirelings)) {
                this.hireling[id] =
                    hirelings.filter(row => row.version === 100);
            }
        }
        // 9. Merged items dict
        this.items = { ...this.armor, ...this.misc, ...this.weapons };
        // 10. Merged mods dict
        this.mods = {
            ...this.autoMagic,
            ...this.magicPrefix,
            ...this.magicSuffix,
            ...this.crafted,
            ...this.qualityItems,
            ...this.staffMods,
        };
        // 11. Mod fixups
        this.fixupMods();
        // 11b. Expand propertyGroups into mods (matches d2planner data/load.js).
        // Each group `<name>` produces one mod per concrete option, keyed `<name>:<n>`.
        if (this.propertyGroups) {
            for (const [name, pg] of Object.entries(this.propertyGroups)) {
                let v = 0;
                for (let i = 1; i <= 8; i++) {
                    const prop = pg[`prop${i}`];
                    if (!prop)
                        continue;
                    const parmin = pg[`parmin${i}`];
                    const parmax = pg[`parmax${i}`];
                    const w = pg[`modmin${i}`];
                    const M = pg[`modmax${i}`];
                    if (parmin != null && parmax != null && parmin < parmax) {
                        for (let p = parmin; p <= parmax; p++) {
                            this.mods[`${name}:${++v}`] = {
                                name: `${name}:${v}`,
                                version: 100,
                                level: 1,
                                levelreq: 0,
                                mod1code: prop,
                                mod1param: p,
                                mod1min: w,
                                mod1max: M,
                            };
                        }
                    }
                    else {
                        this.mods[`${name}:${++v}`] = {
                            name: `${name}:${v}`,
                            version: 100,
                            level: 1,
                            levelreq: 0,
                            mod1code: prop,
                            mod1param: parmax,
                            mod1min: w,
                            mod1max: M,
                        };
                    }
                }
            }
        }
        // 12. Lookup maps
        this.buildLookupMaps();
        // 13. itemStatCost overrides
        if (this.itemStatCost.item_extra_stack) {
            this.itemStatCost.item_extra_stack.descfunc = 1;
            this.itemStatCost.item_extra_stack.descval = 2;
        }
        if (this.itemStatCost.item_replenish_quantity) {
            this.itemStatCost.item_replenish_quantity.descfunc = 99;
        }
        // 14. Locale patch
        if (this.locale.strings.ModStre9vx) {
            this.locale.strings.ModStre9vx = `${this.locale.strings.ModStre9vx} [1 in %d sec.]`;
        }
    }
    // ── Processing helpers ──────────────────────────────────────
    reorderStatPriorities() {
        const statList = [];
        for (const id in this.itemStatCost) {
            const stat = this.itemStatCost[id];
            let priority = (stat.descpriority || 0) + stat.id * 0.001;
            if (id === 'item_magicbonus' || id === 'passive_cold_mastery' || id === 'passive_pois_mastery') {
                priority += 0.1;
            }
            else if (id === 'item_preventheal' || id === 'item_replenish_durability') {
                priority -= 0.1;
            }
            statList.push([id, priority]);
        }
        statList.sort((a, b) => a[1] - b[1]);
        statList.forEach(([id], i) => { this.itemStatCost[id].descpriority = i; });
    }
    generateStaffMods() {
        this.staffMods = {};
        const staffILvl = { 1: 1, 6: 1, 12: 12, 18: 19, 24: 25, 30: 37 };
        for (const id in this.skills) {
            const skill = this.skills[id];
            if (!skill.charclass || !staffILvl[skill.reqlevel ?? 0])
                continue;
            const mod = {
                name: `staff${id}`,
                version: skill.reqlevel === 30 ? 100 : 1,
                rare: 1,
                level: staffILvl[skill.reqlevel],
                levelreq: skill.reqlevel,
                classspecific: skill.charclass,
                group: 600 + parseInt(id),
                multiply: skill.costmult,
                add: skill.costadd,
                mod1code: 'skill',
                mod1param: parseInt(id),
                mod1min: 1,
                mod1max: 3,
            };
            let itypes = 0;
            for (const typeId in this.itemTypes) {
                if (this.itemTypes[typeId].staffmods === skill.charclass) {
                    mod[`itype${++itypes}`] = typeId;
                }
            }
            this.staffMods[`staff${id}`] = mod;
        }
    }
    fixupMods() {
        // Normalize sock/rep-quant mods
        for (const mod of Object.values(this.mods)) {
            if ((mod.mod1code === 'sock' || mod.mod1code === 'rep-quant') && mod.mod1param && !mod.mod1min && !mod.mod1max) {
                mod.mod1min = mod.mod1param;
                mod.mod1max = mod.mod1param;
                delete mod.mod1param;
            }
        }
        // Fix dmg-ac min/max inversion
        for (const row of Object.values(this.mods)) {
            for (let i = 1; i <= 5; i++)
                fixmod(row, `mod${i}code`, `mod${i}min`, `mod${i}max`);
        }
        for (const row of Object.values(this.uniqueItems)) {
            for (let i = 1; i <= 12; i++)
                fixmod(row, `prop${i}`, `min${i}`, `max${i}`);
        }
        for (const row of Object.values(this.setItems)) {
            for (let i = 1; i <= 9; i++)
                fixmod(row, `prop${i}`, `min${i}`, `max${i}`);
            for (let i = 1; i <= 5; i++) {
                fixmod(row, `aprop${i}a`, `amin${i}a`, `amax${i}a`);
                fixmod(row, `aprop${i}b`, `amin${i}b`, `amax${i}b`);
            }
        }
        for (const row of Object.values(this.sets)) {
            for (let i = 2; i <= 5; i++) {
                fixmod(row, `pcode${i}a`, `pmin${i}a`, `pmax${i}a`);
                fixmod(row, `pcode${i}b`, `pmin${i}b`, `pmax${i}b`);
            }
            for (let i = 1; i <= 8; i++)
                fixmod(row, `fcode${i}`, `fmin${i}`, `fmax${i}`);
        }
    }
    buildLookupMaps() {
        this.skillByName = {};
        for (const skill of Object.values(this.skills)) {
            this.skillByName[skill.skill.toLowerCase()] = skill;
        }
        this.stateByName = {};
        for (const state of Object.values(this.states)) {
            this.stateByName[state.state.toLowerCase()] = state;
        }
        this.missileByName = {};
        for (const missile of Object.values(this.missiles)) {
            const m = missile;
            if (m.srcdamage) {
                m.srcdam = m.srcdamage;
                delete m.srcdamage;
            }
            this.missileByName[missile.missile.toLowerCase()] = missile;
        }
        this.monsterById = [];
        for (const monster of Object.values(this.monsters)) {
            this.monsterById[monster.hcidx] = monster;
            const m = monster;
            if ((rawData => rawData)(this.monstersEx)) {
                const monstersEx = this.monstersEx;
                if (m.monstatsex && monstersEx[m.monstatsex]) {
                    Object.assign(monster, monstersEx[m.monstatsex]);
                }
            }
        }
    }
}
// ─── Utility functions ──────────────────────────────────────────
function filterRows(table, fn) {
    const result = {};
    for (const id in table) {
        if (fn(table[id]))
            result[id] = table[id];
    }
    return result;
}
function fixmod(row, prop, min, max) {
    if (row[prop] === 'sock')
        row.sockets = true;
    if (row[prop] === 'dmg-ac' && row[min] > row[max]) {
        const tmp = row[min];
        row[min] = row[max];
        row[max] = tmp;
    }
}
//# sourceMappingURL=game-data.js.map