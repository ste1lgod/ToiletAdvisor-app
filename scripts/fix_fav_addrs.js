// Исправляет неверные адреса в favorites/admin2 и устаревший title test3
const https = require('https');

const PROJECT = 'toiletadvisorrr';
const API_KEY = 'AIzaSyDpqKxUd6LBKhukaPq0vTgbf_qEdkWx6L4';
const USER_ID = 'admin2';

// Правильные данные: {docId: {поля для патча}}
const FIXES = {
  'seed-0003-railway-station': {
    addr: { stringValue: 'улица Мустакиллик, 1' }
  },
  'seed-0006-next-mall': {
    addr: { stringValue: 'проспект Амира Темура, 108' }
  },
  'seed-0007-broadway': {
    addr: { stringValue: 'улица Сайилгох (Broadway)' }
  },
  '3496Frw7ECGcAGSFzh4m': {
    addr: { stringValue: 'Амира Тимура проспект' }
  },
  'UizGGska1LYeu31jm1xg': {
    title: { stringValue: 'test3' },
    addr:  { stringValue: 'Беларык улица, 10' }
  }
};

function patchDoc(docId, fields) {
  return new Promise((resolve) => {
    // Собираем updateMask из ключей fields
    const maskParams = Object.keys(fields)
      .map(k => `updateMask.fieldPaths=${k}`)
      .join('&');

    const body = JSON.stringify({ fields });
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT}/databases/(default)/documents/users/${USER_ID}/favorites/${docId}?${maskParams}&key=${API_KEY}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const p = JSON.parse(data);
          const updated = Object.keys(fields).map(k => `${k}: ${p.fields[k]?.stringValue || p.fields[k]?.doubleValue || '?'}`).join(', ');
          console.log(`✅ ${docId} → ${updated}`);
        } else {
          console.error(`❌ ${docId}: ${res.statusCode}`, data.slice(0, 200));
        }
        resolve();
      });
    });
    req.on('error', e => { console.error(`Ошибка ${docId}:`, e.message); resolve(); });
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log(`Патчу ${Object.keys(FIXES).length} записей избранного admin2...`);
  for (const [docId, fields] of Object.entries(FIXES)) {
    await patchDoc(docId, fields);
    await new Promise(r => setTimeout(r, 150));
  }
  console.log('Готово.');
})();
