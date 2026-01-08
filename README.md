# 贪吃蛇游戏 (Snail Snake Game)

一个基于 Flask 和现代 Web 技术构建的贪吃蛇游戏。结合了经典玩法与现代设计美学，提供丰富的视觉体验和社交功能。

## 🌟 功能特性

### 🎮 游戏体验
- **经典玩法**：流畅的贪吃蛇移动和控制体验
- **现代美学**：毛玻璃（Glassmorphism）UI 设计，炫酷的光效和动画
- **关卡系统**：包含"新手村"到"传说之境"多个难度级别，随分数自动升级
- **卡通风格**：萌系卡通蛇头（随方向旋转）和多种可爱食物（🍎 苹果、🐭 小老鼠）
- **颤动反馈**：碰撞时的屏幕颤动特效

### 🎨 个性化定制
- **颜色自定义**：用户可自由选择蛇身主色和界面背景色
- **实时预览**：颜色修改即时生效，支持光晕和渐变效果

### 🏆 社交与竞技
- **全球排行榜**：实时展示顶尖玩家排名
- **个人统计**：记录最高分、总游玩次数和平均时长
- **成绩分享**：一键生成成绩分享文本

---

## 🚀 快速开始

### 环境要求
- Python 3.8+
- pip

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd snail
   ```

2. **创建虚拟环境**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # macOS/Linux
   # .venv\Scripts\activate   # Windows
   ```

3. **安装依赖**
   ```bash
   pip install -r requirements.txt
   ```

4. **运行游戏**
   ```bash
   python3 app.py
   ```
   游戏将在 http://localhost:5000 启动。

---

## 🛠️ 技术栈

- **后端**：Flask (Python)
- **数据库**：SQLite (SQLAlchemy)
- **前端**：HTML5 Canvas, Tailwind CSS, Vanilla JavaScript
- **设计**：Glassmorphism (毛玻璃), CSS3 Animations

## 📁 目录结构

```
snail/
├── app.py              # Flask 应用入口
├── models.py           # 数据库模型
├── database.py         # 数据库连接
├── requirements.txt    # 项目依赖
├── static/
│   ├── css/            # 样式文件
│   ├── js/             # 游戏逻辑 (game.js)
│   └── images/         # 游戏素材 (蛇头、食物)
└── templates/          # HTML 模板
```

## 🎮 操作指南

- **开始/暂停**：空格键 (Space)
- **移动**：W / A / S / D 或 方向键
- **重新开始**：游戏结束点击"再来一局"

---

## 📝 许可证

MIT License
