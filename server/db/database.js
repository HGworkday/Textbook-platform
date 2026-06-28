import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'textbook.db');

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;

export async function initDB() {
    const SQL = await initSqlJs();
    
    // 尝试加载已有数据库
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    // 创建表
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT DEFAULT 'teacher',
            avatar_color TEXT DEFAULT '#D4A574',
            avatar_image TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            icon TEXT DEFAULT '📚',
            author TEXT,
            description TEXT,
            color TEXT DEFAULT '#00d4ff',
            cover_image TEXT,
            order_index INTEGER DEFAULT 0,
            user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS chapters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            formula TEXT,
            demo_config TEXT,
            order_index INTEGER DEFAULT 0,
            is_published INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            originalname TEXT NOT NULL,
            mimetype TEXT,
            size INTEGER,
            user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS multimedia (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            title TEXT,
            url TEXT NOT NULL,
            description TEXT,
            order_index INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 数据库迁移 - 确保users表有avatar_color和avatar_image字段
    try {
        const columns = db.exec("PRAGMA table_info(users)");
        if (columns.length > 0) {
            const colNames = columns[0].values.map(col => col[1]);
            if (!colNames.includes('avatar_color')) {
                db.run("ALTER TABLE users ADD COLUMN avatar_color TEXT DEFAULT '#D4A574'");
                console.log('✅ Migration: Added avatar_color column to users table');
            }
            if (!colNames.includes('avatar_image')) {
                db.run("ALTER TABLE users ADD COLUMN avatar_image TEXT");
                console.log('✅ Migration: Added avatar_image column to users table');
            }
        }
    } catch (e) {
        console.log('Migration check skipped:', e.message);
    }

    // 数据库迁移 - 确保subjects表有cover_image和author字段
    try {
        const subjColumns = db.exec("PRAGMA table_info(subjects)");
        if (subjColumns.length > 0) {
            const subjColNames = subjColumns[0].values.map(col => col[1]);
            if (!subjColNames.includes('cover_image')) {
                db.run("ALTER TABLE subjects ADD COLUMN cover_image TEXT");
                console.log('✅ Migration: Added cover_image column to subjects table');
            }
            if (!subjColNames.includes('author')) {
                db.run("ALTER TABLE subjects ADD COLUMN author TEXT");
                console.log('✅ Migration: Added author column to subjects table');
            }
        }
    } catch (e) {
        console.log('Subjects migration check skipped:', e.message);
    }

    // 创建默认管理员账号
    const adminExists = db.exec("SELECT id FROM users WHERE role = 'admin'");
    if (adminExists.length === 0 || adminExists[0].values.length === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run(`
            INSERT INTO users (email, password, name, role, avatar_color) 
            VALUES (?, ?, ?, ?, ?)
        `, ['admin@textbook.com', hashedPassword, 'Administrator', 'admin', '#D4A574']);
        console.log('✅ Default admin created: admin@textbook.com / admin123');
    }

    // 创建示例数据（如果为空）
    const subjectCount = db.exec("SELECT COUNT(*) as count FROM subjects");
    if (subjectCount[0].values[0][0] === 0) {
        // 宇宙和艺术主题封面
        const cosmos = 'https://picsum.photos/id/1015/400/300';
        const stars = 'https://picsum.photos/id/1018/400/300';
        const galaxy = 'https://picsum.photos/id/1024/400/300';
        const universe = 'https://picsum.photos/id/1035/400/300';

        // 创建示例科目
        db.run(`INSERT INTO subjects (name, icon, description, color, cover_image, order_index) VALUES (?, ?, ?, ?, ?, ?)`, 
            ['Mathematics', '∑', 'Explore algebra, geometry, and calculus', '#00d4ff', cosmos, 1]);
        db.run(`INSERT INTO subjects (name, icon, description, color, cover_image, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
            ['Physics', '⚡', 'From mechanics to electromagnetism', '#a855f7', galaxy, 2]);
        db.run(`INSERT INTO subjects (name, icon, description, color, cover_image, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
            ['Chemistry', '🧪', 'The magic of molecular reactions', '#ff6b35', stars, 3]);
        db.run(`INSERT INTO subjects (name, icon, description, color, cover_image, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
            ['Literature', '📜', 'Classic works and writing arts', '#22c55e', universe, 4]);

        // 创建示例章节
        db.run(`INSERT INTO chapters (subject_id, title, content, formula, demo_config, order_index, is_published) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [1, 'Pythagorean Theorem', '<h2>Pythagorean Theorem</h2><p>In plane geometry, the square of the hypotenuse of a right triangle equals the sum of squares of the other two sides.</p><p>This is one of the most famous theorems in mathematics, with a history of over 4000 years.</p><h3>Proof Method</h3><p>We can prove this theorem using the area method...</p>',
            'a^2 + b^2 = c^2', JSON.stringify({ type: 'pythagorean', interactive: true }), 1, 1]);

        db.run(`INSERT INTO chapters (subject_id, title, content, formula, demo_config, order_index, is_published) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [1, 'Trigonometric Functions', '<h2>Trigonometric Functions</h2><p>Sine, cosine, and tangent are basic functions describing the relationship between angles and side lengths.</p><p>They are widely used in physics, engineering, music, and other fields.</p>',
            'sin^2\\theta + cos^2\\theta = 1', JSON.stringify({ type: 'trigonometric', interactive: true }), 2, 1]);

        db.run(`INSERT INTO chapters (subject_id, title, content, formula, demo_config, order_index, is_published) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [2, "Newton's Laws of Motion", "<h2>Newton's Laws of Motion</h2><p>Isaac Newton proposed three laws of motion in 1687, which completely changed human understanding of the universe.</p><h3>First Law (Law of Inertia)</h3><p>Every body continues in its state of rest or uniform motion in a straight line unless compelled to change that state by forces impressed upon it.</p>",
            'F = ma', JSON.stringify({ type: 'physics', interactive: true }), 1, 1]);

        console.log('✅ Sample data created');
    }

    // 初始化默认网站设置
    const defaultSettings = [
        ['siteName', 'Interactive Textbook Platform'],
        ['siteLogo', '📚'],
        ['heroTitle', 'Explore the Universe of Knowledge'],
        ['heroSubtitle', 'Learning becomes intuitive and fun through beautiful visualizations, dynamic demonstrations, and interactive exercises'],
        ['heroBadge', 'Next-Generation Interactive Learning Experience'],
        ['footerCopyright', '© 2026 Interactive Textbook Platform'],
        ['sectionLabel', 'Subjects'],
        ['sectionTitle', 'Choose Your Learning Path'],
        ['sectionDesc', 'Explore rich knowledge across multiple subject areas'],
        ['lang', 'en'],
        ['pageTurnEffect', 'slide'],
        ['showPageNumbers', '1'],
        // Interactive Demo settings
        ['demoSectionLabel', 'Interactive Demo'],
        ['demoSectionTitle', 'Hands-on Practice'],
        ['demoSectionDesc', 'Adjust parameters and observe how mathematical patterns change'],
        ['demoTitle', 'Function Graph Explorer'],
        ['demoPanelTitle', 'Parameter Controls'],
        // Font settings
        ['fontFamily', 'Inter'],
        ['chineseFontFamily', 'Microsoft YaHei'],
        ['fontSize', '16'],
        ['darkMode', '0'],
        // Typography settings
        ['heroTitleFont', 'Inter'],
        ['heroTitleSize', '4'],
        ['heroTitleWeight', '900'],
        ['heroTitleColor', ''],
        ['headingFont', 'Inter'],
        ['headingSize', '2'],
        ['headingWeight', '700'],
        ['headingColor', ''],
        ['bodyFont', 'Inter'],
        ['bodySize', '1'],
        ['bodyWeight', '400'],
        ['bodyColor', ''],
        ['buttonFont', 'Inter'],
        ['buttonSize', '1'],
        ['buttonWeight', '600'],
        ['siteNameFont', 'Inter'],
        ['siteNameSize', '1.25'],
        ['siteNameWeight', '700'],
        ['adminFontFamily', 'Inter'],
        ['adminChineseFont', 'Microsoft YaHei'],
        ['adminFontSize', '16']
    ];

    defaultSettings.forEach(([key, value]) => {
        const exists = db.exec(`SELECT id FROM settings WHERE key = '${key}'`);
        if (exists.length === 0 || exists[0].values.length === 0) {
            db.run(`INSERT INTO settings (key, value) VALUES (?, ?)`, [key, value]);
        }
    });

    // 初始化示例多媒体内容
    const mediaCount = db.exec("SELECT COUNT(*) as count FROM multimedia");
    if (mediaCount[0].values[0][0] === 0) {
        db.run(`INSERT INTO multimedia (type, title, url, description, order_index, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
            ['image', 'Interactive Geometry Demo', 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800', 'Explore geometric shapes and their properties', 1, 1]);
        db.run(`INSERT INTO multimedia (type, title, url, description, order_index, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
            ['image', 'Physics Experiments', 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800', 'Hands-on physics demonstrations', 2, 1]);
        db.run(`INSERT INTO multimedia (type, title, url, description, order_index, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
            ['video', 'Introduction to Calculus', 'https://www.youtube.com/embed/WUvTyaaNkzM', 'Learn the fundamentals of calculus', 3, 1]);
    }

    saveDB();
    console.log('✅ Database initialized');
    return db;
}

export function saveDB() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

export function getDB() {
    return db;
}

// 辅助函数：将 sql.js 结果转换为对象数组
export function queryAll(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
        stmt.bind(params);
    }
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

export function queryOne(sql, params = []) {
    const results = queryAll(sql, params);
    return results.length > 0 ? results[0] : null;
}

export function run(sql, params = []) {
    db.run(sql, params);
    saveDB();
    return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0].values[0][0] };
}

export default { initDB, getDB, queryAll, queryOne, run, saveDB };
