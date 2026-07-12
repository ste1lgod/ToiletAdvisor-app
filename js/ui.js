// ── UI UTILITIES ──

// ── THEME ──
function applyTheme(){
  document.body.classList.toggle('dark',currentTheme==='dark');
  document.getElementById('themeBtn').textContent=currentTheme==='dark'?'☀️':'🌙';
  applyMapTheme();
}

function applyMapTheme(){
  if(!myMap) return;
  if(currentTheme==='dark'){
    myMap.panes.get('ground').getElement().style.filter='invert(0.9) hue-rotate(180deg) saturate(0.7) brightness(0.85)';
  } else {
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
  if(isOpen){
    dd.classList.remove('open');
    btn.classList.remove('open');
    return;
  }
  const rect=btn.getBoundingClientRect();
  dd.style.top=(rect.bottom+6)+'px';
  dd.style.right=(window.innerWidth-rect.right)+'px';
  dd.style.left='auto';
  dd.classList.add('open');
  btn.classList.add('open');
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
  
  // Update all translated elements
  document.getElementById('searchInput').placeholder=t('search');
  document.getElementById('fnLabel').textContent=t('findNearest');
  document.getElementById('reviewText').placeholder=t('writeReview');
  const lrt=document.getElementById('leaveReviewTitle');
  if(lrt)lrt.textContent=t('leaveReview');
  const rl=document.getElementById('routeLabel');
  if(rl)rl.textContent=t('route');
  const sl=document.getElementById('submitLabel');
  if(sl)sl.textContent=t('submit');
  
  updateLoginBtn();
  if(typeof updateOfflineText==='function')updateOfflineText();
}

// ── TOAST STACK ──
const TOAST_DURATION = 2200;

const TOAST_TYPES = {
  success: { label:'Готово'    },
  error:   { label:'Ошибка'   },
  warn:    { label:'Внимание' },
  info:    { label:'Инфо'     },
};

const TOAST_ICONS = {
  'добавлен':        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  'восстановл':      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>',
  'вошли':           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
  'регистр':         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
  '_default_success':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  '_default_error':  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  '_default_warn':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  '_default_info':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
};

function _getToastIcon(msg, type){
  const m = msg.toLowerCase();
  for(const key of Object.keys(TOAST_ICONS)){
    if(key.startsWith('_')) continue;
    if(m.includes(key)) return TOAST_ICONS[key];
  }
  return TOAST_ICONS[`_default_${type}`];
}

function _detectToastType(m){
  if(/сохранён локально|сохранен локально|локально/.test(m)) return 'info';
  if(/добавлен|успеш|восстановл|удал[её]н|вошли|вход|регистр[а-яё]*|✅|✓/.test(m)) return 'success';
  if(/ошибка|неверн|не найден|найден|зарегистр|права|запрещ/.test(m)) return 'error';
  if(/введите|заполните|укажите|выберите|сначала|не выбр/.test(m)) return 'warn';
  return 'info';
}

function showToast(msg){
  const cleanMsg = msg.replace(/^[✓✅⏳➕]\s*/,'').trim();
  const type  = _detectToastType(cleanMsg.toLowerCase());
  const label = TOAST_TYPES[type].label;
  const icon  = _getToastIcon(cleanMsg, type);

  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toastItem t-${type}`;
  el.innerHTML = `
    <div class="toastItem-ico">${icon}</div>
    <div class="toastItem-body">
      <div class="toastItem-label">${label}</div>
      <div class="toastItem-text">${cleanMsg}</div>
    </div>
    <div class="toastItem-close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </div>`;
  container.appendChild(el);

  requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ el.classList.add('show'); }); });

  const timer = setTimeout(()=>_removeToast(el), TOAST_DURATION);
  el._timer = timer;

  el.querySelector('.toastItem-close').addEventListener('click', e=>{
    e.stopPropagation();
    clearTimeout(el._timer);
    _removeToast(el);
  });
}

function _removeToast(el){
  el.style.transition = '';
  el.style.transform = '';
  el.style.opacity = '';
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      el.classList.remove('show');
      el.classList.add('hide');
      setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, 1000);
    });
  });
}

// ── SKELETON HTML HELPERS ──
function _skCards(n){
  return Array.from({length:n},()=>`
    <div class="skCard">
      <div class="skRow">
        <div class="skCircle skeletonBase"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
          <div class="skLine w80 skeletonBase"></div>
          <div class="skLine w40 skeletonBase"></div>
        </div>
      </div>
      <div class="skLine w60 skeletonBase"></div>
    </div>`).join('');
}

function _skFavCards(n){
  return Array.from({length:n},()=>`
    <div class="skFavCard">
      <div class="skFavCircle skeletonBase"></div>
      <div class="skFavBody">
        <div class="skLine w70 skeletonBase" style="width:70%;height:12px;"></div>
        <div class="skLine w50 skeletonBase" style="width:50%;height:10px;"></div>
      </div>
    </div>`).join('');
}

function _skStatSummary(){
  return Array.from({length:4},()=>`
    <div class="skStatCard">
      <div class="skLine w40 skeletonBase" style="width:40%;height:10px;"></div>
      <div class="skLine w60 skeletonBase" style="width:60%;height:24px;margin-top:4px;"></div>
    </div>`).join('');
}

// ── OFFLINE BANNER ──
const OFFLINE_TEXTS={
  ru:'Нет подключения к интернету — показаны сохранённые данные',
  uz:'Internet aloqasi yoq — saqlangan ma\'lumotlar ko\'rsatilmoqda',
  en:'No internet connection — showing saved data'
};

function updateOfflineText(){
  document.getElementById('offlineBannerText').textContent=OFFLINE_TEXTS[currentLang]||OFFLINE_TEXTS.ru;
}

function showOfflineBanner(){
  updateOfflineText();
  document.getElementById('offlineBanner').classList.add('show');
}

function hideOfflineBanner(){
  document.getElementById('offlineBanner').classList.remove('show');
}

// ── REFRESH BUTTON HELPER ──
async function runRefresh(btn, fn){
  if(btn.classList.contains('loading'))return;
  btn.classList.add('loading');
  // Страховочный таймаут — через 15 сек снимаем loading в любом случае
  const failsafe=setTimeout(()=>btn.classList.remove('loading'), 15000);
  try{
    await fn();
  }catch(e){
    console.warn('runRefresh error:', e);
  }finally{
    clearTimeout(failsafe);
    btn.classList.remove('loading');
  }
}
