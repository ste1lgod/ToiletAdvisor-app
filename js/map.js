// ── MAP INIT ──
function initMap(){
  try{
    myMap=new ymaps.Map('map',{
      center:TASHKENT,
      zoom:13,
      controls:[]
    },{
      suppressMapOpenBlock:true,
      yandexMapDisablePoiInteractivity:false,
      copyrightLogoVisible:false,
      copyrightProvidersVisible:false,
      copyrightUaVisible:false
    });
    myMap.events.add('click',e=>{
      if(document.getElementById('toiletSheet').classList.contains('open')){closeSheet();return;}
      if(wizPickMode) return;
      if(!document.getElementById('addOverlay').classList.contains('hidden')){
        addCoords=e.get('coords');
        document.getElementById('addHintM').textContent=`📍 Выбрано: ${addCoords[0].toFixed(4)}, ${addCoords[1].toFixed(4)}`;
        document.getElementById('addHintM').style.color='var(--green)';
        const ao=document.getElementById('addOverlay');
        if(ao.style.pointerEvents==='none'){
          ao.classList.add('hidden');
          ao.style.opacity='';
          ao.style.pointerEvents='';
          const cd=document.getElementById('addCoordsDisplay');
          if(cd){cd.textContent=`📍 Выбрано: ${addCoords[0].toFixed(4)}, ${addCoords[1].toFixed(4)}`;cd.style.display='block';}
          switchTab('add');
        }
      }
    });
    loadToilets();
    startGeo();
    setTimeout(adjustControlsPosition,200);
    wizInitSearch();
    setTimeout(applyMapTheme, 500);
    setTimeout(hideYandexUI,600);
    setTimeout(hideYandexUI,1500);
    setTimeout(hideYandexUI,3000);
  }catch(err){console.error('Map:',err);}
}

function hideYandexUI(){
  const map=document.getElementById('map');
  if(!map)return;

  const BAD_SUFFIXES=[
    'copyright','Copyright','gotoymaps','GoToYMaps',
    'logo','Logo','scale','Scale','ruler','Ruler',
    'float-button','searchbox','geolocation',
    'controls__toolbar','controls__control','controls__pane',
    'zoom','Zoom'
  ];

  function shouldHide(el){
    if(!el||!el.className||typeof el.className!=='string')return false;
    if(!el.className.includes('ymaps'))return false;
    return BAD_SUFFIXES.some(s=>el.className.includes(s));
  }

  function hideEl(el){
    if(!el||el.id==='geoBtn'||el.id==='zoomControls')return;
    if(el.closest&&(el.closest('#geoBtn')||el.closest('#zoomControls')||el.closest('#bottomNav')))return;
    if(shouldHide(el)){
      el.style.setProperty('display','none','important');
      el.style.setProperty('opacity','0','important');
      el.style.setProperty('pointer-events','none','important');
      el.style.setProperty('visibility','hidden','important');
      el.style.setProperty('width','0','important');
      el.style.setProperty('height','0','important');
    }
  }

  map.querySelectorAll('*').forEach(hideEl);

  if(!map._uiObserver){
    map._uiObserver=new MutationObserver(mutations=>{
      mutations.forEach(m=>{
        m.addedNodes.forEach(node=>{
          if(node.nodeType===1){
            hideEl(node);
            node.querySelectorAll&&node.querySelectorAll('*').forEach(hideEl);
          }
        });
      });
    });
    map._uiObserver.observe(map,{childList:true,subtree:true});
  }
}

if(typeof ymaps!=='undefined')ymaps.ready(initMap);

// ── ZOOM ──
function mapZoom(delta){
  if(!myMap)return;
  myMap.setZoom(myMap.getZoom()+delta,{duration:200});
}

// ── USER LOCATION ──
function startGeo(){
  if(!navigator.geolocation)return;
  navigator.geolocation.watchPosition(pos=>{
    userCoords=[pos.coords.latitude,pos.coords.longitude];
    updateUserDot();
  },null,{enableHighAccuracy:true,maximumAge:5000,timeout:10000});
}

function updateUserDot(){
  if(!myMap||!userCoords)return;
  if(userPlacemark)myMap.geoObjects.remove(userPlacemark);
  const layout=ymaps.templateLayoutFactory.createClass(
    '<div class="uDotWrap"><div class="uDotRing"></div><div class="uDotCore"></div></div>'
  );
  userPlacemark=new ymaps.Placemark(userCoords,{},{
    iconLayout:layout,
    iconShape:{type:'Circle',coordinates:[0,0],radius:12},
    zIndex:500
  });
  myMap.geoObjects.add(userPlacemark);
}

function goToMyLocation(){
  const go=c=>{myMap.setCenter(c,16,{duration:600});};
  if(userCoords){go(userCoords);}
  else navigator.geolocation.getCurrentPosition(
    p=>{userCoords=[p.coords.latitude,p.coords.longitude];go(userCoords);updateUserDot();},
    ()=>showToast(t('toastGeoUnavail'))
  );
}

let isPanning=false;

function findNearest(){
  if(!allToilets.length){showToast(t('toastNoPoints'));return;}
  const ref=userCoords||TASHKENT;
  let best=null,bd=Infinity;
  allToilets.forEach(toilet=>{const d=haversine(ref[0],ref[1],toilet.lat,toilet.lon);if(d<bd){bd=d;best=toilet;}});
  if(best){
    isPanning=true;
    myMap.setCenter([best.lat,best.lon],17,{duration:700,timingFunction:'ease-in-out'});
    setTimeout(()=>{isPanning=false;},1000);
  }
}

// ── MARKERS ──
async function loadToilets(){
  await _loadFirebase();
  try{
    const snap=await db.collection('toilets').get();
    if(!snap.empty){
      allToilets=snap.docs.map(d=>({id:d.id,...d.data()}));
    } else {
      allToilets=FALLBACK_TOILETS;
      const batch=db.batch();
      FALLBACK_TOILETS.forEach(t=>{
        batch.set(db.collection('toilets').doc(t.id),t);
      });
      await batch.commit();
      console.log('Seed-данные записаны в Firestore');
    }
  }catch(e){
    console.warn('Firestore недоступен, используются локальные данные:',e.message);
    allToilets=FALLBACK_TOILETS;
    if(!navigator.onLine)showOfflineBanner();
  }
  renderMarkers();
  // Если шторка открыта — обновляем сердечко (мог пропасть после reload)
  if(isSheetOpen && selectedToilet){
    updateFavBtn(selectedToilet.id);
  }
}

function renderMarkers(){
  if(!myMap)return;
  myMap.geoObjects.removeAll();
  if(userPlacemark)myMap.geoObjects.add(userPlacemark);
  const q=document.getElementById('searchInput').value.toLowerCase().trim();
  allToilets.filter(toilet=>{
    if(q&&!toilet.title.toLowerCase().includes(q))return false;
    if(currentCat==='taharatkhana')return toilet.isTaharatkhana;
    if(currentCat==='free')return toilet.isFree;
    if(currentCat==='soap')return toilet.hasSoap;
    if(currentCat==='paper')return toilet.hasPaper;
    if(currentCat==='accessible')return toilet.isAccessible;
    return true;
  }).forEach(toilet=>{
    let svg, sz, off;
    if(toilet.isTaharatkhana){
      svg=mosqueSVG();
      sz=[52,64];off=[-26,-64];
    } else {
      const color=toilet.isOpen?'#15803D':'#C62828';
      svg=pinSVG(color,'🚻');
      sz=[48,60];off=[-24,-60];
    }
    const pm=new ymaps.Placemark([toilet.lat,toilet.lon],{hintContent:toilet.title},{
      iconLayout:'default#image',
      iconImageHref:'data:image/svg+xml;utf8,'+encodeURIComponent(svg),
      iconImageSize:sz,
      iconImageOffset:off,
      zIndex:200,
      zIndexHover:210
    });
    pm.events.add('click',(()=>{
      const _toilet=toilet;
      return (e)=>{
        if(isPanning)return;
        if(wizPickMode)return;
        e.stopPropagation();
        if(isSheetOpen){
          isSheetOpen=false;
          _closeBackdrop();
          document.getElementById('toiletSheet').classList.remove('open');
          selectedToilet=null;
          setTimeout(()=>openSheet(_toilet),50);
        } else {
          openSheet(_toilet);
        }
      };
    })());
    myMap.geoObjects.add(pm);
  });
}

// ── MARKER SVGs ──
function pinSVG(color, emoji){
  const gid='pg'+color.replace('#','');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">
  <defs>
    <radialGradient id="${gid}" cx="38%" cy="28%" r="65%">
      <stop offset="0%" stop-color="${lighten(color,40)}"/>
      <stop offset="100%" stop-color="${color}"/>
    </radialGradient>
  </defs>
  <path
    d="M24 2C14.6 2 7 9.6 7 19c0 12.5 17 37 17 37S41 31.5 41 19C41 9.6 33.4 2 24 2z"
    fill="url(#${gid})"
    stroke="#0d1117"
    stroke-width="0.5"
    stroke-linejoin="round"/>
  <circle cx="24" cy="19" r="13" fill="rgba(255,255,255,0.96)"/>
  <foreignObject x="11" y="6" width="26" height="26">
    <div xmlns="http://www.w3.org/1999/xhtml"
      style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1;">
      ${emoji}
    </div>
  </foreignObject>
</svg>`;
}

function mosqueSVG(){
  const color='#C8820A';
  const gid='pgmosque';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="64" viewBox="0 0 48 60">
  <defs>
    <radialGradient id="${gid}" cx="38%" cy="28%" r="65%">
      <stop offset="0%" stop-color="${lighten(color,40)}"/>
      <stop offset="100%" stop-color="${color}"/>
    </radialGradient>
  </defs>
  <path
    d="M24 2C14.6 2 7 9.6 7 19c0 12.5 17 37 17 37S41 31.5 41 19C41 9.6 33.4 2 24 2z"
    fill="url(#${gid})"
    stroke="#0d1117"
    stroke-width="0.5"
    stroke-linejoin="round"/>
  <circle cx="24" cy="19" r="13" fill="rgba(255,255,255,0.96)"/>
  <foreignObject x="11" y="6" width="26" height="26">
    <div xmlns="http://www.w3.org/1999/xhtml"
      style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1;">
      🕌
    </div>
  </foreignObject>
</svg>`;
}

function lighten(hex, amount=55){
  const n=parseInt(hex.replace('#',''),16);
  const r=Math.min(255,((n>>16)&255)+amount);
  const g=Math.min(255,((n>>8)&255)+amount);
  const b=Math.min(255,(n&255)+amount);
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}

// ── ADJUST FLOATING CONTROLS POSITION ──
let _lastControlsTop=170,_lastGeoTop=286;

function adjustControlsPosition(){
  const hp=document.getElementById('headerPanel');
  const card=document.querySelector('.headerCard');
  if(!card||!hp||hp.style.display==='none'||hp.style.visibility==='hidden')return;
  const rect=card.getBoundingClientRect();
  if(rect.height<10)return;
  const bottom=rect.bottom+8;
  const geoTop=bottom+44+8+44+16;
  _lastControlsTop=bottom;
  _lastGeoTop=geoTop;
  document.documentElement.style.setProperty('--controls-top', bottom+'px');
  document.documentElement.style.setProperty('--geo-top', geoTop+'px');
  const ob=document.getElementById('offlineBanner');
  if(ob)ob.style.top=(rect.bottom+10)+'px';
}

// ── DISTANCE UTILS ──
function haversine(lat1,lon1,lat2,lon2){
  const R=6371000,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function formatDist(m,fallback){
  const suf=fallback?` ${t('distFallback')}`:'';
  return m<1000?`▵ ${Math.round(m)} ${t('mAway')}${suf}`:`▵ ${(m/1000).toFixed(1)} ${t('kmAway')}${suf}`;
}
