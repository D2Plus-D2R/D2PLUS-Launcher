'use strict';
(() => {
  const reference = document.getElementById('skills');
  if (!reference) return;
  const tabs = Array.from(reference.querySelectorAll('[data-skill-tab]'));
  const panels = Array.from(reference.querySelectorAll('[data-skill-panel]'));
  const status = reference.querySelector('[data-skill-status]');
  if (!tabs.length || tabs.length !== panels.length) return;

  function select(index, { updateHash = false, focus = false, scroll = false, announce = true } = {}) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    const tab = tabs[index];
    if (updateHash && location.hash !== tab.hash) history.pushState(null, '', tab.hash);
    if (focus) tab.focus();
    if (announce && status) status.textContent = tab.textContent.trim() + ' skill reference selected.';
    if (scroll) reference.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  function fromHash() {
    const index = tabs.findIndex(tab => tab.hash === location.hash);
    if (index !== -1) select(index, { scroll: true });
    else if (location.hash === '#skills') select(0, { scroll: true });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', event => {
      // Modified clicks keep the anchor's normal new-tab behavior.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const aboveViewport = reference.getBoundingClientRect().top < 0;
      select(index, { updateHash: true, scroll: aboveViewport });
    });
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (event.key === ' ') next = index;
      if (next === undefined) return;
      event.preventDefault();
      select(next, { updateHash: true, focus: true });
    });
  });

  const initial = tabs.findIndex(tab => tab.hash === location.hash);
  select(initial === -1 ? 0 : initial, { announce: false });
  reference.classList.add('tabs-ready');
  window.addEventListener('hashchange', fromHash);
  if (initial !== -1) requestAnimationFrame(() => reference.scrollIntoView({ block: 'start' }));
})();
