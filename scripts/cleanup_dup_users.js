// Удаляет дублирующиеся тестовые аккаунты +998888 без ников и без отзывов
const https = require('https');

const PROJECT = 'toiletadvisorrr';
const API_KEY = 'AIzaSyDpqKxUd6LBKhukaPq0vTgbf_qEdkWx6L4';

// 12 дубликатов: одинаковый телефон +998888, без ника, без отзывов, созданы seed-скриптом
const DUP_IDS = [
  'CrxkclBhkj2ZVV8iEycU',
  'F6SpXGId0Q1CSCIZVcIE',
  'Fv2e1TAwtJ6vnZ2vggqu',
  'J5WJh6NFoYyBSkgq5vZ7',
  'SVzBTGEGesglJUqoiQhM',
  'TlXa22cOiWwd3vyraLVY',
  'Wd94syUZVtwkj8h1EPkS',
  'WzIVnt77oYJp8w5ODR1R',
  'cLBVdkImJeBzmXRtYQDl',
  'counnUxcjYPaoEOOXBYP',
  'ihDVZ9nQJ6FzWdWHYex9',
  'zIorTtRLM3CrdFFpRWk4'
];

function deleteDoc(id) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT}/databases/(default)/documents/users/${id}?key=${API_KEY}`,
      method: 'DELETE'
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 204) {
          console.log(`✅ Удалён: ${id}`);
          resolve();
        } else {
          console.error(`❌ ${id}: ${res.statusCode} ${data}`);
          resolve();
        }
      });
    });
    req.on('error', e => { console.error(`Ошибка ${id}:`, e.message); resolve(); });
    req.end();
  });
}

(async () => {
  console.log(`Удаляю ${DUP_IDS.length} дубликатов...`);
  for (const id of DUP_IDS) {
    await deleteDoc(id);
    await new Promise(r => setTimeout(r, 100));
  }
  console.log('Готово.');
})();
