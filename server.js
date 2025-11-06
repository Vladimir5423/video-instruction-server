const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();

// Правильная настройка CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    credentials: true
}));

app.use(express.json());

// Подключение к PostgreSQL
const pool = new Pool({
    connectionString: "postgresql://video_user:HwARHvO4bbNqWhbTEiGimrhQ9WhWwhKC@dpg-d45fhtfdiees73888p30-a/video_db_oomu"
});

// Создаем таблицы если нет
async function initDatabase() {
    try {
        // Ваша существующая таблица viewers
        await pool.query(`
            CREATE TABLE IF NOT EXISTS viewers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                watch_duration INTEGER,
                completed BOOLEAN DEFAULT false,
                watched_fully BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Таблица viewers создана/проверена");

        // Новая таблица для паролей
        await pool.query(`
            CREATE TABLE IF NOT EXISTS passwords (
                id SERIAL PRIMARY KEY,
                password VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Таблица passwords создана/проверена");

        // Добавляем стандартные пароли если таблица пустая
        const existingPasswords = await pool.query('SELECT COUNT(*) FROM passwords');
        if (parseInt(existingPasswords.rows[0].count) === 0) {
            const defaultPasswords = [
                'Vladimir_Qwert',
                'Sofa_Moriarty', 
                'Matthew_Underhill',
                'Lisa_Moriarty'
            ];
            
            for (const password of defaultPasswords) {
                await pool.query('INSERT INTO passwords (password) VALUES ($1)', [password]);
            }
            console.log('✅ Добавлены стандартные пароли');
        }

    } catch (error) {
        console.error("❌ Ошибка создания таблиц:", error);
    }
}

// Инициализация базы при запуске
initDatabase();

// 👥 ВАШИ СУЩЕСТВУЮЩИЕ РОУТЫ ДЛЯ VIEWERS

// Получить всех зрителей
app.get('/viewers', async (req, res) => {
    try {
        console.log("📋 GET /viewers - получение всех записей");
        const result = await pool.query('SELECT * FROM viewers ORDER BY created_at DESC');
        console.log(`✅ Найдено записей: ${result.rows.length}`);
        res.json(result.rows);
    } catch (error) {
        console.error("❌ Ошибка получения viewers:", error);
        res.status(500).json({ error: error.message });
    }
});

// Добавить зрителя
app.post('/viewers', async (req, res) => {
    const { name, startTime, endTime, watchDuration, completed, watchedFully } = req.body;
    console.log(`➕ POST /viewers - добавление: ${name}`);
    
    try {
        const result = await pool.query(
            'INSERT INTO viewers (name, start_time, end_time, watch_duration, completed, watched_fully) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, startTime, endTime, watchDuration, completed, watchedFully]
        );
        console.log(`✅ Добавлен viewer: ${name}`);
        res.json(result.rows[0]);
    } catch (error) {
        console.error("❌ Ошибка добавления viewer:", error);
        res.status(500).json({ error: error.message });
    }
});

// Проверить, смотрел ли пользователь
app.get('/viewers/check/:name', async (req, res) => {
    const name = req.params.name;
    console.log(`🔍 GET /viewers/check/${name} - проверка`);
    
    try {
        const result = await pool.query('SELECT * FROM viewers WHERE name = $1 AND completed = true', [name]);
        console.log(`✅ Проверка ${name}: ${result.rows.length > 0 ? 'найден' : 'не найден'}`);
        res.json({ watched: result.rows.length > 0 });
    } catch (error) {
        console.error("❌ Ошибка проверки viewer:", error);
        res.status(500).json({ error: error.message });
    }
});

// 🔧 ИСПРАВЛЕННЫЙ РОУТ - Удалить конкретного пользователя по имени
app.delete('/viewers/:name', async (req, res) => {
    const { name } = req.params;
    console.log(`🗑️ DELETE /viewers/${name} - запрос на удаление`);

    try {
        // Декодируем имя из URL
        const decodedName = decodeURIComponent(name);
        console.log(`🔍 Декодированное имя: ${decodedName}`);
        
        // Сначала проверим существует ли такой пользователь
        const checkResult = await pool.query('SELECT * FROM viewers WHERE name = $1', [decodedName]);
        console.log(`🔍 Найдено записей с именем ${decodedName}: ${checkResult.rows.length}`);
        
        if (checkResult.rows.length === 0) {
            console.log(`❌ Пользователь ${decodedName} не найден в базе`);
            return res.status(404).json({ error: 'Пользователь не найден', searchedName: decodedName });
        }
        
        // Удаляем пользователя
        const result = await pool.query('DELETE FROM viewers WHERE name = $1', [decodedName]);
        console.log(`✅ Пользователь удален: ${decodedName}, затронуто строк: ${result.rowCount}`);
        
        res.json({ 
            message: 'Просмотр удален', 
            deletedCount: result.rowCount,
            deletedName: decodedName 
        });
    } catch (error) {
        console.error(`❌ Ошибка удаления viewer ${name}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// Удалить все данные viewers
app.delete('/viewers', async (req, res) => {
    try {
        console.log("🗑️ DELETE /viewers - удаление всех данных");
        const result = await pool.query('DELETE FROM viewers');
        console.log(`✅ Удалено всех записей: ${result.rowCount}`);
        res.json({ message: 'Все данные viewers удалены', deletedCount: result.rowCount });
    } catch (error) {
        console.error("❌ Ошибка удаления viewers:", error);
        res.status(500).json({ error: error.message });
    }
});

// 🔐 НОВЫЕ РОУТЫ ДЛЯ ПАРОЛЕЙ

// Получить все пароли
app.get('/passwords', async (req, res) => {
    try {
        console.log("🔐 GET /passwords - получение всех паролей");
        const result = await pool.query('SELECT * FROM passwords ORDER BY id');
        console.log(`✅ Найдено паролей: ${result.rows.length}`);
        res.json(result.rows);
    } catch (error) {
        console.error("❌ Ошибка получения паролей:", error);
        res.status(500).json({ error: error.message });
    }
});

// Добавить новый пароль
app.post('/passwords', async (req, res) => {
    const { password } = req.body;
    console.log(`➕ POST /passwords - добавление пароля`);
    
    if (!password) {
        return res.status(400).json({ error: 'Пароль обязателен' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO passwords (password) VALUES ($1) RETURNING *',
            [password]
        );
        console.log(`✅ Добавлен пароль: ${password}`);
        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            console.log(`❌ Пароль уже существует: ${password}`);
            return res.status(400).json({ error: 'Пароль уже существует' });
        }
        console.error("❌ Ошибка добавления пароля:", error);
        res.status(500).json({ error: error.message });
    }
});

// Удалить пароль
app.delete('/passwords/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`🗑️ DELETE /passwords/${id} - удаление пароля`);

    try {
        // Проверяем сколько паролей останется
        const countResult = await pool.query('SELECT COUNT(*) FROM passwords');
        const passwordCount = parseInt(countResult.rows[0].count);

        if (passwordCount <= 1) {
            console.log(`❌ Нельзя удалить все пароли (осталось: ${passwordCount})`);
            return res.status(400).json({ error: 'Нельзя удалить все пароли' });
        }

        await pool.query('DELETE FROM passwords WHERE id = $1', [id]);
        console.log(`✅ Пароль удален ID: ${id}`);
        res.json({ message: 'Пароль удален' });
    } catch (error) {
        console.error("❌ Ошибка удаления пароля:", error);
        res.status(500).json({ error: error.message });
    }
});

// Проверить пароль
app.post('/passwords/check', async (req, res) => {
    const { password } = req.body;
    console.log(`🔍 POST /passwords/check - проверка пароля`);

    if (!password) {
        return res.status(400).json({ error: 'Пароль обязателен' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM passwords WHERE password = $1',
            [password]
        );

        console.log(`✅ Проверка пароля ${password}: ${result.rows.length > 0 ? 'валиден' : 'невалиден'}`);
        
        if (result.rows.length > 0) {
            res.json({ valid: true });
        } else {
            res.json({ valid: false });
        }
    } catch (error) {
        console.error("❌ Ошибка проверки пароля:", error);
        res.status(500).json({ error: error.message });
    }
});

// Удалить все пароли
app.delete('/passwords', async (req, res) => {
    try {
        console.log("🗑️ DELETE /passwords - удаление всех паролей");
        await pool.query('DELETE FROM passwords');
        console.log(`✅ Все пароли удалены`);
        res.json({ message: 'Все пароли удалены' });
    } catch (error) {
        console.error("❌ Ошибка удаления паролей:", error);
        res.status(500).json({ error: error.message });
    }
});

// Проверка здоровья сервера
app.get('/health', (req, res) => {
    console.log("❤️ GET /health - проверка здоровья");
    res.json({ status: 'OK', message: 'Сервер работает' });
});

// Корневой маршрут
app.get('/', (req, res) => {
    console.log("🏠 GET / - корневой маршрут");
    res.json({ message: 'Сервер видеоИнструктажа запущен' });
});

// Логирование всех запросов
app.use((req, res, next) => {
    console.log(`📍 ${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Доступен по адресу: http://localhost:${PORT}`);
});
