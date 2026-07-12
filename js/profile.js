// ── AUTH ──
function openAuthModal(){document.getElementById('authOverlay').classList.remove('hidden');}
function openAdminLogin(){
  if(currentUser){showToast('Выйдите из текущего аккаунта перед входом в другой');return;}
  closeOverlay('authOverlay');document.getElementById('adminOverlay').classList.remove('hidden');
}
function closeOverlay(id){document.getElementById(id).classList.add('hidden');}
function overlayBgClick(e,id){if(e.target.id===id)closeOverlay(id);}
function toggleEye(id){
  const i=document.getElementById(id);const btn=i.closest('.passRow').querySelector('.eyeBtn');
  const show=i.dataset.visible!=='true';i.dataset.visible=show?'true':'false';
  const tmp=document.createElement('input');tmp.style.cssText='position:fixed;opacity:0;top:0;left:0;width:1px;height:1px;font-size:16px;';
  document.body.appendChild(tmp);tmp.focus();i.type=show?'text':'password';i.focus();tmp.remove();
  if(!btn)return;btn.classList.toggle('open',show);
  btn.innerHTML=show?`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}
function setAuthTab(tab){
  authTab=tab;
  document.getElementById('tabLogin').classList.toggle('active',tab==='login');
  document.getElementById('tabReg').classList.toggle('active',tab==='register');
  document.getElementById('authActionBtn').textContent=tab==='login'?'Войти':'Зарегистрироваться';
}

async function doAuth(){
  const phone='+998'+document.getElementById('authPhone').value.trim().replace(/\D/g,'');
  const pass=document.getElementById('authPass').value.trim();
  if(!phone||!pass){showToast(t('toastFillAll'));return;}
  try{
    await _loadFirebase();const passHash=await hashPassword(pass);
    if(authTab==='login'){
      const snap=await db.collection('users').where('phone','==',phone).limit(1).get();
      if(snap.empty){showToast(t('toastUserNotFound'));return;}
      const userDoc=snap.docs[0];const userData=userDoc.data();
      if(userData.passwordHash!==passHash){showToast(t('toastWrongPass'));return;}
      currentUser={id:userDoc.id,phone:userData.phone,role:userData.role||'user',nick:userData.nick||''};
      localStorage.setItem('ta_user',JSON.stringify(currentUser));
      closeOverlay('authOverlay');updateLoginBtn();resetReviewForm();
      if(!document.getElementById('profileScreen').classList.contains('hidden'))loadProfile();
      showToast(t('toastLoginOk'));
      logAction({type:'auth',category:'auth',action:t('logLogin'),detail:`${t('logUser')} ${phone}`});
    }else{
      const exists=await db.collection('users').where('phone','==',phone).limit(1).get();
      if(!exists.empty){showToast(t('toastAlreadyReg'));return;}
      const newDoc=await db.collection('users').add({phone,passwordHash:passHash,role:'user',createdAt:new Date().toISOString()});
      currentUser={id:newDoc.id,phone,role:'user',nick:''};
      localStorage.setItem('ta_user',JSON.stringify(currentUser));
      closeOverlay('authOverlay');updateLoginBtn();resetReviewForm();
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
  document.getElementById('adminPass').blur();document.getElementById('adminLogin').blur();
  try{
    await _loadFirebase();const passHash=await hashPassword(pass);
    const snap=await Promise.race([db.collection('users').where('login','==',login).where('role','==','admin').get(),new Promise((_,rej)=>setTimeout(()=>rej(new Error(t('toastTimeout'))),8000))]);
    if(snap.empty){showToast(t('toastAdminNotFound'));return;}
    const userDoc=snap.docs.find(d=>d.data().passwordHash===passHash);
    if(!userDoc){showToast(t('toastWrongPass'));return;}
    const userData=userDoc.data();
    currentUser={id:userDoc.id,login:userData.login,role:'admin',nick:userData.nick||''};
    localStorage.setItem('ta_user',JSON.stringify(currentUser));
    closeOverlay('adminOverlay');updateLoginBtn();showToast(t('toastAdminLoginOk'));
    logAction({type:'admin',category:'admin',action:t('logAdminLogin'),detail:`${t('logAdmin')}: ${login}`});
    setTimeout(()=>switchTab('add'),200);
  }catch(e){showToast('Ошибка: '+e.message);console.error(e);}
  finally{_adminLoginInProgress=false;if(btn){btn.textContent='Войти';btn.disabled=false;}}
}

function doLogout(){
  const who=currentUser?(currentUser.phone||currentUser.login||'?'):'?';
  const role=currentUser?.role||'user';
  logAction({type:'auth',category:'auth',action:t('logLogout'),detail:`${role==='admin'?t('logAdmin'):t('logUser')}: ${who}`});
  currentUser=null;localStorage.removeItem('ta_user');updateLoginBtn();switchTab('map');showToast(t('toastLogout'));
  const guest=document.getElementById('pGuestView');const user=document.getElementById('pUserView');
  if(guest)guest.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:16px;padding:40px 24px;';
  if(user)user.style.display='none';
}

// ── PROFILE ──
function loadProfile(){
  const guest=document.getElementById('pGuestView');const user=document.getElementById('pUserView');
  if(!guest||!user)return;
  if(!currentUser){guest.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:16px;padding:40px 24px;';user.style.display='none';return;}
  guest.style.display='none';user.style.cssText='width:100%;display:flex;flex-direction:column;gap:14px;';
  const label=currentUser.phone||currentUser.login||'?';
  const ini=label.replace(/\+/g,'').slice(0,2).toUpperCase();
  const avatarLetter=document.getElementById('pAvatarLetter');if(avatarLetter)avatarLetter.textContent=ini;
  const avatarWrap=document.getElementById('pAvatarWrap');if(avatarWrap)avatarWrap.style.background=currentUser.role==='admin'?'#7c3aed':'var(--green)';
  const phoneLabel=document.getElementById('pPhoneLabel');if(phoneLabel)phoneLabel.textContent=label;
  const nickInput=document.getElementById('pNickInput');if(nickInput){nickInput.value=currentUser.nick||'';nickInput.placeholder=label;}
  const badge=document.getElementById('pRoleBadge');
  if(badge){
    if(currentUser.role==='admin'){badge.textContent='⚙️ Admin';badge.style.cssText='flex-shrink:0;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(124,58,237,0.15);color:#7c3aed;border:1px solid rgba(124,58,237,0.3);';}
    else{badge.textContent='✦ User';badge.style.cssText='flex-shrink:0;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(59,130,246,0.12);color:#2563eb;border:1px solid rgba(59,130,246,0.3);';}
  }
  const borderColor=currentUser.role==='admin'?'#7c3aed':'var(--green)';
  const c1=document.getElementById('pStatReviewsCard');const c2=document.getElementById('pStatFavCard');
  if(c1)c1.style.borderColor=borderColor;if(c2)c2.style.borderColor=borderColor;
  const statFav=document.getElementById('pStatFav');const statReviews=document.getElementById('pStatReviews');
  const favs=getFavorites();
  if(statFav)statFav.textContent=favs.length;if(statReviews)statReviews.textContent='0';
  const list=document.getElementById('pFavList');
  if(list){if(favs.length)renderFavorites();else list.innerHTML=_skFavCards(3);}
  _loadFavoritesFromFirestore();loadProfileStats();
}

async function loadProfileStats(){
  if(!currentUser)return;
  const el=document.getElementById('pStatReviews');if(el)el.textContent='0';
  try{
    await _loadFirebase();let revSize=0;
    try{const snap=await db.collection('reviews').where('userId','==',currentUser.id).limit(200).get();revSize=snap.size;}
    catch(e2){try{const name=currentUser.nick||currentUser.phone||currentUser.login||'';if(name){const snap2=await db.collection('reviews').where('userPhone','==',name).limit(200).get();revSize=snap2.size;}}catch(e3){}}
    if(el)el.textContent=revSize;
  }catch(e){if(el)el.textContent='0';}
}

async function saveNick(nick){
  if(!currentUser)return;const trimmed=nick.trim();
  currentUser.nick=trimmed;localStorage.setItem('ta_user',JSON.stringify(currentUser));
  if(_usersCache[currentUser.id])_usersCache[currentUser.id].nick=trimmed;
  else _usersCache[currentUser.id]={nick:trimmed,phone:currentUser.phone||'',login:currentUser.login||'',role:currentUser.role||'user'};
  updateLoginBtn();
  try{
    await _loadFirebase();
    await db.collection('users').doc(currentUser.id).set({nick:trimmed},{merge:true});
    if(trimmed){
      const displayName=trimmed;
      const snap=await db.collection('reviews').where('userId','==',currentUser.id).limit(100).get();
      const batch=db.batch();snap.docs.forEach(doc=>batch.update(doc.ref,{userPhone:displayName}));
      const logSnap=await db.collection('logs').where('actorId','==',currentUser.id).limit(200).get();
      logSnap.docs.forEach(doc=>batch.update(doc.ref,{actorName:displayName,actorNick:displayName}));
      await batch.commit();
      Object.keys(_reviewsCache).forEach(k=>delete _reviewsCache[k]);
    }
  }catch(e){console.warn('saveNick error:',e);}
}

// ── FAVOURITES (Firestore + localStorage cache) ──
function _favKey(){return currentUser?'ta_fav_'+currentUser.id:null;}
function getFavorites(){if(!currentUser)return[];try{const raw=localStorage.getItem(_favKey());return raw?JSON.parse(raw):[];}catch(e){return[];}}
function _setFavCache(favs){const key=_favKey();if(key)localStorage.setItem(key,JSON.stringify(favs));}

async function _loadFavoritesFromFirestore(){
  if(!currentUser)return;
  try{
    await _loadFirebase();
    const colRef=db.collection('users').doc(currentUser.id).collection('favorites');
    const snap=await colRef.get();
    if(snap.empty){
      const local=getFavorites();
      if(local.length>0){const batch=db.batch();local.forEach(f=>batch.set(colRef.doc(f.id),f));await batch.commit();_setFavCache(local);}
      else _setFavCache([]);
    }else{
      const favs=snap.docs.map(d=>({id:d.id,...d.data()}));_setFavCache(favs);
    }
    renderFavorites();
    const favEl=document.getElementById('pStatFav');if(favEl)favEl.textContent=getFavorites().length;
  }catch(e){console.warn('_loadFavoritesFromFirestore:',e.message);renderFavorites();}
}
async function _addFavToFirestore(favItem){
  if(!currentUser)return;
  try{await _loadFirebase();await db.collection('users').doc(currentUser.id).collection('favorites').doc(favItem.id).set(favItem);}
  catch(e){console.warn('_addFavToFirestore:',e.message);}
}
async function _removeFavFromFirestore(toiletId){
  if(!currentUser)return;
  try{await _loadFirebase();await db.collection('users').doc(currentUser.id).collection('favorites').doc(toiletId).delete();}
  catch(e){console.warn('_removeFavFromFirestore:',e.message);}
}
function saveFavorites(favs){if(!currentUser)return;_setFavCache(favs);}
function isFavorite(toiletId){return getFavorites().some(f=>f.id===toiletId);}

async function toggleFavorite(toiletId){
  if(!currentUser){openAuthModal();return;}
  const favs=getFavorites();const idx=favs.findIndex(f=>f.id===toiletId);
  if(idx>=0){
    const removed=favs[idx];favs.splice(idx,1);saveFavorites(favs);_removeFavFromFirestore(toiletId);
    updateFavBtn(toiletId);renderFavorites();const favEl=document.getElementById('pStatFav');if(favEl)favEl.textContent=favs.length;
    showToast('Убрано из избранного');logAction({type:'fav',category:'fav',action:t('logRemovedFav'),detail:`${t('logToilet')}: ${removed?.title||toiletId}`});
  }else{
    const toilet=allToilets.find(x=>x.id===toiletId);if(!toilet)return;
    let addr=toilet.addr||'';
    if(!addr){try{addr=await wizGeocode(toilet.lat,toilet.lon);}catch(e){addr=`${toilet.lat.toFixed(4)}, ${toilet.lon.toFixed(4)}`;}
      if(addr){toilet.addr=addr;try{await _loadFirebase();await db.collection('toilets').doc(toilet.id).set({addr},{merge:true});}catch(e){}}
    }
    const favItem={id:toilet.id,title:toilet.title,addr,lat:toilet.lat,lon:toilet.lon};
    favs.push(favItem);saveFavorites(favs);_addFavToFirestore(favItem);
    updateFavBtn(toiletId);renderFavorites();const favEl=document.getElementById('pStatFav');if(favEl)favEl.textContent=favs.length;
    showToast('Добавлено в избранное ❤️');logAction({type:'fav',category:'fav',action:t('logAddedFav'),detail:`${t('logToilet')}: ${toilet.title}`});
  }
}
function updateFavBtn(toiletId){
  const btn=document.getElementById('sFavBtn');if(!btn)return;
  const fav=isFavorite(toiletId);btn.classList.toggle('active',fav);
  btn.innerHTML=fav?`<svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
}

function renderFavorites(){
  const list=document.getElementById('pFavList');if(!list)return;
  const favs=getFavorites();const favEl=document.getElementById('pStatFav');if(favEl)favEl.textContent=favs.length;
  if(!favs.length){list.innerHTML='<p style="text-align:center;color:var(--text2);font-size:13px;padding:10px 0;">Нет избранных туалетов</p>';return;}
  if(!allToilets.length){list.innerHTML=_skFavCards(favs.length);setTimeout(()=>{if(allToilets.length)renderFavorites();},1200);return;}
  list.innerHTML=favs.map(f=>{
    const _t=allToilets.find(x=>x.id===f.id);const _ico=_t?.isTaharatkhana?'🕌':'🚻';
    const _toiletDesc=_t?.description||'';
    const _addr=(f.addr&&f.addr!==_toiletDesc)?f.addr:(f.lat?`${Number(f.lat).toFixed(4)}, ${Number(f.lon).toFixed(4)}`:'—');
    return`<div class="pFavItem"><div class="pFavItem-body"><div class="pFavItem-ico">${_ico}</div><div class="pFavItem-info" onclick="openFavSheet('${f.id}')"><div class="pFavItem-title">${f.title}</div><div class="pFavItem-addr">${_addr}</div></div></div><div class="pFavItem-divider"></div><div class="pFavItem-actions"><button class="pFavItem-btn" onclick="openFavOnMap('${f.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>На карте</button><button class="pFavItem-btn" onclick="openFavSheet('${f.id}')" style="background:rgba(236,72,153,0.1);border-color:rgba(236,72,153,0.3);color:#ec4899;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Открыть</button><button class="pFavRemove" onclick="confirmRemoveFavorite('${f.id}','${f.title.replace(/'/g,"\\'")}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div></div>`;
  }).join('');
  _fixFavAddresses(favs);
}

let _fixFavRunning=false;
async function _fixFavAddresses(favs){
  if(!currentUser||_fixFavRunning)return;_fixFavRunning=true;let changed=false;
  for(const f of favs){
    if(!f.lat||!f.lon)continue;
    const _t=allToilets.find(x=>x.id===f.id);const _desc=_t?.description||'';
    if(!(!f.addr||f.addr===_desc||f.addr==='Нет адреса'||f.addr==='—'))continue;
    try{const newAddr=await wizGeocode(f.lat,f.lon);f.addr=newAddr;changed=true;
      if(_t&&!_t.addr){_t.addr=newAddr;try{await _loadFirebase();await db.collection('toilets').doc(f.id).set({addr:newAddr},{merge:true});}catch(e){}}
    }catch(e){}
  }
  _fixFavRunning=false;
  if(changed){saveFavorites(favs);const items=document.querySelectorAll('#pFavList .pFavItem');favs.forEach((f,i)=>{const addrEl=items[i]?.querySelector('.pFavItem-addr');if(addrEl&&f.addr)addrEl.textContent=f.addr;});}
}

let _favConfirmId=null;
function confirmRemoveFavorite(toiletId,title){
  _favConfirmId=toiletId;const titleEl=document.getElementById('pFavConfirmTitle');if(titleEl)titleEl.textContent=title;
  const btn=document.getElementById('pFavConfirmBtn');if(btn)btn.onclick=()=>{removeFavorite(_favConfirmId);closeFavConfirm();};
  document.getElementById('pFavConfirm').classList.add('open');document.getElementById('pFavBackdrop').style.display='block';
}
function closeFavConfirm(){document.getElementById('pFavConfirm').classList.remove('open');document.getElementById('pFavBackdrop').style.display='none';_favConfirmId=null;}
function removeFavorite(toiletId){
  const favs=getFavorites().filter(f=>f.id!==toiletId);saveFavorites(favs);_removeFavFromFirestore(toiletId);
  renderFavorites();updateFavBtn(toiletId);const favEl=document.getElementById('pStatFav');if(favEl)favEl.textContent=favs.length;
}
function openFavSheet(toiletId){const toilet=allToilets.find(t=>t.id===toiletId);if(!toilet){showToast('Туалет не найден');return;}openSheet(toilet);}
function openFavOnMap(toiletId){const toilet=allToilets.find(t=>t.id===toiletId);if(!toilet){showToast('Туалет не найден на карте');return;}switchTab('map');setTimeout(()=>{myMap.setCenter([toilet.lat,toilet.lon],17,{duration:600});},300);}
function openFavToilet(toiletId){openFavSheet(toiletId);}
