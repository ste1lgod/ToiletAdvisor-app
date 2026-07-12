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
