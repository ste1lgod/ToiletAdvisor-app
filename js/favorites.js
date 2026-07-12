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
