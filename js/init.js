// ── ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ СОСТОЯНИЯ ──
let currentLang=localStorage.getItem('ta_lang')||'ru';
let currentTheme=localStorage.getItem('ta_theme')||'light';
let currentUser=null,allToilets=[],currentCat='all';
let selectedToilet=null,reviewRating=0,authTab='login';
let addCoords=null,myMap=null,searchTimer=null;
let userCoords=null,userPlacemark=null;
try{const s=localStorage.getItem('ta_user');if(s)currentUser=JSON.parse(s);}catch(e){}

// ── ПАТЧ АДРЕСОВ ТУАЛЕТОВ ──
// Запускается при старте: записывает addr в Firestore для точек у которых его нет
async function _patchSeedAddresses(){
  try{
    await _loadFirebase();

    // Шаг 1 — seed-точки: у них адреса уже есть в constants.js, просто пишем в Firestore
    const seedBatch=db.batch();
    let seedChanges=false;
    for(const toilet of FALLBACK_TOILETS){
      if(!toilet.addr)continue;
      const local=allToilets.find(x=>x.id===toilet.id);
      if(local&&!local.addr)local.addr=toilet.addr;
      try{
        const doc=await db.collection('toilets').doc(toilet.id).get();
        if(doc.exists&&!doc.data().addr){
          seedBatch.update(db.collection('toilets').doc(toilet.id),{addr:toilet.addr});
          seedChanges=true;
        }
      }catch(e){}
    }
    if(seedChanges)await seedBatch.commit();

    // Шаг 2 — остальные точки без addr: геокодируем через Nominatim (по 1 в секунду — rate limit)
    const needsGeo=allToilets.filter(t=>!t.addr);
    if(!needsGeo.length)return;
    for(const toilet of needsGeo){
      try{
        await new Promise(r=>setTimeout(r,1100)); // уважаем rate limit Nominatim
        const addr=await wizGeocode(toilet.lat,toilet.lon);
        if(addr&&!addr.includes('.toFixed')){
          toilet.addr=addr;
          await db.collection('toilets').doc(toilet.id).set({addr},{merge:true});
        }
      }catch(e){}
    }
  }catch(e){console.warn('_patchSeedAddresses:',e.message);}
}

// ── СТАРТ ПРИЛОЖЕНИЯ ──
// Поиск
document.getElementById('searchInput').addEventListener('input',function(){
  clearTimeout(searchTimer);
  searchTimer=setTimeout(renderMarkers,300);
});

// Чипы категорий
document.querySelectorAll('.catChip').forEach(chip=>{
  chip.addEventListener('click',function(){
    if(this.classList.contains('active')&&this.dataset.cat!=='all'){
      document.querySelectorAll('.catChip').forEach(c=>c.classList.remove('active'));
      document.querySelector('.catChip[data-cat="all"]').classList.add('active');
      currentCat='all';
    } else {
      document.querySelectorAll('.catChip').forEach(c=>c.classList.remove('active'));
      this.classList.add('active');
      currentCat=this.dataset.cat;
    }
    renderMarkers();
  });
});

// Онлайн / офлайн
window.addEventListener('online',()=>{hideOfflineBanner();showToast(t('toastOnline'));loadToilets();});
window.addEventListener('offline',()=>showOfflineBanner());
if(!navigator.onLine)showOfflineBanner();

// Позиция контролов карты
window.addEventListener('load',()=>{setTimeout(()=>{adjustControlsPosition();},400);});
window.addEventListener('resize',()=>{adjustControlsPosition();});

// Запуск
setLang(currentLang);
applyTheme();
updateLoginBtn();
switchTab('map');
_syncUserNick();
_patchSeedAddresses();
// Синхронизируем избранное из Firestore при старте — чтобы сердечки были правильными
if(currentUser){ _loadFavoritesFromFirestore(); }

// Начальное состояние профиля (синхронно, до первого рендера)
(function(){
  const guest=document.getElementById('pGuestView');
  const user=document.getElementById('pUserView');
  if(!guest||!user)return;
  if(currentUser){guest.style.display='none';user.style.display='flex';}
  else{guest.style.display='flex';user.style.display='none';}
})();
