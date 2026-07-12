# ToiletAdvisor — Техническая документация
> Для разработчика. Подробное описание архитектуры, всех функций и логики работы.

---

## 1. Обзор проекта

**ToiletAdvisor** — прогрессивное веб-приложение (PWA) для поиска общественных туалетов в Ташкенте.
Работает полностью в браузере без серверного рендеринга. Хостинг — GitHub Pages (статика).
База данных — Firebase Firestore (облако Google).

**Стек:**
- Vanilla JS (без фреймворков — чистый JavaScript)
- Яндекс.Карты API 2.1 (карта, маркеры, геолокация)
- Firebase Firestore (база данных в реальном времени)
- Nominatim / OpenStreetMap (геокодирование — координаты → адрес)
- CSS Custom Properties (дизайн-токены, тема)
- GitHub Actions (CI/CD — автодеплой на GitHub Pages при push в main)

**Деплой:** при каждом `git push` в ветку `main` GitHub Actions автоматически публикует сайт.
Скрипты (`scripts/`) и сервер (`server/`) при деплое удаляются — на сервер уходит только фронтенд.

---

## 2. Структура файлов

```
ToiletAdvisor/
├── index.html              — единственная HTML-страница, всё приложение внутри
├── manifest.json           — конфигурация PWA (иконка, цвет, название)
├── icon.png                — иконка приложения
├── .nojekyll               — отключает Jekyll-обработку на GitHub Pages
│
├── css/
│   ├── base.css            — сброс стилей, CSS-переменные (токены), карта, хедер, навбар
│   ├── sheet.css           — нижняя шторка туалета (drag, анимация, контент)
│   ├── modals.css          — модальные окна (вход, регистрация, admin login)
│   ├── profile.css         — экран профиля, избранное, карточки статистики
│   ├── admin.css           — панель администратора (дашборд, субвью, статистика, логи)
│   └── ui.css              — утилиты: скелетоны, кнопки Обновить/Назад, тосты, офлайн-баннер
│
├── js/
│   ├── constants.js        — константы, seed-туалеты, переводы (RU/UZ/EN)
│   ├── firebase.js         — инициализация Firebase, hashPassword
│   ├── ui.js               — тема, язык, тосты, скелетоны, офлайн-баннер, runRefresh
│   ├── map.js              — карта, маркеры, геолокация, геокодирование
│   ├── sheet.js            — шторка туалета, отзывы, кэш отзывов (stale-while-revalidate)
│   ├── favorites.js        — избранное: localStorage + Firestore, renderFavorites
│   ├── profile.js          — авторизация, профиль, кэш пользователей, saveNick, табы
│   ├── admin.js            — панель admin: визард добавления, модерация, логи, статистика
│   └── init.js             — глобальные переменные, старт приложения, патч ников/адресов
│
├── server/                 — Express.js сервер (только для локальной разработки)
│   ├── server.js
│   ├── data/               — JSON-файлы с локальными данными
│   └── package.json
│
├── scripts/                — вспомогательные скрипты (seed, патчи)
│
└── .github/workflows/
    └── deploy.yml          — GitHub Actions: автодеплой на Pages
```

---

## 3. Порядок загрузки скриптов

Скрипты в `index.html` подключены в строгом порядке — каждый следующий зависит от предыдущего:

```
constants.js   → глобальные константы, переводы (T{}), FALLBACK_TOILETS
firebase.js    → _loadFirebase(), hashPassword()
ui.js          → showToast(), setLang(), _skCards(), runRefresh()
map.js         → ymaps.ready(initMap), loadToilets(), renderMarkers()
sheet.js       → openSheet(), getReviews(), submitReview(), _reviewsCache
favorites.js   → toggleFavorite(), renderFavorites(), _isBadAddr()
profile.js     → _usersCache, doAuth(), saveNick(), switchTab()
admin.js       → визард, модерация, логи, статистика
init.js        → глобальные переменные состояния, старт приложения
```

**Важно:** `init.js` идёт последним — к этому моменту все функции уже объявлены.
Глобальные переменные (`currentUser`, `allToilets`, `myMap` и т.д.) объявлены в `init.js` и доступны из всех файлов.

---

## 4. Глобальные переменные состояния (init.js)

| Переменная | Тип | Что хранит |
|-----------|-----|-----------|
| `currentUser` | Object\|null | Залогиненный пользователь: `{id, phone/login, role, nick}`. Сохраняется в localStorage как `ta_user`. |
| `allToilets` | Array | Все туалеты загруженные из Firestore. Используется для рендера маркеров и шторки. |
| `currentCat` | String | Активная категория фильтра: `'all'`, `'free'`, `'soap'`, `'paper'`, `'accessible'`, `'taharatkhana'`. |
| `currentLang` | String | Текущий язык: `'ru'`, `'uz'`, `'en'`. Сохраняется в localStorage как `ta_lang`. |
| `currentTheme` | String | Тема: `'light'` или `'dark'`. Сохраняется в localStorage как `ta_theme`. |
| `selectedToilet` | Object\|null | Туалет открытый в шторке в данный момент. |
| `reviewRating` | Number | Выбранная звёздочка при написании отзыва (1–5). |
| `myMap` | Object\|null | Экземпляр карты Яндекс.Карты. |
| `userCoords` | Array\|null | Координаты пользователя `[lat, lon]` от GPS. |
| `wizCoords` | Array\|null | Координаты выбранные в визарде добавления туалета. |
| `isSheetOpen` | Boolean | Открыта ли нижняя шторка. |
| `wizPickMode` | Boolean | Активен ли режим выбора места на карте в визарде. |

---

## 5. База данных Firestore — структура коллекций

### 5.1 `toilets/{id}`
```js
{
  title:         String,   // "Туалет в ТРЦ Next"
  addr:          String,   // "проспект Амира Темура, 108"
  description:   String,   // краткое описание
  lat:           Number,   // широта
  lon:           Number,   // долгота
  isOpen:        Boolean,  // сейчас открыт?
  isFree:        Boolean,  // бесплатный?
  hasSoap:       Boolean,  // есть мыло?
  hasPaper:      Boolean,  // есть бумага?
  isAccessible:  Boolean,  // доступно для людей с ограниченными возможностями?
  isTaharatkhana:Boolean,  // место для омовения (тахаратхана)?
  photo:         String,   // URL фото (пока пустая строка)
  addedBy:       String,   // userId кто добавил
  createdAt:     String,   // ISO-дата создания
}
```

### 5.2 `reviews/{id}`
```js
{
  toiletId:  String,   // ID туалета
  userId:    String,   // ID пользователя
  userPhone: String,   // отображаемое имя (ник, телефон или логин)
  rating:    Number,   // 1–5
  text:      String,   // текст отзыва
  createdAt: String,   // ISO-дата
}
```

### 5.3 `users/{id}`
```js
// Обычный пользователь
{
  phone:        String,   // "+998901234567"
  passwordHash: String,   // SHA-256 хэш пароля
  nick:         String,   // никнейм (опционально)
  role:         String,   // "user"
  createdAt:    String,
}
// Администратор
{
  login:        String,   // логин (не телефон)
  passwordHash: String,
  nick:         String,   // "Admin(Amal)"
  role:         String,   // "admin"
  createdAt:    String,
}
```

### 5.4 `users/{userId}/favorites/{toiletId}`
```js
// Подколлекция — у каждого пользователя своя
{
  id:    String,   // = toiletId
  title: String,   // название туалета (денормализованное — копия из toilets)
  addr:  String,   // адрес (денормализованное)
  lat:   Number,
  lon:   Number,
}
```
> **Денормализация** — данные дублируются специально, чтобы не делать лишний запрос к `toilets` при загрузке избранного. Минус: при изменении данных туалета нужно обновлять и в favorites.

### 5.5 `logs/{id}`
```js
{
  type:       String,   // 'review', 'toilet', 'delete', 'auth', 'admin', 'fav'
  category:   String,   // то же самое (для фильтрации)
  action:     String,   // человекочитаемое действие: "Добавил туалет"
  detail:     String,   // подробности: название туалета, текст отзыва и т.д.
  actorId:    String,   // userId кто сделал
  actorName:  String,   // телефон/логин актора
  actorNick:  String,   // ник актора
  actorRole:  String,   // 'user' или 'admin'
  createdAt:  String,   // ISO-дата
}
```

---

## 6. Модуль firebase.js

**`_loadFirebase()`**
Ленивая инициализация Firebase — вызывается перед каждым обращением к базе.
Инициализирует приложение только один раз (`_fbInitialized` флаг), возвращает `Promise.resolve()`.
После вызова доступна глобальная переменная `db` — объект Firestore.

**`hashPassword(pass)`**
SHA-256 хэш пароля через Web Crypto API (`crypto.subtle.digest`).
Результат кэшируется в `_hashCache` чтобы не пересчитывать одно и то же.
Пароли в базе хранятся ТОЛЬКО в виде хэша — в открытом виде никогда.

**Важно:** Firebase API Key в коде — это `Web API Key`, он публичный по замыслу Firebase.
Реальная защита — Firestore Security Rules, а не скрытие ключа.

---

## 7. Модуль map.js

### 7.1 Инициализация карты
`ymaps.ready(initMap)` — запускается когда Яндекс.Карты загружены.
`initMap()` создаёт карту с центром в Ташкенте, скрывает все стандартные контролы Яндекса
через `hideYandexUI()` (MutationObserver — следит за новыми элементами и прячет их).

### 7.2 loadToilets()
1. `_loadFirebase()` — инициализация Firebase
2. `db.collection('toilets').get()` — загружаем все туалеты
3. Если коллекция пустая — записываем `FALLBACK_TOILETS` (seed-данные из constants.js)
4. `renderMarkers()` — рисуем маркеры на карте
5. `_geocodeMissingAddresses()` — фоновое геокодирование точек без адреса

### 7.3 renderMarkers()
Фильтрует `allToilets` по поисковому запросу и активной категории.
Для каждой точки создаёт `ymaps.Placemark` с SVG-иконкой:
- Обычный туалет: зелёный (открыт) или красный (закрыт) пин с эмодзи 🚻
- Тахаратхана: золотой пин с эмодзи 🕌

Иконки генерируются динамически через `pinSVG()` и `mosqueSVG()`.
Цвет пина вычисляется через `lighten(hex, amount)` — функция осветления hex-цвета.

### 7.4 _geocodeMissingAddresses()
Запускается после `loadToilets`. Находит точки где `addr` пустой или содержит координаты
вместо адреса. Для каждой вызывает `wizGeocode(lat, lon)` с задержкой **1100ms** между
запросами (rate limit Nominatim = 1 req/sec).
При успехе: обновляет `toilet.addr` в памяти, сохраняет в Firestore, обновляет в избранном.

### 7.5 Геолокация
`startGeo()` — запускает `navigator.geolocation.watchPosition()`, непрерывно отслеживает
позицию пользователя. Обновляет `userCoords` и рисует синюю точку `userPlacemark`.
`goToMyLocation()` — анимированный полёт к позиции пользователя, zoom 16.
`findNearest()` — haversine-формула для поиска ближайшего туалета.
