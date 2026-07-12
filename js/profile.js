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
