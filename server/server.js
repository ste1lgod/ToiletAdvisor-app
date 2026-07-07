const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const JWT_SECRET = 'findtoilet_secret_key_2026';

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TOILETS_FILE = path.join(DATA_DIR, 'toilets.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');

app.use(cors());
app.use(express.json());

// ============================================================
//  SEED DATA — точки Ташкента (восстанавливаются при пустом файле)
// ============================================================
const SEED_TOILETS = [
    {
        id: 'seed-0001-tashkent-city-mall',
        lat: 41.2956, lon: 69.2797,
        title: 'Туалет в Tashkent City Mall',
        description: 'Чистый туалет на 1-м этаже ТРЦ Tashkent City Mall, рядом с фуд-кортом',
        photo: '', isOpen: true, isFree: true, hasSoap: true, hasPaper: true,
        isAccessible: true, isTaharatkhana: false,
        addedBy: 'system', createdAt: '2026-07-07T10:00:00.000Z'
    },
    {
        id: 'seed-0002-masjid-minor',
        lat: 41.2871, lon: 69.2768,
        title: 'Тахаратхана у мечети Минор',
        description: 'Место для омовения при мечети Минор. Горячая вода, мыло, тапочки',
        photo: '', isOpen: true, isFree: true, hasSoap: true, hasPaper: false,
        isAccessible: false, isTaharatkhana: true,
        addedBy: 'system', createdAt: '2026-07-07T10:01:00.000Z'
    },
    {
        id: 'seed-0003-railway-station',
        lat: 41.3174, lon: 69.2870,
        title: 'Туалет на вокзале Ташкент-Главный',
        description: 'Платный туалет в здании главного железнодорожного вокзала',
        photo: '', isOpen: true, isFree: false, hasSoap: true, hasPaper: true,
        isAccessible: true, isTaharatkhana: false,
        addedBy: 'system', createdAt: '2026-07-07T10:02:00.000Z'
    },
    {
        id: 'seed-0004-navoi-park',
        lat: 41.3058, lon: 69.2714,
        title: 'Туалет в парке Алишера Навои',
        description: 'Общественный туалет в центральной части парка Навои',
        photo: '', isOpen: true, isFree: true, hasSoap: false, hasPaper: true,
        isAccessible: false, isTaharatkhana: false,
        addedBy: 'system', createdAt: '2026-07-07T10:03:00.000Z'
    },
    {
        id: 'seed-0005-khastimom',
        lat: 41.3276, lon: 69.2623,
        title: 'Тахаратхана в мечети Хастимом',
        description: 'Тахаратхана при соборной мечети Хасти-Имом, рядом с медресе',
        photo: '', isOpen: true, isFree: true, hasSoap: true, hasPaper: false,
        isAccessible: false, isTaharatkhana: true,
        addedBy: 'system', createdAt: '2026-07-07T10:04:00.000Z'
    },
    {
        id: 'seed-0006-next-mall',
        lat: 41.3376, lon: 69.2841,
        title: 'Туалет в ТРЦ Next',
        description: 'Туалет на 2-м этаже торгового центра Next на Юнусабаде',
        photo: '', isOpen: true, isFree: true, hasSoap: true, hasPaper: true,
        isAccessible: true, isTaharatkhana: false,
        addedBy: 'system', createdAt: '2026-07-07T10:05:00.000Z'
    },
    {
        id: 'seed-0007-broadway',
        lat: 41.2983, lon: 69.2717,
        title: 'Туалет на Broadway (пешеходная зона)',
        description: 'Общественный платный туалет на пешеходной улице Сайилгох (Broadway)',
        photo: '', isOpen: true, isFree: false, hasSoap: true, hasPaper: true,
        isAccessible: false, isTaharatkhana: false,
        addedBy: 'system', createdAt: '2026-07-07T10:06:00.000Z'
    }
];

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ ФАЙЛОВ
// ============================================================
function initDataFiles() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
    if (!fs.existsSync(REVIEWS_FILE)) fs.writeFileSync(REVIEWS_FILE, JSON.stringify([], null, 2));

    // Если файл туалетов отсутствует или пустой — загружаем seed-данные
    if (!fs.existsSync(TOILETS_FILE)) {
        fs.writeFileSync(TOILETS_FILE, JSON.stringify(SEED_TOILETS, null, 2));
        console.log(`✅ Загружено ${SEED_TOILETS.length} начальных точек`);
    } else {
        const existing = JSON.parse(fs.readFileSync(TOILETS_FILE));
        if (existing.length === 0) {
            fs.writeFileSync(TOILETS_FILE, JSON.stringify(SEED_TOILETS, null, 2));
            console.log(`✅ Файл туалетов был пустым — восстановлено ${SEED_TOILETS.length} точек`);
        } else {
            // Добавляем seed-точки если их ещё нет (по id)
            const existingIds = new Set(existing.map(t => t.id));
            const missing = SEED_TOILETS.filter(t => !existingIds.has(t.id));
            if (missing.length > 0) {
                const merged = [...missing, ...existing];
                fs.writeFileSync(TOILETS_FILE, JSON.stringify(merged, null, 2));
                console.log(`✅ Добавлено ${missing.length} недостающих seed-точек`);
            }
        }
    }

    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    const adminExists = users.find(u => u.role === 'admin');
    if (!adminExists) {
        const adminPasswordHash = bcrypt.hashSync('admin123', 10);
        users.push({
            id: uuidv4(),
            login: 'admin',
            passwordHash: adminPasswordHash,
            role: 'admin',
            createdAt: new Date().toISOString()
        });
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        console.log('✅ Администратор создан: логин "admin", пароль "admin123"');
    }
}

function readJSON(filePath) {
    return JSON.parse(fs.readFileSync(filePath));
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ============================================================
//  MIDDLEWARE
// ============================================================
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Неверный или истёкший токен' });
    }
}

function adminMiddleware(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещён. Требуются права администратора' });
    }
    next();
}

// ============================================================
//  МАРШРУТЫ
// ============================================================

// ---- Регистрация ----
app.post('/api/register', (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) {
        return res.status(400).json({ error: 'Номер телефона и пароль обязательны' });
    }
    if (password.length < 4) {
        return res.status(400).json({ error: 'Пароль должен быть не менее 4 символов' });
    }

    const users = readJSON(USERS_FILE);
    if (users.find(u => u.phone === phone)) {
        return res.status(409).json({ error: 'Пользователь с таким номером уже зарегистрирован' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser = {
        id: uuidv4(),
        phone: phone,
        passwordHash: passwordHash,
        role: 'user',
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeJSON(USERS_FILE, users);

    const token = jwt.sign(
        { id: newUser.id, phone: newUser.phone, role: newUser.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.status(201).json({
        message: 'Регистрация успешна',
        token: token,
        user: { id: newUser.id, phone: newUser.phone, role: newUser.role }
    });
});

// ---- Вход пользователя ----
app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) {
        return res.status(400).json({ error: 'Номер телефона и пароль обязательны' });
    }

    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.phone === phone);
    if (!user) {
        return res.status(401).json({ error: 'Неверный номер телефона или пароль' });
    }

    if (!bcrypt.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Неверный номер телефона или пароль' });
    }

    const token = jwt.sign(
        { id: user.id, phone: user.phone, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({
        message: 'Вход выполнен',
        token: token,
        user: { id: user.id, phone: user.phone, role: user.role }
    });
});

// ---- Вход администратора ----
app.post('/api/admin/login', (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) {
        return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    const users = readJSON(USERS_FILE);
    const admin = users.find(u => u.login === login && u.role === 'admin');
    if (!admin) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    if (!bcrypt.compareSync(password, admin.passwordHash)) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const token = jwt.sign(
        { id: admin.id, login: admin.login, role: admin.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.json({
        message: 'Вход администратора выполнен',
        token: token,
        user: { id: admin.id, login: admin.login, role: admin.role }
    });
});

// ---- Получить текущего пользователя ----
app.get('/api/user/me', authMiddleware, (req, res) => {
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ id: user.id, phone: user.phone, role: user.role });
});

// ---- Получить все туалеты ----
app.get('/api/toilets', (req, res) => {
    const toilets = readJSON(TOILETS_FILE);
    res.json(toilets);
});

// ---- Добавить туалет (админ) ----
app.post('/api/toilets', authMiddleware, adminMiddleware, (req, res) => {
    const {
        lat, lon, title, description, photo,
        isOpen, isFree, hasSoap, hasPaper, isAccessible, isTaharatkhana
    } = req.body;

    if (!lat || !lon || !title) {
        return res.status(400).json({ error: 'Координаты и название обязательны' });
    }

    const toilets = readJSON(TOILETS_FILE);
    const newToilet = {
        id: uuidv4(),
        lat,
        lon,
        title,
        description: description || '',
        photo: photo || '',
        isOpen: isOpen !== undefined ? isOpen : true,
        isFree: isFree !== undefined ? isFree : true,
        hasSoap: hasSoap || false,
        hasPaper: hasPaper || false,
        isAccessible: isAccessible || false,
        isTaharatkhana: isTaharatkhana || false,
        addedBy: req.user.id,
        createdAt: new Date().toISOString()
    };

    toilets.push(newToilet);
    writeJSON(TOILETS_FILE, toilets);

    res.status(201).json(newToilet);
});

// ---- Удалить туалет (админ) ----
app.delete('/api/toilets/:id', authMiddleware, adminMiddleware, (req, res) => {
    const toilets = readJSON(TOILETS_FILE);
    const index = toilets.findIndex(t => t.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Туалет не найден' });
    }

    toilets.splice(index, 1);
    writeJSON(TOILETS_FILE, toilets);

    // Удаляем отзывы к этому туалету
    const reviews = readJSON(REVIEWS_FILE);
    const filteredReviews = reviews.filter(r => r.toiletId !== req.params.id);
    writeJSON(REVIEWS_FILE, filteredReviews);

    res.json({ message: 'Туалет удалён' });
});

// ---- Получить отзывы для туалета ----
app.get('/api/reviews/:toiletId', (req, res) => {
    const reviews = readJSON(REVIEWS_FILE);
    const toiletReviews = reviews.filter(r => r.toiletId === req.params.toiletId);
    res.json(toiletReviews);
});

// ---- Добавить отзыв ----
app.post('/api/reviews', authMiddleware, (req, res) => {
    const { toiletId, text, rating } = req.body;
    if (!toiletId || !text || !rating) {
        return res.status(400).json({ error: 'toiletId, text и rating обязательны' });
    }
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
    }

    const reviews = readJSON(REVIEWS_FILE);
    const newReview = {
        id: uuidv4(),
        toiletId,
        userId: req.user.id,
        userPhone: req.user.phone || req.user.login || 'Аноним',
        text,
        rating,
        createdAt: new Date().toISOString()
    };

    reviews.push(newReview);
    writeJSON(REVIEWS_FILE, reviews);

    res.status(201).json(newReview);
});

// ---- Удалить отзыв (админ) ----
app.delete('/api/reviews/:id', authMiddleware, adminMiddleware, (req, res) => {
    const reviews = readJSON(REVIEWS_FILE);
    const index = reviews.findIndex(r => r.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Отзыв не найден' });
    }

    reviews.splice(index, 1);
    writeJSON(REVIEWS_FILE, reviews);

    res.json({ message: 'Отзыв удалён' });
});

// ---- Получить статистику (админ) ----
app.get('/api/admin/stats', authMiddleware, adminMiddleware, (req, res) => {
    const users = readJSON(USERS_FILE);
    const toilets = readJSON(TOILETS_FILE);
    const reviews = readJSON(REVIEWS_FILE);

    res.json({
        users: users.length,
        toilets: toilets.length,
        reviews: reviews.length,
        freeToilets: toilets.filter(t => t.isFree).length,
        taharatkhana: toilets.filter(t => t.isTaharatkhana).length
    });
});

// ============================================================
//  ЗАПУСК
// ============================================================
initDataFiles();
app.listen(PORT, () => {
    console.log(`🚽 ToiletAdvisor Server запущен на http://localhost:${PORT}`);
    console.log(`🔑 Администратор: логин "admin", пароль "admin123"`);
});