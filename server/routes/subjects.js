import express from 'express';
import jwt from 'jsonwebtoken';
import db, { queryAll, queryOne, run } from '../db/database.js';

const router = express.Router();
const JWT_SECRET = 'textbook-platform-secret-key-2024';

// 验证管理员权限
function requireAdmin(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: '请先登录' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: '需要管理员权限' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token无效' });
    }
}

// 获取所有科目（公开）
router.get('/', (req, res) => {
    try {
        const subjects = queryAll(`
            SELECT s.*, u.name as user_name,
                   (SELECT COUNT(*) FROM chapters WHERE subject_id = s.id AND is_published = 1) as chapter_count
            FROM subjects s
            LEFT JOIN users u ON s.user_id = u.id
            ORDER BY s.order_index ASC
        `);
        
        res.json(subjects);
    } catch (error) {
        console.error('获取科目列表错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取单个科目
router.get('/:id', (req, res) => {
    try {
        const subject = queryOne(`
            SELECT s.*, u.name as user_name
            FROM subjects s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.id = ?
        `, [req.params.id]);
        
        if (!subject) {
            return res.status(404).json({ error: '科目不存在' });
        }
        
        // 获取该科目的章节
        const chapters = queryAll(`
            SELECT id, title, order_index, is_published, created_at
            FROM chapters
            WHERE subject_id = ?
            ORDER BY order_index ASC
        `, [req.params.id]);
        
        res.json({ ...subject, chapters });
    } catch (error) {
        console.error('获取科目错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 创建科目
router.post('/', requireAdmin, (req, res) => {
    try {
        const { name, icon, author, description, color, cover_image, order_index } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: '请输入科目名称' });
        }

        const result = run(`
            INSERT INTO subjects (name, icon, author, description, color, cover_image, order_index, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, icon || '📚', author || '', description || '', color || '#00d4ff', cover_image || '', order_index || 0, req.user.id]);

        const newSubject = queryOne('SELECT * FROM subjects WHERE id = ?', [result.lastInsertRowid]);
        
        res.json(newSubject);
    } catch (error) {
        console.error('创建科目错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 更新科目
router.put('/:id', requireAdmin, (req, res) => {
    try {
        const { name, icon, author, description, color, cover_image, order_index } = req.body;
        
        const existing = queryOne('SELECT * FROM subjects WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: '科目不存在' });
        }

        run(`
            UPDATE subjects 
            SET name = ?, icon = ?, author = ?, description = ?, color = ?, cover_image = ?, order_index = ?
            WHERE id = ?
        `, [
            name !== undefined ? name : existing.name,
            icon !== undefined ? icon : existing.icon,
            author !== undefined ? author : existing.author,
            description !== undefined ? description : existing.description,
            color !== undefined ? color : existing.color,
            cover_image !== undefined ? cover_image : existing.cover_image,
            order_index !== undefined ? order_index : existing.order_index,
            req.params.id
        ]);

        const updated = queryOne('SELECT * FROM subjects WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (error) {
        console.error('更新科目错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 删除科目
router.delete('/:id', requireAdmin, (req, res) => {
    try {
        const existing = queryOne('SELECT * FROM subjects WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: '科目不存在' });
        }

        // 先删除关联的章节
        run('DELETE FROM chapters WHERE subject_id = ?', [req.params.id]);
        run('DELETE FROM subjects WHERE id = ?', [req.params.id]);
        
        res.json({ message: '删除成功' });
    } catch (error) {
        console.error('删除科目错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

export default router;
