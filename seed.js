const https = require('https');
const API = 'toiletadvisor-server.onrender.com';

const TOILETS = [
  {
    title: 'Туалет в Tashkent City Mall',
    description: 'Чистый туалет на 1-м этаже ТРЦ Tashkent City Mall, рядом с фуд-кортом',
    lat: 41.2956, lon: 69.2797,
    isOpen: true, isFree: true, hasSoap: true, hasPaper: true, isAccessible: true, isTaharatkhana: false
  },
  {
    title: 'Тахаратхана у мечети Минор',
    description: 'Место для омовения при мечети Минор. Горячая вода, мыло, тапочки',
    lat: 41.2871, lon: 69.2768,
    isOpen: true, isFree: true, hasSoap: true, hasPaper: false, isAccessible: false, isTaharatkhana: true
  },
  {
    title: 'Туалет на вокзале Ташкент-Главный',
    description: 'Платный туалет в здании главного железнодорожного вокзала',
    lat: 41.3174, lon: 69.2870,
    isOpen: false, isFree: false, hasSoap: true, hasPaper: true, isAccessible: true, isTaharatkhana: false
  },
  {
    title: 'Туалет в парке Алишера Навои',
    description: 'Общественный туалет в центральной части парка Навои',
    lat: 41.3058, lon: 69.2714,
    isOpen: false, isFree: true, hasSoap: false, hasPaper: true, isAccessible: false, isTaharatkhana: false
  },
  {
    title: 'Тахаратхана в мечети Хастимом',
    description: 'Тахаратхана при соборной мечети Хасти-Имом, рядом с медресе',
    lat: 41.3276, lon: 69.2623,
    isOpen: true, isFree: true, hasSoap: true, hasPaper: false, isAccessible: false, isTaharatkhana: true
  },
  {
    title: 'Туалет в ТРЦ Next',
    description: 'Туалет на 2-м этаже торгового центра Next на Юнусабаде',
    lat: 41.3376, lon: 69.2841,
    isOpen: true, isFree: true, hasSoap: true, hasPaper: true, isAccessible: true, isTaharatkhana: false
  },
  {
    title: 'Туалет на Broadway (пешеходная зона)',
    description: 'Общественный платный туалет на пешеходной улице Сайилгох (Broadway)',
    lat: 41.2983, lon: 69.2717,
    isOpen: true, isFree: false, hasSoap: true, hasPaper: true, isAccessible: false, isTaharatkhana: false
  }
];

function postJSON(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = https.request({ hostname: API, path, method: 'POST', headers }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch(e) { resolve(raw); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Logging in as admin...');
  const auth = await postJSON('/api/admin/login', { login: 'admin', password: 'admin123' });
  if (!auth.token) { console.error('Auth failed:', auth); process.exit(1); }
  console.log('Token OK');
  for (const t of TOILETS) {
    const res = await postJSON('/api/toilets', t, auth.token);
    console.log(res.id ? `✅ ${res.title}` : `❌ ${t.title}: ${JSON.stringify(res)}`);
  }
  console.log('Done!');
}

main().catch(console.error);
