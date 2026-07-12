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
