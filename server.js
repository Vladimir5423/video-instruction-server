const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
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

// 👥 ВАШИ СУЩЕСТВУЮЩИЕ РОУТЫ ДЛЯ VIEWERS (не меняем)

// Получить всех зрителей
app.get('/viewers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM viewers ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error("❌ Ошибка получения viewers:", error);
        res.status(500).json({ error: error.message });
    }
});

// Добавить зрителя
app.post('/viewers', async (req, res) => {
    const { name, startTime, endTime, watchDuration, completed, watchedFully } = req.body;
    
    try {
        const result = await pool.query(
            'INSERT INTO viewers (name, start_time, end_time, watch_duration, completed, watched_fully) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, startTime, endTime, watchDuration, completed, watchedFully]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error("❌ Ошибка добавления viewer:", error);
        res.status(500).json({ error: error.message });
    }
});

// Проверить, смотрел ли пользователь
app.get('/viewers/check/:name', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM viewers WHERE name = $1 AND completed = true', [req.params.name]);
        res.json({ watched: result.rows.length > 0 });
    } catch (error) {
        console.error("❌ Ошибка проверки viewer:", error);
        res.status(500).json({ error: error.message });
    }
});

// Удалить все данные viewers
app.delete('/viewers', async (req, res) => {
    try {
        await pool.query('DELETE FROM viewers');
        res.json({ message: 'Все данные viewers удалены' });
    } catch (error) {
        console.error("❌ Ошибка удаления viewers:", error);
        res.status(500).json({ error: error.message });
    }
});

// 🔐 НОВЫЕ РОУТЫ ДЛЯ ПАРОЛЕЙ (добавляем)

// Получить все пароли
app.get('/passwords', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM passwords ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error("❌ Ошибка получения паролей:", error);
        res.status(500).json({ error: error.message });
    }
});

// Добавить новый пароль
app.post('/passwords', async (req, res) => {
    const { password } = req.body;
    
    if (!password) {
        return res.status(400).json({ error: 'Пароль обязателен' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO passwords (password) VALUES ($1) RETURNING *',
            [password]
        );
        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Пароль уже существует' });
        }
        console.error("❌ Ошибка добавления пароля:", error);
        res.status(500).json({ error: error.message });
    }
});

// Удалить пароль
app.delete('/passwords/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Проверяем сколько паролей останется
        const countResult = await pool.query('SELECT COUNT(*) FROM passwords');
        const passwordCount = parseInt(countResult.rows[0].count);

        if (passwordCount <= 1) {
            return res.status(400).json({ error: 'Нельзя удалить все пароли' });
        }

        await pool.query('DELETE FROM passwords WHERE id = $1', [id]);
        res.json({ message: 'Пароль удален' });
    } catch (error) {
        console.error("❌ Ошибка удаления пароля:", error);
        res.status(500).json({ error: error.message });
    }
});

// Проверить пароль
app.post('/passwords/check', async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Пароль обязателен' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM passwords WHERE password = $1',
            [password]
        );

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
        await pool.query('DELETE FROM passwords');
        res.json({ message: 'Все пароли удалены' });
    } catch (error) {
        console.error("❌ Ошибка удаления паролей:", error);
        res.status(500).json({ error: error.message });
    }
});

// Проверка здоровья сервера
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Сервер работает' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
});
