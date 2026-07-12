// ── ADMIN DASHBOARD ──
let _wizInProgress=false;
let _activeAdminSubview=null;
let _skipAdminDashboard=false;

function showAdminDashboard(){
  document.getElementById('adminDashboard').style.display='';
  document.querySelectorAll('.adminSubview').forEach(el=>el.classList.add('hidden'));
  _wizInProgress=false;
  _activeAdminSubview=null;
  wizReset();
}

function showAdminSubview(id){
  document.getElementById('adminDashboard').style.display='none';
  document.querySelectorAll('.adminSubview').forEach(el=>el.classList.add('hidden'));
  if(id==='addForm'){
    document.getElementById('adminSubAddForm').classList.remove('hidden');
    wizReset();
    _wizInProgress=true;
    _activeAdminSubview='addForm';
  } else if(id==='moderation'){
    document.getElementById('adminSubModeration').classList.remove('hidden');
    loadModerationReviews();
    _activeAdminSubview='moderation';
  } else if(id==='logs'){
    document.getElementById('adminSubLogs').classList.remove('hidden');
    loadActivityLogs();
    _activeAdminSubview='logs';
  } else if(id==='stats'){
    document.getElementById('adminSubStats').classList.remove('hidden');
    _activeAdminSubview='stats';
    _statsCurrentTab='toilets';
    switchStatsTab('toilets',document.querySelector('#statsTabRow [data-stab="toilets"]'));
    loadAdminStats();
  }
}

// ── MODERATION ──
async function loadModerationReviews(){
  const list=document.getElementById('moderationList');
  list.innerHTML=_skCards(4);
  try{
    await _loadFirebase();
    await _loadUsersCache();
    const snap=await db.collection('reviews').orderBy('createdAt','desc').limit(50).get();
    if(snap.empty){list.innerHTML='<p style="text-align:center;color:var(--text2);font-size:13px;">Отзывов нет</p>';return;}

    const reviews=snap.docs.map(d=>({id:d.id,...d.data()}));
    const cachedIds=new Set(allToilets.map(t=>t.id));
    const missingIds=[...new Set(reviews.map(r=>r.toiletId).filter(id=>id&&!cachedIds.has(id)))];
    const extraToilets={};
    await Promise.all(missingIds.map(async id=>{
      try{
        const doc=await db.collection('toilets').doc(id).get();
        if(doc.exists)extraToilets[id]={id:doc.id,...doc.data()};
      }catch(e){}
    }));

    const toiletMap={};
    allToilets.forEach(t=>{toiletMap[t.id]=t;});
    Object.values(extraToilets).forEach(t=>{toiletMap[t.id]=t;});

    list.innerHTML=reviews.map(r=>{
      const name=_getActualName(r.userId,r.userPhone||r.userLogin||'Аноним');
      const stars=('★'.repeat(r.rating)+'☆'.repeat(5-r.rating)).split('').join(' ');
      const d=new Date(r.createdAt);
      const MONTHS=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
      const hh=String(d.getHours()).padStart(2,'0');
      const mm=String(d.getMinutes()).padStart(2,'0');
      const datetime=`${hh}:${mm} · ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      const col=COLORS[name.charCodeAt(0)%COLORS.length];
      const ini=name.replace(/\+/g,'').slice(0,2).toUpperCase();
      const toilet=toiletMap[r.toiletId];
      const toiletAddr=toilet?(toilet.addr||`${Number(toilet.lat).toFixed(4)}, ${Number(toilet.lon).toFixed(4)}`):'';
      const toiletLabel=toilet
        ?`<span style="font-weight:700;color:var(--text);">${toilet.title}</span>`+(toiletAddr?` <span style="color:var(--text2);">— ${toiletAddr}</span>`:'')
        :`<span style="color:var(--text2);">${r.toiletId||'—'}</span>`;
      return`<div class="rvItem" style="margin-bottom:12px;flex-direction:column;gap:0;padding:0;overflow:hidden;">
        <div style="display:flex;align-items:flex-start;gap:14px;padding:16px 16px 12px;">
          <div class="rvAvatar" style="background:${col};">${ini}</div>
          <div class="rvBody">
            <div class="rvName">${name}</div>
            <div class="rvStars">${stars}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex-shrink:0;padding-top:4px;">
            <span class="rvDate">${datetime}</span>
            <button onclick="deleteReview('${r.id}',this)"
              style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:#fee2e2;color:#b91c1c;border:none;border-radius:10px;cursor:pointer;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
        </div>
        <div style="height:1px;background:var(--border);margin:0 16px;opacity:0.7;"></div>
        <div style="margin:0 16px 20px;padding-top:12px;font-size:14px;color:var(--text);line-height:1.55;word-break:break-word;opacity:0.78;">${formatReviewText(r.text)}</div>
        <div style="display:flex;align-items:flex-start;gap:8px;margin:0 14px 14px;padding:10px 12px;background:var(--green-l);border-radius:20px;border:1.5px solid rgba(0,168,89,0.2);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;color:var(--green);"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          <span style="font-size:13px;line-height:1.45;">${toiletLabel}</span>
        </div>
      </div>`;
    }).join('');
  }catch(e){list.innerHTML=`<p style="text-align:center;color:#ef4444;font-size:13px;">Ошибка: ${e.message}</p>`;}
}

async function deleteReview(id,btn){
  try{
    await _loadFirebase();
    const reviewDoc=await db.collection('reviews').doc(id).get();
    const reviewData=reviewDoc.exists?reviewDoc.data():{};
    await db.collection('reviews').doc(id).delete();
    btn.closest('.rvItem').remove();
    showToast(t('toastReviewDeleted'));
    logAction({
      type:'delete',category:'review',action:t('logDeletedReview'),
      detail:`${t('logUser')}: ${reviewData.userPhone||'?'}: "${(reviewData.text||'').slice(0,60)}" (${t('logToilet')}: ${reviewData.toiletId||'?'})`,
    });
  }catch(e){showToast('Ошибка: '+e.message);}
}

// ── ЛОГИ ──
const LOG_ICONS={
  review:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  toilet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  delete:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
  auth:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
  admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  fav:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
};

async function logAction({type,category,action,detail=''}){
  try{
    await _loadFirebase();
    const actor=currentUser
      ?{id:currentUser.id,name:currentUser.phone||currentUser.login||'?',nick:currentUser.nick||'',role:currentUser.role||'user'}
      :{id:'unknown',name:'?',nick:'',role:'user'};
    await db.collection('logs').add({
      type,category,action,detail,
      actorId:actor.id,actorName:actor.name,actorNick:actor.nick,
      actorLogin:actor.name,actorRole:actor.role,
      createdAt:new Date().toISOString(),
    });
  }catch(e){console.warn('[logAction]',e.message);}
}

let _logsCurrentFilter='all';
let _allLogs=[];

async function loadActivityLogs(){
  const list=document.getElementById('logsList');
  list.innerHTML=_skCards(5);
  try{
    await _loadFirebase();
    await _loadUsersCache();
    let snap;
    try{snap=await db.collection('logs').orderBy('createdAt','desc').limit(200).get();}
    catch(e){snap=await db.collection('logs').limit(200).get();}
    _allLogs=snap.docs
      .map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    renderLogs();
  }catch(e){
    list.innerHTML=`<p style="text-align:center;color:#ef4444;font-size:13px;padding:20px 0;">Ошибка: ${e.message}</p>`;
  }
}

function setLogsFilter(filter,chipEl){
  _logsCurrentFilter=filter;
  document.querySelectorAll('.logFilterChip').forEach(c=>c.classList.toggle('active',c.dataset.filter===filter));
  renderLogs();
}

function renderLogs(){
  const list=document.getElementById('logsList');
  const filtered=_logsCurrentFilter==='all'
    ?_allLogs
    :_allLogs.filter(l=>l.category===_logsCurrentFilter);
  if(!filtered.length){
    list.innerHTML=`<div class="logsEmpty">Нет записей${_logsCurrentFilter!=='all'?' по этому фильтру':''}</div>`;
    return;
  }
  const MONTHS=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  list.innerHTML=filtered.map(log=>{
    const d=new Date(log.createdAt);
    const dateStr=`${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const timeStr=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
    const isAdmin=log.actorRole==='admin';
    const icoClass=log.type==='delete'?'log-delete':`log-${log.category||log.type}`;
    const icoSvg=LOG_ICONS[log.type]||LOG_ICONS.review;
    const actorDisplay=_getActualName(log.actorId,log.actorNick||log.actorName||log.actorLogin||'?');
    const whoBadge=`<span class="logItem-who${isAdmin?' admin-badge':''}">${isAdmin?'⚙️ ':''}${actorDisplay}</span>`;
    const detail=log.detail?`<div class="logItem-detail" style="margin:0 14px 14px;">${log.detail}</div>`:'';
    return`<div class="logItem ${icoClass}">
      <div style="display:flex;align-items:flex-start;gap:14px;padding:16px 16px 12px;">
        <div class="logItem-ico ${icoClass}" style="margin-top:2px;">${icoSvg}</div>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;">
          <div class="logItem-action">${log.action||'—'}</div>
          <div class="logItem-meta">${whoBadge}</div>
        </div>
        <div class="logItem-datetime" style="flex-shrink:0;padding-top:2px;">
          <span class="logItem-date">${dateStr}</span>
          <span class="logItem-time">${timeStr}</span>
        </div>
      </div>
      ${detail}
    </div>`;
  }).join('');
}

// ── СТАТИСТИКА ──
let _statsCurrentTab='toilets';

function switchStatsTab(tab,chipEl){
  _statsCurrentTab=tab;
  document.querySelectorAll('#statsTabRow .logFilterChip').forEach(c=>c.classList.toggle('active',c.dataset.stab===tab));
  document.getElementById('statsTabToilets').style.display=tab==='toilets'?'':'none';
  document.getElementById('statsTabUsers').style.display=tab==='users'?'':'none';
}

async function loadAdminStats(){
  document.getElementById('statsSummaryToilets').innerHTML=_skStatSummary();
  document.getElementById('statsSummaryUsers').innerHTML=_skStatSummary();
  document.getElementById('statsToiletsList').innerHTML=_skCards(3);
  document.getElementById('statsUsersList').innerHTML=_skCards(3);
  try{
    await _loadFirebase();
    const [toiletsSnap,usersSnap,reviewsSnap]=await Promise.all([
      db.collection('toilets').get(),
      db.collection('users').get(),
      db.collection('reviews').limit(500).get()
    ]);
    const toilets=toiletsSnap.docs.map(d=>({id:d.id,...d.data()}));
    const users=usersSnap.docs.map(d=>({id:d.id,...d.data()}));
    const reviews=reviewsSnap.docs.map(d=>({id:d.id,...d.data()}));
    const MONTHS=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];

    // ── ТУАЛЕТЫ ──
    const openCount=toilets.filter(x=>x.isOpen).length;
    const freeCount=toilets.filter(x=>x.isFree).length;
    const taharatCount=toilets.filter(x=>x.isTaharatkhana).length;
    document.getElementById('statsSummaryToilets').innerHTML=`
      <div class="statSummaryCard"><div class="statSummaryRow"><span class="statSummaryIcon">🚻</span><span class="statSummaryNum">${toilets.length}</span></div><div class="statSummaryLabel">Всего точек</div></div>
      <div class="statSummaryCard"><div class="statSummaryRow"><span class="statSummaryIcon">🟢</span><span class="statSummaryNum">${openCount}</span></div><div class="statSummaryLabel">Открытых</div></div>
      <div class="statSummaryCard"><div class="statSummaryRow"><span class="statSummaryIcon">🆓</span><span class="statSummaryNum">${freeCount}</span></div><div class="statSummaryLabel">Бесплатных</div></div>
      <div class="statSummaryCard"><div class="statSummaryRow"><span class="statSummaryIcon">🕌</span><span class="statSummaryNum">${taharatCount}</span></div><div class="statSummaryLabel">Тахаратхан</div></div>`;

    const reviewsByToilet={};
    reviews.forEach(r=>{
      if(!reviewsByToilet[r.toiletId])reviewsByToilet[r.toiletId]={count:0,sum:0};
      reviewsByToilet[r.toiletId].count++;
      reviewsByToilet[r.toiletId].sum+=r.rating||0;
    });
    const sortedToilets=[...toilets].sort((a,b)=>(reviewsByToilet[b.id]?.count||0)-(reviewsByToilet[a.id]?.count||0));
    document.getElementById('statsToiletsList').innerHTML=sortedToilets.map(toilet=>{
      const rv=reviewsByToilet[toilet.id]||{count:0,sum:0};
      const avg=rv.count>0?(rv.sum/rv.count).toFixed(1):null;
      const tags=[];
      if(toilet.isOpen)tags.push('<span class="statItemBadge statBadgeGreen">Открыт</span>');
      else tags.push('<span class="statItemBadge statBadgeRed">Закрыт</span>');
      if(toilet.isFree)tags.push('<span class="statItemBadge statBadgeBlue">Бесплатно</span>');
      if(toilet.isTaharatkhana)tags.push('<span class="statItemBadge statBadgePurple">Тахаратхана</span>');
      const added=toilet.createdAt?(()=>{const d=new Date(toilet.createdAt);return`${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;})():'—';
      const addrLine=toilet.addr?`<div class="statItemAddr">${toilet.addr}</div>`:'';
      return`<div class="statItemCard">
        <div class="statItemIco" style="background:${toilet.isOpen?'rgba(0,168,89,0.12)':'rgba(239,68,68,0.10)'};">${toilet.isTaharatkhana?'🕌':'🚻'}</div>
        <div class="statItemBody">
          <div class="statItemTitle">${toilet.title||'—'}</div>
          ${addrLine}
          <div class="statItemMeta">
            ${avg?`<span class="statItemMetaChip">⭐ ${avg}</span>`:''}
            <span class="statItemMetaChip">${rv.count} отз.</span>
            <span class="statItemMetaChip">📅 ${added}</span>
          </div>
          <div class="statItemTags">${tags.join('')}</div>
        </div>
      </div>`;
    }).join('')||'<div class="statsLoading">Нет точек</div>';

    // ── ПОЛЬЗОВАТЕЛИ ──
    const reviewsByUser={};
    reviews.forEach(r=>{if(r.userId)reviewsByUser[r.userId]=(reviewsByUser[r.userId]||0)+1;});

    // Фильтруем дубликаты: если несколько аккаунтов с одинаковым телефоном без ника и без отзывов —
    // оставляем только одного (у которого есть отзывы, иначе первого)
    const phoneCount={};
    users.forEach(u=>{ if(u.phone&&!u.nick) phoneCount[u.phone]=(phoneCount[u.phone]||0)+1; });
    const seenDupPhone={};
    const dedupUsers=users.filter(u=>{
      if(u.role==='admin'||u.nick) return true;
      if(!u.phone||phoneCount[u.phone]<=1) return true;
      if(reviewsByUser[u.id]>0) return true;
      if(!seenDupPhone[u.phone]){ seenDupPhone[u.phone]=true; return true; }
      return false;
    });

    const adminCount=dedupUsers.filter(u=>u.role==='admin').length;
    document.getElementById('statsSummaryUsers').innerHTML=`
      <div class="statSummaryCard"><div class="statSummaryRow"><span class="statSummaryIcon">👥</span><span class="statSummaryNum">${dedupUsers.length}</span></div><div class="statSummaryLabel">Всего аккаунтов</div></div>
      <div class="statSummaryCard"><div class="statSummaryRow"><span class="statSummaryIcon">⚙️</span><span class="statSummaryNum">${adminCount}</span></div><div class="statSummaryLabel">Администраторов</div></div>
      <div class="statSummaryCard"><div class="statSummaryRow"><span class="statSummaryIcon">✦</span><span class="statSummaryNum">${dedupUsers.length-adminCount}</span></div><div class="statSummaryLabel">Обычных юзеров</div></div>
      <div class="statSummaryCard"><div class="statSummaryRow"><span class="statSummaryIcon">💬</span><span class="statSummaryNum">${reviews.length}</span></div><div class="statSummaryLabel">Всего отзывов</div></div>`;

    const sortedUsers=[...dedupUsers].sort((a,b)=>(reviewsByUser[b.id]||0)-(reviewsByUser[a.id]||0));
    document.getElementById('statsUsersList').innerHTML=sortedUsers.map(u=>{
      const isAdmin=u.role==='admin';
      const displayName=u.nick||u.phone||u.login||'—';
      const identifier=u.phone||u.login||'';
      const revCount=reviewsByUser[u.id]||0;
      const registered=u.createdAt?(()=>{const d=new Date(u.createdAt);return`${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;})():'—';
      const ini=displayName.replace(/\+/g,'').slice(0,2).toUpperCase();
      const avatarColor=isAdmin?'#7c3aed':'var(--green)';
      const avatarBg=isAdmin?'rgba(124,58,237,0.12)':'rgba(0,168,89,0.10)';
      return`<div class="statItemCard">
        <div class="statItemIco" style="background:${avatarBg};border-radius:50%;color:${avatarColor};font-size:14px;font-weight:800;">${ini}</div>
        <div class="statItemBody">
          <div class="statItemTitle">${displayName}</div>
          <div class="statItemMeta">
            ${identifier&&identifier!==displayName?`<span class="statItemMetaChip">${identifier}</span>`:''}
            <span class="statItemMetaChip">💬 ${revCount} отз.</span>
            <span class="statItemMetaChip">📅 ${registered}</span>
          </div>
        </div>
        <span class="statItemBadge ${isAdmin?'statBadgePurple':'statBadgeBlue'}">${isAdmin?'⚙️ Admin':'User'}</span>
      </div>`;
    }).join('')||'<div class="statsLoading">Нет пользователей</div>';
  }catch(e){
    document.getElementById('statsToiletsList').innerHTML=`<div class="statsLoading" style="color:#ef4444;">Ошибка: ${e.message}</div>`;
    document.getElementById('statsUsersList').innerHTML=`<div class="statsLoading" style="color:#ef4444;">Ошибка: ${e.message}</div>`;
  }
}

// ── WIZARD ──
let wizCoords=null;
let wizCurrentStep=1;
let wizPickMode=false;
let _wizGeocodeTimer=null;
let _wizSearchTimer=null;
let _wizLastGeocodeCoords=null;

function wizReset(){
  wizCoords=null; wizCurrentStep=1; wizPickMode=false;
  const nav=document.getElementById('bottomNav');
  if(nav)nav.style.display='';
  _wizHideOverlay();
  const confirmed=document.getElementById('wizCoordsConfirmed');
  if(confirmed){confirmed.style.display='none';confirmed.textContent='';}
  const next1=document.getElementById('wizNext1');
  if(next1)next1.disabled=true;
  const navRow1=document.getElementById('wizNavRow1');
  if(navRow1)navRow1.style.display='none';
  const menuBtnRow=document.getElementById('wizMenuBtnRow');
  if(menuBtnRow)menuBtnRow.style.display='flex';
  const titleEl=document.getElementById('wizTitle');
  if(titleEl){titleEl.value='';titleEl.style.height='';}
  const descEl=document.getElementById('wizDesc');
  if(descEl){descEl.value='';descEl.style.height='';}
  document.querySelectorAll('.tagToggle').forEach(el=>{
    const def=el.dataset.tag==='isFree'||el.dataset.tag==='isOpen';
    el.classList.toggle('on',def);
  });
  wizShowPanel(1);
}

function wizShowPanel(step){
  wizCurrentStep=step;
  document.querySelectorAll('.wizPanel').forEach((p,i)=>p.classList.toggle('active',i===step-1));
  const titles={1:'📍 Укажите место',2:'✏️ Добавьте описание',3:'🔍 Проверьте данные'};
  const titleEl=document.getElementById('wizStepTitle');
  if(titleEl){titleEl.textContent=titles[step]||'';titleEl.classList.toggle('wizStepTitleConfirm',step===3);}
}

function wizGoStep(step){
  if(step===2&&!wizCoords){showToast(t('toastFirstPlace'));return;}
  if(step===3){
    const title=document.getElementById('wizTitle').value.trim();
    if(!title){showToast(t('toastEnterTitle'));document.getElementById('wizTitle').focus();return;}
    wizFillConfirm();
  }
  wizShowPanel(step);
}

function wizFillConfirm(){
  const coords=wizCoords?`${wizCoords[0].toFixed(5)}, ${wizCoords[1].toFixed(5)}`:'—';
  const title=document.getElementById('wizTitle').value.trim();
  document.getElementById('wizPreviewTitle').textContent=title||'—';

  const addrMain=document.getElementById('wizPickAddressMain');
  const addrText=(addrMain&&addrMain.textContent&&
    addrMain.textContent!=='Определяю адрес...'&&
    addrMain.textContent!=='...'&&
    addrMain.textContent!=='Перемещаю...')
    ?addrMain.textContent:coords;
  document.getElementById('wizPreviewAddrText').textContent=addrText;

  const pillsEl=document.getElementById('wizPreviewPills');
  if(pillsEl){
    pillsEl.innerHTML='';
    const tags={};
    document.querySelectorAll('.tagToggle').forEach(el=>{tags[el.dataset.tag]=el.classList.contains('on');});
    const openSpan=document.createElement('span');
    openSpan.className='mPill '+(tags.isOpen?'pGreen':'pRed');
    openSpan.textContent=tags.isOpen?'🟢 Открыто':'🔴 Закрыто';
    pillsEl.appendChild(openSpan);
    const freeSpan=document.createElement('span');
    freeSpan.className='mPill '+(tags.isFree?'pGreen2':'pBlue');
    freeSpan.textContent=tags.isFree?'🆓 Бесплатно':'💳 Платно';
    pillsEl.appendChild(freeSpan);
    if(tags.hasSoap){const s=document.createElement('span');s.className='mPill pBlue';s.textContent='🧼 Мыло';pillsEl.appendChild(s);}
    if(tags.hasPaper){const s=document.createElement('span');s.className='mPill pBlue';s.textContent='🧻 Бумага';pillsEl.appendChild(s);}
    if(tags.isAccessible){const s=document.createElement('span');s.className='mPill pBlue';s.textContent='♿ Доступно';pillsEl.appendChild(s);}
    if(tags.isTaharatkhana){const s=document.createElement('span');s.className='mPill';s.style.background='#fef3c7';s.style.color='#92400e';s.textContent='🕌 Тахаратхана';pillsEl.appendChild(s);}
  }

  const desc=document.getElementById('wizDesc').value.trim();
  const descEl=document.getElementById('wizPreviewDesc');
  const taharatPreview=document.getElementById('wizPreviewTaharat');
  const taharatNotePreview=document.getElementById('wizPreviewTaharatNote');
  const tags={};
  document.querySelectorAll('.tagToggle').forEach(el=>{tags[el.dataset.tag]=el.classList.contains('on');});
  if(tags.isTaharatkhana&&desc){
    if(taharatNotePreview)taharatNotePreview.textContent=desc;
    if(taharatPreview)taharatPreview.classList.remove('hidden');
    if(descEl)descEl.classList.add('hidden');
  } else {
    if(taharatPreview)taharatPreview.classList.add('hidden');
    if(descEl){desc?(descEl.textContent=desc,descEl.classList.remove('hidden')):descEl.classList.add('hidden');}
  }
}

function wizToggleTag(el){el.classList.toggle('on');}

function _wizShowOverlay(){
  const ov=document.getElementById('wizPickOverlay');
  if(ov){ov.classList.remove('hidden');ov.classList.add('active');}
}
function _wizHideOverlay(){
  const ov=document.getElementById('wizPickOverlay');
  if(ov){ov.classList.add('hidden');ov.classList.remove('active');}
  wizHideSuggest();
}

function wizStartPickLocation(){
  wizPickMode=true;
  const nav=document.getElementById('bottomNav');
  if(nav)nav.style.display='none';
  switchTab('map');
  _wizShowOverlay();
  requestAnimationFrame(()=>{
    const header=document.getElementById('wizPickHeader');
    const addrBar=document.getElementById('wizPickAddressBar');
    const pin=document.getElementById('wizPickPin');
    if(pin&&header&&addrBar){
      const hH=header.getBoundingClientRect().height;
      const aH=addrBar.getBoundingClientRect().height;
      pin.style.marginTop=(-20+(hH-aH)/2)+'px';
    }
  });
  const si=document.getElementById('wizPickSearch');
  if(si){si.value='';si.blur();}
  wizHideSuggest();
  wizScheduleGeocode();
  if(myMap){
    myMap.events.add('boundschange',_wizOnMapMove);
    myMap.events.add('actionbegin',_wizOnMapDragStart);
    myMap.events.add('actionend',_wizOnMapDragEnd);
  }
}

function _wizOnMapDragStart(){
  const pin=document.getElementById('wizPickPin');
  if(pin)pin.classList.add('dragging');
  const addr=document.getElementById('wizPickAddressMain');
  if(addr)addr.textContent='Перемещаю...';
}
function _wizOnMapDragEnd(){
  const pin=document.getElementById('wizPickPin');
  if(pin)pin.classList.remove('dragging');
  wizScheduleGeocode();
}
function _wizOnMapMove(){
  clearTimeout(_wizGeocodeTimer);
  const addr=document.getElementById('wizPickAddressMain');
  if(addr&&addr.textContent!=='Перемещаю...')addr.textContent='...';
}

function wizScheduleGeocode(){
  clearTimeout(_wizGeocodeTimer);
  _wizGeocodeTimer=setTimeout(()=>{
    if(!myMap||!wizPickMode)return;
    const center=myMap.getCenter();
    wizGeocode(center[0],center[1]).then(addr=>{
      const addrEl=document.getElementById('wizPickAddressMain');
      if(addrEl)addrEl.textContent=addr;
      _wizLastGeocodeCoords=[center[0],center[1]];
    });
  },700);
}

async function wizGeocode(lat,lon){
  try{
    const url=`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ru&zoom=18`;
    const r=await fetch(url,{headers:{'Accept-Language':'ru'}});
    if(!r.ok)throw new Error('http '+r.status);
    const data=await r.json();
    const a=data.address||{};
    const parts=[];
    if(a.road)parts.push(a.road);
    if(a.house_number)parts.push(a.house_number);
    if(parts.length)return parts.join(', ');
    return data.name||a.neighbourhood||a.suburb||data.display_name?.split(',')[0]||`${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }catch(e){return`${lat.toFixed(4)}, ${lon.toFixed(4)}`;}
}

async function wizDoSearch(query){
  if(!query||!wizPickMode)return;
  try{
    const url=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent('Ташкент '+query)}&format=json&limit=6&accept-language=ru&countrycodes=uz&viewbox=69.10,41.45,69.45,41.15&bounded=1`;
    const r=await fetch(url,{headers:{'Accept-Language':'ru'}});
    if(!r.ok)throw new Error('http '+r.status);
    const data=await r.json();
    if(!data.length){wizHideSuggest();return;}
    const items=data.map(item=>{
      const parts=item.display_name.split(', ');
      const clean=parts.filter(p=>p!=='Узбекистан'&&p!=='100000'&&p!=='Toshkent'&&p!=='Ташкент'||parts.indexOf(p)===0);
      return{name:clean.slice(0,3).join(', '),desc:'',coords:[parseFloat(item.lat),parseFloat(item.lon)]};
    });
    wizShowSuggest(items);
  }catch(e){wizHideSuggest();}
}

function wizCancelPickLocation(){
  wizPickMode=false;
  const nav=document.getElementById('bottomNav');
  if(nav)nav.style.display='';
  _wizHideOverlay();
  if(myMap){
    myMap.events.remove('boundschange',_wizOnMapMove);
    myMap.events.remove('actionbegin',_wizOnMapDragStart);
    myMap.events.remove('actionend',_wizOnMapDragEnd);
  }
  switchTab('add');
}

function wizConfirmLocation(){
  if(!myMap)return;
  const center=myMap.getCenter();
  wizPickMode=false;
  const nav=document.getElementById('bottomNav');
  if(nav)nav.style.display='';
  _wizHideOverlay();
  if(myMap){
    myMap.events.remove('boundschange',_wizOnMapMove);
    myMap.events.remove('actionbegin',_wizOnMapDragStart);
    myMap.events.remove('actionend',_wizOnMapDragEnd);
  }
  wizCoords=[center[0],center[1]];
  const addrEl=document.getElementById('wizPickAddressMain');
  const addrText=addrEl?addrEl.textContent:'';
  const confirmed=document.getElementById('wizCoordsConfirmed');
  if(confirmed){confirmed.style.display='block';confirmed.textContent=`✓ ${addrText||(center[0].toFixed(4)+', '+center[1].toFixed(4))}`;}
  const next1=document.getElementById('wizNext1');
  if(next1)next1.disabled=false;
  const navRow1=document.getElementById('wizNavRow1');
  if(navRow1)navRow1.style.display='';
  const menuBtnRow=document.getElementById('wizMenuBtnRow');
  if(menuBtnRow)menuBtnRow.style.display='none';
  _skipAdminDashboard=true;
  switchTab('add');
  setTimeout(()=>wizGoStep(2),80);
}

function wizShowSuggest(items){
  const inner=document.getElementById('wizPickSuggestInner');
  const divider=document.getElementById('wizPickDivider');
  if(!inner)return;
  if(!items.length){wizHideSuggest();return;}
  inner.innerHTML=items.map(it=>{
    const parts=it.name.split(', ');
    const main=parts[0]||it.name;
    const sub=parts.slice(1).join(', ');
    return`<div class="wizPickSuggestItem" onclick="wizSelectSuggest(${it.coords[0]},${it.coords[1]})">
      <div class="sugIco">📍</div>
      <div class="sugText">
        <div class="sugName">${main}</div>
        ${sub?`<div class="sugSub">${sub}</div>`:''}
      </div>
    </div>`;
  }).join('');
  if(divider)divider.classList.add('vis');
  inner.style.display='block';
  const hint=document.getElementById('wizPickHint');
  if(hint)hint.style.visibility='hidden';
}

function wizHideSuggest(){
  const inner=document.getElementById('wizPickSuggestInner');
  const divider=document.getElementById('wizPickDivider');
  if(inner){inner.innerHTML='';inner.style.display='none';}
  if(divider)divider.classList.remove('vis');
  const hint=document.getElementById('wizPickHint');
  if(hint)hint.style.visibility='visible';
}

function wizSelectSuggest(lat,lon){
  if(!myMap)return;
  myMap.setCenter([lat,lon],17,{duration:500});
  wizHideSuggest();
  const input=document.getElementById('wizPickSearch');
  if(input)input.blur();
  setTimeout(wizScheduleGeocode,600);
}

function wizClearSearch(){
  const input=document.getElementById('wizPickSearch');
  const clearBtn=document.getElementById('wizPickSearchClear');
  if(input){input.value='';input.focus();}
  if(clearBtn)clearBtn.classList.add('hidden');
  wizHideSuggest();
}

function wizInitSearch(){
  const input=document.getElementById('wizPickSearch');
  const clearBtn=document.getElementById('wizPickSearchClear');
  if(!input)return;
  input.addEventListener('input',()=>{
    const val=input.value.trim();
    clearBtn&&clearBtn.classList.toggle('hidden',!val);
    clearTimeout(_wizSearchTimer);
    if(!val){wizHideSuggest();return;}
    _wizSearchTimer=setTimeout(()=>wizDoSearch(val),350);
  });
  input.addEventListener('focus',()=>{if(input.value.trim())wizDoSearch(input.value.trim());});
}

async function wizSaveToilet(){
  if(!currentUser||currentUser.role!=='admin'){showToast(t('toastNeedAdmin'));return;}
  if(!wizCoords){showToast(t('toastNoPlace'));return;}
  const title=document.getElementById('wizTitle').value.trim();
  if(!title){showToast(t('toastEnterTitle'));return;}
  const btn=document.getElementById('wizSaveBtn');
  if(btn){btn.textContent='⏳ Сохраняю...';btn.disabled=true;}
  const tags={};
  document.querySelectorAll('.tagToggle').forEach(el=>{tags[el.dataset.tag]=el.classList.contains('on');});
  const body={
    lat:wizCoords[0],lon:wizCoords[1],title,
    description:document.getElementById('wizDesc').value.trim()||'',
    photo:'',
    isOpen:tags.isOpen||false,isFree:tags.isFree||false,
    hasSoap:tags.hasSoap||false,hasPaper:tags.hasPaper||false,
    isAccessible:tags.isAccessible||false,isTaharatkhana:tags.isTaharatkhana||false,
    addedBy:currentUser.id,createdAt:new Date().toISOString()
  };
  // Геокодируем адрес до записи в Firestore
  try{
    const addrEl=document.getElementById('wizPickAddressMain');
    const addrFromUI=(addrEl&&addrEl.textContent&&
      addrEl.textContent!=='Определяю адрес...'&&
      addrEl.textContent!=='...'&&
      addrEl.textContent!=='Перемещаю...')
      ?addrEl.textContent:'';
    body.addr=addrFromUI||await wizGeocode(body.lat,body.lon);
  }catch(e){
    body.addr=`${body.lat.toFixed(5)}, ${body.lon.toFixed(5)}`;
  }
  try{
    await _loadFirebase();
    await db.collection('toilets').add(body);
    loadToilets();
    showToast(t('toiletAdded'));
    logAction({type:'toilet',category:'toilet',action:t('logAddedToilet'),
      detail:`"${body.title}" · ${body.addr||body.lat.toFixed(5)+', '+body.lon.toFixed(5)}${body.description?' · '+body.description.slice(0,60):''}`,});
    wizReset();
    showAdminDashboard();
    switchTab('map');
  }catch(e){
    showToast('Ошибка: '+e.message);
    if(btn){btn.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Сохранить';btn.disabled=false;}
    console.error(e);
  }
}

// обратная совместимость
function pickLocationOnMap(){wizStartPickLocation();}
async function submitAddToiletDirect(){wizSaveToilet();}
