// ── FAVORITES ──
// localStorage — быстрый синхронный кэш
// Firestore — единственный источник правды между устройствами

function _favKey(){
  return currentUser ? 'ta_fav_'+currentUser.id : null;
}

function getFavorites(){
  if(!currentUser)return[];
  try{
    const raw=localStorage.getItem(_favKey());
    return raw?JSON.parse(raw):[];
  }catch(e){return[];}
}

function _setFavCache(favs){
  const key=_favKey();
  if(key)localStorage.setItem(key,JSON.stringify(favs));
}

function saveFavorites(favs){
  if(!currentUser)return;
  _setFavCache(favs);
}

function isFavorite(toiletId){
  return getFavorites().some(f=>f.id===toiletId);
}

// Загружает избранное из Firestore → обновляет кэш и UI
async function _loadFavoritesFromFirestore(){
  if(!currentUser)return;
  try{
    await _loadFirebase();
    const colRef=db.collection('users').doc(currentUser.id).collection('favorites');
    const snap=await colRef.get();
    if(snap.empty){
      const local=getFavorites();
      if(local.length>0){
        const batch=db.batch();
        local.forEach(f=>batch.set(colRef.doc(f.id),f));
        await batch.commit();
        _setFavCache(local);
      } else {
        _setFavCache([]);
      }
    } else {
      const favs=snap.docs.map(d=>({id:d.id,...d.data()}));
      _setFavCache(favs);
    }
    renderFavorites();
    const favEl=document.getElementById('pStatFav');
    if(favEl)favEl.textContent=getFavorites().length;
  }catch(e){
    console.warn('_loadFavoritesFromFirestore:',e.message);
    renderFavorites();
  }
}

async function _addFavToFirestore(favItem){
  if(!currentUser)return;
  try{
    await _loadFirebase();
    await db.collection('users').doc(currentUser.id)
      .collection('favorites').doc(favItem.id).set(favItem);
  }catch(e){console.warn('_addFavToFirestore:',e.message);}
}

async function _removeFavFromFirestore(toiletId){
  if(!currentUser)return;
  try{
    await _loadFirebase();
    await db.collection('users').doc(currentUser.id)
      .collection('favorites').doc(toiletId).delete();
  }catch(e){console.warn('_removeFavFromFirestore:',e.message);}
}

async function toggleFavorite(toiletId){
  if(!currentUser){openAuthModal();return;}
  const favs=getFavorites();
  const idx=favs.findIndex(f=>f.id===toiletId);
  if(idx>=0){
    const removed=favs[idx];
    favs.splice(idx,1);
    saveFavorites(favs);
    _removeFavFromFirestore(toiletId);
    updateFavBtn(toiletId);
    renderFavorites();
    const favEl=document.getElementById('pStatFav');
    if(favEl)favEl.textContent=favs.length;
    showToast('Убрано из избранного');
    logAction({type:'fav',category:'fav',action:t('logRemovedFav'),detail:`${t('logToilet')}: ${removed?.title||toiletId}`});
  } else {
    const toilet=allToilets.find(x=>x.id===toiletId);
    if(!toilet)return;
    let addr=toilet.addr||'';
    if(!addr){
      try{ addr=await wizGeocode(toilet.lat,toilet.lon); }
      catch(e){ addr=`${toilet.lat.toFixed(4)}, ${toilet.lon.toFixed(4)}`; }
      if(addr){
        toilet.addr=addr;
        try{
          await _loadFirebase();
          await db.collection('toilets').doc(toilet.id).set({addr},{merge:true});
        }catch(e){}
      }
    }
    const favItem={id:toilet.id,title:toilet.title,addr,lat:toilet.lat,lon:toilet.lon};
    favs.push(favItem);
    saveFavorites(favs);
    _addFavToFirestore(favItem);
    updateFavBtn(toiletId);
    renderFavorites();
    const favEl=document.getElementById('pStatFav');
    if(favEl)favEl.textContent=favs.length;
    showToast('Добавлено в избранное ❤️');
    logAction({type:'fav',category:'fav',action:t('logAddedFav'),detail:`${t('logToilet')}: ${toilet.title}`});
  }
}

function updateFavBtn(toiletId){
  const btn=document.getElementById('sFavBtn');
  if(btn){
    const fav=isFavorite(toiletId);
    btn.classList.toggle('active',fav);
    btn.innerHTML=fav
      ?`<svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
      :`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
  }
}

function renderFavorites(){
  const list=document.getElementById('pFavList');
  if(!list)return;
  const favs=getFavorites();
  const favEl=document.getElementById('pStatFav');
  if(favEl)favEl.textContent=favs.length;
  if(!favs.length){
    list.innerHTML='<p style="text-align:center;color:var(--text2);font-size:13px;padding:10px 0;">Нет избранных туалетов</p>';
    return;
  }
  if(!allToilets.length){
    list.innerHTML=_skFavCards(favs.length);
    setTimeout(()=>{ if(allToilets.length)renderFavorites(); },1200);
    return;
  }
  list.innerHTML=favs.map(f=>{
    const _t=allToilets.find(x=>x.id===f.id);
    const _ico=_t?.isTaharatkhana?'🕌':'🚻';
    // Берём addr из самого объекта избранного (f.addr),
    // fallback — addr туалета из allToilets, потом координаты
    const _addrRaw=f.addr||_t?.addr||'';
    const _desc=_t?.description||'';
    // Считаем адрес плохим если он пустой, совпадает с description или является заглушкой
    const _addrBad=!_addrRaw||_addrRaw===_desc||_addrRaw==='Нет адреса'||_addrRaw==='—';
    const _addr=_addrBad
      ?(f.lat?`${Number(f.lat).toFixed(4)}, ${Number(f.lon).toFixed(4)}`:'—')
      :_addrRaw;
    return`<div class="pFavItem">
      <div class="pFavItem-body">
        <div class="pFavItem-ico">${_ico}</div>
        <div class="pFavItem-info" onclick="openFavSheet('${f.id}')">
          <div class="pFavItem-title">${f.title}</div>
          <div class="pFavItem-addr">${_addr}</div>
        </div>
      </div>
      <div class="pFavItem-divider"></div>
      <div class="pFavItem-actions">
        <button class="pFavItem-btn" onclick="openFavOnMap('${f.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          На карте
        </button>
        <button class="pFavItem-btn" onclick="openFavSheet('${f.id}')" style="background:rgba(236,72,153,0.1);border-color:rgba(236,72,153,0.3);color:#ec4899;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Открыть
        </button>
        <button class="pFavRemove" onclick="confirmRemoveFavorite('${f.id}','${f.title.replace(/'/g,"\\'")}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>`;
  }).join('');
  _fixFavAddresses(favs);
}

let _fixFavRunning=false;
async function _fixFavAddresses(favs){
  if(!currentUser||_fixFavRunning)return;
  _fixFavRunning=true;
  let changed=false;
  for(const f of favs){
    if(!f.lat||!f.lon)continue;
    const _t=allToilets.find(x=>x.id===f.id);
    const _desc=_t?.description||'';
    const needsUpdate=!f.addr||f.addr===_desc||f.addr==='Нет адреса'||f.addr==='—'
      ||(f.addr&&_t?.description&&f.addr===_t.description);
    if(!needsUpdate)continue;
    try{
      const newAddr=await wizGeocode(f.lat,f.lon);
      f.addr=newAddr; changed=true;
      if(_t&&!_t.addr){
        _t.addr=newAddr;
        try{ await _loadFirebase(); await db.collection('toilets').doc(f.id).set({addr:newAddr},{merge:true}); }catch(e){}
      }
    }catch(e){}
  }
  _fixFavRunning=false;
  if(changed){
    saveFavorites(favs);
    const items=document.querySelectorAll('#pFavList .pFavItem');
    favs.forEach((f,i)=>{ const el=items[i]?.querySelector('.pFavItem-addr'); if(el&&f.addr)el.textContent=f.addr; });
  }
}

let _favConfirmId=null;
function confirmRemoveFavorite(toiletId,title){
  _favConfirmId=toiletId;
  const titleEl=document.getElementById('pFavConfirmTitle');
  if(titleEl)titleEl.textContent=title;
  const btn=document.getElementById('pFavConfirmBtn');
  if(btn)btn.onclick=()=>{removeFavorite(_favConfirmId);closeFavConfirm();};
  document.getElementById('pFavConfirm').classList.add('open');
  document.getElementById('pFavBackdrop').style.display='block';
}

function closeFavConfirm(){
  document.getElementById('pFavConfirm').classList.remove('open');
  document.getElementById('pFavBackdrop').style.display='none';
  _favConfirmId=null;
}

function removeFavorite(toiletId){
  const favs=getFavorites().filter(f=>f.id!==toiletId);
  saveFavorites(favs);
  _removeFavFromFirestore(toiletId);
  renderFavorites();
  updateFavBtn(toiletId);
  const favEl=document.getElementById('pStatFav');
  if(favEl)favEl.textContent=favs.length;
}

function openFavSheet(toiletId){
  const toilet=allToilets.find(t=>t.id===toiletId);
  if(!toilet){showToast('Туалет не найден');return;}
  openSheet(toilet);
}

function openFavOnMap(toiletId){
  const toilet=allToilets.find(t=>t.id===toiletId);
  if(!toilet){showToast('Туалет не найден на карте');return;}
  switchTab('map');
  setTimeout(()=>{ myMap.setCenter([toilet.lat,toilet.lon],17,{duration:600}); },300);
}

// обратная совместимость
function openFavToilet(toiletId){openFavSheet(toiletId);}
