/**
 * seed.js — Инициализация Firestore: admin-аккаунт + туалеты
 *
 * Запуск:
 *   1. npm install firebase-admin   (один раз)
 *   2. Скачай serviceAccountKey.json из Firebase Console →
 *      Project settings (шестерёнка) → Service accounts →
 *      "Generate new private key" → сохрани как serviceAccountKey.json рядом с этим файлом
 *   3. node seed.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');

let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
} catch (e) {
  console.error('❌ Файл serviceAccountKey.json не найден!');
  console.error('   Скачай его: Firebase Console → Project settings → Service accounts → Generate new private key');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function hashPassword(pass) {
  return crypto.createHash('sha256').update(pass).digest('hex');
}

const SEED_TOILETS = [
  { id:'seed-0001-tashkent-city-mall', lat:41.2956, lon:69.2797, title:'Туалет в Tashkent City Mall', description:'Чистый туалет на 1-м этаже ТРЦ Tashkent City Mall, рядом с фуд-кортом', isOpen:true,  isFree:true,  hasSoap:true,  hasPaper:true,  isAccessible:true,  isTaharatkhana:false },
  { id:'seed-0002-masjid-minor',       lat:41.2871, lon:69.2768, title:'Тахаратхана у мечети Минор',         description:'Место для омовения при мечети Минор. Горячая вода, мыло, тапочки',         isOpen:true,  isFree:true,  hasSoap:true,  hasPaper:false, isAccessible:false, isTaharatkhana:true  },
  { id:'seed-0003-railway-station',    lat:41.3174, lon:69.2870, title:'Туалет на вокзале Ташкент-Главный',  description:'Платный туалет в здании главного железнодорожного вокзала',                isOpen:false, isFree:false, hasSoap:true,  hasPaper:true,  isAccessible:true,  isTaharatkhana:false },
  { id:'seed-0004-navoi-park',         lat:41.3058, lon:69.2714, title:'Туалет в парке Алишера Навои',       description:'Общественный туалет в центральной части парка Навои',                      isOpen:false, isFree:true,  hasSoap:false, hasPaper:true,  isAccessible:false, isTaharatkhana:false },
  { id:'seed-0005-khastimom',          lat:41.3276, lon:69.2623, title:'Тахаратхана в мечети Хастимом',      description:'Тахаратхана при соборной мечети Хасти-Имом, рядом с медресе',              isOpen:true,  isFree:true,  hasSoap:true,  hasPaper:false, isAccessible:false, isTaharatkhana:true  },
  { id:'seed-0006-next-mall',          lat:41.3376, lon:69.2841, title:'Туалет в ТРЦ Next',                  description:'Туалет на 2-м этаже торгового центра Next на Юнусабаде',                  isOpen:true,  isFree:true,  hasSoap:true,  hasPaper:true,  isAccessible:true,  isTaharatkhana:false },
  { id:'seed-0007-broadway',           lat:41.2983, lon:69.2717, title:'Туалет на Broadway (пешеходная зона)', description:'Общественный платный туалет на пешеходной улице Сайилгох (Broadway)',    isOpen:true,  isFree:false, hasSoap:true,  hasPaper:true,  isAccessible:false, isTaharatkhana:false },
];

async function main() {
  // ── 1. Admin-аккаунт ──────────────────────────────────────
  console.log('\n👤 Создаём admin-аккаунты...');
  const adminSnap = await db.collection('users')
    .where('role', '==', 'admin').limit(1).get();

  if (!adminSnap.empty) {
    console.log('   ✅ Admin уже существует, пропускаем');
  } else {
    await db.collection('users').doc('admin').set({
      login: 'admin',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    console.log('   ✅ Admin создан: логин "admin", пароль "admin123"');
  }

  // ── 1b. Второй админ ──────────────────────────────────────
  const admin2Snap = await db.collection('users')
    .where('login', '==', 'admin').where('role', '==', 'admin').limit(1).get();

  const existingAdmin2 = admin2Snap.docs.find(d => d.data().passwordHash === hashPassword('admin777'));
  if (existingAdmin2) {
    console.log('   ✅ Admin (admin777) уже существует, пропускаем');
  } else {
    await db.collection('users').doc('admin2').set({
      login: 'admin',
      passwordHash: hashPassword('admin777'),
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    console.log('   ✅ Admin2 создан: логин "admin", пароль "admin777"');
  }

  // ── 2. Туалеты ────────────────────────────────────────────
  console.log('\n🚽 Заливаем туалеты...');
  const batch = db.batch();
  for (const toilet of SEED_TOILETS) {
    const { id, ...data } = toilet;
    batch.set(db.collection('toilets').doc(id), {
      ...data,
      addedBy: 'system',
      createdAt: new Date().toISOString()
    }, { merge: false });
  }
  await batch.commit();
  console.log(`   ✅ Записано ${SEED_TOILETS.length} туалетов`);

  console.log('\n🎉 Готово! Firestore инициализирован.\n');
  process.exit(0);
}

main().catch(e => { console.error('❌ Ошибка:', e.message); process.exit(1); });
