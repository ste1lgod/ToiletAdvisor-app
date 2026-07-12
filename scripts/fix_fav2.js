const https = require('https');
const PROJECT = 'toiletadvisorrr';
const API_KEY = 'AIzaSyDpqKxUd6LBKhukaPq0vTgbf_qEdkWx6L4';
const USER_ID = 'admin2';

function patch(docId, fields, mask) {
  return new Promise(resolve => {
    const maskQ = mask.map(k => `updateMask.fieldPaths=${k}`).join('&');
    const body = JSON.stringify({ fields });
    const opts = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT}/databases/(default)/documents/users/${USER_ID}/favorites/${docId}?${maskQ}&key=${API_KEY}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log(res.statusCode === 200 ? `OK ${docId}` : `FAIL ${docId} ${res.statusCode} ${d.slice(0,100)}`);
        resolve();
      });
    });
    req.on('error', e => { console.log('ERR', e.message); resolve(); });
    req.write(body); req.end();
  });
}

(async () => {
  await patch('3496Frw7ECGcAGSFzh4m',
    { addr: { stringValue: 'Амира Тимура проспект' } }, ['addr']);
  await new Promise(r => setTimeout(r, 300));
  await patch('UizGGska1LYeu31jm1xg',
    { title: { stringValue: 'test3' }, addr: { stringValue: 'Беларык улица, 10' } }, ['title', 'addr']);
  console.log('done');
})();
