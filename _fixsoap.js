const fs = require('fs');
let html = fs.readFileSync('./index.html', 'utf8');
// Заменяем повреждённый символ перед </span><span>Мыло
html = html.replace(/(<span class="tagIco">)[^<]*(<\/span><span>Мыло)/, '$1🧼$2');
fs.writeFileSync('./index.html', html, 'utf8');
console.log('Done');
