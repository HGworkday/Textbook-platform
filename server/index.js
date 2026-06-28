import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './db/database.js';
import authRoutes from './routes/auth.js';
import subjectRoutes from './routes/subjects.js';
import chapterRoutes from './routes/chapters.js';
import uploadRoutes from './routes/upload.js';
import settingsRoutes from './routes/settings.js';
import multimediaRoutes from './routes/multimedia.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/multimedia', multimediaRoutes);

// 页面路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/index.html'));
});

app.get('/subject/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/chapter/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

async function start() {
    await initDB();
    app.listen(PORT, () => {
        console.log(`🚀 Server running: http://localhost:${PORT}`);
        console.log(`📚 Homepage: http://localhost:${PORT}`);
        console.log(`⚙️  Admin Panel: http://localhost:${PORT}/admin`);
    });
}

start();
