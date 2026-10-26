const D2PLUS_PROFILE = require('./profile.js');

async function loadD2PlusConstants(fetchImpl = fetch) {
  const candidates = D2PLUS_PROFILE.saveVersions
    .slice()
    .sort((a, b) => b - a)
    .map((version) => `d2plus/constants_${version}.json`);

  for (const url of candidates) {
    try {
      const response = await fetchImpl(url, { cache: 'no-store' });
      if (!response.ok) continue;
      const constants = await response.json();
      return { loaded: true, url, constants };
    } catch (_error) {
      // Try the next supported save-version artifact. A missing generated
      // data pack is reported to the user by App.vue.
    }
  }

  return {
    loaded: false,
    url: null,
    constants: null,
    error: 'D2PLUS constants have not been compiled from the final merged D2RMM data folder.',
  };
}

module.exports = { loadD2PlusConstants };

