import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {mountRitualLab} from '../site/ritual-lab.mjs';
const [catalog,rules,pools]=await Promise.all(['catalog','rules','pools'].map(async f=>JSON.parse(await readFile(new URL('../site/ritual-lab-'+f+'.json',import.meta.url),'utf8'))));

test('button, focus, filter, prepared, result, and retry flows work without importing files',()=>{
  const dom=new JSDOM('<!doctype html><div id="app"></div>',{url:'https://d2-plus.net/accursed.html',pretendToBeVisual:true});
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLImageElement=dom.window.HTMLImageElement;
  const root=document.querySelector('#app');const {lab}=mountRitualLab(root,catalog,rules,pools,(min,max)=>min===1&&max===100?66:min);
  const $=s=>root.querySelector(s), click=s=>$(s).click();
  assert.equal(root.querySelectorAll('[data-item]').length,39);assert.equal($('#rl-transmute').disabled,true);
  assert.equal(root.querySelector('input[type=file]'),null);
  $('[data-item]').focus();assert.equal($('#rl-hover').hidden,false);assert.match($('#rl-hover').textContent,/The Gnasher/);
  root.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal($('#rl-hover').hidden,true);
  const search=$('#rl-search');search.value='FIRE';search.dispatchEvent(new window.Event('input',{bubbles:true}));assert.equal(root.querySelectorAll('[data-item]').length,1);
  search.value='';search.dispatchEvent(new window.Event('input',{bubbles:true}));
  const filter=$('#rl-filter');filter.value='jewl';filter.dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal(root.querySelectorAll('[data-item]').length,2);
  filter.value='';filter.dispatchEvent(new window.Event('change',{bubbles:true}));
  click('#rl-place-unique');click('#rl-place-sigil');assert.equal($('#rl-transmute').disabled,false);
  click('#rl-transmute');assert.equal(lab.state.phase,'prepared');assert.equal($('#rl-fresh').disabled,true);assert.equal($('#rl-search').disabled,true);assert.equal($('#rl-place-unique').disabled,true);assert.equal($('#rl-transmute').disabled,false);assert.match($('#rl-status').textContent,/stored and cannot be changed/);
  click('#rl-transmute');assert.equal(lab.state.phase,'resolved');assert.equal($('#rl-transmute').disabled,true);assert.match($('#rl-preview').textContent,/Accursed/);assert.match($('#rl-preview').textContent,/included in the totals/);assert.equal(lab.state.tally.twoBonuses,1);assert.equal(root.querySelectorAll('#rl-history li').length,1);
  assert.match($('#rl-preview').textContent,/\+85% Enhanced Damage/);
  click('#rl-fresh');assert.equal(lab.state.phase,'ready');assert.equal(lab.state.result,null);assert.match($('#rl-preview').textContent,/\+65% Enhanced Damage/);assert.doesNotMatch($('#rl-preview').textContent,/Accursed/);
  click('#rl-clear');assert.equal(lab.state.history.length,0);
  dom.window.close();delete globalThis.window;delete globalThis.document;delete globalThis.HTMLImageElement;
});

test('dragging a known example and Sigil into the Cube resolves rare failure truthfully',()=>{
  const dom=new JSDOM('<!doctype html><div id="app"></div>',{url:'https://d2-plus.net/wiki/accursed.html',pretendToBeVisual:true});
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLImageElement=dom.window.HTMLImageElement;
  const root=document.querySelector('#app');const {lab}=mountRitualLab(root,catalog,rules,pools,(min,max)=>min===1&&max===100?1:min);
  const cube=root.querySelector('#rl-cube');
  const drop=data=>{const event=new window.Event('drop',{bubbles:true,cancelable:true});event.dataTransfer={getData:()=>JSON.stringify(data)};cube.dispatchEvent(event);};
  drop({kind:'unique',id:catalog.items[1].id});drop({kind:'sigil'});assert.equal(lab.state.uniquePlaced,true);assert.equal(lab.state.sigilPlaced,true);
  root.querySelector('#rl-transmute').click();root.querySelector('#rl-transmute').click();
  assert.equal(lab.state.result.rare,true);const preview=root.querySelector('#rl-preview');assert.match(preview.textContent,/Rare affixes are not simulated/);assert.doesNotMatch(preview.textContent,/Enhanced Damage|Required Level/);assert.equal(preview.querySelector('.rl-stats'),null);
  dom.window.close();delete globalThis.window;delete globalThis.document;delete globalThis.HTMLImageElement;
});
