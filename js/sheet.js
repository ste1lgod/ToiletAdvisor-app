// ── BOTTOM SHEET ──
let isSheetOpen=false;

function _openBackdrop(){
  const bd=document.getElementById('sheetBackdrop');
  bd.classList.add('vis');
  requestAnimationFrame(()=>{ bd.style.pointerEvents='auto'; });
}

function _closeBackdrop(){
  const bd=document.getElementById('sheetBackdrop');
  bd.style.pointerEvents='none';
  bd.classList.remove('vis');
}

async function openSheet(toilet){
  if(isSheetOpen)return;
  isSheetOpen=true;
  selectedToilet=toilet;
  document.getElementById('sTitle').textContent=toilet.title;
  const ref=userCoords||TASHKENT;
  const isFallback=!userCoords;
  document.getElementById('sDistPill').textContent=formatDist(haversine(ref[0],ref[1],toilet.lat,toilet.lon),isFallback);
  const op=document.getElementById('sOpenPill');
  op.textContent=toilet.isOpen?t('open'):t('closed');
  op.className='mPill '+(toilet.isOpen?'pGreen':'pRed');
  const fp=document.getElementById('sFreePill');
  fp.textContent=toilet.isFree?t('free'):t('paid');
  fp.className='mPill '+(toilet.isFree?'pGreen2':'pBlue');
  document.getElementById('taharatBlock').classList.toggle('hidden',!toilet.isTaharatkhana);

  const bads=[];
  if(toilet.hasSoap && !toilet.isTaharatkhana)bads.push({emoji:'🧼',key:'soap'});
  if(toilet.hasPaper)bads.push({emoji:'🧻',key:'paper'});
  if(toilet.isAccessible)bads.push({emoji:'♿',key:'accessible'});
  document.getElementById('sBadges').innerHTML='';
  const pillsEl=document.getElementById('sPills');
  pillsEl.querySelectorAll('.sBadge').forEach(el=>el.remove());
  bads.forEach(b=>{
    const s=document.createElement('span');
    s.className='sBadge';
    s.textContent=b.emoji+' '+t(b.key);
    pillsEl.appendChild(s);
  });
  const desc=document.getElementById('sDesc');
  if(toilet.isTaharatkhana){
    desc.style.display='none';
  } else {
    desc.textContent=toilet.description||'';
    desc.style.display=toilet.description?'block':'none';
  }

  document.getElementById('sRatingVal').textContent='—';
  document.getElementById('reviewsList').innerHTML=`
    <div class="rvSkeleton"><div class="rvSkAvatar"></div><div class="rvSkBody"><div class="rvSkLine w80"></div><div class="rvSkLine w60"></div><div class="rvSkLine w40"></div></div></div>
    <div class="rvSkeleton"><div class="rvSkAvatar"></div><div class="rvSkBody"><div class="rvSkLine w60"></div><div class="rvSkLine w80"></div><div class="rvSkLine w40"></div></div></div>
    <div class="rvSkeleton"><div class="rvSkAvatar"></div><div class="rvSkBody"><div class="rvSkLine w40"></div><div class="rvSkLine w60"></div><div class="rvSkLine w80"></div></div></div>
  `;
  resetReviewForm();
  // Сердечко ставим сразу из localStorage-кэша
  updateFavBtn(toilet.id);
  document.getElementById('toiletSheet').classList.add('open');
  _openBackdrop();

  try{
    // Загружаем кэш пользователей только если ещё не загружен
    const [reviews] = await Promise.all([
      getReviews(toilet.id),
      _usersCacheLoaded ? Promise.resolve() : _loadUsersCache()
    ]);
    if(!isSheetOpen||selectedToilet?.id!==toilet.id)return;
    const avg=reviews.length?(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length):0;
    document.getElementById('sRatingVal').textContent=avg>0?avg.toFixed(1):'—';
    renderReviews(reviews);
    // Обновляем сердечко повторно — к этому моменту allToilets точно загружен
    updateFavBtn(toilet.id);
  }catch(e){
    document.getElementById('reviewsList').innerHTML=`<p class="rvNoReviews">${t('noReviews')}</p>`;
  }
}

function closeSheet(){
  if(!isSheetOpen)return;
  isSheetOpen=false;
  const sheet=document.getElementById('toiletSheet');
  _closeBackdrop();
  sheet.classList.remove('open');
  sheet.style.transform='';
  sheet.style.transition='';
  selectedToilet=null;
}

function resetReviewForm(){
  reviewRating=0;
  document.querySelectorAll('.starBtn').forEach(s=>s.classList.remove('lit'));
  const ta=document.getElementById('reviewText');
  ta.blur();
  ta.value='';
  ta.defaultValue='';
  ta.placeholder=t('writeReview');
  const rl=document.getElementById('routeLabel');
  if(rl)rl.textContent=t('route');
  const sl2=document.getElementById('submitLabel');
  if(sl2)sl2.textContent=t('submit');
  const notice=document.getElementById('authNotice');
  ta.style.display='block';
  document.getElementById('submitReviewBtn').style.display='flex';
  if(currentUser){
    notice.classList.add('hidden');
    ta.disabled=false;
    document.getElementById('submitReviewBtn').style.opacity='1';
  } else {
    notice.classList.remove('hidden');
    ta.disabled=false;
    document.getElementById('submitReviewBtn').style.opacity='0.72';
  }
}

// ── REVIEWS ──
const _reviewsCache = {};
const _REVIEWS_CACHE_TTL = 300000; // 5 минут

async function getReviews(id){
  const cached = _reviewsCache[id];
  if(cached && Date.now() - cached.ts < _REVIEWS_CACHE_TTL){
    return cached.data;
  }
  await _loadFirebase();
  let result = [];
  try{
    const snap=await db.collection('reviews')
      .where('toiletId','==',id)
      .orderBy('createdAt','desc')
      .limit(50)
      .get();
    result = snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch(e){
    const snap=await db.collection('reviews').where('toiletId','==',id).limit(50).get();
    result = snap.docs.map(d=>({id:d.id,...d.data()}));
  }
  _reviewsCache[id] = { ts: Date.now(), data: result };
  return result;
}

function _invalidateReviewCache(toiletId){
  delete _reviewsCache[toiletId];
}

function formatReviewText(text){
  const normalized=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim();
  const lines=normalized.split('\n');
  return lines
    .map(line=>line.trim()===''
      ? '<p style="margin:0;padding:0;height:0.6em;"></p>'
      : `<p style="margin:0;padding:0;text-indent:1em;">${line}</p>`)
    .join('');
}

function renderReviews(reviews){
  const c=document.getElementById('reviewsList');
  if(!reviews.length){c.innerHTML=`<p class="rvNoReviews">${t('noReviews')}</p>`;return;}
  const sorted=[...reviews].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  c.innerHTML=sorted.map(r=>{
    const name=_getActualName(r.userId, r.userPhone||r.userLogin||'Аноним');
    const col=COLORS[name.charCodeAt(0)%COLORS.length];
    const ini=name.replace(/\+/g,'').slice(0,2).toUpperCase();
    const stars=('★'.repeat(r.rating)+'☆'.repeat(5-r.rating)).split('').join(' ');
    const d=new Date(r.createdAt);
    const MONTHS=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    const hh=String(d.getHours()).padStart(2,'0');
    const mm=String(d.getMinutes()).padStart(2,'0');
    const ds=`${hh}:${mm} · ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    return`<div class="rvItem" style="flex-direction:column;gap:0;padding:0;overflow:hidden;">
      <div style="display:flex;align-items:flex-start;gap:14px;padding:16px 16px 12px;">
        <div class="rvAvatar" style="background:${col}">${ini}</div>
        <div class="rvBody">
          <div class="rvName">${name}</div>
          <div class="rvStars">${stars}</div>
        </div>
        <span class="rvDate" style="flex-shrink:0;padding-top:4px;">${ds}</span>
      </div>
      <div style="height:1px;background:var(--border);margin:0 16px;opacity:0.7;"></div>
      <div style="margin:0 16px 16px;padding-top:12px;font-size:14px;color:var(--text);line-height:1.55;word-break:break-word;opacity:0.78;">${formatReviewText(r.text)}</div>
    </div>`;
  }).join('');
}

// ── STAR INPUT ──
document.querySelectorAll('.starBtn').forEach(btn=>{
  btn.addEventListener('click',function(){
    if(!currentUser){openAuthModal();return;}
    reviewRating=parseInt(this.dataset.s);
    document.querySelectorAll('.starBtn').forEach((s,i)=>{
      s.classList.toggle('lit', i<reviewRating);
    });
  });
});

// ── SUBMIT REVIEW ──
async function submitReview(){
  if(!currentUser){openAuthModal();return;}
  if(!selectedToilet)return;
  const ta=document.getElementById('reviewText');
  const text=ta.value.replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim();
  if(!text||!reviewRating){showToast(t('toastEnterReview'));return;}

  const optimistic={
    id:'tmp_'+Date.now(),
    toiletId:selectedToilet.id,
    userId:currentUser.id,
    userPhone:currentUser.nick||currentUser.phone||currentUser.login||'Пользователь',
    text,rating:reviewRating,
    createdAt:new Date().toISOString()
  };

  const existingItems=document.querySelectorAll('#reviewsList .rvItem');
  const existingCount=existingItems.length;
  const name=_getActualName(currentUser.id, optimistic.userPhone);
  const col=COLORS[name.charCodeAt(0)%COLORS.length];
  const ini=name.replace(/\+/g,'').slice(0,2).toUpperCase();
  const stars=('★'.repeat(optimistic.rating)+'☆'.repeat(5-optimistic.rating)).split('').join(' ');
  const d=new Date(optimistic.createdAt);
  const ds=d.getDate()+' '+['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][d.getMonth()]+' '+d.getFullYear();
  const newCard='<div class="rvItem" id="'+optimistic.id+'" style="flex-direction:column;gap:0;padding:0;overflow:hidden;">'
    +'<div style="display:flex;align-items:flex-start;gap:14px;padding:16px 16px 12px;">'
    +'<div class="rvAvatar" style="background:'+col+'">'+ini+'</div>'
    +'<div class="rvBody">'
    +'<div class="rvName">'+name+'</div>'
    +'<div class="rvStars">'+stars+'</div>'
    +'</div>'
    +'<span class="rvDate" style="flex-shrink:0;padding-top:4px;">'+ds+'</span>'
    +'</div>'
    +'<div style="height:1px;background:var(--border);margin:0 16px;opacity:0.7;"></div>'
    +'<div style="margin:0 16px 16px;padding-top:12px;font-size:14px;color:var(--text);line-height:1.55;word-break:break-word;opacity:0.78;">'+formatReviewText(text)+'</div>'
    +'</div>';
  const listEl=document.getElementById('reviewsList');
  if(existingCount===0){ listEl.innerHTML=newCard; }
  else { listEl.insertAdjacentHTML('beforeend',newCard); }

  const currentRating=document.getElementById('sRatingVal').textContent;
  const prevAvg=currentRating==='—'?0:parseFloat(currentRating);
  const newAvg=existingCount===0?optimistic.rating:((prevAvg*existingCount)+optimistic.rating)/(existingCount+1);
  document.getElementById('sRatingVal').textContent=newAvg.toFixed(1);

  resetReviewForm();
  showToast(t('success'));

  try{
    await _loadFirebase();
    await db.collection('reviews').add({
      toiletId:selectedToilet.id,
      userId:currentUser.id,
      userPhone:currentUser.nick||currentUser.phone||currentUser.login||'Пользователь',
      text,rating:optimistic.rating,
      createdAt:optimistic.createdAt
    });
    _invalidateReviewCache(selectedToilet.id);
    const tmpEl=document.getElementById(optimistic.id);
    if(tmpEl)tmpEl.removeAttribute('id');
    logAction({
      type:'review', category:'review', action:t('logLeftReview'),
      detail:`${t('logToilet')}: ${selectedToilet.title||selectedToilet.id} · ${t('logRating')}: ${'★'.repeat(optimistic.rating)} · "${text.slice(0,80)}"`,
    });
  }catch(e){
    console.error('Ошибка сохранения отзыва:',e);
    showToast(t('toastReviewSaved'));
  }
}

// ── ROUTE ──
function goRoute(){
  if(!selectedToilet)return;
  const lat=selectedToilet.lat, lon=selectedToilet.lon;
  if(userCoords){
    window.open(`https://yandex.ru/maps/?rtext=${userCoords[0]},${userCoords[1]}~${lat},${lon}&rtt=pd`,'_blank');
    return;
  }
  let opened=false;
  const timeout=setTimeout(()=>{ if(!opened){opened=true;window.open(`https://yandex.ru/maps/?rtext=~${lat},${lon}`,'_blank');} },2000);
  navigator.geolocation.getCurrentPosition(
    p=>{ if(opened)return; opened=true;clearTimeout(timeout); window.open(`https://yandex.ru/maps/?rtext=${p.coords.latitude},${p.coords.longitude}~${lat},${lon}&rtt=pd`,'_blank'); },
    ()=>{ if(opened)return; opened=true;clearTimeout(timeout); window.open(`https://yandex.ru/maps/?rtext=~${lat},${lon}`,'_blank'); },
    {timeout:1500,maximumAge:30000}
  );
}

// ── iOS DRAG-TO-DISMISS ──
function initDrag(dragZone,panel,onDismiss){
  let startY=0,startT=0,curY=0,dragging=false,dismissing=false;
  function onStart(clientY){ if(dismissing)return; startY=clientY;startT=Date.now();curY=0;dragging=true; panel.style.transition='none'; }
  function onMove(clientY){ if(!dragging||dismissing)return; curY=Math.max(0,clientY-startY); panel.style.transform=`translateY(${curY}px)`; }
  function onEnd(){
    if(!dragging||dismissing)return; dragging=false; panel.style.transition='';
    const vel=(curY)/(Date.now()-startT);
    if(curY>panel.offsetHeight*0.45||vel>0.6){
      dismissing=true; panel.style.transform='translateY(100%)';
      setTimeout(()=>{ dismissing=false; panel.style.transform=''; onDismiss(); },320);
    } else { panel.style.transform=''; }
  }
  dragZone.addEventListener('touchstart',e=>{onStart(e.touches[0].clientY);},{passive:true});
  dragZone.addEventListener('touchmove',e=>{onMove(e.touches[0].clientY);},{passive:true});
  dragZone.addEventListener('touchend',onEnd);
  dragZone.addEventListener('mousedown',e=>{onStart(e.clientY);});
  document.addEventListener('mousemove',e=>{if(dragging)onMove(e.clientY);});
  document.addEventListener('mouseup',()=>{if(dragging)onEnd();});
}

// ── AUTO-RESIZE REVIEW TEXTAREA ──
document.addEventListener('DOMContentLoaded', function(){
  const ta=document.getElementById('reviewText');
  if(ta){
    function resize(){ ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight, 320)+'px'; }
    ta.addEventListener('input',resize);
  }
  // Sheet drag
  initDrag(document.getElementById('sDragZone'),document.getElementById('toiletSheet'),closeSheet);
  // Backdrop click
  document.getElementById('sheetBackdrop').addEventListener('click',()=>{ if(isSheetOpen)closeSheet(); });
  // Auth notice click
  const notice=document.getElementById('authNotice');
  if(notice)notice.addEventListener('click',openAuthModal);
});
