'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=process.argv[2],core=path.join(root,'D2PLUS_Alpha_v11_Complete');
const expected=JSON.parse(fs.readFileSync(path.join(root,'expected.json')));
const manifest=JSON.parse(fs.readFileSync(path.join(core,'INSTALL_MANIFEST.json')));
const seen=new Set();
assert.equal(manifest.version,process.argv[3]||'1.1.0-alpha');
assert.equal(manifest.files.length,Object.keys(expected).length);
function check(p,b){
 const e=expected[p];assert.ok(e,p);assert.ok(!seen.has(p),'duplicate '+p);
 assert.equal(b.length,e.size,p);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),e.sha256,p);
 const m=manifest.files.find(f=>f.path===p);assert.equal(m.size,e.size,p);assert.equal(m.sha256,e.sha256,p);seen.add(p);
 if(p.endsWith('/objpreset.txt')){
  const [head,...lines]=b.toString().trim().split(/\r?\n/),h=head.split('\t');
  const row=lines.map(l=>l.split('\t')).filter(v=>v[h.indexOf('Act')]==='5'&&v[h.indexOf('Index')]==='154');
  assert.equal(row.length,1);assert.equal(row[0][h.indexOf('ObjectClass')],'Bank');
 }
}
vm.runInNewContext(fs.readFileSync(path.join(core,'mod.js'),'utf8'),{D2RMM:{writeTxt:(p,s)=>check(p,Buffer.from(s)),copyFile:(src,dst)=>check(dst,fs.readFileSync(path.join(core,src)))}},{timeout:30000});
assert.equal(seen.size,Object.keys(expected).length);
console.log('Standalone D2RMM output matches corrected snapshot: '+seen.size+' files verified.');
