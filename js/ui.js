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
