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

---

## 8. Модуль sheet.js — нижняя шторка туалета

### 8.1 openSheet(toilet)
Главная функция открытия карточки туалета. Порядок работы:

1. Заполняет статичные данные (название, адрес, теги, тахаратхана, описание) — **синхронно, без задержки**
2. Показывает кэшированные отзывы из `_reviewsCache` мгновенно если они есть
3. Если кэша нет — показывает скелетон (заглушку-анимацию)
4. Открывает шторку (CSS `classList.add('open')`)
5. Обновляет сердечко из localStorage мгновенно
6. Запускает `getReviews(id, onFresh)` — stale-while-revalidate загрузка

### 8.2 Кэш отзывов — Stale-While-Revalidate

```
_reviewsCache = {}          — in-memory кэш (живёт пока страница открыта)
localStorage ta_rv_{id}     — persistent кэш (живёт между сессиями, TTL 5 минут)
```

**Алгоритм getReviews(id, onFresh):**
```
Если кэш свежий (< 5 минут):
  → Возвращаем кэш НЕМЕДЛЕННО
  → Фоново идём в Firestore
  → Если данные изменились (id+userPhone+rating+text) → вызываем onFresh(reviews)

Если кэша нет или устарел:
  → Идём в Firestore, ждём
  → Сохраняем в кэш
  → Возвращаем
```

**_fetchReviewsFromFirestore(id):**
Пробует запрос с `orderBy('createdAt', 'desc')`. Если Firestore не может выполнить
(нет составного индекса) — делает запрос без сортировки как fallback.

### 8.3 Рендер отзывов — renderReviews(reviews)
Для каждого отзыва: вызывает `_getActualName(userId, fallback)` — берёт ник из `_usersCache`.
Генерирует HTML с аватаром (инициалы), звёздами, датой, текстом.
`formatReviewText(text)` — заменяет `\n` на `<br>`, обрезает длинные ссылки.

### 8.4 Форма отзыва
`resetReviewForm()` — сбрасывает звёзды и текст.
Звёзды: клик по `.starBtn` ставит `reviewRating`, подсвечивает нужное количество.
`submitReview()`:
1. Проверяет авторизацию и что выбрана звёзда
2. Создаёт `optimistic` объект — добавляет отзыв в DOM немедленно
3. Имя берёт из `currentUser.nick || phone || login`
4. Вызывает `_getActualName()` для финального имени из кэша
5. Сохраняет в Firestore
6. При ошибке — удаляет оптимистичный элемент, показывает ошибку
7. Инвалидирует кэш отзывов для этой точки

### 8.5 Drag-to-dismiss шторки
Touch events на `#sDragZone`: отслеживает `touchstart/touchmove/touchend`.
Если свайп вниз > 80px — закрывает шторку. Менее 80px — пружинит обратно.

### 8.6 _saveReviewsToStorage(toiletId, data)
Сохраняет отзывы в localStorage. При `QuotaExceededError` (хранилище переполнено) —
очищает все кэши отзывов (`ta_rv_*`) и повторяет попытку.

---

## 9. Модуль favorites.js — избранное

### 9.1 Хранение

```
localStorage ta_fav_{userId}     — быстрый кэш, ответ мгновенный
Firestore users/{id}/favorites/  — источник правды, синхронизируется фоново
```

Структура в обоих местах одинакова: `{id, title, addr, lat, lon}`.

### 9.2 Ключевые функции

**`getFavorites()`** — читает из localStorage синхронно, возвращает массив.

**`toggleFavorite(toiletId)`**
- Если туалет уже в избранном → удаляет из localStorage + `_removeFavFromFirestore()` (fire-and-forget)
- Если нет → проверяет адрес через `_isBadAddr()`, при необходимости геокодирует →
  добавляет в localStorage + `_addFavToFirestore()` (fire-and-forget)
- В обоих случаях мгновенно обновляет UI: `updateFavBtn()`, `renderFavorites()`

**`_loadFavoritesFromFirestore()`** — загружает избранное из Firestore фоново.
Сравнивает состав с localStorage. Если состав отличается — перерисовывает список.
Если localStorage пустой а Firestore нет — синхронизирует localStorage из Firestore.
Если наоборот — заливает localStorage в Firestore.

**`renderFavorites()`** — рендерит список избранного в профиле.
Каждый элемент получает `data-fav-id` атрибут для надёжного DOM-поиска.
Если `allToilets` ещё не загружен — показывает скелетон и повторяет попытку (max 3 раза).
После рендера запускает `_fixFavAddresses(favs)`.

**`_isBadAddr(addr, desc)`** — проверяет адрес на корректность:
- пустой → плохой
- `"Нет адреса"` или `"—"` → плохой
- совпадает с description туалета → плохой
- выглядит как координаты `"41.308, 69.259"` → плохой

**`_fixFavAddresses(favs)`** — проходит по элементам избранного у которых плохой адрес,
геокодирует через Nominatim. Обновляет адрес в DOM по `data-fav-id`,
в localStorage и в Firestore. Защищён флагом `_fixFavRunning` от параллельных запусков.

---

## 10. Модуль profile.js — авторизация и профиль

### 10.1 Кэш пользователей

```
_usersCache = {}                — in-memory словарь: {userId: {nick, phone, login, role}}
localStorage ta_users_cache     — persistent кэш с TTL 30 минут
```

**При старте страницы** (IIFE в начале файла): мгновенно восстанавливает кэш из localStorage
если он свежий. Это позволяет показывать ники в отзывах без ожидания сетевого запроса.

**`_loadUsersCache({forceRefresh})`** — загружает всех пользователей из Firestore.
Защита от параллельных вызовов: если уже идёт загрузка → возвращает тот же Promise.
При успехе сохраняет в `_usersCache` и в localStorage.

**`_invalidateUsersCache()`** — сбрасывает кэш и запускает новую загрузку.
Вызывается после `saveNick` чтобы новый ник распространился везде.

**`_getActualName(userId, fallback)`** — возвращает имя для отображения.
Приоритет: `nick > phone > login > fallback > 'Пользователь'`

### 10.2 Авторизация

**`doAuth()`** — вход или регистрация по телефону:
- `login`: ищет в Firestore по телефону, проверяет хэш пароля, создаёт `currentUser`
- `register`: проверяет что телефон не занят, создаёт документ в Firestore, добавляет в кэш

**`doAdminLogin()`** — вход по логин/пароль:
- Race с таймаутом 8 сек (защита от зависания)
- Ищет по полям `login` И `role === 'admin'`
- После входа обновляет запись в `_usersCache`
- Флаг `_adminLoginInProgress` защищает от двойного клика

**`doLogout()`** — очищает `currentUser` из localStorage, переключает на карту.

### 10.3 saveNick(nick)
1. Проверяет изменился ли ник (если нет — выходит сразу, не делает запросы)
2. Обновляет `currentUser`, localStorage, `_usersCache` синхронно
3. Обновляет в Firestore: `users/{id}` → set nick
4. Если ник непустой → batch-обновление отзывов и логов пользователя
5. Инвалидирует кэш отзывов и пользователей
6. Toast-уведомление "Ник сохранён ✓"

### 10.4 switchTab(tab)
Переключатель между тремя экранами: `map`, `add` (admin), `profile`.
Управляет видимостью хедера, контролов карты, экранов.
При `add`: проверяет роль — `admin` видит панель, остальные видят экран блокировки.
При `profile`: вызывает `loadProfile()`.

---

## 11. Модуль admin.js — панель администратора

### 11.1 Структура навигации

```
adminDashboard          — главный экран с 4 кнопками
  ├── adminSubAddForm   — визард добавления туалета (3 шага)
  ├── adminSubModeration — список всех отзывов с удалением
  ├── adminSubLogs      — журнал действий с фильтрами
  └── adminSubStats     — статистика (точки / пользователи)
```

`showAdminSubview(id)` — скрывает дашборд, показывает нужный субвью.
`showAdminDashboard()` — возврат на главный экран, сброс состояния визарда.

### 11.2 Визард добавления туалета (3 шага)

**Шаг 1 — Выбор места:**
`wizStartPickLocation()` — активирует режим `wizPickMode`. Прячет навбар.
Показывает оверлей с поиском улицы и пином в центре экрана.
Поиск (`wizDoSearch`) — Nominatim geocoding по тексту, результаты в выпадающем списке.
Пин следует за центром карты. `wizScheduleGeocode()` — через 700ms после остановки карты
запрашивает обратное геокодирование для обновления адреса в плашке снизу.
`wizConfirmLocation()` — фиксирует центр карты как `wizCoords`.

**Шаг 2 — Заполнение:**
Название и описание в авторастягивающихся textarea.
Теги-тоглы: `isTaharatkhana`, `isFree`, `isOpen`, `hasSoap`, `hasPaper`, `isAccessible`.

**Шаг 3 — Подтверждение:**
`wizFillConfirm()` — заполняет превью-карточку данными из шагов 1-2.
Превью выглядит как настоящая шторка туалета.
`wizSaveToilet()` — сохраняет в Firestore, перезагружает туалеты, логирует действие.

### 11.3 Модерация отзывов (loadModerationReviews)
Загружает 50 последних отзывов, для каждого подгружает данные туалета.
Туалеты которых нет в `allToilets` — загружаются отдельными запросами (`extraToilets`).
Кнопка удаления: `deleteReview(id, btn)` — удаляет из Firestore, убирает элемент из DOM.

### 11.4 Журнал действий (loadActivityLogs)
Загружает 200 последних логов. Фильтры по категории — клиентская фильтрация `_allLogs`.
`renderLogs()` — рендерит отфильтрованный список.
`_getActualName(actorId, fallback)` — для каждой записи берёт актуальный ник из кэша.

### 11.5 Статистика (loadAdminStats)
Параллельно грузит туалеты, пользователей, отзывы через `Promise.all`.
Дедупликация пользователей: аккаунты с одинаковым телефоном без ника и без отзывов
схлопываются в один — чтобы seed-дубликаты не портили счётчик.
Две вкладки: "Точки" и "Пользователи". Переключение — `switchStatsTab()`.

### 11.6 logAction({type, category, action, detail})
Записывает действие в коллекцию `logs`. Fire-and-forget — не блокирует UI.
Записывает актора из `currentUser`: id, name, nick, role.

---

## 12. Модуль ui.js — утилиты интерфейса

### 12.1 Система тостов (всплывающих уведомлений)
`showToast(msg)` — анализирует текст сообщения и определяет тип:
- `success` (зелёный) — "добавлен", "успеш", "вошли", "регистр", ✓
- `error` (красный) — "ошибка", "неверн", "не найден"
- `warn` (жёлтый) — "введите", "заполните", "укажите"
- `info` (синий) — всё остальное

Тосты появляются сверху с анимацией, исчезают через 2200ms.
Можно закрыть кнопкой ×. Несколько тостов стекаются.

### 12.2 Тема
`toggleTheme()` — переключает класс `body.dark`, сохраняет в localStorage.
`applyMapTheme()` — применяет CSS-фильтр к слою карты для тёмной темы:
`invert(0.9) hue-rotate(180deg) saturate(0.7) brightness(0.85)`.

### 12.3 Мультиязычность
`setLang(l)` — устанавливает `currentLang`, обновляет все текстовые элементы в DOM
через функцию `t(key)` которая берёт строку из объекта `T[currentLang][key]`.
Переводы для RU, UZ, EN хранятся в `constants.js` в объекте `T`.

### 12.4 Скелетоны
`_skCards(n)` — n карточек-заглушек с анимацией shimmer для общих списков.
`_skFavCards(n)` — заглушки для избранного.
`_skStatSummary()` — заглушки для карточек статистики.
Анимация `skeletonShimmer` — движущийся градиент создаёт эффект загрузки.

### 12.5 runRefresh(btn, fn)
Обёртка для кнопки "Обновить". Добавляет класс `loading` (opacity 0.5),
вызывает `fn()`, убирает `loading`. Страховочный таймаут 15 сек.
