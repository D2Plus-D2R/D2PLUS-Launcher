// Completed Oaths store their actual rolled aura and display-only bonuses.
// These values are the same ones used by the two-step Cube recipes.
export function applyOathTemplate(gd, item, mode = 'average') {
  const row = gd.uniqueItems[item.unique];
  const oath = gd.info.d2plus?.oathCharms?.find(a => a.uniqueIndex === row?.index);
  if (!oath || item.quality !== 7) return item;
  const level = mode === 'minimum' ? 1 : mode === 'maximum' ? 20 : 10;
  item.stats['item_aura#' + oath.skillId] = level;
  Object.assign(item.stats, oath.exactOutcomes.find(o => o.level === level).displayValues);
  return item;
}

export function checkOathPlacement(gd, viewItems, item) {
  if (item.quality !== 7 || gd.uniqueItems[item.unique]?.carry1 !== 1006) return;
  if (viewItems.some(i => gd.uniqueItems['unique' + i.unique_id]?.carry1 === 1006 ||
      gd.uniqueItems[i._native?.unique || i.unique]?.carry1 === 1006)) {
    throw new Error('A character can carry only one Oath charm. Store the existing Oath in the shared stash first.');
  }
}
