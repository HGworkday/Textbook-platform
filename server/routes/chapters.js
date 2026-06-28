import express from 'express';
import jwt from 'jsonwebtoken';
import db, { queryAll, queryOne, run } from '../db/database.js';

const router = express.Router();
const JWT_SECRET = 'textbook-platform-secret-key-2024';

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

// 验证管理员权限
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '需要管理员权限' });
    }
    next();
}

// 获取章节列表（公开，只能看已发布的）
router.get('/', (req, res) => {
    try {
        const { subject_id, published } = req.query;
        
        let sql = `
            SELECT c.*, s.name as subject_name, s.icon as subject_icon, s.color as subject_color
            FROM chapters c
            JOIN subjects s ON c.subject_id = s.id
        `;
        const params = [];
        const conditions = [];

        if (subject_id) {
            conditions.push('c.subject_id = ?');
            params.push(subject_id);
        }

        // 未登录用户只能看已发布的
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token || published === '0') {
            conditions.push('c.is_published = 1');
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY c.order_index ASC';

        const chapters = queryAll(sql, params);
        
        res.json(chapters);
    } catch (error) {
        console.error('获取章节列表错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取单个章节
router.get('/:id', (req, res) => {
    try {
        const chapter = queryOne(`
            SELECT c.*, s.name as subject_name, s.icon as subject_icon, s.color as subject_color
            FROM chapters c
            JOIN subjects s ON c.subject_id = s.id
            WHERE c.id = ?
        `, [req.params.id]);
        
        if (!chapter) {
            return res.status(404).json({ error: '章节不存在' });
        }

        // 检查是否已发布（未登录且未发布则拒绝）
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token && !chapter.is_published) {
            return res.status(404).json({ error: '章节不存在' });
        }
        
        res.json(chapter);
    } catch (error) {
        console.error('获取章节错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 创建章节
router.post('/', requireAuth, requireAdmin, (req, res) => {
    try {
        const { subject_id, title, content, formula, demo_config, order_index, is_published } = req.body;
        
        if (!subject_id || !title) {
            return res.status(400).json({ error: '请填写科目和标题' });
        }

        const result = run(`
            INSERT INTO chapters (subject_id, title, content, formula, demo_config, order_index, is_published)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [subject_id, title, content || '', formula || '', demo_config || '', order_index || 0, is_published ? 1 : 0]);

        const newChapter = queryOne('SELECT * FROM chapters WHERE id = ?', [result.lastInsertRowid]);
        
        res.json(newChapter);
    } catch (error) {
        console.error('创建章节错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 更新章节
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
    try {
        const { subject_id, title, content, formula, demo_config, order_index, is_published } = req.body;
        
        const existing = queryOne('SELECT * FROM chapters WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: '章节不存在' });
        }

        run(`
            UPDATE chapters 
            SET subject_id = ?, title = ?, content = ?, formula = ?, 
                demo_config = ?, order_index = ?, is_published = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            subject_id !== undefined ? subject_id : existing.subject_id,
            title !== undefined ? title : existing.title,
            content !== undefined ? content : existing.content,
            formula !== undefined ? formula : existing.formula,
            demo_config !== undefined ? demo_config : existing.demo_config,
            order_index !== undefined ? order_index : existing.order_index,
            is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published,
            req.params.id
        ]);

        const updated = queryOne('SELECT * FROM chapters WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (error) {
        console.error('更新章节错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 删除章节
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
    try {
        const existing = queryOne('SELECT * FROM chapters WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: '章节不存在' });
        }

        run('DELETE FROM chapters WHERE id = ?', [req.params.id]);
        
        res.json({ message: '删除成功' });
    } catch (error) {
        console.error('删除章节错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

export default router;
