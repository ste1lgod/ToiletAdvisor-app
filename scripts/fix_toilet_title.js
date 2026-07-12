// Исправляет название туалета UizGGska — убирает \n из title и description
const https = require('https');

const PROJECT = 'toiletadvisorrr';
const API_KEY = 'AIzaSyDpqKxUd6LBKhukaPq0vTgbf_qEdkWx6L4';
const DOC_ID  = 'UizGGska1LYeu31jm1xg';

const body = JSON.stringify({
  fields: {
    title:       { stringValue: 'test3' },
    description: { stringValue: 'test3 sioddodo dodos osmosis ododoso' }
  }
});

const options = {
  hostname: 'firestore.googleapis.com',
  path: `/v1/projects/${PROJECT}/databases/(default)/documents/toilets/${DOC_ID}?updateMask.fieldPaths=title&updateMask.fieldPaths=description&key=${API_KEY}`,
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    if (res.statusCode === 200) {
      const p = JSON.parse(data);
      console.log('✅ title:', p.fields.title.stringValue);
      console.log('✅ description:', p.fields.description.stringValue);
    } else {
      console.error('❌', res.statusCode, data);
    }
  });
});
req.on('error', e => console.error('Ошибка:', e.message));
req.write(body);
req.end();
