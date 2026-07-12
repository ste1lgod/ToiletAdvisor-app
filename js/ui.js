// ── THEME ──
function applyTheme(){
  document.body.classList.toggle('dark',currentTheme==='dark');
  document.getElementById('themeBtn').textContent=currentTheme==='dark'?'☀️':'🌙';
  applyMapTheme();
}
function applyMapTheme(){
  if(!myMap)return;
  if(currentTheme==='dark'){
    myMap.panes.get('ground').getElement().style.filter='invert(0.9) hue-rotate(180deg) saturate(0.7) brightness(0.85)';
  }else{
    myMap.panes.get('ground').getElement().style.filter='';
  }
}
function toggleTheme(){
  currentTheme=currentTheme==='dark'?'light':'dark';
  localStorage.setItem('ta_theme',currentTheme);
  applyTheme();
}

// ── LANG DROPDOWN ──
function toggleLangDrop(){
  const btn=document.getElementById('langBtn');
  const dd=document.getElementById('langDrop');
  const isOpen=dd.classList.contains('open');
  if(isOpen){dd.classList.remove('open');btn.classList.remove('open');return;}
  const rect=btn.getBoundingClientRect();
  dd.style.top=(rect.bottom+6)+'px';
  dd.style.right=(window.innerWidth-rect.right)+'px';
  dd.style.left='auto';
  dd.classList.add('open');btn.classList.add('open');
  setTimeout(()=>document.addEventListener('click',closeLangOut,{once:true,capture:true}),10);
}
function closeLangOut(e){
  if(!document.querySelector('.langWrap').contains(e.target)){
    document.getElementById('langDrop').classList.remove('open');
    document.getElementById('langBtn').classList.remove('open');
  }
}
function setLang(l){
  currentLang=l;localStorage.setItem('ta_lang',l);
  document.getElementById('langLabel').textContent=l.toUpperCase();
  document.getElementById('langDrop').classList.remove('open');
  document.getElementById('langBtn').classList.remove('open');
  document.querySelectorAll('.lOpt').forEach(o=>o.classList.toggle('active',o.textContent.trim().toLowerCase()===l));
  document.getElementById('searchInput').placeholder=t('search');
  document.getElementById('fnLabel').textContent=t('findNearest');
  document.getElementById('reviewText').placeholder=t('writeReview');
  const lrt=document.getElementById('leaveReviewTitle');if(lrt)lrt.textContent=t('leaveReview');
  const rl=document.getElementById('routeLabel');if(rl)rl.textContent=t('route');
  const sl=document.getElementById('submitLabel');if(sl)sl.textContent=t('submit');
  const adTitle=document.getElementById('adTitle');if(adTitle)adTitle.textContent=t('adminDeniedTitle');
  const adText=document.getElementById('adText');if(adText)adText.textContent=t('adminDenied');
  const adBtnLabel=document.getElementById('adBtnLabel');if(adBtnLabel)adBtnLabel.textContent=t('adminDeniedBtn');
  _updateProfileTexts();updateLoginBtn();
  if(typeof updateOfflineText==='function')updateOfflineText();
  const navLabels=document.querySelectorAll('.navLabel');
  if(navLabels[0])navLabels[0].textContent=t('navMap');
  if(navLabels[1])navLabels[1].textContent=t('navProfile');
  const chips=document.querySelectorAll('.catChip');
  const catKeys=['catAll','catTaharatkhana','catFree','catSoap','catPaper','catAccessible'];
  chips.forEach((c,i)=>{if(catKeys[i])c.textContent=t(catKeys[i]);});
  const reviewsT=document.getElementById('reviewsTitle');if(reviewsT)reviewsT.textContent=t('reviewsTitle');
  const authN=document.getElementById('authNotice');if(authN)authN.textContent=t('authNotice');
  ['taharatTitle','taharatSub','taharatNote'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=t(id.replace('taharat','taharat').replace('Title','Title').replace('Sub','Sub').replace('Note','Note'));});
  document.getElementById('taharatTitle')&&(document.getElementById('taharatTitle').textContent=t('taharatTitle'));
  document.getElementById('taharatSub')&&(document.getElementById('taharatSub').textContent=t('taharatSub'));
  document.getElementById('taharatNote')&&(document.getElementById('taharatNote').textContent=t('taharatNote'));
  const tItems=document.querySelectorAll('.tItem');
  ['taharatHotWater','taharatSoap','taharatTowels','taharatSlippers'].forEach((k,i)=>{if(tItems[i])tItems[i].textContent=t(k);});
  const adminDashTitleEl=document.getElementById('adminDashTitle');if(adminDashTitleEl)adminDashTitleEl.textContent=t('adminPanelTitle');
  const dashLabels=document.querySelectorAll('.adminDashLabel');
  const dashSubs=document.querySelectorAll('.adminDashSub');
  ['adminAddPoint','adminModeration','adminLogs'].forEach((k,i)=>{if(dashLabels[i])dashLabels[i].textContent=t(k);});
  ['adminAddPointSub','adminModerationSub','adminLogsSub'].forEach((k,i)=>{if(dashSubs[i])dashSubs[i].textContent=t(k);});
  const logChips=document.querySelectorAll('.logFilterChip');
  ['logFilterAll','logFilterReviews','logFilterToilets','logFilterAuth','logFilterAdmin'].forEach((k,i)=>{if(logChips[i])logChips[i].textContent=t(k);});
  const wizMapSubEl=document.getElementById('wizMapSub');if(wizMapSubEl)wizMapSubEl.textContent=t('wizMapSub');
  const wizPickHintEl=document.getElementById('wizPickHint');if(wizPickHintEl)wizPickHintEl.textContent=t('wizPickHint');
  const wizPickSearchEl=document.getElementById('wizPickSearch');if(wizPickSearchEl)wizPickSearchEl.placeholder=t('wizPickSearch');
  const wizPickConfirmEl=document.getElementById('wizPickConfirmBtn');if(wizPickConfirmEl)wizPickConfirmEl.childNodes[0].textContent=t('wizPickSelect')+' ';
  document.querySelectorAll('.wizTagsLabel').forEach((el,i)=>{el.textContent=i===0?t('wizCatSpecial'):t('wizCatFeatures');});
  const wizTitleEl=document.getElementById('wizTitle');if(wizTitleEl)wizTitleEl.placeholder=t('wizTitlePlaceholder');
  const wizDescEl=document.getElementById('wizDesc');if(wizDescEl)wizDescEl.placeholder=t('wizDescPlaceholder');
  const tagMap={isTaharatkhana:'wizTagTaharatkhana',isFree:'wizTagFree',isOpen:'wizTagOpen',hasSoap:'wizTagSoap',hasPaper:'wizTagPaper',isAccessible:'wizTagAccessible'};
  document.querySelectorAll('.tagToggle').forEach(el=>{const key=tagMap[el.dataset.tag];if(key){const span=el.querySelectorAll('span')[1];if(span)span.textContent=t(key);}});
  document.querySelectorAll('.wizBtnPrev').forEach(el=>el.textContent=t('wizPrev'));
  document.querySelectorAll('.wizBtnNext:not(#wizSaveBtn)').forEach(el=>el.textContent=t('wizNext'));
  const wizSaveBtnEl=document.getElementById('wizSaveBtn');
  if(wizSaveBtnEl)wizSaveBtnEl.innerHTML=`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> ${t('wizSave')}`;
  const wizPreviewNewBadgeEl=document.getElementById('wizPreviewNewBadge');if(wizPreviewNewBadgeEl)wizPreviewNewBadgeEl.textContent=t('wizNew');
  document.querySelectorAll('.adminBackBtn').forEach(el=>el.textContent=t('adminBack'));
  const mTitleEl=document.querySelector('#authBox .mTitle');if(mTitleEl)mTitleEl.innerHTML=t('loginTitle')+'<br><span class="mSub">Toilet Advisor Tashkent</span>';
  const mNoticeEl=document.querySelector('#authBox .mNotice');if(mNoticeEl)mNoticeEl.textContent=t('loginNotice');
  const tabLoginEl=document.getElementById('tabLogin');if(tabLoginEl)tabLoginEl.textContent=t('tabLogin');
  const tabRegEl=document.getElementById('tabReg');if(tabRegEl)tabRegEl.textContent=t('tabRegister');
  const authActionEl=document.getElementById('authActionBtn');if(authActionEl)authActionEl.textContent=authTab==='login'?t('loginAction'):t('registerAction');
  const adminTitleEl=document.querySelector('#adminBox .mTitle');if(adminTitleEl)adminTitleEl.textContent=t('adminLoginTitle');
  const wizTitles={1:t('wizStep1Title'),2:t('wizStep2Title'),3:t('wizStep3Title')};
  const wizStepTitleEl=document.getElementById('wizStepTitle');
  if(wizStepTitleEl&&wizCurrentStep)wizStepTitleEl.textContent=wizTitles[wizCurrentStep]||'';
}

// ── LOGIN BTN ──
function updateLoginBtn(){
  const btn=document.getElementById('loginBtn');
  if(currentUser){
    const nick=currentUser.nick||'';
    const label=nick||currentUser.phone||currentUser.login||'';
    btn.textContent=currentUser.role==='admin'?`⚙️ ${label}`:`👤 ${maskPhone(label)}`;
    btn.style.background=currentUser.role==='admin'?'#7c3aed':'var(--green)';
  }else{btn.textContent=t('loginBtn');btn.style.background='var(--green)';}
}
function onLoginBtnClick(){currentUser?switchTab('profile'):openAuthModal();}
function _updateProfileTexts(){
  const logoutBtn=document.getElementById('pLogoutBtn');if(logoutBtn)logoutBtn.textContent=t('profileLogout');
  const loginBtn=document.getElementById('pLoginPromptBtn');if(loginBtn)loginBtn.textContent=t('profileLogin');
}

// ── SKELETON HELPERS ──
function _skCards(n){
  return Array.from({length:n},()=>`<div class="skCard"><div class="skRow"><div class="skCircle skeletonBase"></div><div style="flex:1;display:flex;flex-direction:column;gap:8px;"><div class="skLine w80 skeletonBase"></div><div class="skLine w40 skeletonBase"></div></div></div><div class="skLine w60 skeletonBase"></div></div>`).join('');
}
function _skFavCards(n){
  return Array.from({length:n},()=>`<div class="skFavCard"><div class="skFavCircle skeletonBase"></div><div class="skFavBody"><div class="skLine skeletonBase" style="width:70%;height:12px;"></div><div class="skLine skeletonBase" style="width:50%;height:10px;"></div></div></div>`).join('');
}
function _skStatSummary(){
  return Array.from({length:4},()=>`<div class="skStatCard"><div class="skLine skeletonBase" style="width:40%;height:10px;"></div><div class="skLine skeletonBase" style="width:60%;height:24px;margin-top:4px;"></div></div>`).join('');
}

// ── REFRESH BUTTON ──
async function runRefresh(btn,fn){
  if(btn.classList.contains('loading'))return;
  btn.classList.add('loading');
  try{await fn();}finally{btn.classList.remove('loading');}
}

// ── TOAST ──
const TOAST_DURATION=2200;
const TOAST_TYPES={success:{label:'Готово'},error:{label:'Ошибка'},warn:{label:'Внимание'},info:{label:'Инфо'}};
const TOAST_ICONS={
  'добавлен':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  'восстановл':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>',
  'вошли':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
  'регистр':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
  'удал':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
  'неверн':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  'не найден':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  'геолокац':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>',
  'вышли':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  '_default_success':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  '_default_error':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  '_default_warn':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  '_default_info':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
};
function _getToastIcon(msg,type){
  const m=msg.toLowerCase();
  for(const key of Object.keys(TOAST_ICONS)){if(key.startsWith('_'))continue;if(m.includes(key))return TOAST_ICONS[key];}
  return TOAST_ICONS[`_default_${type}`];
}
function _detectToastType(m){
  if(/сохранён локально|сохранен локально|локально/.test(m))return 'info';
  if(/добавлен|успеш|восстановл|удал[её]н|вошли|вход|регистр[а-яё]*|✅|✓/.test(m))return 'success';
  if(/ошибка|неверн|не найден|найден|зарегистр|права|запрещ/.test(m))return 'error';
  if(/введите|заполните|укажите|выберите|сначала|не выбр/.test(m))return 'warn';
  return 'info';
}
function showToast(msg){
  const cleanMsg=msg.replace(/^[✓✅⏳➕]\s*/,'').trim();
  const type=_detectToastType(cleanMsg.toLowerCase());
  const label=TOAST_TYPES[type].label;
  const icon=_getToastIcon(cleanMsg,type);
  const container=document.getElementById('toastContainer');
  const el=document.createElement('div');
  el.className=`toastItem t-${type}`;
  el.innerHTML=`<div class="toastItem-ico">${icon}</div><div class="toastItem-body"><div class="toastItem-label">${label}</div><div class="toastItem-text">${cleanMsg}</div></div><div class="toastItem-close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>`;
  container.appendChild(el);
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('show')));
  const timer=setTimeout(()=>_removeToast(el),TOAST_DURATION);
  el._timer=timer;
  el.querySelector('.toastItem-close').addEventListener('click',e=>{e.stopPropagation();clearTimeout(el._timer);_removeToast(el);});
  let _tx=0,_startX=0,_startY=0,_swiping=false,_swipeLocked=false;
  el.addEventListener('touchstart',e=>{_startX=e.touches[0].clientX;_startY=e.touches[0].clientY;_swiping=false;_swipeLocked=false;_tx=0;el.style.transition='none';},{passive:true});
  el.addEventListener('touchmove',e=>{
    const dx=e.touches[0].clientX-_startX,dy=e.touches[0].clientY-_startY;
    if(!_swiping&&!_swipeLocked){if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>6)_swiping=true;else if(Math.abs(dy)>8)_swipeLocked=true;}
    if(_swiping&&dx<0){_tx=dx;const p=Math.min(1,Math.abs(dx)/120);el.style.transform=`translateX(${dx}px) scale(${1-p*0.06})`;el.style.opacity=String(1-p*0.5);}
  },{passive:true});
  el.addEventListener('touchend',()=>{
    if(!_swiping){el.style.transition='';el.style.transform='';el.style.opacity='';return;}
    if(_tx<-80){clearTimeout(el._timer);_removeToast(el);}
    else{el.style.transition='transform .5s cubic-bezier(.34,1.56,.64,1),opacity .4s ease';el.style.transform='';el.style.opacity='';setTimeout(()=>{el.style.transition='';},520);}
  });
}
function _removeToast(el){
  el.style.transition='';el.style.transform='';el.style.opacity='';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    el.classList.remove('show');el.classList.add('hide');
    setTimeout(()=>{if(el.parentNode)el.parentNode.removeChild(el);},1000);
  }));
}

// ── OFFLINE BANNER ──
const OFFLINE_TEXTS={ru:'Нет подключения к интернету — показаны сохранённые данные',uz:'Internet aloqasi yoq — saqlangan ma\'lumotlar ko\'rsatilmoqda',en:'No internet connection — showing saved data'};
function updateOfflineText(){document.getElementById('offlineBannerText').textContent=OFFLINE_TEXTS[currentLang]||OFFLINE_TEXTS.ru;}
function showOfflineBanner(){updateOfflineText();document.getElementById('offlineBanner').classList.add('show');}
function hideOfflineBanner(){document.getElementById('offlineBanner').classList.remove('show');}
window.addEventListener('online',()=>{hideOfflineBanner();showToast(t('toastOnline'));loadToilets();});
window.addEventListener('offline',()=>showOfflineBanner());

// ── ADJUST CONTROLS POSITION ──
function adjustControlsPosition(){
  const hp=document.getElementById('headerPanel');
  const card=document.querySelector('.headerCard');
  if(!card||!hp||hp.style.display==='none'||hp.style.visibility==='hidden')return;
  const rect=card.getBoundingClientRect();
  if(rect.height<10)return;
  const bottom=rect.bottom+8;
  document.documentElement.style.setProperty('--controls-top',bottom+'px');
  document.documentElement.style.setProperty('--geo-top',(bottom+44+8+44+16)+'px');
  const ob=document.getElementById('offlineBanner');if(ob)ob.style.top=(rect.bottom+10)+'px';
}
function setScreenPaddingTop(){}
window.addEventListener('load',()=>setTimeout(()=>{adjustControlsPosition();setScreenPaddingTop();},400));
window.addEventListener('resize',()=>{adjustControlsPosition();setScreenPaddingTop();});

// ── TABS ──
let _adminNavLastClick=0;
function onAdminNavClick(){
  const isAlreadyOnAdd=document.querySelector('.navCenter.active')!==null;
  if(isAlreadyOnAdd){
    showAdminDashboard();
    const addScreen=document.getElementById('addScreen');
    if(addScreen)addScreen.scrollTo({top:0,behavior:'smooth'});
  }else{switchTab('add');}
}
function switchTab(tab){
  closeSheet();
  if(tab!=='map'&&wizPickMode){
    wizPickMode=false;_wizHideOverlay();
    const nav=document.getElementById('bottomNav');if(nav)nav.style.display='';
    if(myMap){myMap.events.remove('boundschange',_wizOnMapMove);myMap.events.remove('actionbegin',_wizOnMapDragStart);myMap.events.remove('actionend',_wizOnMapDragEnd);}
  }
  document.querySelectorAll('.navBtn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  const nc=document.querySelector('.navCenter');if(nc)nc.classList.toggle('active',tab==='add');
  const isMap=tab==='map';
  const hp=document.getElementById('headerPanel');
  if(hp){hp.style.display=isMap?'':'none';hp.style.visibility=isMap?'':'hidden';}
  ['zoomControls','geoBtn','findNearestBtn'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    if(isMap){el.style.display='';el.style.visibility='visible';}else{el.style.display='none';el.style.visibility='hidden';}
  });
  const mc=document.getElementById('mapControls');if(mc)mc.style.display=isMap?'':'none';
  if(isMap){
    if(hp){hp.style.display='';hp.style.visibility='visible';}
    if(mc)mc.style.display='';
    if(wizPickMode){
      if(hp){hp.style.display='none';hp.style.visibility='hidden';}
      if(mc)mc.style.display='none';
      const fn=document.getElementById('findNearestBtn');if(fn){fn.style.display='none';fn.style.visibility='hidden';}
    }
    requestAnimationFrame(()=>requestAnimationFrame(()=>adjustControlsPosition()));
  }else{setScreenPaddingTop();}
  document.getElementById('profileScreen').classList.add('hidden');
  document.getElementById('adminDeniedScreen').classList.add('hidden');
  document.getElementById('addScreen').classList.add('hidden');
  if(tab==='add'){
    if(currentUser&&currentUser.role==='admin'){
      document.getElementById('addScreen').classList.remove('hidden');
      addCoords=null;
      if(!_skipAdminDashboard&&!_wizInProgress){
        if(_activeAdminSubview&&_activeAdminSubview!=='addForm'){
          document.getElementById('adminDashboard').style.display='none';
          document.querySelectorAll('.adminSubview').forEach(el=>el.classList.add('hidden'));
          if(_activeAdminSubview==='moderation')document.getElementById('adminSubModeration').classList.remove('hidden');
          else if(_activeAdminSubview==='logs')document.getElementById('adminSubLogs').classList.remove('hidden');
          else if(_activeAdminSubview==='stats')document.getElementById('adminSubStats').classList.remove('hidden');
        }else{showAdminDashboard();}
      }else if(_wizInProgress){
        document.getElementById('adminDashboard').style.display='none';
        document.getElementById('adminSubAddForm').classList.remove('hidden');
      }
      _skipAdminDashboard=false;
    }else{
      document.getElementById('adminDeniedScreen').classList.remove('hidden');
      document.getElementById('adTitle').textContent=t('adminDeniedTitle');
      document.getElementById('adText').textContent=t('adminDenied');
      document.getElementById('adBtnLabel').textContent=t('adminDeniedBtn');
    }
  }else if(tab==='profile'){
    const ps=document.getElementById('profileScreen');
    ps.classList.remove('hidden');ps.style.display='flex';
    loadProfile();
  }
}

// ── SEARCH & CHIPS ──
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('searchInput').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(renderMarkers,300);});
  document.querySelectorAll('.catChip').forEach(chip=>{
    chip.addEventListener('click',function(){
      if(this.classList.contains('active')&&this.dataset.cat!=='all'){
        document.querySelectorAll('.catChip').forEach(c=>c.classList.remove('active'));
        document.querySelector('.catChip[data-cat="all"]').classList.add('active');
        currentCat='all';
      }else{
        document.querySelectorAll('.catChip').forEach(c=>c.classList.remove('active'));
        this.classList.add('active');currentCat=this.dataset.cat;
      }
      renderMarkers();
    });
  });
});

// ── TOAST TEST ──
const _TTI_SVG={
  success:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  error:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
};
const _TTI_LABELS={success:'Готово',warn:'Внимание',error:'Ошибка',info:'Инфо'};
const TOAST_TEST_ITEMS=[
  {text:'Туалет добавлен!',cat:'success'},{text:'Ваш отзыв добавлен!',cat:'success'},{text:'Вы вошли в систему',cat:'success'},{text:'Регистрация успешна',cat:'success'},{text:'Вы вошли как администратор',cat:'success'},{text:'Подключение восстановлено',cat:'success'},{text:'Отзыв удалён',cat:'success'},
  {text:'Введите текст и поставьте оценку',cat:'warn'},{text:'Заполните все поля',cat:'warn'},{text:'Введите название туалета',cat:'warn'},{text:'Сначала укажите место на карте',cat:'warn'},{text:'Не выбрано место',cat:'warn'},
  {text:'Пользователь не найден',cat:'error'},{text:'Неверный пароль',cat:'error'},{text:'Этот номер уже зарегистрирован',cat:'error'},{text:'Администратор не найден',cat:'error'},{text:'Требуются права администратора',cat:'error'},
  {text:'Нет точек на карте',cat:'info'},{text:'Геолокация недоступна',cat:'info'},{text:'Отзыв сохранён локально — синхронизируется при восстановлении связи',cat:'info'},{text:'Вы вышли из аккаунта',cat:'info'},
];
function toggleToastTest(){
  const panel=document.getElementById('toastTestPanel');
  if(panel.classList.contains('hidden')){
    const list=document.getElementById('toastTestList');
    const catMap={success:'s',warn:'w',error:'e',info:'i'};
    list.innerHTML=TOAST_TEST_ITEMS.map(item=>`<div class="toastTestItem" onclick="showToast('${item.text.replace(/'/g,"\\'")}')"><div class="tti-ico ${catMap[item.cat]}">${_TTI_SVG[item.cat]}</div><div class="tti-body"><div class="tti-text">${item.text}</div></div><span class="tti-cat ${item.cat}">${_TTI_LABELS[item.cat]}</span></div>`).join('');
    panel.classList.remove('hidden');
  }else{panel.classList.add('hidden');}
}
