import {RitualLab, totalStats} from './ritual-lab-model.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asset = path => new URL(path, import.meta.url).href;
const groups = {wand:'Caster weapon',staf:'Caster weapon',orb:'Caster weapon',weap:'Weapon',armo:'Armor',ring:'Ring',amul:'Amulet',jewl:'Jewel'};
const statLine = stat => stat.text ? esc(stat.text) : `${Number(stat.value) > 0?'+':''}${esc(stat.value)}${esc(stat.unit ?? '')} ${esc(stat.label)}`;
const bonusLine = bonus => `${statLine(bonus)} <small>(${bonus.min}–${bonus.max}${esc(bonus.unit)})</small>`;

function itemTooltip(item) {
  if (!item) return '<div class="rl-empty-preview"><span aria-hidden="true">◇</span><p>Select a unique from the inventory.</p></div>';
  return `<div class="rl-item-tooltip${item.rare?' rl-rare':''}">
    <h4>${esc(item.name)}</h4><div class="rl-item-base">${esc(item.base)}${item.variant?' · '+esc(item.variant):''}</div>
    ${item.rare ? '<p class="rl-rare-copy">The unique is lost.</p><p class="rl-muted">In game, this base receives new rare affixes. Rare affixes are not simulated here; the original unique powers are gone.</p>' : `
    ${item.accursed ? `<div class="rl-accursed">Accursed</div><div class="rl-added">${item.bonuses.map(b=>`<div>${bonusLine(b)}</div>`).join('')}</div><p class="rl-included">Bonuses above are included in the totals below.</p>`:''}
    <p class="rl-requirement">Required Level: ${esc(item.level)}</p>
    <div class="rl-stats">${(item.accursed?item.stats:totalStats(item.stats)).map(s=>`<div>${statLine(s)}</div>`).join('')}</div>
    ${item.accursed?'<p class="rl-locked">This item cannot be Accursed again.</p>':'<p class="rl-sample">Controlled example · fixed original rolls</p>'}`}
  </div>`;
}

export function mountRitualLab(root, catalog, rules, pools, random) {
  const lab = new RitualLab(catalog,rules,pools,random);
  let query = '', category = '', hovered = null, announcement = '';
  root.innerHTML = `
    <div class="rl-topline"><span class="rl-tag">FREE PRACTICE · NO ACCOUNT NEEDED</span><span>Alpha V1.2 reference</span></div>
    <div class="rl-layout">
      <div class="rl-panel rl-arsenal">
        <div class="rl-panel-title"><span aria-hidden="true">◆</span><h3>Example inventory</h3></div>
        <label class="rl-visually-hidden" for="rl-search">Search example uniques</label><input id="rl-search" type="search" placeholder="Search uniques…" autocomplete="off">
        <label class="rl-visually-hidden" for="rl-filter">Filter item types</label><select id="rl-filter"><option value="">All item types</option><option value="caster">Caster weapons</option><option value="weap">Other weapons</option><option value="armo">Armor</option><option value="jewelry">Rings &amp; amulets</option><option value="jewl">Jewels</option></select>
        <div class="rl-inventory" id="rl-inventory" aria-label="Example unique items"></div>
        <div class="rl-inventory-footer"><span id="rl-count"></span><span>Hover or focus to inspect</span></div>
        <button type="button" class="rl-sigil-supply" draggable="true" data-drag="sigil" data-action="sigil"><img src="${asset('assets/accursed_ritual_sigil.png')}" alt=""><span><strong>Ritual Sigil</strong><small>Unlimited practice supply</small></span><b aria-hidden="true">∞</b></button>
      </div>
      <div class="rl-panel rl-chamber">
        <div class="rl-panel-title"><span aria-hidden="true">✦</span><h3>Horadric Cube</h3></div>
        <div class="rl-cube" id="rl-cube" aria-label="Cube. Drop the example unique or Ritual Sigil here.">
          <div class="rl-cube-engraving" aria-hidden="true">✧</div>
          <div class="rl-cube-grid" aria-hidden="true"></div>
          <button type="button" class="rl-cube-slot rl-unique-slot" data-action="unique" id="rl-unique-slot"></button>
          <button type="button" class="rl-cube-slot rl-sigil-slot" data-action="sigil" id="rl-sigil-slot"></button>
          <span class="rl-cube-caption">THE HORADRIC RITE</span>
        </div>
        <div class="rl-step-state" id="rl-step-state"></div>
        <button type="button" class="rl-transmute" data-action="transmute" id="rl-transmute">Transmute</button>
        <div class="rl-cube-actions"><button type="button" data-action="unique" id="rl-place-unique">Place unique</button><button type="button" data-action="sigil" id="rl-place-sigil">Place Sigil</button></div>
        <button type="button" class="rl-fresh" data-action="fresh" id="rl-fresh">Load a fresh copy</button>
        <p class="rl-cube-help">Drag items into the Cube, or use the buttons. Transmute twice to reveal the result.</p>
      </div>
      <div class="rl-panel rl-inspector">
        <div class="rl-panel-title"><span aria-hidden="true">◇</span><h3 id="rl-preview-title">Item inspection</h3></div>
        <div id="rl-preview"></div><div class="rl-pool" id="rl-pool"></div>
      </div>
    </div>
    <div class="rl-odds-strip" aria-label="Ritual probabilities"><span><b class="rl-risk">25%</b> Rare · unique lost</span><span><b>40%</b> One bonus</span><span><b>35%</b> Two bonuses</span></div>
    <div class="rl-status" id="rl-status" role="status" aria-live="polite" aria-atomic="true"></div>
    <div class="rl-journal"><div class="rl-journal-heading"><h3>Ritual journal</h3><button type="button" data-action="clear" id="rl-clear">Clear journal</button></div><div id="rl-tally" class="rl-tally"></div><ol id="rl-history" class="rl-history"></ol></div>
    <p class="rl-footnote">Practice items only. Nothing is taken from your character or exchange stash. Each fresh copy is a separate experiment; actual game outcomes are permanent. Examples use current wiki names and the shipped item ranges.</p>
    <div class="rl-hover" id="rl-hover" role="tooltip" hidden></div>`;
  const $ = selector => root.querySelector(selector);
  const image = (item, cls='') => `<img class="${cls}" src="${asset(item.image)}" alt="" loading="lazy">`;
  const selectedItem = () => lab.state.result ?? lab.state.item;
  function hideTooltip() {
    $('#rl-hover').hidden = true;
    root.querySelectorAll('[aria-describedby="rl-hover"]').forEach(el=>el.removeAttribute('aria-describedby'));
    hovered = null;
  }
  function showTooltip(target, item) {
    if (!item || hovered === target) return;
    hideTooltip(); hovered = target;
    const tip = $('#rl-hover'); tip.innerHTML = itemTooltip(item); tip.hidden = false;
    target.setAttribute('aria-describedby','rl-hover');
    const rect = target.getBoundingClientRect(); const width = Math.min(310,window.innerWidth-24);
    tip.style.width = width+'px'; tip.style.left = Math.max(12,Math.min(window.innerWidth-width-12,rect.right+12))+'px';
    tip.style.top = Math.max(12,Math.min(window.innerHeight-tip.offsetHeight-12,rect.top))+'px';
  }
  function renderInventory() {
    const state = lab.state;
    const items = catalog.items.filter(item => (!query || `${item.name} ${item.base} ${item.variant??''}`.toLowerCase().includes(query)) && (!category || (category==='caster'?['wand','staf','orb'].includes(item.pool):category==='jewelry'?['ring','amul'].includes(item.pool):item.pool===category)));
    $('#rl-count').textContent = `${items.length} example${items.length===1?'':'s'}`;
    $('#rl-inventory').innerHTML = items.length ? items.map(item=>`<button type="button" class="rl-item${state.item?.id===item.id?' is-selected':''}" data-item="${esc(item.id)}" draggable="${state.phase!=='prepared'}" aria-pressed="${state.item?.id===item.id}" aria-label="Load ${esc(item.name)}, ${esc(item.base)}${item.variant?', '+esc(item.variant):''}" ${state.phase==='prepared'?'disabled':''}>${image(item)}<span>${esc(item.name)}${item.variant?'<br>'+esc(item.variant):''}</span></button>`).join(''):'<p class="rl-no-results">No matching examples. Try another name or type.</p>';
  }
  function render() {
    hideTooltip();
    const state = lab.state, item = state.result ?? state.item, locked = state.phase !== 'ready';
    const active = document.activeElement; const focusId = root.contains(active) ? active.id : null;
    const itemFocus = root.contains(active) ? active.dataset.item : null;
    renderInventory();
    $('#rl-preview').innerHTML = itemTooltip(item);
    $('#rl-preview-title').textContent = state.phase === 'resolved' ? 'Ritual result' : 'Item inspection';
    $('#rl-pool').textContent = item && !item.rare ? `${groups[item.pool]} bonus pool` : '';
    $('#rl-cube').classList.toggle('is-prepared',state.phase==='prepared');
    $('#rl-cube').classList.toggle('is-success',!!state.result?.accursed);
    $('#rl-cube').classList.toggle('is-rare',!!state.result?.rare);
    const unique = $('#rl-unique-slot');
    unique.disabled = locked; unique.setAttribute('aria-label',state.uniquePlaced?'Remove unique from Cube':'Place selected unique in Cube');
    unique.innerHTML = state.uniquePlaced && item ? item.rare ? '<span class="rl-rare-token" aria-hidden="true">?</span><span>Rare base</span>' : `${image(item)}<span>${esc(item.name)}</span>` : '<span class="rl-slot-mark" aria-hidden="true">◇</span><span>Unique</span>';
    const sigil = $('#rl-sigil-slot'); sigil.disabled = locked; sigil.setAttribute('aria-label',state.sigilPlaced?'Remove Ritual Sigil from Cube':'Place Ritual Sigil in Cube');
    sigil.innerHTML = state.sigilPlaced ? `<img src="${asset('assets/accursed_ritual_sigil.png')}" alt=""><span>Ritual Sigil</span>` : `<span class="rl-slot-mark" aria-hidden="true">✦</span><span>${state.phase==='resolved'?'Consumed':'Ritual Sigil'}</span>`;
    for (const [kind, label] of [['unique','unique'],['sigil','Sigil']]) {
      const el = $('#rl-place-'+kind); el.disabled=locked; el.textContent = `${state[kind+'Placed']?'Remove':'Place'} ${label}`;
    }
    const supply = $('.rl-sigil-supply'); supply.disabled = locked; supply.draggable = !locked;
    $('#rl-search').disabled = state.phase==='prepared'; $('#rl-filter').disabled = state.phase==='prepared';
    $('#rl-fresh').disabled = !state.item || state.phase==='prepared';
    $('#rl-clear').disabled = state.phase==='prepared' || !state.history.length;
    const transmute = $('#rl-transmute');
    transmute.disabled = !['ready','prepared'].includes(state.phase) || !state.uniquePlaced || !state.sigilPlaced;
    transmute.textContent = state.phase==='prepared'?'Transmute · finish the rite':state.phase==='resolved'?'Ritual complete':'Transmute · prepare';
    $('#rl-step-state').innerHTML = state.phase==='prepared'?'<span class="rl-violet">II · THE OUTCOME IS SEALED</span><small>Transmute once more to reveal it.</small>':state.phase==='resolved'?`<span class="${state.result.rare?'rl-risk':'rl-violet'}">${state.result.rare?'THE UNIQUE IS LOST':'THE RITE IS COMPLETE'}</span><small>Load a fresh copy to experiment again.</small>`:'<span>I · PLACE THE OFFERING</span><small>One unique. One Ritual Sigil.</small>';
    $('#rl-status').textContent = announcement;
    const t = state.tally, n = t.rare+t.oneBonus+t.twoBonuses;
    $('#rl-tally').innerHTML = `<span><b>${n}</b> attempts</span><span><b>${t.rare}</b> rare</span><span><b>${t.oneBonus}</b> one bonus</span><span><b>${t.twoBonuses}</b> two bonuses</span>`;
    $('#rl-history').innerHTML = state.history.length ? state.history.map((r,i)=>`<li><span class="rl-history-no">${n-i}</span><div><strong class="${r.rare?'rl-risk':''}">${esc(r.sourceName)}</strong><small>${r.rare?`Became a rare ${esc(r.base)} · unique powers lost`:r.bonuses.map(b=>statLine(b)).join(' · ')}</small></div><span class="rl-history-kind ${r.rare?'rl-risk':'rl-violet'}">${r.rare?'RARE':r.bonuses.length===1?'+1 BONUS':'+2 BONUSES'}</span></li>`).join(''):'<li class="rl-journal-empty">Your experiments will be recorded here. Each attempt has the same odds.</li>';
    // Preserve keyboard position when the inventory is redrawn.
    if (focusId) $('#'+focusId)?.focus({preventScroll:true});
    else if (itemFocus) [...root.querySelectorAll('[data-item]')].find(el=>el.dataset.item===itemFocus)?.focus({preventScroll:true});
  }
  function act(action) {
    try {
      const state = lab.state;
      if(action==='unique'||action==='sigil') {lab.place(action,!state[action+'Placed']); announcement = `${action==='unique'?'Unique':'Ritual Sigil'} ${state[action+'Placed']?'removed from':'placed in'} the Cube.`;}
      else if(action==='transmute') {const next=lab.transmute();announcement=next.phase==='prepared'?'Ritual prepared. The outcome is stored and cannot be changed. Transmute again to finish.':next.result.rare?`${next.result.sourceName} became a rare ${next.result.base}. Its unique powers are lost.`:`${next.result.name} is Accursed with ${next.result.bonuses.length} ${next.result.bonuses.length===1?'bonus':'bonuses'}. Original rolls preserved.`;}
      else if(action==='fresh') {lab.select(state.item.id); announcement='A fresh practice copy is ready. Place it and a new Sigil in the Cube.';}
      else if(action==='clear') {lab.clearHistory(); announcement='Ritual journal cleared.';}
      render();
    } catch(error) {announcement=error.message;$('#rl-status').textContent=announcement;}
  }
  root.addEventListener('click',event=>{
    const button=event.target.closest('button'); if(!button||button.disabled)return;
    if(button.dataset.item){try{lab.select(button.dataset.item);announcement=`${lab.state.item.name} loaded. Place the example and a Sigil in the Cube.`;render();}catch(error){$('#rl-status').textContent=error.message;}}
    else if(button.dataset.action)act(button.dataset.action);
  });
  $('#rl-search').addEventListener('input',event=>{query=event.target.value.trim().toLowerCase();hideTooltip();renderInventory();});
  $('#rl-filter').addEventListener('change',event=>{category=event.target.value;hideTooltip();renderInventory();});
  for(const name of ['pointerover','focusin'])root.addEventListener(name,event=>{
    const button=event.target.closest('[data-item],#rl-unique-slot');if(!button)return;
    const item=button.dataset.item?catalog.items.find(i=>i.id===button.dataset.item):lab.state.uniquePlaced?selectedItem():null;
    showTooltip(button,item);
  });
  for(const name of ['pointerout','focusout'])root.addEventListener(name,event=>{if(hovered && !hovered.contains(event.relatedTarget))hideTooltip();});
  root.addEventListener('keydown',event=>{if(event.key==='Escape')hideTooltip();});
  root.addEventListener('dragstart',event=>{
    const el=event.target.closest('[data-item],[data-drag]');
    if(!el || lab.state.phase==='prepared'){event.preventDefault();return;}
    event.dataTransfer.setData('text/plain',JSON.stringify(el.dataset.item?{kind:'unique',id:el.dataset.item}:{kind:'sigil'}));event.dataTransfer.effectAllowed='copy';hideTooltip();
  });
  const cube=$('#rl-cube');
  cube.addEventListener('dragover',event=>{if(lab.state.phase!=='prepared'){event.preventDefault();event.dataTransfer.dropEffect='copy';cube.classList.add('is-dragover');}});
  cube.addEventListener('dragleave',event=>{if(!cube.contains(event.relatedTarget))cube.classList.remove('is-dragover');});
  cube.addEventListener('drop',event=>{
    event.preventDefault();cube.classList.remove('is-dragover');
    try{const data=JSON.parse(event.dataTransfer.getData('text/plain'));if(data.kind==='unique'){if(lab.state.item?.id!==data.id || lab.state.phase==='resolved')lab.select(data.id);lab.place('unique');}else if(data.kind==='sigil')lab.place('sigil');else throw new Error('Use a practice item from the example inventory.');announcement='Offering placed in the Cube.';render();}catch(error){$('#rl-status').textContent=error.message;}
  });
  window.addEventListener('resize',hideTooltip);window.addEventListener('scroll',hideTooltip,{passive:true});
  root.addEventListener('error',event=>{if(event.target instanceof HTMLImageElement){event.target.classList.add('rl-art-unavailable');event.target.alt='Item artwork';}},true);
  if(catalog.items.length)lab.select(catalog.items[0].id);
  render();
  return {lab,render};
}

const root = typeof document === 'undefined'?null:document.querySelector('[data-ritual-lab]');
if(root && !root.dataset.mounted){
  root.dataset.mounted='true';
  Promise.all(['ritual-lab-catalog.json','ritual-lab-rules.json','ritual-lab-pools.json'].map(async path=>{const response=await fetch(asset(path));if(!response.ok)throw new Error('Example data is unavailable.');return response.json();}))
    .then(([catalog,rules,pools])=>mountRitualLab(root,catalog,rules,pools))
    .catch(()=>{root.innerHTML='<p class="rl-loading">The practice Cube could not load. Refresh to try again; the recipe and bonus tables below remain available.</p>';});
}
