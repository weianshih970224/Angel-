/**
 * 貓咪食星者 (Cat & Fruits) - 遊戲邏輯程式碼
 * 開發者：Antigravity (v2.0)
 */

// 1. 初始化遊戲實體與變數
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const timerElement = document.getElementById('timer');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const startOverlay = document.getElementById('start-overlay');
const gameOverModal = document.getElementById('game-over-modal');
const loveWordDiv = document.getElementById('love-word');
const levelUpModal = document.getElementById('level-up-modal');
const levelUpText = document.getElementById('level-up-text');

// 設定 Canvas 寬高
canvas.width = 600;
canvas.height = 400;

// 2. 載入資產
const catImg = new Image();
catImg.src = 'assets/cat.png';

const fruitImages = [];
const fruitSources = [
    'assets/apple.png',
    'assets/banana.png',
    'assets/grape.png',
    'assets/pear.png'
];

let fruitsLoadedCount = 0;
fruitSources.forEach(src => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
        fruitsLoadedCount++;
    };
    fruitImages.push(img);
});

// 載入炸彈圖片
const bombImg = new Image();
bombImg.src = 'assets/bomb.png';

let gameRunning = false;
let score = 0;
let level = 1;
let timeLeft = 60; // 每關 60 秒
let animationId;
let levelInterval;
const obstacles = [];
const keys = {};

// 3. 土味情話資料庫
const loveWords = [
    "「你有打火機嗎？」『沒有。』「那你是怎麼點燃我的心的？」",
    "「你屬什麼？」『我屬兔。』「不，你屬於我。」",
    "「你知道我為什麼最近感冒了嗎？」『因為著涼了？』「不，因為我對你完全沒有抵抗力。」",
    "「你知道我的心在哪邊嗎？」『左邊？』「不，在你那邊。」",
    "「莫文蔚的陰天，孫燕姿的雨天，周杰倫的晴天，都不如你和我聊天。」",
    "「你是哪裡人？」『台灣人。』「不，你是我的心上人。」",
    "「我懷疑你是碳酸飲料。」『為什麼？』「因為我一見到你，就開心地冒泡。」",
    "「你知道你和星星有什麼區別嗎？」『星星在天上，我在地上？』「不，星星在天上，你在我心裡。」",
    "「最近有謠言說我喜歡你，我要澄清一下，那不是謠言。」"
];

// 4. 遊戲物件定義
const player = {
    x: canvas.width / 2,
    y: canvas.height - 70,
    width: 60,
    height: 60,
    speed: 6,
    draw() {
        if (catImg.complete) {
            // 移除發光效果以避免與背景融合不良
            ctx.shadowBlur = 0;
            ctx.drawImage(catImg, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        } else {
            // 備用方案：如果圖片沒載入，畫個圓圈
            ctx.beginPath();
            ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
            ctx.fillStyle = '#38bdf8';
            ctx.fill();
        }
    }
};

class Obstacle {
    constructor() {
        this.size = 50; // 稍微放大一點點
        this.x = Math.random() * (canvas.width - this.size);
        this.y = -this.size;
        this.speed = Math.random() * 2 + 1.5 + (level * 1.2);

        // 決定是產生炸彈還是水果，假設炸彈的機率是 25%
        this.isBomb = Math.random() < 0.25;

        if (!this.isBomb) {
            // 如果是水果，隨機選取不同的水果圖片索引 (0-3)
            this.fruitIndex = Math.floor(Math.random() * fruitImages.length);
        }
    }
    draw() {
        ctx.shadowBlur = 0;

        if (this.isBomb) {
            if (bombImg.complete) {
                ctx.drawImage(bombImg, this.x, this.y, this.size, this.size);
            } else {
                ctx.fillStyle = '#000000'; // 備用炸彈為黑色方塊
                ctx.fillRect(this.x, this.y, this.size, this.size);
            }
        } else {
            const currentFruit = fruitImages[this.fruitIndex];
            if (currentFruit && currentFruit.complete) {
                ctx.drawImage(currentFruit, this.x, this.y, this.size, this.size);
            } else {
                ctx.fillStyle = '#f472b6'; // 備用水果為粉色方塊
                ctx.fillRect(this.x, this.y, this.size, this.size);
            }
        }
    }
    update() {
        this.y += this.speed;
    }
}

// 5. 控制邏輯
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function movePlayer() {
    if (keys['ArrowUp'] && player.y - player.height / 2 > 0) player.y -= player.speed;
    if (keys['ArrowDown'] && player.y + player.height / 2 < canvas.height) player.y += player.speed;
    if (keys['ArrowLeft'] && player.x - player.width / 2 > 0) player.x -= player.speed;
    if (keys['ArrowRight'] && player.x + player.width / 2 < canvas.width) player.x += player.speed;
}

// 6. 核心遊戲循環
function update() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    movePlayer();
    player.draw();

    // 處理障礙物生成頻率隨等級提升
    const spawnChance = 0.02 + (level * 0.01);
    if (Math.random() < spawnChance) {
        obstacles.push(new Obstacle());
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.update();
        obs.draw();

        // 碰撞偵測 (貓咪是矩形碰撞塊稍微縮小一點以增加容錯)
        if (
            player.x - player.width / 3 < obs.x + obs.size &&
            player.x + player.width / 3 > obs.x &&
            player.y - player.height / 3 < obs.y + obs.size &&
            player.y + player.height / 3 > obs.y
        ) {
            if (obs.isBomb) {
                // 吃到炸彈，遊戲結束
                endGame();
            } else {
                // 吃到水果，加分並移除
                obstacles.splice(i, 1);
                score += 10;
                scoreElement.innerText = score;
            }
            // 已發生碰撞，不再判斷是否跑出畫面
            continue;
        }

        // 移除超出螢幕的障礙物 (但不加分)
        if (obs.y > canvas.height) {
            obstacles.splice(i, 1);
        }
    }

    animationId = requestAnimationFrame(update);
}

// 7. 關卡與計時邏輯
function startLevelTimer() {
    levelInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            levelUp();
        }
        updateTimerDisplay();
    }, 1000);
}

function levelUp() {
    level++;
    timeLeft = 60;
    levelElement.innerText = level;
    // 增加過關特效提示 (可選)
    console.log("Level Up! Current Level: " + level);
    
    // 更新並顯示過關訊息
    levelUpText.innerText = `angel 小野貓 第 ${level} 關`;
    
    // 重新觸發 CSS 動畫
    levelUpText.style.animation = 'none';
    levelUpText.offsetHeight; // trigger reflow
    levelUpText.style.animation = null;
    
    levelUpModal.classList.remove('hidden');
    
    // 2秒後自動隱藏過關提示
    setTimeout(() => {
        levelUpModal.classList.add('hidden');
    }, 2000);
}

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    timerElement.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 8. 遊戲流程控制
function startGame() {
    gameRunning = true;
    score = 0;
    level = 1;
    timeLeft = 60;

    scoreElement.innerText = score;
    levelElement.innerText = level;
    updateTimerDisplay();

    obstacles.length = 0;
    player.x = canvas.width / 2;
    player.y = canvas.height - 70;

    startOverlay.style.display = 'none';
    gameOverModal.classList.add('hidden');
    levelUpModal.classList.add('hidden');

    if (levelInterval) clearInterval(levelInterval);
    startLevelTimer();

    update();
}

function endGame() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    if (levelInterval) clearInterval(levelInterval);

    // 隨機選取一句土味情話
    const randomQuote = loveWords[Math.floor(Math.random() * loveWords.length)];
    loveWordDiv.innerText = randomQuote;

    gameOverModal.classList.remove('hidden');
    levelUpModal.classList.add('hidden');
}

// 事件綁定
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// 初始化畫布
catImg.onload = () => {
    player.draw();
};
