import { repairLegacyFireStats } from './native-save-repair.mjs';
import {rebuildCharacterPreview} from './character-preview.mjs';
import {readProgression,writeProgression} from './progression.mjs';
import { validateCharacterFields } from './character-model.mjs';
import { D2RSaver } from './index.js';
import { createTemplate, findPlacement, itemSignature, validateNativeItemStats } from './item-library.mjs';

const BODY_SLOT_TO_ID = {
  head: 1,
  neck: 2,
  tors: 3,
  rarm: 4,
  larm: 5,
  rrin: 6,
  lrin: 7,
  belt: 8,
  feet: 9,
  glov: 10,
  rarm2: 11,
  larm2: 12,
};

const STATUS_OFFSET = 0x14;
const STATUS_BITS = {
  hardcore: 1 << 2,
  died: 1 << 3,
  expansion: 1 << 5,
  ladder: 1 << 6,
};

const EDITABLE_ATTRIBUTE_KEYS = [
  'strength', 'energy', 'dexterity', 'vitality', 'statpts', 'newskills',
  'hitpoints', 'maxhp', 'mana', 'maxmana', 'stamina', 'maxstamina',
  'level', 'experience', 'gold', 'goldbank',
];

function placementItem(binary, key, location) {
  return { binary, key, ...location };
}

function allPlacements(document) {
  const { profile, items } = document.parsed;
  const inventoryColumns = document.saver.gd.info.inventory.columns;
  const cubeColumns = document.saver.gd.info.cube.columns;
  const stashColumns = document.saver.gd.info.stash.columns;
  const result = [];
  for (const [slot, key] of Object.entries(profile.items || {})) {
    result.push(placementItem(items[key], key, { location_id: 1, equipped_id: BODY_SLOT_TO_ID[slot] || 0 }));
  }
  for (const [index, key] of (profile.inventory || []).entries()) {
    if (key != null) result.push(placementItem(items[key], key, { location_id: 0, alt_position_id: 1, position_x: index % inventoryColumns, position_y: Math.floor(index / inventoryColumns) }));
  }
  for (const [index, key] of (profile.cube || []).entries()) {
    if (key != null) result.push(placementItem(items[key], key, { location_id: 0, alt_position_id: 4, position_x: index % cubeColumns, position_y: Math.floor(index / cubeColumns) }));
  }
  for (const [index, key] of (profile.stash || []).entries()) {
    if (key != null) result.push(placementItem(items[key], key, { location_id: 0, alt_position_id: 5, position_x: index % stashColumns, position_y: Math.floor(index / stashColumns) }));
  }
  for (const [index, key] of (profile.belt || []).entries()) {
    if (key != null) result.push(placementItem(items[key], key, { location_id: 2, position_x: index, position_y: 0 }));
  }
  return result;
}

function itemName(binary, base, gameData) {
  if (binary.unidentified) return binary.base==='ztr'?'Unidentified Ring':`Unidentified ${base.name || binary.base}`;
  if (binary.unique?.startsWith('unique')) return gameData.uniqueItems[binary.unique]?.index || base.name;
  if (binary.unique?.startsWith('set')) return gameData.setItems[binary.unique]?.index || base.name;
  if (binary.unique?.startsWith('runeword')) return gameData.runes[binary.unique]?.name || base.name;
  return base.name || binary.base;
}

function viewItem(document, placement) {
  const gameData = document.saver.gd;
  const binary = placement.binary || { base: String(placement.key), quality: 2, socketedItems: [], stats: {} };
  const base = gameData.items[binary.base] || {};
  const uniqueId = binary.unique?.startsWith('unique') ? Number(binary.unique.slice(6)) : 0;
  const setId = binary.unique?.startsWith('set') ? Number(binary.unique.slice(3)) : 0;
  const runewordId = binary.unique?.startsWith('runeword') ? Number(binary.unique.slice(8)) : 0;
  return {
    _d2plusItemKey: placement.key,
    type: binary.base,
    art_identity: binary.unique || '',
    picture_id: binary.iconIndex ?? 0,
    type_name: gameData.locale.strings[itemName(binary, base, gameData)] || itemName(binary, base, gameData),
    inv_file: base.invfile || base.i || '',
    inv_width: base.invwidth || 1,
    inv_height: base.invheight || 1,
    quality: binary.quality || 2,
    level: binary.ilvl || 1,
    required_level: Math.max(base.levelreq||0,gameData.uniqueItems[binary.unique]?.lvlreq||0,gameData.setItems[binary.unique]?.lvlreq||0),
    identified: binary.unidentified ? 0 : 1,
    identified_name: gameData.locale.strings[gameData.uniqueItems[binary.unique]?.index] || gameData.uniqueItems[binary.unique]?.index || base.name,
    unidentified_name: binary.base==='ztr'?'Unidentified Ring':`Unidentified ${base.name || binary.base}`,
    trinket: binary.base==='ztr',
    ethereal: binary.ethereal ? 1 : 0,
    socketed: binary.socketed ? 1 : 0,
    total_nr_of_sockets: binary.sockets || 0,
    socketed_items: [],
    magic_attributes: [],
    displayed_combined_magic_attributes: [],
    unique_id: uniqueId,
    set_id: setId,
    runeword_id: runewordId,
    given_runeword: runewordId ? 1 : 0,
    ...placement,
    binary: undefined,
    key: undefined,
  };
}

function className(code, gameData) {
  return gameData.constructor.classNames[code] || code;
}

function viewAttributes(profile) {
  const raw = profile.attributes || {};
  return {
    strength: raw.strength || 0,
    energy: raw.energy || 0,
    dexterity: raw.dexterity || 0,
    vitality: raw.vitality || 0,
    unused_stats: raw.statpts || 0,
    unused_skill_points: raw.newskills || 0,
    current_hp: Math.floor((raw.hitpoints || 0) / 256),
    max_hp: Math.floor((raw.maxhp || 0) / 256),
    current_mana: Math.floor((raw.mana || 0) / 256),
    max_mana: Math.floor((raw.maxmana || 0) / 256),
    current_stamina: Math.floor((raw.stamina || 0) / 256),
    max_stamina: Math.floor((raw.maxstamina || 0) / 256),
    level: raw.level || profile.level || 1,
    experience: raw.experience || 0,
    gold: raw.gold || 0,
    stashed_gold: raw.goldbank || 0,
  };
}

function viewSkills(document) {
  const { profile } = document.parsed;
  return Object.values(document.saver.gd.skills)
    .filter((skill) => skill.charclass === profile.class)
    .sort((a, b) => Number(a.id) - Number(b.id))
    .slice(0, profile.rawHeader?.[0x1a] || 30)
    .map((skill) => {
      const description = document.saver.gd.skillDesc?.[skill.skilldesc] || {};
      const strings = document.saver.gd.locale.strings;
      return {
        id: Number(skill.id),
        name: strings[description.strname]
          || strings[`skillname${skill.id}`]
          || strings[`${skill.skilldesc}_name`]
          || skill.skill,
        description: strings[description.strlong]
          || strings[description.strshort]
          || strings[`${skill.skilldesc}_text`]
          || '',
        points: profile.skills?.[skill.id] || 0,
        max: skill.maxlvl || 20,
      };
    });
}

export async function loadV105Backend() {
  const [dataResponse, stringsResponse, manifestResponse] = await Promise.all([
    fetch('d2plus/v105_data.json'),
    fetch('d2plus/v105_strings.json'),
    fetch('d2plus/v105_data.manifest.json'),
  ]);
  if (!dataResponse.ok || !stringsResponse.ok || !manifestResponse.ok) throw new Error('D2PLUS v105 backend data pack is missing.');
  const [dataText, strings, manifest] = await Promise.all([dataResponse.text(), stringsResponse.json(), manifestResponse.json()]);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataText));
  const hash = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
  if (hash !== manifest.sha256) throw new Error('D2PLUS data fingerprint does not match its manifest. Rebuild the pack.');
  const saver = D2RSaver.fromData(JSON.parse(dataText), strings);
  saver.d2plusManifest = manifest;
  return saver;
}

export function readV105Document(saver, bytes) {
  let originalBytes = new Uint8Array(bytes), parsed, importRepair=[];
  try {
    parsed=saver.readD2S(originalBytes);
    if(parsed.warnings.length)throw Error('Unrecognized item data.');
  } catch(originalError) {
    let repaired;
    try { repaired=repairLegacyFireStats(originalBytes,saver.gd); } catch { throw originalError; }
    if(!repaired.changes.length)throw originalError;
    originalBytes=repaired.bytes;importRepair=repaired.changes;parsed=saver.readD2S(originalBytes);
  }
  const document = { saver, parsed, originalBytes, importRepair, sourceRecords:{}, sourceLocations:{} };
  const start=parsed.profile.rawPlayerStart,end=parsed.profile.rawPlayerEnd;
  const placements=allPlacements(document).sort((a,b)=>a.binary.binaryOffset.start-b.binary.binaryOffset.start);
  if(parsed.warnings.length||!Number.isInteger(start)||!Number.isInteger(end)||originalBytes[start]!==74||originalBytes[start+1]!==77
    ||new DataView(originalBytes.buffer).getUint16(start+2,true)!==placements.length)throw new Error('The entire player item list could not be accounted for. Editing is blocked.');
  placements.forEach((p,i)=>{
    const from=p.binary.binaryOffset.start/8,to=i+1<placements.length?placements[i+1].binary.binaryOffset.start/8:end;
    if(!Number.isInteger(from)||from<start+4||to>end||to<=from)throw new Error('Invalid item record boundary.');
    document.sourceRecords[p.key]=originalBytes.slice(from,to);
    document.sourceLocations[p.key]=locationKey(p);
  });
  document.originalMetadata=metadataKey(toEditorSave(document));
  return document;
}

function metadataKey(save){return JSON.stringify({header:save.header,attributes:save.attributes,skills:save.skills});}
function locationKey(p){return JSON.stringify([p.location_id,p.equipped_id||0,p.alt_position_id||0,p.position_x||0,p.position_y||0]);}
function setBits(bytes,offset,width,value){for(let bit=0;bit<width;bit++){const p=offset+bit,mask=1<<(p%8);bytes[p>>3]=(bytes[p>>3]&~mask)|(((value>>>bit)&1)<<(p%8));}}

// Preserve native item records, including socket children and fields absent
// from the display model. The original tail (corpse, mercenary, golem, extra
// sections) also remains verbatim. Only moved-item coordinates are patched.
function writePreservingRecords(document,save){
  const {originalBytes:source,parsed,saver}=document;
  if(!source)throw new Error('Reopen the original game save before exporting.');
  let prefix=source.slice(0,parsed.profile.rawPlayerStart);
  if(metadataKey(save)!==document.originalMetadata){const candidate=saver.writeD2S(parsed.profile,parsed.items);const check=saver.readD2S(candidate);prefix=candidate.slice(0,check.profile.rawPlayerStart);}
  if(save.header.rebuildPreview){rebuildCharacterPreview(parsed.profile,parsed.items);prefix.set(parsed.profile.rawHeader);}
  const placements=allPlacements(document),order=Object.keys(document.sourceRecords);
  placements.sort((a,b)=>{const ai=order.indexOf(String(a.key)),bi=order.indexOf(String(b.key));return(ai<0?Infinity:ai)-(bi<0?Infinity:bi);});
  const records=placements.map(p=>{
    const original=document.sourceRecords[p.key];
    const bytes=original?new Uint8Array(original):Uint8Array.from(atob(saver.serializeItem(p.binary,parsed.items).split(':')[1]),c=>c.charCodeAt(0));
    if(!original||locationKey(p)!==document.sourceLocations[p.key]){
      setBits(bytes,35,3,p.location_id);setBits(bytes,38,4,p.equipped_id||0);setBits(bytes,42,4,p.position_x||0);setBits(bytes,46,4,p.position_y||0);setBits(bytes,50,3,p.alt_position_id||0);
    }
    setBits(bytes,4,1,p.binary.unidentified?0:1);
    return bytes;
  });
  const tail=source.slice(parsed.profile.rawPlayerEnd),size=prefix.length+4+records.reduce((n,r)=>n+r.length,0)+tail.length;
  const result=new Uint8Array(size),view=new DataView(result.buffer);result.set(prefix);result.set([74,77],prefix.length);view.setUint16(prefix.length+2,records.length,true);
  let offset=prefix.length+4;for(const record of records){result.set(record,offset);offset+=record.length;}result.set(tail,offset);
  view.setUint32(8,size,true);view.setUint32(12,0,true);let checksum=0;for(const byte of result)checksum=(checksum*2+byte+(checksum>>>31))>>>0;view.setUint32(12,checksum,true);
  return result;
}

export function toEditorSave(document) {
  const profile = document.parsed.profile;
  const status = profile.rawHeader?.[STATUS_OFFSET] || 0;
  return {
    header: {
      identifier: 'aa55aa55',
      version: 105,
      name: profile.name,
      class: className(profile.class, document.saver.gd),
      level: profile.level,
      campaign: readProgression(profile.rawHeader),
      status: {
        expansion: Boolean(status & STATUS_BITS.expansion),
        ladder: Boolean(status & STATUS_BITS.ladder),
        hardcore: Boolean(status & STATUS_BITS.hardcore),
        died: Boolean(status & STATUS_BITS.died),
      },
    },
    attributes: viewAttributes(profile),
    skills: viewSkills(document),
    items: allPlacements(document).map((placement) => viewItem(document, placement)),
    merc_items: [],
    corpse_items: [],
    golem_item: null,
  };
}

function writeAscii(bytes, offset, length, value) {
  for (let i = 0; i < length; i += 1) bytes[offset + i] = i < value.length ? value.charCodeAt(i) : 0;
}

function finiteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function writeStatus(rawHeader, status) {
  let value = rawHeader[STATUS_OFFSET] || 0;
  for (const [key, bit] of Object.entries(STATUS_BITS)) {
    if (status?.[key]) value |= bit;
    else value &= ~bit;
  }
  rawHeader[STATUS_OFFSET] = value;
}

export function applyEditorSave(document, save) {
  const profile = document.parsed.profile;
  const inventoryColumns = document.saver.gd.info.inventory.columns;
  const cubeColumns = document.saver.gd.info.cube.columns;
  const stashColumns = document.saver.gd.info.stash.columns;
  const raw = profile.attributes || (profile.attributes = {});
  const view = save.attributes;
  const fixedPoint=(value,original)=>Number(value)===Math.floor((original||0)/256)?original||0:Math.max(0,Math.round(finiteNumber(value,(original||0)/256)*256));
  Object.assign(raw, {
    strength: finiteNumber(view.strength, raw.strength),
    energy: finiteNumber(view.energy, raw.energy),
    dexterity: finiteNumber(view.dexterity, raw.dexterity),
    vitality: finiteNumber(view.vitality, raw.vitality),
    statpts: finiteNumber(view.unused_stats, raw.statpts),
    newskills: finiteNumber(view.unused_skill_points, raw.newskills),
    hitpoints: fixedPoint(view.current_hp,raw.hitpoints),
    maxhp: fixedPoint(view.max_hp,raw.maxhp),
    mana: fixedPoint(view.current_mana,raw.mana),
    maxmana: fixedPoint(view.max_mana,raw.maxmana),
    stamina: fixedPoint(view.current_stamina,raw.stamina),
    maxstamina: fixedPoint(view.max_stamina,raw.maxstamina),
    level: finiteNumber(view.level, raw.level),
    experience: finiteNumber(view.experience, raw.experience),
    gold: finiteNumber(view.gold, raw.gold),
    goldbank: finiteNumber(view.stashed_gold, raw.goldbank),
  });
  profile.name = save.header.name;
  profile.level = raw.level;
  if (profile.rawHeader) {
    profile.rawHeader[0x1b] = raw.level;
    writeAscii(profile.rawHeader, 299, 16, profile.name);
    writeStatus(profile.rawHeader, save.header.status);
    writeProgression(profile.rawHeader,save.header.campaign);
  }
  profile.skills = Object.fromEntries(save.skills
    .map((skill) => [finiteNumber(skill.id), finiteNumber(skill.points)])
    .filter(([, points]) => points > 0));

  profile.items = {};
  profile.inventory = [];
  profile.cube = [];
  profile.stash = [];
  profile.belt = [];
  const idToSlot = Object.fromEntries(Object.entries(BODY_SLOT_TO_ID).map(([slot, id]) => [id, slot]));
  const usedCells = new Set();
  const usedKeys = new Set();
  for (const item of save.items) {
    const key = item._d2plusItemKey;
    if (key == null || !document.parsed.items[key]) throw new Error('Unrecognized item in the editor; export blocked.');
    if (usedKeys.has(String(key))) throw new Error('Duplicate item reference; export blocked.');
    usedKeys.add(String(key));
    if (![0,1,2].includes(item.location_id)) throw Error('Unsupported item location; export blocked.');
    document.parsed.items[key].unidentified = !item.identified;
    if(item.location_id===1){
      if(!idToSlot[item.equipped_id])throw Error('Unsupported equipment slot.');
      const slot='body:'+item.equipped_id;if(usedCells.has(slot))throw Error('Two items occupy one equipment slot.');usedCells.add(slot);
    }
    if(item.location_id===2){
      const pos=item.position_x;if(!Number.isInteger(pos)||pos<0||pos>15)throw Error('Invalid belt position.');
      const slot='belt:'+pos;if(usedCells.has(slot))throw Error('Two items occupy one belt slot.');usedCells.add(slot);
    }
    if(item.type==='box'&&item.location_id===0&&item.alt_position_id===4)throw Error('A Horadric Cube cannot be stored inside itself.');
    if (item.location_id === 0) {
      const target = { 1: 'inventory', 4: 'cube', 5: 'stash' }[item.alt_position_id];
      const size = document.saver.gd.info[target];
      const base = document.saver.gd.items[document.parsed.items[key].base];
      const x = item.position_x, y = item.position_y;
      if (!size || !base || !Number.isInteger(x) || !Number.isInteger(y)
        || x < 0 || y < 0 || x + base.invwidth > size.columns || y + base.invheight > size.rows) {
        throw new Error('Item exceeds its storage boundary; export blocked.');
      }
      for (let dy = 0; dy < base.invheight; dy++) for (let dx = 0; dx < base.invwidth; dx++) {
        const cell = `${target}:${x + dx}:${y + dy}`;
        if (usedCells.has(cell)) throw new Error('Items overlap; export blocked.');
        usedCells.add(cell);
      }
    }
    if (item.location_id === 1 && idToSlot[item.equipped_id]) profile.items[idToSlot[item.equipped_id]] = key;
    else if (item.location_id === 2) profile.belt[item.position_x || 0] = key;
    else if (item.location_id === 0 && item.alt_position_id === 1) profile.inventory[item.position_y * inventoryColumns + item.position_x] = key;
    else if (item.location_id === 0 && item.alt_position_id === 4) profile.cube[item.position_y * cubeColumns + item.position_x] = key;
    else if (item.location_id === 0 && item.alt_position_id === 5) profile.stash[item.position_y * stashColumns + item.position_x] = key;
  }
  if(save.items.filter(i=>i.type==='box').length>1)throw Error('A character may carry only one Horadric Cube.');
  if(profile.cube.some(k=>k!=null)&&!save.items.some(i=>i.type==='box'))throw Error('Cube contents require a Horadric Cube.');
  return document;
}

function placementSignature(document) {
  return allPlacements(document)
    .map((placement) => `${JSON.stringify(itemSignature(placement.binary || { base: String(placement.key) }, document.parsed.items))}:${placement.location_id}:${placement.equipped_id || 0}:${placement.alt_position_id || 0}:${placement.position_x || 0}:${placement.position_y || 0}`)
    .sort();
}

function statusSignature(profile) {
  return (profile.rawHeader?.[STATUS_OFFSET] || 0)
    & Object.values(STATUS_BITS).reduce((mask, bit) => mask | bit, 0);
}

function attributeSignature(profile) {
  return Object.fromEntries(EDITABLE_ATTRIBUTE_KEYS.map((key) => [key, Number(profile.attributes?.[key] || 0)]));
}

function skillSignature(profile) {
  return Object.entries(profile.skills || {})
    .filter(([, points]) => Number(points) > 0)
    .map(([id, points]) => `${Number(id)}:${Number(points)}`)
    .sort();
}

export function writeAndAuditV105(document, save) {
  // Audit a detached draft. A rejected operation cannot mutate the open save.
  document = { ...document, parsed: structuredCloneRaw(document.parsed) };
  validateCharacterFields(document.saver.gd, save);
  applyEditorSave(document, save);
  for(const item of Object.values(document.parsed.items)) {
    validateNativeItemStats(document.saver.gd,item.stats||{});
    for(const stats of item.setBonusStats||[])validateNativeItemStats(document.saver.gd,stats);
  }
  const expected = {
    name: document.parsed.profile.name,
    level: Number(document.parsed.profile.level),
    status: statusSignature(document.parsed.profile),
    campaign: readProgression(document.parsed.profile.rawHeader),
    attributes: attributeSignature(document.parsed.profile),
    skills: skillSignature(document.parsed.profile),
    placements: placementSignature(document),
  };
  const bytes = writePreservingRecords(document,save);
  const reparsed = readV105Document(document.saver, bytes);
  const actual = {
    name: reparsed.parsed.profile.name,
    level: Number(reparsed.parsed.profile.level),
    status: statusSignature(reparsed.parsed.profile),
    campaign: readProgression(reparsed.parsed.profile.rawHeader),
    attributes: attributeSignature(reparsed.parsed.profile),
    skills: skillSignature(reparsed.parsed.profile),
    placements: placementSignature(reparsed),
  };
  const ok = JSON.stringify(expected) === JSON.stringify(actual)
    && reparsed.parsed.warnings.length === 0;
  return {
    bytes,
    reparsed,
    ok,
    error: ok ? null : 'The v105 round-trip changed character, skills, item properties, or placement data. Export blocked.',
  };
}

// Vue wraps documents in proxies; structuredClone cannot clone those directly.
// Preserve raw header bytes and sparse arrays while unwrapping plain objects.
function structuredCloneRaw(value) {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (Array.isArray(value)) return value.map(structuredCloneRaw);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, structuredCloneRaw(v)]));
  return value;
}

export function insertTemplateV105(document, save, entry, target, mode) {
  const item = createTemplate(document.saver, entry, mode);
  const placement = findPlacement(document.saver.gd, save.items, item, target);
  const draft = { ...document, parsed: structuredCloneRaw(document.parsed) };
  // Parser keys and persistent GUIDs are different concepts. Allocate both.
  let key = Math.max(0, ...Object.keys(draft.parsed.items).map(Number).filter(Number.isFinite)) + 1;
  while (Object.hasOwn(draft.parsed.items, key)) key++;
  const usedGuids = new Set(Object.values(draft.parsed.items).map(i => i.guid));
  const random = new Uint32Array(1);
  do { crypto.getRandomValues(random); } while (!random[0] || usedGuids.has(random[0]));
  item.guid = random[0];
  item.itemId = key;
  draft.parsed.items[key] = item;
  const next = { ...save, items: [...save.items, viewItem(draft, placementItem(item, key, placement))] };
  const audit = writeAndAuditV105(draft, next);
  if (!audit.ok) throw new Error(audit.error);
  return { document: audit.reparsed, save: toEditorSave(audit.reparsed) };
}
