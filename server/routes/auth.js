import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db, { queryOne, run } from '../db/database.js';

const router = express.Router();
const JWT_SECRET = 'textbook-platform-secret-key-2024';

// 登录
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: '请输入邮箱和密码' });
        }

        const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: '邮箱或密码错误' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar_color: user.avatar_color || '#D4A574',
                avatar_image: user.avatar_image || null
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 注册
router.post('/register', (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password || !name) {
            return res.status(400).json({ error: '请填写所有必填项' });
        }

        const existing = queryOne('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(400).json({ error: '该邮箱已被注册' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const result = run(
            'INSERT INTO users (email, password, name, role, avatar_color) VALUES (?, ?, ?, ?, ?)',
            [email, hashedPassword, name, 'teacher', '#D4A574']
        );

        res.json({ 
            message: '注册成功',
            userId: result.lastInsertRowid 
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 验证token
router.get('/verify', (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: '未登录' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = queryOne('SELECT id, email, name, role, avatar_color, avatar_image FROM users WHERE id = ?', [decoded.id]);
        
        if (!user) {
            return res.status(401).json({ error: '用户不存在' });
        }

        res.json({ user });
    } catch (error) {
        res.status(401).json({ error: 'Token无效' });
    }
});

// 获取当前用户信息
router.get('/me', (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: '未登录' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = queryOne('SELECT id, email, name, role, avatar_color, avatar_image FROM users WHERE id = ?', [decoded.id]);
        
        if (!user) {
            return res.status(401).json({ error: '用户不存在' });
        }

        res.json({ user });
    } catch (error) {
        res.status(401).json({ error: 'Token无效' });
    }
});

// 修改密码
router.put('/password', (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: '未登录' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: '请填写旧密码和新密码' });
        }

        const user = queryOne('SELECT * FROM users WHERE id = ?', [decoded.id]);
        if (!user) {
            return res.status(401).json({ error: '用户不存在' });
        }

        // 验证旧密码
        if (!bcrypt.compareSync(oldPassword, user.password)) {
            return res.status(400).json({ error: '旧密码错误' });
        }

        // 更新新密码
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

        res.json({ message: '密码修改成功' });
    } catch (error) {
        console.error('修改密码错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 更新用户资料
router.put('/profile', (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: '未登录' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const { email, name, avatar_color, avatar_image } = req.body;
        
        const user = queryOne('SELECT * FROM users WHERE id = ?', [decoded.id]);
        if (!user) {
            return res.status(401).json({ error: '用户不存在' });
        }

        // 如果要修改邮箱，检查是否已被占用
        if (email && email !== user.email) {
            const existing = queryOne('SELECT id FROM users WHERE email = ? AND id != ?', [email, user.id]);
            if (existing) {
                return res.status(400).json({ error: '该邮箱已被使用' });
            }
        }

        run('UPDATE users SET email = ?, name = ?, avatar_color = ?, avatar_image = ? WHERE id = ?',
            [email || user.email, name || user.name, avatar_color || user.avatar_color, avatar_image !== undefined ? avatar_image : user.avatar_image, user.id]);

        const updated = queryOne('SELECT id, email, name, role, avatar_color, avatar_image FROM users WHERE id = ?', [user.id]);
        res.json({ 
            message: '资料更新成功',
            user: updated
        });
    } catch (error) {
        console.error('更新资料错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

export default router;
