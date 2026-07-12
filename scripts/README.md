# scripts/

Инструментальные скрипты — **не являются частью сайта** и не деплоятся на GitHub Pages.

## seed.js — инициализация Firestore

Создаёт admin-аккаунты и записывает 7 начальных туалетов.

### Запуск

```bash
cd scripts
npm install
node seed.js
```

### Требования

Файл `serviceAccountKey.json` должен лежать в **корне проекта** (на уровень выше `scripts/`).

Скачать: Firebase Console → Project settings (шестерёнка) → Service accounts → Generate new private key.

> `serviceAccountKey.json` добавлен в `.gitignore` — никогда не коммитится.
