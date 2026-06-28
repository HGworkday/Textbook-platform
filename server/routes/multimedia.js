import express from 'express';
import jwt from 'jsonwebtoken';
import { queryAll, queryOne, run } from '../db/database.js';

const router = express.Router();
const JWT_SECRET = 'textbook-platform-secret-key-2024';

function requireAdmin(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Please login first' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// 获取所有活跃多媒体（公开）
router.get('/', (req, res) => {
    try {
        const activeOnly = req.query.active !== 'all';
        let sql = 'SELECT * FROM multimedia';
        if (activeOnly) {
            sql += ' WHERE is_active = 1';
        }
        sql += ' ORDER BY order_index ASC, id ASC';
        const items = queryAll(sql);
        res.json(items);
    } catch (error) {
        console.error('Get multimedia error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 获取单个多媒体（公开）
router.get('/:id', (req, res) => {
    try {
        const item = queryOne('SELECT * FROM multimedia WHERE id = ?', [req.params.id]);
        if (!item) {
            return res.status(404).json({ error: 'Not found' });
        }
        res.json(item);
    } catch (error) {
        console.error('Get multimedia error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 创建多媒体（需要管理员）
router.post('/', requireAdmin, (req, res) => {
    try {
        const { type, title, url, description, order_index, is_active } = req.body;
        
        if (!type || !url) {
            return res.status(400).json({ error: 'Type and URL are required' });
        }

        const result = run(
            'INSERT INTO multimedia (type, title, url, description, order_index, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            [type, title || '', url, description || '', order_index || 0, is_active !== undefined ? (is_active ? 1 : 0) : 1]
        );
        
        res.json({ id: result.lastInsertRowid, message: 'Created successfully' });
    } catch (error) {
        console.error('Create multimedia error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 更新多媒体（需要管理员）
router.put('/:id', requireAdmin, (req, res) => {
    try {
        const { type, title, url, description, order_index, is_active } = req.body;
        
        const existing = queryOne('SELECT id FROM multimedia WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Not found' });
        }

        run(
            'UPDATE multimedia SET type = ?, title = ?, url = ?, description = ?, order_index = ?, is_active = ? WHERE id = ?',
            [type || existing.type, title !== undefined ? title : existing.title, url || existing.url, 
             description !== undefined ? description : existing.description, 
             order_index !== undefined ? order_index : existing.order_index,
             is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
             req.params.id]
        );
        
        res.json({ message: 'Updated successfully' });
    } catch (error) {
        console.error('Update multimedia error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 删除多媒体（需要管理员）
router.delete('/:id', requireAdmin, (req, res) => {
    try {
        const existing = queryOne('SELECT id FROM multimedia WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Not found' });
        }

        run('DELETE FROM multimedia WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Delete multimedia error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 切换激活状态（需要管理员）
router.patch('/:id/toggle', requireAdmin, (req, res) => {
    try {
        const existing = queryOne('SELECT id, is_active FROM multimedia WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Not found' });
        }

        const newStatus = existing.is_active ? 0 : 1;
        run('UPDATE multimedia SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);
        res.json({ is_active: newStatus, message: 'Status updated' });
    } catch (error) {
        console.error('Toggle multimedia error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 重新排序（需要管理员）
router.post('/reorder', requireAdmin, (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid items' });
        }

        items.forEach((item, index) => {
            run('UPDATE multimedia SET order_index = ? WHERE id = ?', [index + 1, item.id]);
        });
        
        res.json({ message: 'Reordered successfully' });
    } catch (error) {
        console.error('Reorder multimedia error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
