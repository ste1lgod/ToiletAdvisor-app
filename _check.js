const fs = require('fs');
const html = fs.readFileSync('C:/Users/zbaze/ToiletAdvisor/index.html', 'utf8');
const matches = [...html.matchAll(/(?s)<script>([\s\S]*?)<\/script>/g)];
const combined = matches.map(m => m[1]).join('\n');
try {
  new Function(combined);
  console.log('JS OK');
} catch(e) {
  console.error('JS ERROR:', e.message);
}
