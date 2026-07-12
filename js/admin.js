// ── USERS CACHE ──
let _usersCache={};
let _usersCacheLoaded=false;
async function _loadUsersCache(){
  if(_usersCacheLoaded)return _usersCache;
  try{
    await _loadFirebase();
    const snap=await db.collection('users').limit(500).get();
    snap.docs.forEach(d=>{const data=d.data();_usersCache[d.id]={nick:data.nick||'',phone:data.phone||'',login:data.login||'',role:data.role||'user'};});
    _usersCacheLoaded=true;
  }catch(e){console.warn('_loadUsersCache:',e.message);}
  return _usersCache;
}
function _getActualName(userId,fallback){
  if(!userId)return fallback||'?';
  const u=_usersCache[userId];if(!u)return fallback||userId;
  return u.nick||u.phone||u.login||fallback||'?';
}
