$file = "c:\Users\zbaze\ToiletAdvisor\index.html"
$lines = Get-Content $file -Encoding UTF8

# Часть до первого <script> (строки 1-2816, индексы 0-2815)
$before = $lines[0..2815]

# Часть после последнего </script> (строка 5812+, индекс 5811+)
$after = $lines[5811..($lines.Length - 1)]

# Блок: глобальные переменные + подключения внешних JS
$inject = @'
<script>
// ── ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ──
const COLORS=['#019451','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899'];
const TASHKENT=[41.2995,69.2401];
const FALLBACK_TOILETS=[
  {id:'seed-0001-tashkent-city-mall',lat:41.2956,lon:69.2797,title:'Туалет в Tashkent City Mall',addr:'проспект Ислама Каримова, 1',description:'Чистый туалет на 1-м этаже ТРЦ Tashkent City Mall, рядом с фуд-кортом',isOpen:true,isFree:true,hasSoap:true,hasPaper:true,isAccessible:true,isTaharatkhana:false},
  {id:'seed-0002-masjid-minor',lat:41.2871,lon:69.2768,title:'Тахаратхана у мечети Минор',addr:'улица Катартал, 56',description:'Место для омовения при мечети Минор. Горячая вода, мыло, тапочки',isOpen:true,isFree:true,hasSoap:true,hasPaper:false,isAccessible:false,isTaharatkhana:true},
  {id:'seed-0003-railway-station',lat:41.3174,lon:69.2870,title:'Туалет на вокзале Ташкент-Главный',addr:'улица Мустакиллик, 1',description:'Платный туалет в здании главного железнодорожного вокзала',isOpen:false,isFree:false,hasSoap:true,hasPaper:true,isAccessible:true,isTaharatkhana:false},
  {id:'seed-0004-navoi-park',lat:41.3058,lon:69.2714,title:'Туалет в парке Алишера Навои',addr:'улица Алишера Навои, 30',description:'Общественный туалет в центральной части парка Навои',isOpen:false,isFree:true,hasSoap:false,hasPaper:true,isAccessible:false,isTaharatkhana:false},
  {id:'seed-0005-khastimom',lat:41.3276,lon:69.2623,title:'Тахаратхана в мечети Хастимом',addr:'улица Зайнабидин Восиков, 103',description:'Тахаратхана при соборной мечети Хасти-Имом, рядом с медресе',isOpen:true,isFree:true,hasSoap:true,hasPaper:false,isAccessible:false,isTaharatkhana:true},
  {id:'seed-0006-next-mall',lat:41.3376,lon:69.2841,title:'Туалет в ТРЦ Next',addr:'проспект Амира Темура, 108',description:'Туалет на 2-м этаже торгового центра Next на Юнусабаде',isOpen:true,isFree:true,hasSoap:true,hasPaper:true,isAccessible:true,isTaharatkhana:false},
  {id:'seed-0007-broadway',lat:41.2983,lon:69.2717,title:'Туалет на Broadway (пешеходная зона)',addr:'улица Сайилгох (Broadway)',description:'Общественный платный туалет на пешеходной улице Сайилгох (Broadway)',isOpen:true,isFree:false,hasSoap:true,hasPaper:true,isAccessible:false,isTaharatkhana:false}
];
const T={
  ru:{search:'Поиск туалета...',loginBtn:'→ Войти',open:'Открыто',closed:'Закрыто',free:'🆓 Бесплатно',paid:'Платно',noReviews:'Пока нет отзывов',success:'✓ Ваш отзыв добавлен!',kmAway:'км от вас',mAway:'м от вас',findNearest:'Найти ближайший туалет',addHint:'📍 Нажмите на карте, чтобы выбрать место',distFallback:'(от центра)',route:'Маршрут',writeReview:'Напишите ваш отзыв...',submit:'Отправить',leaveReview:'Оставить отзыв',adminDenied:'Эта вкладка предназначена только для администраторов Toilet Advisor.',adminDeniedTitle:'Доступ ограничен',adminDeniedBtn:'Войти как Админ',profile:'Профиль',profileSub:'Войдите чтобы увидеть данные',profileAccount:'Аккаунт',profileRole:'Роль',profileLogout:'🚪 Выйти из аккаунта',profileLogin:'→ Войти в аккаунт',profileAdmin:'Администратор',toiletAdded:'Туалет добавлен!',logAddedToilet:'Добавил туалет',logLeftReview:'Оставил отзыв',logDeletedReview:'Удалил отзыв',logLogin:'Вход в систему',logLogout:'Выход из аккаунта',logRegister:'Регистрация нового пользователя',logAdminLogin:'Вход администратора',logToilet:'Туалет',logRating:'Оценка',logUser:'Пользователь',logAdmin:'Администратор',logAddedFav:'Добавил в избранное',logRemovedFav:'Убрал из избранного',toastGeoUnavail:'Геолокация недоступна',toastNoPoints:'Нет точек на карте',toastEnterReview:'Введите текст и поставьте оценку',toastReviewSaved:'Отзыв сохранён локально, синхронизация при восстановлении связи',toastFillAll:'Заполните все поля',toastUserNotFound:'Пользователь не найден',toastWrongPass:'Неверный пароль',toastAlreadyReg:'Этот номер уже зарегистрирован',toastRegOk:'Регистрация успешна',toastLoginOk:'Вы вошли в систему',toastAdminLoginOk:'Вы вошли как администратор',toastAdminNotFound:'Администратор не найден',toastLogout:'Вы вышли из аккаунта',toastReviewDeleted:'Отзыв удалён',toastNeedAdmin:'Требуются права администратора',toastNoPlace:'Не выбрано место',toastEnterTitle:'Введите название',toastFirstPlace:'Сначала укажите место на карте',toastNoPlaceMap:'Выберите место на карте',toastTimeout:'Превышено время ожидания. Проверьте интернет и попробуйте снова.',toastOnline:'Подключение восстановлено',soap:'Мыло',paper:'Бумага',accessible:'Доступность',catAll:'🗺️ Все',catTaharatkhana:'🕌 Тахаратхана',catFree:'🆓 Бесплатно',catSoap:'🧼 Мыло',catPaper:'🧻 Бумага',catAccessible:'♿ Доступные',navMap:'Карта',navProfile:'Профиль',reviews:'Отзывы',reviewsTitle:'Отзывы',authNotice:'🔒 Чтобы оставить оценку, пожалуйста, войдите в систему',adminPanelTitle:'⚙️ Панель администратора',adminAddPoint:'Добавить точку',adminAddPointSub:'Добавить новый туалет на карту',adminModeration:'Модерация отзывов',adminModerationSub:'Просмотр и удаление отзывов пользователей',adminLogs:'Журнал действий',adminLogsSub:'Все действия пользователей и администраторов',adminBack:'‹ Назад',adminModerationTitle:'Модерация отзывов',adminLogsTitle:'📋 Журнал действий',logFilterAll:'Все',logFilterReviews:'Отзывы',logFilterToilets:'Туалеты',logFilterAuth:'Входы',logFilterAdmin:'Админ',wizStep1Title:'📍 Укажите место',wizStep2Title:'✏️ Добавьте описание',wizStep3Title:'🔍 Проверьте данные',wizMapSub:'Нажмите кнопку ниже, затем выберите место на карте — пин в центре экрана покажет точку добавления',wizPickPlace:'Указать место на карте',wizPickHint:'📍 Укажите координаты — переместите карту или найдите улицу',wizPickSearch:'Поиск улицы...',wizPickSelect:'Выбрать',wizCatSpecial:'Особые категории',wizCatFeatures:'Характеристики',wizTagTaharatkhana:'Тахаратхана',wizTagFree:'Бесплатно',wizTagOpen:'Открыто',wizTagSoap:'Мыло',wizTagPaper:'Бумага',wizTagAccessible:'Доступно',wizTitlePlaceholder:'Название туалета',wizDescPlaceholder:'Описание (необязательно)',wizPrev:'← Назад',wizNext:'Далее →',wizSave:'Сохранить',wizNew:'✨ Новый',wizBack:'‹ В меню',taharatTitle:'🕌 Тахоратхона / Тахаратхана',taharatSub:'Место для омовения перед намазом',taharatHotWater:'🔥 Горячая вода',taharatSoap:'🧼 Мыло',taharatTowels:'🧻 Полотенца',taharatSlippers:'🩴 Тапочки',taharatNote:'Специально оборудованное место для омовения. Чистые условия, горячая вода, мыло и одноразовые полотенца.',loading:'Загрузка...',noReviewsYet:'Отзывов нет',loginTitle:'Добро пожаловать',loginNotice:'💬 Для отправки отзыва необходимо войти',tabLogin:'Войти',tabRegister:'Регистрация',loginAction:'Войти',registerAction:'Зарегистрироваться',adminLoginTitle:'🔐 Вход администратора',cancel:'Отмена'},
  uz:{search:'Hojatxona qidirish...',loginBtn:'→ Kirish',open:'Ochiq',closed:'Yopiq',free:"🆓 Bepul",paid:'Pullik',noReviews:'Sharhlar yoq',success:"✓ Sharhingiz qoshildi!",kmAway:'km uzoqda',mAway:'m uzoqda',findNearest:'Eng yaqin hojatxonani topish',addHint:"📍 Xaritaga bosing",distFallback:'(markazdan)',route:"Yo'nalish",writeReview:"Sharhingizni yozing...",submit:'Yuborish',leaveReview:'Sharh qoldirish',adminDenied:"Bu bo'lim faqat Toilet Advisor administratorlari uchun.",adminDeniedTitle:'Kirish taqiqlangan',adminDeniedBtn:'Admin sifatida kirish',profile:'Profil',profileSub:"Ma'lumotlarni ko'rish uchun kiring",profileAccount:'Hisob',profileRole:'Rol',profileLogout:"🚪 Hisobdan chiqish",profileLogin:"→ Kirish",profileAdmin:'Administrator',toiletAdded:"Hojatxona qo'shildi!",logAddedToilet:"Hojatxona qo'shdi",logLeftReview:'Sharh qoldirdi',logDeletedReview:"Sharhni o'chirdi",logLogin:'Tizimga kirish',logLogout:'Tizimdan chiqish',logRegister:"Yangi foydalanuvchi ro'yxatdan o'tdi",logAdminLogin:'Administrator kirishi',logToilet:'Hojatxona',logRating:'Baho',logUser:'Foydalanuvchi',logAdmin:'Administrator',toastGeoUnavail:'Geolokatsiya mavjud emas',toastNoPoints:"Xaritada nuqtalar yo'q",toastEnterReview:"Matn kiriting va baho qo'ying",toastReviewSaved:'Sharh mahalliy saqlandi',toastFillAll:"Barcha maydonlarni to'ldiring",toastUserNotFound:'Foydalanuvchi topilmadi',toastWrongPass:"Noto'g'ri parol",toastAlreadyReg:"Bu raqam allaqachon ro'yxatdan o'tgan",toastRegOk:"Ro'yxatdan o'tish muvaffaqiyatli",toastLoginOk:'Tizimga kirdingiz',toastAdminLoginOk:'Administrator sifatida kirdingiz',toastAdminNotFound:'Administrator topilmadi',toastLogout:'Tizimdan chiqdingiz',toastReviewDeleted:"Sharh o'chirildi",toastNeedAdmin:'Administrator huquqlari talab qilinadi',toastNoPlace:'Joy tanlanmagan',toastEnterTitle:'Nom kiriting',toastFirstPlace:"Avval xaritada joyni ko'rsating",toastNoPlaceMap:'Xaritada joyni tanlang',toastTimeout:'Vaqt tugadi. Internetni tekshiring.',toastOnline:'Ulanish tiklandi',soap:"Sabun",paper:"Qog'oz",accessible:'Imkoniyat',catAll:"🗺️ Hammasi",catTaharatkhana:'🕌 Tahoratxona',catFree:"🆓 Bepul",catSoap:"🧼 Sabun",catPaper:"🧻 Qog'oz",catAccessible:'♿ Qulay',navMap:'Xarita',navProfile:'Profil',reviews:'Sharhlar',reviewsTitle:'Sharhlar',authNotice:"🔒 Baho qoldirish uchun tizimga kiring",adminPanelTitle:'⚙️ Administrator paneli',adminAddPoint:"Nuqta qo'shish",adminAddPointSub:'Xaritaga yangi hojatxona qo\'shish',adminModeration:'Sharhlarni moderatsiya',adminModerationSub:"Foydalanuvchi sharhlarini ko'rish va o'chirish",adminLogs:'Harakatlar jurnali',adminLogsSub:'Barcha foydalanuvchi va administrator harakatlari',adminBack:"‹ Orqaga",adminModerationTitle:'Sharhlarni moderatsiya',adminLogsTitle:"📋 Harakatlar jurnali",logFilterAll:'Hammasi',logFilterReviews:'Sharhlar',logFilterToilets:'Hojatxonalar',logFilterAuth:'Kirishlar',logFilterAdmin:'Admin',wizStep1Title:"📍 Joyni ko'rsating",wizStep2Title:"✏️ Tavsif qo'shing",wizStep3Title:"🔍 Ma'lumotlarni tekshiring",wizMapSub:'Quyidagi tugmani bosing, keyin xaritada joyni tanlang',wizPickPlace:"Xaritada joyni ko'rsating",wizPickHint:"📍 Koordinatalarni ko'rsating — xaritani suring yoki ko'cha toping",wizPickSearch:"Ko'cha qidirish...",wizPickSelect:'Tanlash',wizCatSpecial:'Maxsus kategoriyalar',wizCatFeatures:'Xususiyatlar',wizTagTaharatkhana:'Tahoratxona',wizTagFree:'Bepul',wizTagOpen:'Ochiq',wizTagSoap:'Sabun',wizTagPaper:"Qog'oz",wizTagAccessible:'Qulay',wizTitlePlaceholder:'Hojatxona nomi',wizDescPlaceholder:'Tavsif (ixtiyoriy)',wizPrev:"← Orqaga",wizNext:"Keyingisi →",wizSave:'Saqlash',wizNew:'✨ Yangi',wizBack:"‹ Menyuga",taharatTitle:'🕌 Tahoratxona',taharatSub:'Namoz oldidan tahorat olish joyi',taharatHotWater:'🔥 Issiq suv',taharatSoap:'🧼 Sabun',taharatTowels:'🧻 Sochiqlar',taharatSlippers:'🩴 Shippaklar',taharatNote:'Tahorat olish uchun maxsus jihozlangan joy. Toza sharoit, issiq suv, sabun va bir martalik sochiqlar.',loading:'Yuklanmoqda...',noReviewsYet:"Sharhlar yo'q",loginTitle:'Xush kelibsiz',loginNotice:"💬 Sharh yuborish uchun tizimga kiring",tabLogin:'Kirish',tabRegister:"Ro'yxatdan o'tish",loginAction:'Kirish',registerAction:"Ro'yxatdan o'tish",adminLoginTitle:'🔐 Administrator kirishi',cancel:'Bekor qilish'},
  en:{search:'Search toilet...',loginBtn:'→ Login',open:'Open',closed:'Closed',free:'🆓 Free',paid:'Paid',noReviews:'No reviews yet',success:'✓ Review submitted!',kmAway:'km away',mAway:'m away',findNearest:'Find nearest toilet',addHint:'📍 Tap map to select location',distFallback:'(from center)',route:'Route',writeReview:'Write your review...',submit:'Submit',leaveReview:'Leave a review',adminDenied:'This section is for Toilet Advisor administrators only.',adminDeniedTitle:'Access restricted',adminDeniedBtn:'Login as Admin',profile:'Profile',profileSub:'Login to see your data',profileAccount:'Account',profileRole:'Role',profileLogout:'🚪 Logout',profileLogin:'→ Login',profileAdmin:'Administrator',toiletAdded:'Toilet added!',logAddedToilet:'Added toilet',logLeftReview:'Left a review',logDeletedReview:'Deleted review',logLogin:'Logged in',logLogout:'Logged out',logRegister:'New user registered',logAdminLogin:'Admin login',logToilet:'Toilet',logRating:'Rating',logUser:'User',logAdmin:'Administrator',toastGeoUnavail:'Geolocation unavailable',toastNoPoints:'No points on map',toastEnterReview:'Enter text and set a rating',toastReviewSaved:'Review saved locally, will sync when online',toastFillAll:'Please fill all fields',toastUserNotFound:'User not found',toastWrongPass:'Wrong password',toastAlreadyReg:'This number is already registered',toastRegOk:'Registration successful',toastLoginOk:'You are logged in',toastAdminLoginOk:'Logged in as administrator',toastAdminNotFound:'Administrator not found',toastLogout:'You have logged out',toastReviewDeleted:'Review deleted',toastNeedAdmin:'Admin rights required',toastNoPlace:'No place selected',toastEnterTitle:'Enter a name',toastFirstPlace:'First select a place on the map',toastNoPlaceMap:'Select a place on the map',toastTimeout:'Request timed out. Check your internet connection.',toastOnline:'Connection restored',soap:'Soap',paper:'Paper',accessible:'Accessible',catAll:'🗺️ All',catTaharatkhana:'🕌 Taharatkhana',catFree:'🆓 Free',catSoap:'🧼 Soap',catPaper:'🧻 Paper',catAccessible:'♿ Accessible',navMap:'Map',navProfile:'Profile',reviews:'Reviews',reviewsTitle:'Reviews',authNotice:'🔒 Please log in to leave a review',adminPanelTitle:'⚙️ Admin Panel',adminAddPoint:'Add Point',adminAddPointSub:'Add a new toilet to the map',adminModeration:'Review Moderation',adminModerationSub:'View and delete user reviews',adminLogs:'Activity Log',adminLogsSub:'All user and admin actions',adminBack:'‹ Back',adminModerationTitle:'Review Moderation',adminLogsTitle:'📋 Activity Log',logFilterAll:'All',logFilterReviews:'Reviews',logFilterToilets:'Toilets',logFilterAuth:'Logins',logFilterAdmin:'Admin',wizStep1Title:'📍 Select Location',wizStep2Title:'✏️ Add Details',wizStep3Title:'🔍 Review Data',wizMapSub:'Tap the button below, then select a location on the map',wizPickPlace:'Select on Map',wizPickHint:'📍 Set coordinates — move the map or find a street',wizPickSearch:'Search street...',wizPickSelect:'Select',wizCatSpecial:'Special Categories',wizCatFeatures:'Features',wizTagTaharatkhana:'Taharatkhana',wizTagFree:'Free',wizTagOpen:'Open',wizTagSoap:'Soap',wizTagPaper:'Paper',wizTagAccessible:'Accessible',wizTitlePlaceholder:'Toilet name',wizDescPlaceholder:'Description (optional)',wizPrev:'← Back',wizNext:'Next →',wizSave:'Save',wizNew:'✨ New',wizBack:'‹ Menu',taharatTitle:'🕌 Taharatkhana',taharatSub:'Ablution place before prayer',taharatHotWater:'🔥 Hot water',taharatSoap:'🧼 Soap',taharatTowels:'🧻 Towels',taharatSlippers:'🩴 Slippers',taharatNote:'A specially equipped place for ablution. Clean conditions, hot water, soap and disposable towels.',loading:'Loading...',noReviewsYet:'No reviews yet',loginTitle:'Welcome',loginNotice:'💬 Please log in to submit a review',tabLogin:'Log In',tabRegister:'Register',loginAction:'Log In',registerAction:'Register',adminLoginTitle:'🔐 Admin Login',cancel:'Cancel'}
};
function t(k){return(T[currentLang]||T.ru)[k]||(T.ru[k]||k);}
let currentLang=localStorage.getItem('ta_lang')||'ru';
let currentTheme=localStorage.getItem('ta_theme')||'light';
let currentUser=null,allToilets=[],currentCat='all';
let selectedToilet=null,reviewRating=0,authTab='login';
let addCoords=null,myMap=null,searchTimer=null;
let userCoords=null,userPlacemark=null;
try{const s=localStorage.getItem('ta_user');if(s)currentUser=JSON.parse(s);}catch(e){}
</script>

<!-- JS модули -->
<script src="js/firebase.js"></script>
<script src="js/ui.js"></script>
<script src="js/map.js"></script>
<script src="js/sheet.js"></script>
<script src="js/favorites.js"></script>
<script src="js/profile.js"></script>
<script src="js/admin.js"></script>

<script>
// ── ИНИЦИАЛИЗАЦИЯ ──
// Поиск и чипы категорий
document.getElementById('searchInput').addEventListener('input',function(){
  clearTimeout(searchTimer);searchTimer=setTimeout(renderMarkers,300);
});
document.querySelectorAll('.catChip').forEach(chip=>{
  chip.addEventListener('click',function(){
    if(this.classList.contains('active')&&this.dataset.cat!=='all'){
      document.querySelectorAll('.catChip').forEach(c=>c.classList.remove('active'));
      document.querySelector('.catChip[data-cat="all"]').classList.add('active');
      currentCat='all';
    } else {
      document.querySelectorAll('.catChip').forEach(c=>c.classList.remove('active'));
      this.classList.add('active');
      currentCat=this.dataset.cat;
    }
    renderMarkers();
  });
});

// Онлайн/офлайн
window.addEventListener('online',()=>{hideOfflineBanner();showToast(t('toastOnline'));loadToilets();});
window.addEventListener('offline',()=>showOfflineBanner());
if(!navigator.onLine)showOfflineBanner();

// Размер контролов при старте и ресайзе
window.addEventListener('load',()=>{setTimeout(()=>{adjustControlsPosition();},400);});
window.addEventListener('resize',()=>{adjustControlsPosition();});

// Патч адресов seed-точек
async function _patchSeedAddresses(){
  try{
    await _loadFirebase();
    const batch=db.batch();
    let hasChanges=false;
    for(const toilet of FALLBACK_TOILETS){
      if(!toilet.addr)continue;
      const local=allToilets.find(x=>x.id===toilet.id);
      if(local&&!local.addr)local.addr=toilet.addr;
      try{
        const doc=await db.collection('toilets').doc(toilet.id).get();
        if(doc.exists&&!doc.data().addr){batch.update(db.collection('toilets').doc(toilet.id),{addr:toilet.addr});hasChanges=true;}
      }catch(e){}
    }
    if(hasChanges)await batch.commit();
  }catch(e){console.warn('_patchSeedAddresses:',e.message);}
}

// Старт
setLang(currentLang);
applyTheme();
updateLoginBtn();
switchTab('map');
_syncUserNick();
_patchSeedAddresses();

// Начальное состояние профиля
(function(){
  const guest=document.getElementById('pGuestView');
  const user=document.getElementById('pUserView');
  if(!guest||!user)return;
  if(currentUser){guest.style.display='none';user.style.display='flex';}
  else{guest.style.display='flex';user.style.display='none';}
})();
</script>
'@

$result = $before + $inject.Split("`n") + $after
[System.IO.File]::WriteAllLines($file, $result, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done. Lines: $($result.Length)"
