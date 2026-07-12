// ── ГЛОБАЛЬНЫЙ КЭШ ПОЛЬЗОВАТЕЛЕЙ ──
// Хранится в localStorage, чтобы при перезагрузке ники были доступны мгновенно
const _USERS_CACHE_KEY = 'ta_users_cache';
const _USERS_CACHE_TTL = 30 * 60 * 1000; // 30 минут

let _usersCache = {};
let _usersCacheLoaded = false;
let _usersCacheLoadPromise = null; // защита от параллельных запросов

// При инициализации сразу восстанавливаем кэш из localStorage
(function _restoreUsersCache(){
  try{
    const raw = localStorage.getItem(_USERS_CACHE_KEY);
    if(!raw) return;
    const stored = JSON.parse(raw);
    if(stored && stored.data && Date.now() - stored.ts < _USERS_CACHE_TTL){
      _usersCache = stored.data;
      _usersCacheLoaded = true;
    }
  }catch(e){}
})();

async function _loadUsersCache({ forceRefresh = false } = {}){
  // Если кэш свежий и не требуется принудительное обновление — возвращаем сразу
  if(_usersCacheLoaded && !forceRefresh) return _usersCache;

  // Защита от параллельных вызовов: если уже грузим — ждём того же промиса
  if(_usersCacheLoadPromise) return _usersCacheLoadPromise;

  _usersCacheLoadPromise = (async () => {
    try{
      await _loadFirebase();
      const snap = await db.collection('users').limit(500).get();
      const fresh = {};
      snap.docs.forEach(d => {
        const data = d.data();
        fresh[d.id] = {
          nick:  data.nick  || '',
          phone: data.phone || '',
          login: data.login || '',
          role:  data.role  || 'user'
        };
      });
      _usersCache = fresh;
      _usersCacheLoaded = true;
      // Сохраняем в localStorage для следующей сессии
      try{
        localStorage.setItem(_USERS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: fresh }));
      }catch(e){}
    }catch(e){
      console.warn('_loadUsersCache:', e.message);
    }
    _usersCacheLoadPromise = null;
    return _usersCache;
  })();

  return _usersCacheLoadPromise;
}

// Принудительно сбросить и перезагрузить кэш (вызывается после saveNick)
function _invalidateUsersCache(){
  _usersCacheLoaded = false;
  _usersCacheLoadPromise = null;
  try{ localStorage.removeItem(_USERS_CACHE_KEY); }catch(e){}
  // Фоново перезагружаем
  _loadUsersCache({ forceRefresh: true });
}

// Возвращает актуальное отображаемое имя для userId
// Приоритет: ник из кэша > телефон из кэша > логин из кэша > fallback из отзыва
function _getActualName(userId, fallback){
  if(!userId) return fallback || '?';
  const u = _usersCache[userId];
  if(u){
    if(u.nick)   return u.nick;
    if(u.phone)  return u.phone;
    if(u.login)  return u.login;
  }
  return fallback || '?';
}

// ── SYNC NICK ──
async function _syncUserNick(){
  if(!currentUser||!currentUser.id)return;
  if(currentUser.nick)return;
  try{
    await _loadFirebase();
    const doc=await db.collection('users').doc(currentUser.id).get();
    if(doc.exists){
      const data=doc.data();
      if(data.nick){
        currentUser.nick=data.nick;
        localStorage.setItem('ta_user',JSON.stringify(currentUser));
        updateLoginBtn();
        const nickInput=document.getElementById('pNickInput');
        if(nickInput&&!nickInput.value)nickInput.value=data.nick;
      }
    }
  }catch(e){console.warn('_syncUserNick:',e.message);}
}

// ── LOGIN BTN ──
function updateLoginBtn(){
  const btn=document.getElementById('loginBtn');
  if(currentUser){
    const nick=currentUser.nick||'';
    const label=nick||currentUser.phone||currentUser.login||'';
    btn.textContent=currentUser.role==='admin'?`⚙️ ${label}`:`👤 ${maskPhone(label)}`;
    btn.style.background=currentUser.role==='admin'?'#7c3aed':'var(--green)';
  } else {
    btn.textContent=t('loginBtn');
    btn.style.background='var(--green)';
  }
}

function maskPhone(p){return!p?'':p.length<=6?p:p.slice(0,6)+'***';}
function onLoginBtnClick(){currentUser?switchTab('profile'):openAuthModal();}

// ── AUTH ──
function openAuthModal(){document.getElementById('authOverlay').classList.remove('hidden');}

function openAdminLogin(){
  if(currentUser){showToast('Выйдите из текущего аккаунта перед входом в другой');return;}
  closeOverlay('authOverlay');
  document.getElementById('adminOverlay').classList.remove('hidden');
}

function closeOverlay(id){document.getElementById(id).classList.add('hidden');}
function overlayBgClick(e,id){if(e.target.id===id)closeOverlay(id);}

function toggleEye(id){
  const i=document.getElementById(id);
  const btn=i.closest('.passRow').querySelector('.eyeBtn');
  const show=i.dataset.visible!=='true';
  i.dataset.visible=show?'true':'false';
  const tmp=document.createElement('input');
  tmp.style.cssText='position:fixed;opacity:0;top:0;left:0;width:1px;height:1px;font-size:16px;';
  document.body.appendChild(tmp);
  tmp.focus();
  i.type=show?'text':'password';
  i.focus();
  tmp.remove();
  if(!btn)return;
  btn.classList.toggle('open',show);
  btn.innerHTML=show
    ?`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
    :`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

function setAuthTab(tab){
  authTab=tab;
  document.getElementById('tabLogin').classList.toggle('active',tab==='login');
  document.getElementById('tabReg').classList.toggle('active',tab==='register');
  document.getElementById('authActionBtn').textContent=tab==='login'?t('loginAction'):t('registerAction');
}

async function doAuth(){
  const phone='+998'+document.getElementById('authPhone').value.trim().replace(/\D/g,'');
  const pass=document.getElementById('authPass').value.trim();
  if(!phone||!pass){showToast(t('toastFillAll'));return;}
  try{
    await _loadFirebase();
    const passHash=await hashPassword(pass);
    if(authTab==='login'){
      const snap=await db.collection('users').where('phone','==',phone).limit(1).get();
      if(snap.empty){showToast(t('toastUserNotFound'));return;}
      const userDoc=snap.docs[0];
      const userData=userDoc.data();
      if(userData.passwordHash!==passHash){showToast(t('toastWrongPass'));return;}
      currentUser={id:userDoc.id,phone:userData.phone,role:userData.role||'user',nick:userData.nick||''};
      localStorage.setItem('ta_user',JSON.stringify(currentUser));
      closeOverlay('authOverlay');
      updateLoginBtn();
      resetReviewForm();
      if(!document.getElementById('profileScreen').classList.contains('hidden'))loadProfile();
      showToast(t('toastLoginOk'));
      logAction({type:'auth',category:'auth',action:t('logLogin'),detail:`${t('logUser')} ${phone}`});
    } else {
      const exists=await db.collection('users').where('phone','==',phone).limit(1).get();
      if(!exists.empty){showToast(t('toastAlreadyReg'));return;}
      const newDoc=await db.collection('users').add({
        phone,passwordHash:passHash,role:'user',createdAt:new Date().toISOString()
      });
      currentUser={id:newDoc.id,phone,role:'user',nick:''};
      localStorage.setItem('ta_user',JSON.stringify(currentUser));
      closeOverlay('authOverlay');
      updateLoginBtn();
      resetReviewForm();
      if(!document.getElementById('profileScreen').classList.contains('hidden'))loadProfile();
      showToast(t('toastRegOk'));
      logAction({type:'auth',category:'auth',action:t('logRegister'),detail:`${t('logUser')}: ${phone}`});
    }
  }catch(e){showToast('Ошибка: '+e.message);console.error(e);}
}

let _adminLoginInProgress=false;
async function doAdminLogin(){
  if(_adminLoginInProgress)return;
  const login=document.getElementById('adminLogin').value.trim();
  const pass=document.getElementById('adminPass').value.trim();
  if(!login||!pass){showToast(t('toastFillAll'));return;}
  _adminLoginInProgress=true;
  const btn=document.querySelector('#adminBox .mainBtn');
  if(btn){btn.textContent='⏳ Вход...';btn.disabled=true;}
  document.getElementById('adminPass').blur();
  document.getElementById('adminLogin').blur();
  try{
    await _loadFirebase();
    const passHash=await hashPassword(pass);
    const queryPromise=db.collection('users').where('login','==',login).where('role','==','admin').get();
    const timeoutPromise=new Promise((_,rej)=>setTimeout(()=>rej(new Error(t('toastTimeout'))),8000));
    const snap=await Promise.race([queryPromise,timeoutPromise]);
    if(snap.empty){showToast(t('toastAdminNotFound'));return;}
    const userDoc=snap.docs.find(d=>d.data().passwordHash===passHash);
    if(!userDoc){showToast(t('toastWrongPass'));return;}
    const userData=userDoc.data();
    currentUser={id:userDoc.id,login:userData.login,role:'admin',nick:userData.nick||''};
    localStorage.setItem('ta_user',JSON.stringify(currentUser));
    closeOverlay('adminOverlay');
    updateLoginBtn();
    showToast(t('toastAdminLoginOk'));
    logAction({type:'admin',category:'admin',action:t('logAdminLogin'),detail:`${t('logAdmin')}: ${login}`});
    setTimeout(()=>switchTab('add'),200);
  }catch(e){
    showToast('Ошибка: '+e.message);
    console.error(e);
  }finally{
    _adminLoginInProgress=false;
    if(btn){btn.textContent='Войти';btn.disabled=false;}
  }
}

function doLogout(){
  const who=currentUser?(currentUser.phone||currentUser.login||'?'):'?';
  const role=currentUser?.role||'user';
  logAction({type:'auth',category:'auth',action:t('logLogout'),detail:`${role==='admin'?t('logAdmin'):t('logUser')}: ${who}`});
  currentUser=null;
  localStorage.removeItem('ta_user');
  updateLoginBtn();
  switchTab('map');
  showToast(t('toastLogout'));
  const guest=document.getElementById('pGuestView');
  const user=document.getElementById('pUserView');
  if(guest)guest.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:16px;padding:40px 24px;';
  if(user)user.style.display='none';
}

// ── PROFILE SCREEN ──
function loadProfile(){
  const guest=document.getElementById('pGuestView');
  const user=document.getElementById('pUserView');
  if(!guest||!user)return;
  if(!currentUser){
    guest.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:16px;padding:40px 24px;';
    user.style.display='none';
    return;
  }
  guest.style.display='none';
  user.style.cssText='width:100%;display:flex;flex-direction:column;gap:14px;';

  const label=currentUser.phone||currentUser.login||'?';
  const ini=label.replace(/\+/g,'').slice(0,2).toUpperCase();
  const avatarLetter=document.getElementById('pAvatarLetter');
  if(avatarLetter)avatarLetter.textContent=ini;
  const avatarWrap=document.getElementById('pAvatarWrap');
  if(avatarWrap)avatarWrap.style.background=currentUser.role==='admin'?'#7c3aed':'var(--green)';
  const phoneLabel=document.getElementById('pPhoneLabel');
  if(phoneLabel)phoneLabel.textContent=label;

  const nickInput=document.getElementById('pNickInput');
  if(nickInput){nickInput.value=currentUser.nick||'';nickInput.placeholder=label;}

  const badge=document.getElementById('pRoleBadge');
  if(badge){
    if(currentUser.role==='admin'){
      badge.textContent='⚙️ Admin';
      badge.style.cssText='flex-shrink:0;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(124,58,237,0.15);color:#7c3aed;border:1px solid rgba(124,58,237,0.3);';
    } else {
      badge.textContent='✦ User';
      badge.style.cssText='flex-shrink:0;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(59,130,246,0.12);color:#2563eb;border:1px solid rgba(59,130,246,0.3);';
    }
  }

  const borderColor=currentUser.role==='admin'?'#7c3aed':'var(--green)';
  const c1=document.getElementById('pStatReviewsCard');
  const c2=document.getElementById('pStatFavCard');
  if(c1)c1.style.borderColor=borderColor;
  if(c2)c2.style.borderColor=borderColor;

  const statFav=document.getElementById('pStatFav');
  const statReviews=document.getElementById('pStatReviews');
  const favs=getFavorites();
  // Показываем скелетон в счётчиках пока данные грузятся
  if(statFav)statFav.innerHTML='<span class="skeletonBase" style="display:inline-block;width:28px;height:22px;border-radius:6px;vertical-align:middle;"></span>';
  if(statReviews)statReviews.innerHTML='<span class="skeletonBase" style="display:inline-block;width:28px;height:22px;border-radius:6px;vertical-align:middle;"></span>';

  const list=document.getElementById('pFavList');
  if(list){
    if(favs.length){renderFavorites();}
    else{list.innerHTML=_skFavCards(3);}
  }

  _loadFavoritesFromFirestore();
  loadProfileStats();
}

async function loadProfileStats(){
  if(!currentUser)return;
  const el=document.getElementById('pStatReviews');
  if(el)el.textContent='0';
  try{
    await _loadFirebase();
    let revSize=0;
    try{
      const revSnap=await db.collection('reviews').where('userId','==',currentUser.id).limit(200).get();
      revSize=revSnap.size;
    }catch(e2){
      try{
        const name=currentUser.nick||currentUser.phone||currentUser.login||'';
        if(name){
          const revSnap2=await db.collection('reviews').where('userPhone','==',name).limit(200).get();
          revSize=revSnap2.size;
        }
      }catch(e3){}
    }
    if(el)el.textContent=revSize;
  }catch(e){if(el)el.textContent='0';}
}

async function saveNick(nick){
  if(!currentUser)return;
  const trimmed=nick.trim();
  currentUser.nick=trimmed;
  localStorage.setItem('ta_user',JSON.stringify(currentUser));
  if(_usersCache[currentUser.id]){_usersCache[currentUser.id].nick=trimmed;}
  else{_usersCache[currentUser.id]={nick:trimmed,phone:currentUser.phone||'',login:currentUser.login||'',role:currentUser.role||'user'};}
  updateLoginBtn();
  try{
    await _loadFirebase();
    await db.collection('users').doc(currentUser.id).set({nick:trimmed},{merge:true});
    if(trimmed){
      const displayName=trimmed;
      const snap=await db.collection('reviews').where('userId','==',currentUser.id).limit(100).get();
      const batch=db.batch();
      snap.docs.forEach(doc=>batch.update(doc.ref,{userPhone:displayName}));
      const logSnap=await db.collection('logs').where('actorId','==',currentUser.id).limit(200).get();
      logSnap.docs.forEach(doc=>batch.update(doc.ref,{actorName:displayName,actorNick:displayName}));
      await batch.commit();
      // Инвалидируем оба кэша — отзывов и пользователей
      Object.keys(_reviewsCache).forEach(k=>delete _reviewsCache[k]);
      _invalidateUsersCache();
    }
  }catch(e){console.warn('saveNick error:',e);}
}

// ── TABS ──
let _adminNavLastClick=0;

function onAdminNavClick(){
  const isAlreadyOnAdd=document.querySelector('.navCenter.active')!==null;
  if(isAlreadyOnAdd){
    showAdminDashboard();
    const addScreen=document.getElementById('addScreen');
    if(addScreen)addScreen.scrollTo({top:0,behavior:'instant'});
  } else {
    switchTab('add');
  }
}

function onProfileNavClick(){
  const isAlreadyOnProfile=document.querySelector('.navBtn[data-tab="profile"].active')!==null;
  if(isAlreadyOnProfile){
    const ps=document.getElementById('profileScreen');
    if(ps)ps.scrollTo({top:0,behavior:'instant'});
  } else {
    switchTab('profile');
  }
}

function switchTab(tab){
  closeSheet();
  if(tab!=='map'&&wizPickMode){
    wizPickMode=false;
    _wizHideOverlay();
    const nav=document.getElementById('bottomNav');
    if(nav)nav.style.display='';
    if(myMap){
      myMap.events.remove('boundschange',_wizOnMapMove);
      myMap.events.remove('actionbegin',_wizOnMapDragStart);
      myMap.events.remove('actionend',_wizOnMapDragEnd);
    }
  }
  document.querySelectorAll('.navBtn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  const nc=document.querySelector('.navCenter');
  if(nc)nc.classList.toggle('active',tab==='add');

  const isMap=tab==='map';
  const hp=document.getElementById('headerPanel');
  if(hp){hp.style.display=isMap?'':'none';hp.style.visibility=isMap?'':'hidden';}

  ['zoomControls','geoBtn','findNearestBtn'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    if(isMap){el.style.display='';el.style.visibility='visible';}
    else{el.style.display='none';el.style.visibility='hidden';}
  });

  const mc=document.getElementById('mapControls');
  if(mc)mc.style.display=isMap?'':'none';

  if(isMap){
    if(hp){hp.style.display='';hp.style.visibility='visible';}
    if(mc)mc.style.display='';
    if(wizPickMode){
      if(hp){hp.style.display='none';hp.style.visibility='hidden';}
      if(mc)mc.style.display='none';
      ['findNearestBtn'].forEach(id=>{
        const el=document.getElementById(id);
        if(el){el.style.display='none';el.style.visibility='hidden';}
      });
    }
    requestAnimationFrame(()=>requestAnimationFrame(()=>adjustControlsPosition()));
  } else {
    setScreenPaddingTop();
  }

  document.getElementById('profileScreen').classList.add('hidden');
  document.getElementById('adminDeniedScreen').classList.add('hidden');
  document.getElementById('addScreen').classList.add('hidden');

  if(tab==='add'){
    if(currentUser&&currentUser.role==='admin'){
      document.getElementById('addScreen').classList.remove('hidden');
      addCoords=null;
      if(!_skipAdminDashboard&&!_wizInProgress){
        if(_activeAdminSubview&&_activeAdminSubview!=='addForm'){
          document.getElementById('adminDashboard').style.display='none';
          document.querySelectorAll('.adminSubview').forEach(el=>el.classList.add('hidden'));
          if(_activeAdminSubview==='moderation')document.getElementById('adminSubModeration').classList.remove('hidden');
          else if(_activeAdminSubview==='logs')document.getElementById('adminSubLogs').classList.remove('hidden');
          else if(_activeAdminSubview==='stats')document.getElementById('adminSubStats').classList.remove('hidden');
        } else {
          showAdminDashboard();
        }
      } else if(_wizInProgress){
        document.getElementById('adminDashboard').style.display='none';
        document.getElementById('adminSubAddForm').classList.remove('hidden');
      }
      _skipAdminDashboard=false;
    } else {
      document.getElementById('adminDeniedScreen').classList.remove('hidden');
      document.getElementById('adTitle').textContent=t('adminDeniedTitle');
      document.getElementById('adText').textContent=t('adminDenied');
      document.getElementById('adBtnLabel').textContent=t('adminDeniedBtn');
    }
  } else if(tab==='profile'){
    const ps=document.getElementById('profileScreen');
    ps.classList.remove('hidden');
    ps.style.display='flex';
    loadProfile();
  }
}

function setScreenPaddingTop(){
  // Padding управляется CSS через env(safe-area-inset-top) — no-op для совместимости
}

// ── MODAL DRAGS ──
document.addEventListener('DOMContentLoaded',function(){
  initDrag(document.getElementById('authDrag'),document.getElementById('authBox'),()=>closeOverlay('authOverlay'));
  initDrag(document.getElementById('adminDrag'),document.getElementById('adminBox'),()=>closeOverlay('adminOverlay'));
});
