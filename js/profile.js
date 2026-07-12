// ── ГЛОБАЛЬНЫЙ КЭШ ПОЛЬЗОВАТЕЛЕЙ ──
let _usersCache={};
let _usersCacheLoaded=false;

async function _loadUsersCache(){
  if(_usersCacheLoaded)return _usersCache;
  try{
    await _loadFirebase();
    const snap=await db.collection('users').limit(500).get();
    snap.docs.forEach(d=>{
      const data=d.data();
      _usersCache[d.id]={
        nick:data.nick||'',
        phone:data.phone||'',
        login:data.login||'',
        role:data.role||'user'
      };
    });
    _usersCacheLoaded=true;
  }catch(e){console.warn('_loadUsersCache:',e.message);}
  return _usersCache;
}

// Возвращает актуальное отображаемое имя для userId
function _getActualName(userId,fallback){
  if(!userId)return fallback||'?';
  const u=_usersCache[userId];
  if(!u)return fallback||userId;
  return u.nick||u.phone||u.login||fallback||'?';
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
