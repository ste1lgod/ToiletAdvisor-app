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
  updateFavBtn(toilet.id);
  document.getElementById('toiletSheet').classList.add('open');
  _openBackdrop();

  try{
    const [reviews] = await Promise.all([
      getReviews(toilet.id),
      _loadUsersCache()
    ]);
    if(!isSheetOpen||selectedToilet?.id!==toilet.id)return;
    const avg=reviews.length?(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length):0;
    document.getElementById('sRatingVal').textContent=avg>0?avg.toFixed(1):'—';
    renderReviews(reviews);
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
const _REVIEWS_CACHE_TTL = 60000;

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
