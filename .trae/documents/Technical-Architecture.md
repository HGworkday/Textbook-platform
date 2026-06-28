# 多媒体互动数学教材 - 技术架构文档

## 1. 架构设计

```
┌─────────────────────────────────────────┐
│              前端层 (HTML/CSS/JS)        │
│  单页面应用 + Canvas/SVG 图形渲染         │
├─────────────────────────────────────────┤
│              样式层 (CSS3)               │
│  CSS变量 + 动画 + 响应式媒体查询          │
├─────────────────────────────────────────┤
│              交互层 (Vanilla JS)         │
│  事件处理 + 状态管理 + 动画控制           │
├─────────────────────────────────────────┤
│              数学引擎                    │
│  Math.js 公式渲染 + 自定义Canvas绑定      │
└─────────────────────────────────────────┘
```

## 2. 技术选型

- **前端框架**：纯 HTML5 + CSS3 + Vanilla JavaScript（无框架依赖）
- **图形渲染**：HTML5 Canvas API + SVG
- **数学公式**：KaTeX（用于公式渲染）
- **动画库**：CSS3 Animations + requestAnimationFrame
- **构建工具**：无需（单文件部署）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 首页 - 学科导航与精选内容 |
| /geometry | 几何篇 - 交互式几何作图 |
| /functions | 函数篇 - 动态函数图像 |
| /probability | 概率统计 - 模拟实验 |
| /calculus | 微积分 - 导数与积分演示 |

## 4. 页面结构

```
index.html
├── CSS内嵌样式
│   ├── 全局样式（变量、重置、排版）
│   ├── 组件样式（卡片、按钮、导航）
│   └── 页面特定样式
├── HTML结构
│   ├── 导航栏
│   ├── 主内容区
│   │   ├── Hero区域
│   │   ├── 学科导航
│   │   └── 精选内容
│   └── 页脚
└── JavaScript
    ├── 导航控制
    ├── 卡片交互
    └── 动画控制
```

## 5. 数据模型

本项目为纯前端项目，使用 localStorage 存储用户进度：

```javascript
// 用户进度结构
{
  "userProgress": {
    "geometry": { "completed": ["triangle", "circle"], "lastVisit": "2026-06-27" },
    "functions": { "completed": ["linear", "quadratic"], "lastVisit": "2026-06-26" }
  }
}
```

## 6. 性能优化

- 图片使用 CSS 渐变替代，减少HTTP请求
- Canvas 动画使用 requestAnimationFrame
- 延迟加载非首屏内容
- CSS 动画使用 transform 和 opacity 触发GPU加速
