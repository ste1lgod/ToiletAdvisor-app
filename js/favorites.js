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
