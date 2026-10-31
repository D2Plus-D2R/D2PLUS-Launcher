const D2PLUS_PROFILE = Object.freeze({
  id: 'd2plus-v1.1-beta3',
  name: 'D2PLUS Hero Editor',
  modVersion: '1.1.0 Beta 3',
  dataProfile: '13x8-v1',

  // D2R 2.5+ uses 99. Reign of the Warlock-era saves use 105. The
  // application only registers 105 when constants have been compiled from
  // the final D2RMM output; substituting vanilla constants would corrupt
  // custom item/stat IDs.
  saveVersions: Object.freeze([99, 105]),
  constantsGlobalByVersion: Object.freeze({
    99: 'constants_d2plus',
    105: 'constants_d2plus',
  }),

  limits: Object.freeze({
    maxLevel: 100,
    maxEarnedSkillPoints: 111,
    maxEarnedStatPoints: 510,
    level100Experience: 3876195864,
  }),

  grids: Object.freeze({
    inventory: Object.freeze({ w: 13, h: 8, storagePage: 1 }),
    stash: Object.freeze({ w: 10, h: 10, storagePage: 5 }),
    cube: Object.freeze({ w: 3, h: 4, storagePage: 4 }),
  }),

  requiredData: Object.freeze([
    'custom runes and runewords',
    'Elder Gems and crafting currencies',
    'D2PLUS uniques and sets',
    'native-slot class passives',
    'Barbarian and Druid skill replacements',
    'Reign of the Warlock class data when present',
  ]),
});

module.exports = D2PLUS_PROFILE;
