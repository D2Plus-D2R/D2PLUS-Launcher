function localUrl(value,origin){try{const u=new URL(value);return u.origin===origin&&u.username===''&&u.password==='';}catch{return false;}}
function allowedExternal(value){try{const u=new URL(value);return u.protocol==='https:'&&['github.com','www.nexusmods.com','diablo2.blizzard.com','nodejs.org'].includes(u.hostname)&&!u.username&&!u.password;}catch{return false;}}
module.exports={localUrl,allowedExternal};
