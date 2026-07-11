const fs=require('fs');
const html=fs.readFileSync('C:/Users/zbaze/ToiletAdvisor/index.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
try{new Function(scripts);console.log('OK');}catch(e){console.error('ERR:',e.message);}
