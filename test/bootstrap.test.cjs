'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('bootstrap holds the singleton before applying updates or loading application code',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../desktop/bootstrap.cjs'),'utf8');
 for(const ownsLock of [true,false]){
  const order=[],app={requestSingleInstanceLock(){order.push('lock');return ownsLock;},quit(){order.push('quit');},whenReady:async()=>{}};
  const context={__dirname:path.resolve(__dirname,'../desktop'),process:{env:{LOCALAPPDATA:osTemp()}},console,
   require(name){if(name==='node:path')return path;if(name==='node:fs')return fs;if(name==='electron')return {app,dialog:{showErrorBox(){}}};if(name==='./update-apply.cjs')return {applyPending(){order.push('apply');return {applied:false};}};if(name==='./main.cjs'){order.push('main');return {};}throw Error(name);}};
  vm.runInNewContext(source,context);assert.deepEqual(order,ownsLock?['lock','apply','main']:['lock','quit']);
 }
});
function osTemp(){return require('node:os').tmpdir();}
