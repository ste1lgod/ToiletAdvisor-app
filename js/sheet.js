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
