# Vercel 部署指南

## 限制说明

⚠️ **重要提醒**：此项目使用 sql.js (内存SQLite) 和本地文件存储，存在以下限制：

1. **数据库**：每次冷启动时数据会重置为初始状态
2. **上传文件**：不保存（服务器无持久化存储）
3. **建议**：如需持久化数据，可后续接入 Vercel Postgres 或 Turso (网络SQLite)

---

## 部署步骤

### 1. 准备GitHub仓库

在GitHub上创建新仓库，例如 `textbook-platform`

```bash
# 在项目根目录初始化git（如果还没初始化）
git init

# 添加所有文件（除了 .gitignore 中指定的）
git add .

# 提交
git commit -m "Initial commit"

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/textbook-platform.git

# 推送
git push -u origin main
```

### 2. 在Vercel部署

1. 访问 [vercel.com](https://vercel.com) 并登录
2. 点击 "New Project"
3. 选择 "Import Git Repository"
4. 选择刚才创建的仓库
5. 点击 "Deploy"

### 3. 配置环境变量

在 Vercel 项目设置中添加环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `JWT_SECRET` | 随机密钥 | 运行 `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` 生成 |

### 4. 访问你的网站

部署完成后，Vercel会提供一个URL，例如：`https://your-project.vercel.app`

管理员登录：`https://your-project.vercel.app/admin`
- 邮箱：`admin@textbook.com`
- 密码：`admin123`

---

## 重要：不上传到GitHub的内容

以下内容**绝对不要**上传到GitHub：

```
data/           # 数据库文件（包含所有数据！）
uploads/        # 用户上传的文件
node_modules/   # 依赖包
.env            # 环境变量文件
*.log           # 日志文件
.DS_Store       # Mac系统文件
Thumbs.db       # Windows系统文件
```

项目已配置 `.gitignore`，这些文件默认会被忽略。

---

## 如需完整持久化功能

当前部署适合演示使用。如需完整功能（数据持久化 + 真实文件上传），建议：

1. **数据库**：接入 [Turso](https://turso.tech) (免费网络SQLite)
2. **文件存储**：使用 [Cloudinary](https://cloudinary.com) 或 AWS S3
3. **或者**：部署到传统VPS（如阿里云、腾讯云）

---

## 本地开发

```bash
npm install
npm run dev
```

访问 http://localhost:3000
