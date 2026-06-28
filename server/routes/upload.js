import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import db, { queryAll, queryOne, run } from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const JWT_SECRET = 'textbook-platform-secret-key-2024';

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('不支持的文件类型'));
        }
    }
});

// 验证登录
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: '请先登录' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token无效' });
    }
}

// 文件上传
router.post('/', requireAuth, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '请选择要上传的文件' });
        }

        // 记录到数据库
        const result = run(`
            INSERT INTO uploads (filename, originalname, mimetype, size, user_id)
            VALUES (?, ?, ?, ?, ?)
        `, [req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.user.id]);

        res.json({
            id: result.lastInsertRowid,
            filename: req.file.filename,
            originalname: req.file.originalname,
            url: `/uploads/${req.file.filename}`,
            size: req.file.size
        });
    } catch (error) {
        console.error('上传错误:', error);
        res.status(500).json({ error: '上传失败' });
    }
});

// 获取上传列表
router.get('/', requireAuth, (req, res) => {
    try {
        const uploads = queryAll(`
            SELECT * FROM uploads 
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, [req.user.id]);
        
        res.json(uploads.map(u => ({
            ...u,
            url: `/uploads/${u.filename}`
        })));
    } catch (error) {
        console.error('获取上传列表错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 删除上传
router.delete('/:filename', requireAuth, (req, res) => {
    try {
        const uploadRecord = queryOne('SELECT * FROM uploads WHERE filename = ?', [req.params.filename]);
        
        if (!uploadRecord) {
            return res.status(404).json({ error: '文件不存在' });
        }

        // 删除物理文件
        const filePath = path.join(uploadDir, req.params.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // 删除数据库记录
        run('DELETE FROM uploads WHERE filename = ?', [req.params.filename]);
        
        res.json({ message: '删除成功' });
    } catch (error) {
        console.error('删除错误:', error);
        res.status(500).json({ error: '删除失败' });
    }
});

export default router;
