"""Execute the packaged D2RMM installer against a hash-verifying API mock."""
from pathlib import Path
import hashlib,json,subprocess,tempfile,zipfile
R=Path(__file__).resolve().parents[1]
with zipfile.ZipFile(R/'dist/D2PLUS_AlphaV1.2.2_Complete_D2RMM.zip') as z, tempfile.TemporaryDirectory(prefix='d2plus-v122-check-') as temp:
 root='D2PLUS_Alpha_v122_Complete/'
 assert json.loads(z.read(root+'mod.json'))['version']=='1.2.2'
 manifest=json.loads(z.read(root+'INSTALL_MANIFEST.json'))
 expected={r['path']:r for r in manifest['files']}
 assert len(expected)==len(manifest['files'])
 binaries={}
 for name in z.namelist():
  if not name.startswith(root+'payload/'):continue
  rel=name.removeprefix(root+'payload/');raw=z.read(name)
  assert rel in expected and '..' not in Path(rel).parts
  row={'size':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
  assert row=={k:expected[rel][k] for k in row},rel
  binaries[rel]=row
 p=Path(temp)
 (p/'mod.js').write_bytes(z.read(root+'mod.js'))
 (p/'data.json').write_text(json.dumps({'expected':expected,'binaries':binaries}),encoding='utf8')
 (p/'check.cjs').write_text("""
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const data=JSON.parse(fs.readFileSync(__dirname+'/data.json','utf8')),seen=new Set();
function verify(p,row){assert(!seen.has(p),'Duplicate: '+p);seen.add(p);assert(data.expected[p],p);assert.equal(row.size,data.expected[p].size,p);assert.equal(row.sha256,data.expected[p].sha256,p);}
vm.runInNewContext(fs.readFileSync(__dirname+'/mod.js','utf8'),{D2RMM:{
 writeTxt(p,s){const b=Buffer.from(s,'utf8');verify(p,{size:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});},
 copyFile(src,dst,overwrite){assert.equal(src,'payload/'+dst);assert.equal(overwrite,true);assert(data.binaries[dst],dst);verify(dst,data.binaries[dst]);}
}},{timeout:30000});
assert.equal(seen.size,Object.keys(data.expected).length);
console.log('D2RMM install script verified: '+seen.size+' exact file outputs.');
""",encoding='utf8')
 subprocess.run(['node',str(p/'check.cjs')],check=True)
report=R/'dist/GAMEPLAY_VALIDATION.json';data=json.loads(report.read_text());data.update(executedD2RMMInstallScript=True,allOutputHashesMatch=True);report.write_text(json.dumps(data,indent=2))
