import { applyOathTemplate, checkOathPlacement } from './oath-templates.js';
import { uniqueStats, addProp, itemGetTypes } from './index.js';

export const PACK_SCHEMA = 'd2plus-item-pack/1';
const MATERIALS = new Set(['cfe', 'svs', 'eap', 'edi', 'eem', 'eru', 'esa', 'esk', 'eto', 'acs']);
const ALLOWED_FUNCS = new Set([1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24]);

function assert(condition, message) { if (!condition) throw new Error(message); }
function name(gd, key) { return gd.locale.strings[key] || key; }

// Templates reference canonical rows, never arbitrary stats from a downloaded pack.
// Changing a name in a pack cannot change the resulting item's identity or powers.
export function buildCatalog(saver) {
  const gd = saver.gd;
  const result = [];
  for (const [code, base] of Object.entries(gd.items)) {
    if (!/^[a-z0-9]{3}$/.test(code) || !base.invwidth || !base.invheight) continue;
    const types = itemGetTypes(gd, code);
    const category = MATERIALS.has(code) ? 'Crafting materials'
      : types.has('rune') ? 'Runes' : types.has('gem') ? 'Gems'
        : gd.weapons[code] ? 'Weapons' : gd.armor[code] ? 'Armor' : 'Supplies';
    // Ear, gold, quest and special engine-managed bases are not generic templates.
    if (code !== 'box' && category === 'Supplies' && !['poti', 'scro', 'book', 'key'].some(t => types.has(t))) continue;
    result.push({ id: `base:${code}`, name: gd.locale.strings[base.namestr] || base.name, category,
      base: code, level: base.levelreq || 0, width: base.invwidth, height: base.invheight });
  }
  for (const [kind, table, category] of [['unique', gd.uniqueItems, 'Uniques'], ['set', gd.setItems, 'Sets']]) {
    for (const [key, row] of Object.entries(table)) {
      const code = kind === 'unique' ? row.code : row.item;
      const base = gd.items[code];
      if (!base || row.enabled === 0 || !base.invwidth || !base.invheight) continue;
      result.push({ id: `${kind}:${key}`, name: name(gd, row.index), category: code === 'ztr' ? 'Trinkets' : category, base: code,
        level: row.lvlreq || 0, set: row.set ? name(gd, row.set) : '', width: base.invwidth, height: base.invheight });
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

function roll(min = 0, max = 0, mode) {
  assert(Number.isFinite(min) && Number.isFinite(max), 'Non-numeric property roll is not supported.');
  return mode === 'minimum' ? min : mode === 'maximum' ? max : Math.floor((min + max) / 2);
}

function checkProperties(gd, row) {
  for (const [field, code] of Object.entries(row)) {
    if (!/^(prop\d+|aprop\d+[ab])$/.test(field) || !code || code.startsWith('*')) continue;
    const property = gd.properties[code];
    assert(property && !gd.propertyGroups?.[code], `Property ${code} needs additional template support.`);
    for (let i = 1; i <= 7; i++) {
      assert(!property[`func${i}`] || ALLOWED_FUNCS.has(property[`func${i}`]),
        `Property ${code} uses an unsupported calculation.`);
    }
  }
}

// The binary format has fixed-width fields. Reject out-of-range stats instead
// of relying on the writer's bit truncation (which would produce weaker items).
export function validateNativeItemStats(gd, stats) {
  const allowed=new Set(gd.info.d2plus.nativeItemStatIds);
  for(const key of Object.keys(stats)) {
    if(key==='poison_count')continue;
    const stat=key.split('#')[0],definition=gd.itemStatCost[stat];
    assert(definition && allowed.has(definition.id), `Stat ${stat} is not supported by this D2PLUS profile; export blocked.`);
  }
}

export function validateItemStats(gd, item) {
  validateNativeItemStats(gd,item.stats);
  for (const [key, raw] of Object.entries(item.stats)) {
    if (key === 'poison_count') continue; // derived, not persisted
    const [stat, ...params] = key.split('#');
    const definition = gd.itemStatCost[stat];
    assert(definition && definition.id < 511 && definition.savebits, `Stat ${stat} cannot be stored safely.`);
    assert(Number.isInteger(raw), `Stat ${stat} has an unresolved roll.`);
    let value = raw;
    if (stat === 'item_undeaddamage_percent' && itemGetTypes(gd, item.base).has('blun')) value -= 50;
    let parameter = Number(params[0] || 0);
    if (/^item_skillon/.test(stat)) {
      assert(params.length === 2 && Number.isInteger(+params[1]) && +params[1] >= 1 && +params[1] <= 63,
        'Triggered skill level is outside the supported range.');
      assert(gd.skills[params[0]] && raw >= 0 && raw <= 100, 'Triggered skill/chance cannot be represented safely.');
      parameter = (+params[0] << 6) | +params[1];
    } else if (stat === 'item_charged_skill') {
      assert(gd.skills[params[0]] && params.length === 2 && +params[1] >= 1 && +params[1] <= 63 && raw >= 0 && raw <= 255,
        'Charged skill needs a supported level and charge count.');
      parameter = (+params[0] << 6) | +params[1];
      value = (raw << 8) | raw;
    } else if (stat === 'item_addskill_tab') {
      parameter = (Math.floor(parameter / 3) << 3) | (parameter % 3);
    } else {
      assert(params.length <= 1, `Stat ${stat} has unsupported parameters.`);
    }
    assert(Number.isInteger(parameter) && parameter >= 0 && parameter < 2 ** (definition.saveparambits || 0),
      `Stat ${stat} has an out-of-range parameter.`);
    const encoded = value + (definition.saveadd || 0);
    assert(encoded >= 0 && encoded < 2 ** definition.savebits, `Stat ${stat} exceeds the save format's range.`);
  }
}

// Semantic comparison excludes parser-local IDs, offsets, inferred affixes and
// derived poison_count, but includes identity, actual rolls and socket children.
export function itemSignature(item, allItems = {}) {
  const stats = Object.fromEntries(Object.entries(item.stats || {})
    .filter(([k, v]) => k !== 'poison_count' && Number(v) !== 0)
    .sort(([a], [b]) => a.localeCompare(b)));
  return { base: item.base, quality: item.quality || 2, unique: item.unique || '',
    ethereal: !!item.ethereal, unidentified: !!item.unidentified,
    sockets: item.sockets || 0, defense: item.defense || 0, quantity: item.quantity || 0,
    personalized: item.personalized || '', stats,
    setflags: item.setflags || 0, setBonusStats: (item.setBonusStats || Array.from({length:5},()=>({}))).map(s => Object.fromEntries(Object.entries(s).filter(([k,v])=>k!=='poison_count'&&v!==0).sort(([a],[b])=>a.localeCompare(b)))),
    children: (item.socketedItems || []).map(key => {
      if (allItems[key]) return itemSignature(allItems[key], allItems);
      return { base: String(key) };
    }) };
}

export function createTemplate(saver, entry, mode = 'average') {
  assert(['minimum', 'average', 'maximum'].includes(mode), 'Choose a supported roll preset.');
  const gd = saver.gd;
  const [kind, key, extra] = entry.id.split(':');
  assert(!extra && ['base', 'unique', 'set'].includes(kind), 'Unknown item template.');
  const row = kind === 'unique' ? gd.uniqueItems[key] : kind === 'set' ? gd.setItems[key] : null;
  const baseCode = kind === 'base' ? key : kind === 'unique' ? row?.code : row?.item;
  const base = gd.items[baseCode];
  assert(base, 'The template base does not exist in the loaded data.');
  const types = itemGetTypes(gd, baseCode);
  const item = { itemId: 1, base: baseCode, quality: kind === 'unique' ? 7 : kind === 'set' ? 5 : 2,
    ilvl: Math.min(99, Math.max(1, row?.lvl || base.level || 1)), unidentified: baseCode === 'ztr',
    ethereal: false, socketed: false, sockets: 0, socketedItems: [], stats: {},
    binaryOffset: { start: 0, end: 0 } };
  if (row) {
    checkProperties(gd, row);
    item.unique = key;
    item.uniqueValues = Array.from({ length: 12 }, (_, i) => roll(row[`min${i + 1}`], row[`max${i + 1}`], mode));
    uniqueStats(gd, item.stats, row, item.uniqueValues, item);
    if (kind === 'set' && row.addfunc) {
      item.setflags = 0;
      item.setBonusStats = Array.from({length:5},()=>({}));
      for (let i = 1; i <= 5; i++) for (const suffix of ['a','b']) {
        const tag = i + suffix, code = row['aprop'+tag];
        if (!code || code.startsWith('*')) continue;
        addProp(gd, item.setBonusStats[i-1], code, row['apar'+tag], row['amin'+tag], row['amax'+tag], roll(row['amin'+tag],row['amax'+tag],mode), item);
        item.setflags |= 1 << (i-1);
      }
    }
    if (item.stats.item_ethereal) { item.ethereal = true; delete item.stats.item_ethereal; }
    if (item.stats.item_numsockets) {
      item.sockets = item.stats.item_numsockets;
      item.socketed = true;
      delete item.stats.item_numsockets;
    }
  }
  if (types.has('blun')) item.stats.item_undeaddamage_percent = (item.stats.item_undeaddamage_percent || 0) + 50;
  if (types.has('armo')) item.defense = item.stats.item_armor_percent > 0 ? base.maxac + 1 : roll(base.minac, base.maxac, mode);
  if (base.stackable) item.quantity = Math.min(255, base.maxstack || 1);
  applyOathTemplate(gd, item, mode);
  validateItemStats(gd, item);
  for (const stats of item.setBonusStats || []) validateItemStats(gd, { ...item, stats });
  const encoded = saver.serializeItem(item, {});
  const decoded = saver.deserializeItem(encoded);
  assert(JSON.stringify(itemSignature(item)) === JSON.stringify(itemSignature(decoded.item, decoded.allItems)),
    'This template does not yet preserve all properties through the item writer. Creation is blocked.');
  return decoded.item;
}

export function findPlacement(gd, viewItems, item, target = 'inventory') {
  checkOathPlacement(gd, viewItems, item);
  const pages = { inventory: 1, stash: 5, cube: 4 };
  assert(Object.hasOwn(pages, target), 'Choose inventory, personal stash, or cube.');
  if (item.base === 'box' && (target === 'cube' || viewItems.some(i => i.type === 'box'))) throw new Error('A character can carry one Horadric Cube, outside its own contents.');
  if (target === 'cube' && !viewItems.some(i => i.type === 'box' && i.alt_position_id !== 4)) throw new Error('Add a Horadric Cube before placing items inside it.');
  const grid = gd.info[target];
  const base = gd.items[item.base];
  const occupied = viewItems.filter(i => i.location_id === 0 && i.alt_position_id === pages[target]);
  for (let y = 0; y <= grid.rows - base.invheight; y++) {
    for (let x = 0; x <= grid.columns - base.invwidth; x++) {
      if (!occupied.some(i => x < i.position_x + i.inv_width && x + base.invwidth > i.position_x
        && y < i.position_y + i.inv_height && y + base.invheight > i.position_y)) {
        return { location_id: 0, alt_position_id: pages[target], position_x: x, position_y: y };
      }
    }
  }
  throw new Error(`No free space in the ${target === 'stash' ? 'personal stash' : target}.`);
}

export function makePack(manifest, entries, title = 'D2PLUS collection') {
  return { schema: PACK_SCHEMA, title, profile: manifest.profile, saveVersion: 105,
    dataHash: manifest.sha256, entries: entries.map(e => ({ id: e.id, roll: e.roll || 'average' })) };
}

export function readPack(text, manifest, catalog) {
  assert(text.length <= 2 * 1024 * 1024, 'Item packs must be smaller than 2 MB.');
  const pack = JSON.parse(text);
  assert(pack && pack.schema === PACK_SCHEMA, 'Not a supported D2PLUS item pack. Legacy binary packs are not supported.');
  assert(pack.profile === manifest.profile && pack.saveVersion === 105 && pack.dataHash === manifest.sha256,
    'This pack was made for different D2PLUS tables. Load the matching data version first.');
  assert(Array.isArray(pack.entries) && pack.entries.length > 0 && pack.entries.length <= 3000,
    'A pack must contain between 1 and 3,000 templates.');
  const byId = new Map(catalog.map(e => [e.id, e]));
  const seen = new Set();
  return pack.entries.map(e => {
    assert(e && typeof e.id === 'string' && byId.has(e.id), 'Pack contains an unknown or disabled item.');
    assert(['minimum', 'average', 'maximum'].includes(e.roll), 'Pack contains an unsupported roll preset.');
    assert(!seen.has(e.id), 'Pack contains duplicate templates.');
    seen.add(e.id);
    return { ...byId.get(e.id), roll: e.roll };
  });
}
