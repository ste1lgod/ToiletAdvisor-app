const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Секретный ключ для JWT (в реальном проекте — в переменных окружения)
const JWT_SECRET = 'findtoilet_secret_key_2026';

// Пути к файлам данных
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TOILETS_FILE = path.join(DATA_DIR, 'toilets.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');

// Middleware
app.use(cors());
app.use(express.json());

// Инициализация файлов данных, если их нет
function initDataFiles() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(TOILETS_FILE)) {
        fs.writeFileSync(TOILETS_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(REVIEWS_FILE)) {
        fs.writeFileSync(REVIEWS_FILE, JSON.stringify([], null, 2));
    }

    // Создаём админа, если его ещё нет
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
        console.log('Администратор создан: логин "admin", пароль "admin123"');
    }
}

// Вспомогательные функции
function readJSON(filePath) {
    return JSON.parse(fs.readFileSync(filePath));
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Middleware для проверки JWT токена
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

// Middleware для проверки роли admin
function adminMiddleware(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещён. Требуются права администратора' });
    }
    next();
}

// ==================== МАРШРУТЫ ====================

// Регистрация пользователя (по номеру телефона)
app.post('/api/register', (req, res) => {
    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ error: 'Номер телефона и пароль обязательны' });
    }

    if (password.length < 4) {
        return res.status(400).json({ error: 'Пароль должен быть не менее 4 символов' });
    }

    const users = readJSON(USERS_FILE);
    const existingUser = users.find(u => u.phone === phone);
    if (existingUser) {
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

// Авторизация пользователя (по номеру телефона)
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

    const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isPasswordValid) {
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

// Вход администратора (по логину)
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

    const isPasswordValid = bcrypt.compareSync(password, admin.passwordHash);
    if (!isPasswordValid) {
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

// Получить текущего пользователя
app.get('/api/user/me', authMiddleware, (req, res) => {
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json({ id: user.id, phone: user.phone, role: user.role });
});

// Получить все туалеты
app.get('/api/toilets', (req, res) => {
    const toilets = readJSON(TOILETS_FILE);
    res.json(toilets);
});

// Добавить туалет (только админ)
app.post('/api/toilets', authMiddleware, adminMiddleware, (req, res) => {
    const { lat, lon, title, isOpen, isFree, hasSoap, hasPaper, isAccessible, photo } = req.body;

    if (!lat || !lon || !title) {
        return res.status(400).json({ error: 'Координаты и название обязательны' });
    }

    const toilets = readJSON(TOILETS_FILE);
    const newToilet = {
        id: uuidv4(),
        lat,
        lon,
        title,
        isOpen: isOpen !== undefined ? isOpen : true,
        isFree: isFree !== undefined ? isFree : true,
        hasSoap: hasSoap || false,
        hasPaper: hasPaper || false,
        isAccessible: isAccessible || false,
        photo: photo || '',
        addedBy: req.user.id,
        createdAt: new Date().toISOString()
    };

    toilets.push(newToilet);
    writeJSON(TOILETS_FILE, toilets);

    res.status(201).json(newToilet);
});

// Получить отзывы для туалета
app.get('/api/reviews/:toiletId', (req, res) => {
    const reviews = readJSON(REVIEWS_FILE);
    const toiletReviews = reviews.filter(r => r.toiletId === req.params.toiletId);
    res.json(toiletReviews);
});

// Добавить отзыв (только авторизованные)
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
        userPhone: req.user.phone,
        text,
        rating,
        createdAt: new Date().toISOString()
    };

    reviews.push(newReview);
    writeJSON(REVIEWS_FILE, reviews);

    res.status(201).json(newReview);
});

// ==================== ЗАПУСК ====================
initDataFiles();
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log('Администратор: логин "admin", пароль "admin123"');
});