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
