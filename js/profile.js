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
