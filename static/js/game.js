/**
 * 贪吃蛇游戏 - 核心逻辑
 * 包含游戏状态管理、蛇的移动、碰撞检测、食物生成、关卡系统等
 */

// ==================== 关卡配置 ====================

const LEVELS = [
    { name: '新手村', speed: 180, scoreTarget: 50, color: { start: '#00FF41', end: '#00CC33' } },
    { name: '青铜挑战', speed: 150, scoreTarget: 120, color: { start: '#00D9FF', end: '#0099CC' } },
    { name: '白银战场', speed: 130, scoreTarget: 200, color: { start: '#9B59B6', end: '#8E44AD' } },
    { name: '黄金竞技', speed: 110, scoreTarget: 300, color: { start: '#F1C40F', end: '#F39C12' } },
    { name: '铂金巅峰', speed: 90, scoreTarget: 420, color: { start: '#E74C3C', end: '#C0392B' } },
    { name: '钻石王者', speed: 70, scoreTarget: 560, color: { start: '#FF6B9D', end: '#C44569' } },
    { name: '传说之境', speed: 55, scoreTarget: Infinity, color: { start: '#FFD700', end: '#FF4500' } },
];

// ==================== 游戏配置 ====================

const CONFIG = {
    // 画布尺寸
    CANVAS_WIDTH: 600,
    CANVAS_HEIGHT: 600,
    // 格子大小
    CELL_SIZE: 20,
    // 颜色配置
    COLORS: {
        background: '#121212',
        grid: '#1a1a1a',
        food: '#FF4136',
        foodGlow: 'rgba(255, 65, 54, 0.3)',
    },
    // 蛇身渐变色配置（用户可自定义）
    SNAKE_GRADIENT: {
        // 头部颜色
        headStart: '#00FF41',
        headEnd: '#00CC33',
        // 身体渐变色数组（从头到尾）
        bodyColors: ['#00FF41', '#00D9FF', '#9B59B6', '#FF6B9D'],
    }
};

// ==================== 用户颜色配置 ====================

const USER_COLORS = {
    // 蛇身主色（用户自定义）
    snakeColor: '#00FF41',
    // 背景毛玻璃颜色
    bgColor: '#1E1E1E',
};

// ==================== 图像资源 ====================

const IMAGES = {
    // 蛇头图像（根据方向旋转）
    snakeHead: null,
    snakeHeadLoaded: false,
    // 食物图像数组
    foods: [],
    foodsLoaded: false,
    // 当前食物索引
    currentFoodIndex: 0,
};

// ==================== 游戏状态 ====================

let gameState = {
    // 蛇身体数组，每个元素是 {x, y}
    snake: [],
    // 移动方向
    direction: { x: 1, y: 0 },
    // 下一个方向（防止快速按键导致反向）
    nextDirection: { x: 1, y: 0 },
    // 食物位置
    food: { x: 0, y: 0 },
    // 当前得分
    score: 0,
    // 当前关卡（0-based）
    currentLevel: 0,
    // 游戏运行状态
    isRunning: false,
    // 游戏是否结束
    isGameOver: false,
    // 是否暂停
    isPaused: false,
    // 当前速度
    currentSpeed: LEVELS[0].speed,
    // 游戏循环ID
    gameLoopId: null,
    // 会话ID
    sessionId: null,
};

// Canvas 和上下文
let canvas, ctx;

// 格子数量
const GRID_WIDTH = CONFIG.CANVAS_WIDTH / CONFIG.CELL_SIZE;
const GRID_HEIGHT = CONFIG.CANVAS_HEIGHT / CONFIG.CELL_SIZE;

// ==================== 初始化 ====================

/**
 * 预加载游戏图像资源
 */
function preloadImages() {
    // 加载蛇头图像
    IMAGES.snakeHead = new Image();
    IMAGES.snakeHead.onload = () => {
        IMAGES.snakeHeadLoaded = true;
        console.log('蛇头图像加载完成');
        // 重新绘制以显示图像
        if (canvas && ctx) drawGame();
    };
    IMAGES.snakeHead.onerror = () => {
        console.warn('蛇头图像加载失败，将使用默认绘制');
    };
    IMAGES.snakeHead.src = '/static/images/snake_head.png';

    // 加载食物图像
    const foodPaths = [
        '/static/images/food_apple.png',
        '/static/images/food_mouse.png'
    ];

    foodPaths.forEach((path, index) => {
        const img = new Image();
        img.onload = () => {
            IMAGES.foods[index] = img;
            if (IMAGES.foods.filter(Boolean).length === foodPaths.length) {
                IMAGES.foodsLoaded = true;
                console.log('食物图像全部加载完成');
                if (canvas && ctx) drawGame();
            }
        };
        img.onerror = () => {
            console.warn(`食物图像 ${path} 加载失败`);
        };
        img.src = path;
    });
}

/**
 * 从 localStorage 加载用户颜色配置
 */
function loadUserColors() {
    const saved = localStorage.getItem('snakeGameColors');
    if (saved) {
        try {
            const colors = JSON.parse(saved);
            USER_COLORS.snakeColor = colors.snakeColor || USER_COLORS.snakeColor;
            USER_COLORS.bgColor = colors.bgColor || USER_COLORS.bgColor;
        } catch (e) {
            console.warn('加载颜色配置失败:', e);
        }
    }
}

/**
 * 保存用户颜色配置到 localStorage
 */
function saveUserColors() {
    localStorage.setItem('snakeGameColors', JSON.stringify(USER_COLORS));
}

/**
 * 应用用户颜色到页面
 */
function applyUserColors() {
    // 将颜色转换为 CSS 变量
    document.documentElement.style.setProperty('--user-snake-color', USER_COLORS.snakeColor);
    document.documentElement.style.setProperty('--user-bg-color', USER_COLORS.bgColor);

    // 将 hex 转换为 rgb 以支持透明度
    const bgRgb = hexToRgb(USER_COLORS.bgColor);
    if (bgRgb) {
        document.documentElement.style.setProperty('--user-bg-color-rgb', `${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}`);
    }

    // 更新毛玻璃卡片背景色
    const glassCards = document.querySelectorAll('.glass-card');
    glassCards.forEach(card => {
        card.style.background = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, 0.6)`;
    });

    // 更新颜色选择器的值
    const snakePicker = document.getElementById('snake-color-picker');
    const bgPicker = document.getElementById('bg-color-picker');
    if (snakePicker) snakePicker.value = USER_COLORS.snakeColor;
    if (bgPicker) bgPicker.value = USER_COLORS.bgColor;
}

/**
 * 绑定颜色选择器事件
 */
function bindColorPickers() {
    const snakePicker = document.getElementById('snake-color-picker');
    const bgPicker = document.getElementById('bg-color-picker');

    if (snakePicker) {
        snakePicker.addEventListener('input', (e) => {
            USER_COLORS.snakeColor = e.target.value;
            saveUserColors();
            applyUserColors();
            // 重新绘制游戏以显示新颜色
            if (canvas && ctx) drawGame();
        });
    }

    if (bgPicker) {
        bgPicker.addEventListener('input', (e) => {
            USER_COLORS.bgColor = e.target.value;
            saveUserColors();
            applyUserColors();
        });
    }
}

/**
 * 初始化游戏
 */
function initGame() {
    // 获取 Canvas
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // 获取会话ID
    gameState.sessionId = document.getElementById('session-id')?.value;

    // 预加载图像资源
    preloadImages();

    // 加载用户颜色配置
    loadUserColors();
    applyUserColors();

    // 绑定颜色选择器事件
    bindColorPickers();

    // 绑定键盘事件
    document.addEventListener('keydown', handleKeyDown);

    // 绘制初始画面
    drawGame();

    // 初始化关卡显示
    updateLevelDisplay();
}

/**
 * 重置游戏状态
 */
function resetGame() {
    // 蛇初始位置在中央，长度为3
    const startX = Math.floor(GRID_WIDTH / 2);
    const startY = Math.floor(GRID_HEIGHT / 2);

    gameState.snake = [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY },
    ];

    // 重置方向
    gameState.direction = { x: 1, y: 0 };
    gameState.nextDirection = { x: 1, y: 0 };

    // 重置分数和关卡
    gameState.score = 0;
    gameState.currentLevel = 0;
    gameState.currentSpeed = LEVELS[0].speed;

    // 重置状态
    gameState.isRunning = false;
    gameState.isGameOver = false;
    gameState.isPaused = false;

    // 生成食物
    generateFood();

    // 更新UI
    updateScoreDisplay();
    updateLevelDisplay();
}

// ==================== 游戏控制 ====================

/**
 * 开始游戏
 */
function startGame() {
    if (gameState.isRunning) return;

    // 重置游戏
    resetGame();

    // 隐藏开始覆盖层
    document.getElementById('start-overlay').classList.add('hidden');
    document.getElementById('gameover-overlay').classList.add('hidden');

    // 更新状态显示
    document.getElementById('game-status').textContent = '游戏中';
    document.getElementById('game-status').classList.remove('text-accent-cyan');
    document.getElementById('game-status').classList.add('text-snake-green');

    // 开始游戏循环
    gameState.isRunning = true;
    gameLoop();
}

/**
 * 重新开始游戏
 */
async function restartGame() {
    // 请求新的会话ID
    try {
        const response = await fetch('/api/new_session', { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            gameState.sessionId = data.session_id;
        }
    } catch (error) {
        console.error('创建新会话失败:', error);
    }

    startGame();
}

/**
 * 暂停/继续游戏
 */
function togglePause() {
    if (!gameState.isRunning || gameState.isGameOver) return;

    gameState.isPaused = !gameState.isPaused;

    if (gameState.isPaused) {
        document.getElementById('game-status').textContent = '已暂停';
        document.getElementById('game-status').classList.remove('text-snake-green');
        document.getElementById('game-status').classList.add('text-yellow-400');
    } else {
        document.getElementById('game-status').textContent = '游戏中';
        document.getElementById('game-status').classList.remove('text-yellow-400');
        document.getElementById('game-status').classList.add('text-snake-green');
        gameLoop();
    }
}

/**
 * 触发画布颤动效果
 */
function triggerShakeEffect() {
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
        canvasContainer.classList.add('shake-effect');
        // 移除动画类，以便下次可以再次触发
        setTimeout(() => {
            canvasContainer.classList.remove('shake-effect');
        }, 500);
    }
}

/**
 * 游戏结束
 */
async function gameOver() {
    gameState.isRunning = false;
    gameState.isGameOver = true;

    // 清除游戏循环
    if (gameState.gameLoopId) {
        clearTimeout(gameState.gameLoopId);
    }

    // 触发颤动效果
    triggerShakeEffect();

    // 更新状态显示
    document.getElementById('game-status').textContent = '游戏结束';
    document.getElementById('game-status').classList.remove('text-snake-green');
    document.getElementById('game-status').classList.add('text-food-red');

    // 提交分数
    try {
        const response = await fetch('/api/submit_score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: gameState.sessionId,
                score: gameState.score
            })
        });

        const data = await response.json();

        if (data.success) {
            // 更新游戏结束界面
            document.getElementById('final-score').textContent = gameState.score;
            document.getElementById('beat-percentage').textContent = `${data.beat_percentage}%`;

            // 显示达到的关卡
            const levelName = LEVELS[gameState.currentLevel].name;
            document.getElementById('final-level').textContent = levelName;

            // 显示新纪录提示
            if (data.is_high_score && gameState.score > 0) {
                document.getElementById('new-record').classList.remove('hidden');
            } else {
                document.getElementById('new-record').classList.add('hidden');
            }

            // 更新用户统计
            document.getElementById('total-games').textContent = data.stats.total_games;
            document.getElementById('high-score').textContent = data.stats.high_score;

            // 刷新排行榜
            loadLeaderboard();
        }
    } catch (error) {
        console.error('提交分数失败:', error);
        document.getElementById('final-score').textContent = gameState.score;
        document.getElementById('beat-percentage').textContent = '0%';
    }

    // 显示游戏结束覆盖层
    document.getElementById('gameover-overlay').classList.remove('hidden');
}

// ==================== 游戏循环 ====================

/**
 * 游戏主循环
 */
function gameLoop() {
    if (!gameState.isRunning || gameState.isPaused) return;

    // 更新方向
    gameState.direction = { ...gameState.nextDirection };

    // 移动蛇
    moveSnake();

    // 检测碰撞
    if (checkCollision()) {
        gameOver();
        return;
    }

    // 检测是否吃到食物
    if (checkFoodCollision()) {
        eatFood();
    }

    // 绘制游戏
    drawGame();

    // 继续循环
    gameState.gameLoopId = setTimeout(gameLoop, gameState.currentSpeed);
}

/**
 * 移动蛇
 */
function moveSnake() {
    // 计算新头部位置
    const head = gameState.snake[0];
    const newHead = {
        x: head.x + gameState.direction.x,
        y: head.y + gameState.direction.y
    };

    // 将新头部添加到蛇身前面
    gameState.snake.unshift(newHead);

    // 移除尾部（如果没吃到食物）
    // 注意：吃到食物时不移除尾部，在 eatFood 中处理
    if (!checkFoodCollision()) {
        gameState.snake.pop();
    }
}

/**
 * 检测碰撞（墙壁和自身）
 */
function checkCollision() {
    const head = gameState.snake[0];

    // 检测墙壁碰撞
    if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
        return true;
    }

    // 检测自身碰撞（从第二节开始检查）
    for (let i = 1; i < gameState.snake.length; i++) {
        if (head.x === gameState.snake[i].x && head.y === gameState.snake[i].y) {
            return true;
        }
    }

    return false;
}

/**
 * 检测是否吃到食物
 */
function checkFoodCollision() {
    const head = gameState.snake[0];
    return head.x === gameState.food.x && head.y === gameState.food.y;
}

/**
 * 吃到食物
 */
function eatFood() {
    // 增加分数
    gameState.score += 10;
    updateScoreDisplay();

    // 检查是否升级关卡
    checkLevelUp();

    // 生成新食物
    generateFood();
}

/**
 * 检查并处理关卡升级
 */
function checkLevelUp() {
    const currentLevel = gameState.currentLevel;
    const currentLevelConfig = LEVELS[currentLevel];

    // 检查是否达到当前关卡目标分数
    if (gameState.score >= currentLevelConfig.scoreTarget && currentLevel < LEVELS.length - 1) {
        // 升级到下一关
        gameState.currentLevel++;
        const newLevelConfig = LEVELS[gameState.currentLevel];
        gameState.currentSpeed = newLevelConfig.speed;

        // 更新关卡显示
        updateLevelDisplay();

        // 显示升级提示
        showLevelUpNotification(newLevelConfig.name);
    }
}

/**
 * 显示关卡升级提示
 */
function showLevelUpNotification(levelName) {
    const notification = document.getElementById('level-up-notification');
    if (notification) {
        notification.querySelector('.level-name').textContent = levelName;
        notification.classList.remove('hidden');
        notification.classList.add('animate-level-up');

        setTimeout(() => {
            notification.classList.add('hidden');
            notification.classList.remove('animate-level-up');
        }, 2000);
    }
}

/**
 * 生成食物
 */
function generateFood() {
    let newFood;
    let isOnSnake;

    // 确保食物不会生成在蛇身上
    do {
        isOnSnake = false;
        newFood = {
            x: Math.floor(Math.random() * GRID_WIDTH),
            y: Math.floor(Math.random() * GRID_HEIGHT)
        };

        for (const segment of gameState.snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                isOnSnake = true;
                break;
            }
        }
    } while (isOnSnake);

    gameState.food = newFood;

    // 随机选择食物类型
    if (IMAGES.foods.length > 0) {
        IMAGES.currentFoodIndex = Math.floor(Math.random() * IMAGES.foods.length);
    }
}

// ==================== 绘制函数 ====================

/**
 * 绘制游戏画面
 */
function drawGame() {
    // 清空画布
    ctx.fillStyle = CONFIG.COLORS.background;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // 绘制网格
    drawGrid();

    // 绘制食物
    drawFood();

    // 绘制蛇
    drawSnake();
}

/**
 * 绘制网格
 */
function drawGrid() {
    ctx.strokeStyle = CONFIG.COLORS.grid;
    ctx.lineWidth = 0.5;

    // 垂直线
    for (let x = 0; x <= CONFIG.CANVAS_WIDTH; x += CONFIG.CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
        ctx.stroke();
    }

    // 水平线
    for (let y = 0; y <= CONFIG.CANVAS_HEIGHT; y += CONFIG.CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CONFIG.CANVAS_WIDTH, y);
        ctx.stroke();
    }
}

/**
 * 颜色插值函数
 */
function interpolateColor(color1, color2, factor) {
    // 解析颜色
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);

    // 插值计算
    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);

    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * 十六进制颜色转 RGB
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

/**
 * 获取蛇身颜色（结合用户自定义颜色和关卡颜色）
 */
function getSnakeColor(index, total) {
    const level = LEVELS[gameState.currentLevel];
    const factor = index / Math.max(total - 1, 1);

    // 使用用户自定义颜色作为起始色，渐变到关卡结束色
    const startColor = USER_COLORS.snakeColor || level.color.start;
    return interpolateColor(startColor, level.color.end, factor);
}

/**
 * 绘制蛇
 */
function drawSnake() {
    const total = gameState.snake.length;

    gameState.snake.forEach((segment, index) => {
        const x = segment.x * CONFIG.CELL_SIZE;
        const y = segment.y * CONFIG.CELL_SIZE;

        // 获取渐变颜色
        const color = getSnakeColor(index, total);

        // 头部使用卡通图像
        if (index === 0) {
            if (IMAGES.snakeHeadLoaded && IMAGES.snakeHead) {
                // 使用卡通蛇头图像
                ctx.save();

                // 移动到蛇头中心点
                const centerX = x + CONFIG.CELL_SIZE / 2;
                const centerY = y + CONFIG.CELL_SIZE / 2;
                ctx.translate(centerX, centerY);

                // 根据方向旋转图像
                let rotation = 0;
                if (gameState.direction.x === 1) rotation = 0;          // 向右（原始方向）
                else if (gameState.direction.x === -1) rotation = Math.PI;   // 向左
                else if (gameState.direction.y === 1) rotation = Math.PI / 2;  // 向下
                else if (gameState.direction.y === -1) rotation = -Math.PI / 2; // 向上

                ctx.rotate(rotation);

                // 添加发光效果
                ctx.shadowColor = color;
                ctx.shadowBlur = 15;

                // 绘制蛇头图像（稍微放大以覆盖格子）
                const headSize = CONFIG.CELL_SIZE * 1.4;
                ctx.drawImage(
                    IMAGES.snakeHead,
                    -headSize / 2,
                    -headSize / 2,
                    headSize,
                    headSize
                );

                ctx.restore();
            } else {
                // 回退到默认绘制（图像未加载时）
                ctx.shadowColor = color;
                ctx.shadowBlur = 15;
                ctx.fillStyle = color;
                ctx.fillRect(x + 1, y + 1, CONFIG.CELL_SIZE - 2, CONFIG.CELL_SIZE - 2);

                // 绘制眼睛
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#000';
                let eyeOffset = 5;
                let eyeSize = 3;

                if (gameState.direction.x === 1) {
                    ctx.fillRect(x + CONFIG.CELL_SIZE - eyeOffset - eyeSize, y + 4, eyeSize, eyeSize);
                    ctx.fillRect(x + CONFIG.CELL_SIZE - eyeOffset - eyeSize, y + CONFIG.CELL_SIZE - 7, eyeSize, eyeSize);
                } else if (gameState.direction.x === -1) {
                    ctx.fillRect(x + eyeOffset, y + 4, eyeSize, eyeSize);
                    ctx.fillRect(x + eyeOffset, y + CONFIG.CELL_SIZE - 7, eyeSize, eyeSize);
                } else if (gameState.direction.y === 1) {
                    ctx.fillRect(x + 4, y + CONFIG.CELL_SIZE - eyeOffset - eyeSize, eyeSize, eyeSize);
                    ctx.fillRect(x + CONFIG.CELL_SIZE - 7, y + CONFIG.CELL_SIZE - eyeOffset - eyeSize, eyeSize, eyeSize);
                } else {
                    ctx.fillRect(x + 4, y + eyeOffset, eyeSize, eyeSize);
                    ctx.fillRect(x + CONFIG.CELL_SIZE - 7, y + eyeOffset, eyeSize, eyeSize);
                }
            }
        } else {
            // 身体使用渐变色，透明度从头到尾递减
            const alpha = 1 - (index / total) * 0.3;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.fillRect(x + 2, y + 2, CONFIG.CELL_SIZE - 4, CONFIG.CELL_SIZE - 4);
            ctx.globalAlpha = 1;

            // 边框（使用相同颜色但更深）
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1, y + 1, CONFIG.CELL_SIZE - 2, CONFIG.CELL_SIZE - 2);
        }
    });

    // 重置阴影
    ctx.shadowBlur = 0;
}

/**
 * 绘制食物
 */
function drawFood() {
    const x = gameState.food.x * CONFIG.CELL_SIZE;
    const y = gameState.food.y * CONFIG.CELL_SIZE;
    const centerX = x + CONFIG.CELL_SIZE / 2;
    const centerY = y + CONFIG.CELL_SIZE / 2;

    // 检查食物图像是否加载
    if (IMAGES.foodsLoaded && IMAGES.foods[IMAGES.currentFoodIndex]) {
        const foodImg = IMAGES.foods[IMAGES.currentFoodIndex];

        // 发光效果
        ctx.shadowColor = CONFIG.COLORS.food;
        ctx.shadowBlur = 15;

        // 绘制食物图像（稍微放大）
        const foodSize = CONFIG.CELL_SIZE * 1.3;
        ctx.drawImage(
            foodImg,
            centerX - foodSize / 2,
            centerY - foodSize / 2,
            foodSize,
            foodSize
        );
    } else {
        // ... fallback ...
        ctx.shadowColor = CONFIG.COLORS.food;
        ctx.shadowBlur = 15;
        ctx.fillStyle = CONFIG.COLORS.food;
        ctx.beginPath();
        ctx.arc(centerX, centerY, CONFIG.CELL_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(centerX - 2, centerY - 2, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.shadowBlur = 0;
}

// ==================== 输入处理 ====================

/**
 * 处理键盘按键事件
 */
function handleKeyDown(e) {
    if (e.code === 'Space') {
        e.preventDefault(); // 防止滚动页面
        if (gameState.isGameOver) {
            restartGame();
        } else if (!gameState.isRunning) {
            startGame();
        } else {
            togglePause();
        }
        return;
    }

    // 防止在用户名字段打字时触发
    if (e.target.tagName === 'INPUT') return;

    if (!gameState.isRunning || gameState.isPaused) return;

    // 防止方向键滚动页面
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }

    const { x, y } = gameState.direction;

    switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
            if (y === 0) gameState.nextDirection = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
        case 'KeyS':
            if (y === 0) gameState.nextDirection = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
        case 'KeyA':
            if (x === 0) gameState.nextDirection = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
        case 'KeyD':
            if (x === 0) gameState.nextDirection = { x: 1, y: 0 };
            break;
    }
}

// ==================== UI 更新 ====================

/**
 * 更新分数显示
 */
function updateScoreDisplay() {
    document.getElementById('current-score').textContent = gameState.score;
    // 添加跳动动画
    const scoreEl = document.getElementById('current-score');
    scoreEl.classList.remove('number-pop');
    void scoreEl.offsetWidth; // 触发回流
    scoreEl.classList.add('number-pop');
}

/**
 * 更新关卡显示
 */
function updateLevelDisplay() {
    const levelConfig = LEVELS[gameState.currentLevel];
    document.getElementById('level-number').textContent = gameState.currentLevel + 1;
    document.getElementById('level-name').textContent = levelConfig.name;

    // 更新进度条
    const currentScore = gameState.score;
    const targetScore = levelConfig.scoreTarget;
    let progress = 0;

    // 如果是最后一关
    if (gameState.currentLevel === LEVELS.length - 1) {
        progress = 100;
    } else {
        // 计算上一关的目标分数作为基准
        const prevTarget = gameState.currentLevel > 0 ? LEVELS[gameState.currentLevel - 1].scoreTarget : 0;
        const currentLevelRange = targetScore - prevTarget;
        const scoreInLevel = currentScore - prevTarget;
        progress = Math.min(100, Math.max(0, (scoreInLevel / currentLevelRange) * 100));
    }

    document.getElementById('level-progress').style.width = `${progress}%`;
}
