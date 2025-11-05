const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Подключение к PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Создаем таблицу если нет
async function initDatabase() {
    try {
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
    } catch (error) {
        console.error("❌ Ошибка создания таблицы:", error);
    }
}

// Инициализация базы при запуске
initDatabase();

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

// Удалить все данные
app.delete('/viewers', async (req, res) => {
    try {
        await pool.query('DELETE FROM viewers');
        res.json({ message: 'Все данные удалены' });
    } catch (error) {
        console.error("❌ Ошибка удаления viewers:", error);
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