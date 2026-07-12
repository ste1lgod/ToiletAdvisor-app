// ── FIREBASE INIT ──
const FIREBASE_CONFIG={
  apiKey:"AIzaSyDpqKxUd6LBKhukaPq0vTgbf_qEdkWx6L4",
  authDomain:"toiletadvisorrr.firebaseapp.com",
  projectId:"toiletadvisorrr",
  storageBucket:"toiletadvisorrr.firebasestorage.app",
  messagingSenderId:"768746623109",
  appId:"1:768746623109:web:a6a7aa641e3bcef1af59ec"
};

// Firebase инициализация — SDK уже загружен в <head>
let db=null;
let _fbInitialized=false;

function _loadFirebase(){
  if(_fbInitialized&&db)return Promise.resolve();
  try{
    if(!firebase.apps.length)firebase.initializeApp(FIREBASE_CONFIG);
    db=firebase.firestore();
    _fbInitialized=true;
  }catch(e){console.error('Firebase init error:',e);}
  return Promise.resolve();
}

// Кэш хэшей паролей — не пересчитываем одно и то же
const _hashCache={};

async function hashPassword(pass){
  if(_hashCache[pass])return _hashCache[pass];
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pass));
  const hash=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  _hashCache[pass]=hash;
  return hash;
}
