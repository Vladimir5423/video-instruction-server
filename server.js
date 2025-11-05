const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Подключение к PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// ✅ Проверка подключения к БД
pool.on('connect', () => {
    console.log('✅ Подключено к PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Ошибка PostgreSQL:', err);
});

// ✅ Эндпоинт для получения всех пользователей
app.get('/viewers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM viewers ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Ошибка получения данных:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ✅ Эндпоинт для проверки пользователя
app.get('/viewers/check/:name', async (req, res) => {
    try {
        const name = decodeURIComponent(req.params.name);
        const result = await pool.query('SELECT * FROM viewers WHERE name = $1', [name]);
        res.json({ watched: result.rows.length > 0 });
    } catch (error) {
        console.error('❌ Ошибка проверки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ✅ Эндпоинт для сохранения пользователя
app.post('/viewers', async (req, res) => {
    try {
        const viewer = req.body;
        console.log('📥 Получены данные:', viewer);

        // Преобразуем названия полей
        const dbViewer = {
            name: viewer.name,
            start_time: viewer.startTime || new Date().toISOString(),
            end_time: viewer.endTime || new Date().toISOString(),
            watch_duration: viewer.watchDuration || 0,
            completed: viewer.completed || false,
            watched_fully: viewer.watchedFully || false
        };

        console.log('📊 Данные для БД:', dbViewer);

        // Удаляем существующую запись если есть
        await pool.query('DELETE FROM viewers WHERE name = $1', [dbViewer.name]);

        // Добавляем новую запись
        const result = await pool.query(
            `INSERT INTO viewers (name, start_time, end_time, watch_duration, completed, watched_fully) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [dbViewer.name, dbViewer.start_time, dbViewer.end_time, dbViewer.watch_duration, dbViewer.completed, dbViewer.watched_fully]
        );

        console.log('✅ Сохранено в БД:', dbViewer.name);
        res.json({ success: true, message: 'Данные сохранены', data: result.rows[0] });
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
        res.status(500).json({ success: false, message: 'Ошибка сохранения: ' + error.message });
    }
});

// ✅ Эндпоинт для удаления конкретного пользователя
app.delete('/viewers/:name', async (req, res) => {
    try {
        const name = decodeURIComponent(req.params.name);
        console.log('🔄 Попытка удалить:', name);

        const result = await pool.query('DELETE FROM viewers WHERE name = $1', [name]);
        
        if (result.rowCount > 0) {
            console.log('✅ Удален из БД:', name);
            res.json({ success: true, message: `Пользователь ${name} удален` });
        } else {
            console.log('❌ Не найден в БД:', name);
            res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
    } catch (error) {
        console.error('❌ Ошибка удаления:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера: ' + error.message });
    }
});

// ✅ Эндпоинт для удаления всех пользователей
app.delete('/viewers', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM viewers');
        console.log('🔥 Удалены все записи:', result.rowCount);
        res.json({ success: true, message: `Удалено ${result.rowCount} записей` });
    } catch (error) {
        console.error('❌ Ошибка очистки:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера: ' + error.message });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🔗 URL: https://video-instruction-server.onrender.com`);
});
