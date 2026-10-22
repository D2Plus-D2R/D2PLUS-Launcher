// Browser-only practice model. Rules mirror the shipped D2PLUS Accursed recipes.
export const bonusLabels = Object.freeze({cast2:'Faster Cast Rate',hp:'Life',balance2:'Faster Hit Recovery',move2:'Faster Run/Walk','red-dmg%':'Physical Damage Reduction',str:'Strength',dex:'Dexterity',mana:'Mana',swing2:'Increased Attack Speed','dmg%':'Enhanced Damage',crush:'Chance of Crushing Blow',deadly:'Deadly Strike','res-all':'All Resistances'});
const percent = new Set(['cast2','balance2','move2','red-dmg%','swing2','dmg%','crush','deadly','res-all']);
const canonical = code => code.replace(/^(cast|swing|move|balance)[123]$/, (_, prefix) => prefix+'2');
const clone = value => JSON.parse(JSON.stringify(value));
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }

export function randomInteger(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) throw new Error('Invalid random range.');
  const span = max - min + 1;
  const limit = Math.floor(0x100000000 / span) * span;
  const buffer = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
  return min + buffer[0] % span;
}

export function outcomeForRoll(rules, pool, roll) {
  if (!Object.hasOwn(rules.pools, pool) || !Number.isInteger(roll) || roll < 1 || roll > 100) throw new Error('Invalid ritual outcome.');
  if (roll <= 25) return null;
  let upper = 25;
  for (const row of rules.pools[pool]) { upper += row.weight; if (roll <= upper) return clone(row.bonuses); }
  throw new Error('Incomplete ritual pool.');
}

export function totalStats(original, bonuses = []) {
  const stats = clone(original).map(stat => ({...stat, code:canonical(stat.code)}));
  for (const bonus of bonuses) {
    const code = canonical(bonus.code);
    const existing = stats.find(stat => stat.code === code && Number.isFinite(stat.value));
    if (existing) existing.value += bonus.value;
    else stats.push({code,label:bonusLabels[code],value:bonus.value,unit:percent.has(code)?'%':''});
  }
  // All-resistance and individual resistance modifiers are additive. Show each
  // final resistance once instead of making the visitor mentally add two lines.
  const elements = ['fire','cold','ltng','pois'];
  const resistance = stats.filter(s => Number.isFinite(s.value) && (s.code === 'res-all' || elements.some(e => s.code === 'res-'+e)));
  if (resistance.length) {
    const values = elements.map(e => resistance.reduce((n,s) => n + (s.code === 'res-all' || s.code === 'res-'+e ? s.value : 0),0));
    const rest = stats.filter(s => !resistance.includes(s));
    if (values.every(v => v === values[0])) rest.push({code:'res-all',label:'All Resistances',value:values[0],unit:'%'});
    else elements.forEach((e,i) => {if(values[i])rest.push({code:'res-'+e,label:['Fire Resist','Cold Resist','Lightning Resist','Poison Resist'][i],value:values[i],unit:'%'});});
    return rest;
  }
  return stats;
}

export class RitualLab {
  #catalog; #rules; #pools; #random; #prepared = null; #state;
  constructor(catalog, rules, pools, random = randomInteger) {
    this.#catalog = freeze(clone(catalog)); this.#rules = freeze(clone(rules)); this.#pools = freeze(clone(pools)); this.#random = random;
    this.#state = {phase:'empty',item:null,uniquePlaced:false,sigilPlaced:false,result:null,history:[],tally:{rare:0,oneBonus:0,twoBonuses:0}};
  }
  get state() { return freeze(clone(this.#state)); }
  select(id) {
    if (this.#state.phase === 'prepared') throw new Error('Finish the prepared ritual before loading another example.');
    const item = this.#catalog.items.find(i => i.id === id);
    if (!item || item.accursed || item.prepared || !Object.hasOwn(this.#pools,item.code) || this.#pools[item.code] !== item.pool) throw new Error('This item cannot be used in the ritual.');
    this.#state.item = clone(item); this.#state.phase = 'ready'; this.#state.uniquePlaced = false; this.#state.sigilPlaced = false; this.#state.result = null; this.#prepared = null;
    return this.state;
  }
  place(kind, present = true) {
    if (this.#state.phase !== 'ready') throw new Error('Load a fresh example before changing the Cube.');
    if (!['unique','sigil'].includes(kind)) throw new Error('Only the example unique and Ritual Sigil belong in this Cube.');
    this.#state[kind+'Placed'] = !!present;
    return this.state;
  }
  transmute() {
    if (this.#state.phase === 'prepared') return this.#resolve();
    if (this.#state.phase !== 'ready' || !this.#state.uniquePlaced || !this.#state.sigilPlaced) throw new Error('Place the unique and a Ritual Sigil in the Cube first.');
    const roll = this.#random(1,100);
    const row = outcomeForRoll(this.#rules, this.#state.item.pool, roll);
    const bonuses = (row ?? []).map(b => {
      const value = this.#random(b.min,b.max);
      if (!Number.isInteger(value) || value < b.min || value > b.max) throw new Error('Invalid bonus roll.');
      return {...b,value,label:bonusLabels[b.code],unit:percent.has(b.code)?'%':''};
    });
    this.#prepared = freeze({roll,bonuses});
    this.#state.phase = 'prepared';
    return this.state;
  }
  #resolve() {
    const {roll,bonuses} = this.#prepared;
    const source = this.#state.item;
    const rare = roll <= 25;
    const result = rare
      ? {id:source.id,name:'Rare '+source.base,base:source.base,code:source.code,level:source.level,rare:true,bonuses:[],stats:[],sourceName:source.name}
      : {...clone(source),accursed:true,bonuses:clone(bonuses),stats:totalStats(source.stats,bonuses),sourceName:source.name};
    this.#state.phase = 'resolved'; this.#state.result = result; this.#state.sigilPlaced = false;
    this.#state.tally[rare?'rare':bonuses.length === 1?'oneBonus':'twoBonuses']++;
    this.#state.history.unshift(clone(result));
    this.#state.history = this.#state.history.slice(0,12);
    this.#prepared = null;
    return this.state;
  }
  clearHistory() {
    if (this.#state.phase === 'prepared') throw new Error('Finish the prepared ritual first.');
    this.#state.history = []; this.#state.tally = {rare:0,oneBonus:0,twoBonuses:0};
    return this.state;
  }
}
