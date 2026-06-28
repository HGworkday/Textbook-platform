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

// 获取所有设置（公开）
router.get('/', (req, res) => {
    try {
        const settings = queryAll('SELECT key, value FROM settings');
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.key] = s.value;
        });
        res.json(settingsObj);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 更新设置（需要管理员）
router.put('/', requireAdmin, (req, res) => {
    try {
        const { key, value } = req.body;
        
        if (!key) {
            return res.status(400).json({ error: 'Setting key is required' });
        }

        const existing = queryOne('SELECT id FROM settings WHERE key = ?', [key]);
        
        if (existing) {
            run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
        } else {
            run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
        }
        
        res.json({ message: 'Setting updated' });
    } catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 批量更新设置（需要管理员）
router.put('/batch', requireAdmin, (req, res) => {
    try {
        const settings = req.body;
        
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'Settings data is required' });
        }

        Object.entries(settings).forEach(([key, value]) => {
            const existing = queryOne('SELECT id FROM settings WHERE key = ?', [key]);
            if (existing) {
                run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
            } else {
                run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
            }
        });
        
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Batch update settings error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
