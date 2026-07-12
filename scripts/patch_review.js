// Патч отзыва w6PxJVvjn4HHYuTFqP1t — установить userPhone = "Admin(Amal)"
const https = require('https');

const PROJECT = 'toiletadvisorrr';
const API_KEY = 'AIzaSyDpqKxUd6LBKhukaPq0vTgbf_qEdkWx6L4';
const REVIEW_ID = 'w6PxJVvjn4HHYuTFqP1t';
const NEW_NICK = 'Admin(Amal)';

const body = JSON.stringify({
  fields: {
    userPhone: { stringValue: NEW_NICK }
  }
});

const options = {
  hostname: 'firestore.googleapis.com',
  path: `/v1/projects/${PROJECT}/databases/(default)/documents/reviews/${REVIEW_ID}?updateMask.fieldPaths=userPhone&key=${API_KEY}`,
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      const parsed = JSON.parse(data);
      console.log('OK! userPhone теперь:', parsed.fields.userPhone.stringValue);
    } else {
      console.error('Ошибка', res.statusCode, data);
    }
  });
});

req.on('error', e => console.error('Ошибка запроса:', e.message));
req.write(body);
req.end();
