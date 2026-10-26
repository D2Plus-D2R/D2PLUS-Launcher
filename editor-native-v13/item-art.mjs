// One resolver for character items and library templates. Only bundled paths
// are returned; the editor remains fully offline and never changes item data.
export function resolveItemArt(manifest, item) {
  const code=item.type||item.base;
  if(code==='ztr' && (item.identified===0 || item.unidentified))return manifest.bases.rin;
  if(manifest.custom[code])return manifest.custom[code];
  const identity=item.art_identity||item.unique||'';
  const fixed=manifest.uniques[identity]||manifest.sets[identity];
  if(fixed&&!fixed.usesBaseArt)return fixed;
  const variants=manifest.variants[code];
  const picture=item.picture_id??item.iconIndex;
  if(variants&&Number.isInteger(picture)&&variants[picture])return variants[picture];
  return fixed||manifest.bases[code]||manifest.files[String(item.inv_file||'').toLowerCase()]||null;
}

export function artForTemplate(manifest, entry) {
  const [kind,key]=entry.id.split(':');
  return resolveItemArt(manifest,{base:entry.base,art_identity:kind==='base'?'':key});
}
