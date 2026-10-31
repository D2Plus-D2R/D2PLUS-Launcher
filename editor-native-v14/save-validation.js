const D2PLUS_PROFILE = require('./profile.js');

const D2S_IDENTIFIER = 0xaa55aa55;

function readSavePreamble(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.byteLength < 8) {
    return { valid: false, identifier: null, version: null };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const identifier = view.getUint32(0, true);
  const version = view.getUint32(4, true);
  return {
    valid: identifier === D2S_IDENTIFIER,
    identifier,
    version,
  };
}

function gridForItem(item, profile = D2PLUS_PROFILE) {
  if (item?.location_id !== 0) return null;
  if (item.alt_position_id === profile.grids.inventory.storagePage) {
    return { name: 'inventory', ...profile.grids.inventory };
  }
  if (item.alt_position_id === profile.grids.stash.storagePage) {
    return { name: 'personal stash', ...profile.grids.stash };
  }
  if (item.alt_position_id === profile.grids.cube.storagePage) {
    return { name: 'Horadric Cube', ...profile.grids.cube };
  }
  return null;
}

function validateItemGeometry(items, profile = D2PLUS_PROFILE) {
  const errors = [];
  for (const [index, item] of (items || []).entries()) {
    const grid = gridForItem(item, profile);
    if (!grid) continue;

    const x = Number(item.position_x);
    const y = Number(item.position_y);
    const w = Number(item.inv_width);
    const h = Number(item.inv_height);
    if (![x, y, w, h].every(Number.isFinite) || w < 1 || h < 1) {
      errors.push(`Item ${index + 1} has invalid ${grid.name} dimensions.`);
      continue;
    }
    if (x < 0 || y < 0 || x + w > grid.w || y + h > grid.h) {
      errors.push(
        `Item ${index + 1} (${item.type || 'unknown'}) exceeds the ${grid.w}x${grid.h} ${grid.name} boundary at ${x},${y}.`,
      );
    }
  }
  return errors;
}

function validateSave(save, profile = D2PLUS_PROFILE) {
  const errors = [];
  const warnings = [];

  if (!save?.header) {
    return { ok: false, errors: ['No parsed character header is available.'], warnings };
  }

  if (!profile.saveVersions.includes(Number(save.header.version))) {
    errors.push(`Save version ${save.header.version} is not supported by ${profile.name}.`);
  }

  const level = Number(save.header.level);
  if (!Number.isInteger(level) || level < 1 || level > profile.limits.maxLevel) {
    errors.push(`Character level must be between 1 and ${profile.limits.maxLevel}.`);
  }

  errors.push(...validateItemGeometry(save.items, profile));

  if (Number(save.header.version) === 105) {
    warnings.push('Version 105 support requires constants compiled from the same final D2PLUS/D2RMM table output as this save.');
  }
  warnings.push('Keep the original .d2s backup until the exported character has loaded and saved successfully in D2R.');

  return { ok: errors.length === 0, errors, warnings };
}

function projectItem(item) {
  return {
    type: item?.type ?? null,
    quality: item?.quality ?? null,
    location_id: item?.location_id ?? null,
    equipped_id: item?.equipped_id ?? null,
    position_x: item?.position_x ?? null,
    position_y: item?.position_y ?? null,
    alt_position_id: item?.alt_position_id ?? null,
    unique_id: item?.unique_id ?? null,
    set_id: item?.set_id ?? null,
    runeword_id: item?.runeword_id ?? null,
    socketCount: item?.socketed_items?.length ?? 0,
  };
}

function projectSave(save) {
  return {
    header: {
      identifier: save?.header?.identifier ?? null,
      version: save?.header?.version ?? null,
      name: save?.header?.name ?? null,
      class: save?.header?.class ?? null,
      level: save?.header?.level ?? null,
    },
    attributes: save?.attributes ?? {},
    skills: (save?.skills || []).map((skill) => ({
      id: skill.id ?? null,
      name: skill.name ?? skill.skill ?? null,
      points: skill.points ?? null,
    })),
    items: (save?.items || []).map(projectItem),
    mercItems: (save?.merc_items || []).map(projectItem),
    corpseItems: (save?.corpse_items || []).map(projectItem),
    golemItem: save?.golem_item ? projectItem(save.golem_item) : null,
  };
}

function compareRoundTrip(before, after) {
  const expected = JSON.stringify(projectSave(before));
  const actual = JSON.stringify(projectSave(after));
  return {
    ok: expected === actual,
    error: expected === actual ? null : 'The parser/writer round trip changed character, skill, or item identity data.',
  };
}

module.exports = {
  D2S_IDENTIFIER,
  compareRoundTrip,
  projectSave,
  readSavePreamble,
  validateItemGeometry,
  validateSave,
};
