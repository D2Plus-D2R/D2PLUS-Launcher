'use strict';
const config=window.D2PLUS_SITE||{};
if(/^[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+$/.test(config.repository||'')){
 const base='https://github.com/'+config.repository;
 document.querySelectorAll('[data-repository]').forEach(a=>{a.href=base;a.hidden=false;});
 if(config.releasePublished===true&&/^v[0-9A-Za-z._-]+$/.test(config.releaseTag||'')){
  document.querySelectorAll('[data-download]').forEach(a=>{a.href=base+'/releases/download/'+config.releaseTag+'/'+encodeURIComponent(a.dataset.download);a.removeAttribute('aria-disabled');a.textContent=a.dataset.download.endsWith('.exe')?'Download installer':'Download portable ZIP';});
  document.querySelectorAll('[data-release]').forEach(a=>{a.href=base+'/releases/tag/'+config.releaseTag;a.removeAttribute('aria-disabled');a.textContent='Source & release notes';});
  document.getElementById('release-status').textContent='Alpha prerelease · Review the release notes before installing.';
 }
}
