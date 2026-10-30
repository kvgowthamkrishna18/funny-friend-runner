
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const bestEl = document.getElementById('bestScore');

const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const jumpBtn = document.getElementById('jumpBtn');
const soundBtn = document.getElementById('soundBtn');
const music = document.getElementById('bgMusic');

// Images and sounds
const friendImg = new Image();
friendImg.src = 'friend.png';

let friendReady = false;
friendImg.onload = () => friendReady = true;

const defeatImg = new Image();
defeatImg.src = 'gameover.jpeg';

const defeatSound = new Audio('defeat.mp3');
defeatSound.volume = 0.9;

let musicEnabled = false;

// Game variables
let running = false;
let score = 0;
let best = Number(localStorage.getItem('massFriendBest') || 0);
let frame = 0;
let speed = 5;
let obstacles = [];
let clouds = [];
let animationId;

let player = {
    x: 105,
    y: 300,
    w: 72,
    h: 82,
    vy: 0,
    grounded: true
};

const groundY = 382;

bestEl.textContent = best;

// Defeat screen styling
const defeatStyle = document.createElement('style');

defeatStyle.textContent = `
    .overlay-card.defeat-card {
        width: min(650px, 96%);
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 22px;
        padding: 25px;
        text-align: left;
        overflow: visible;
    }

    .defeat-photo {
        width: 180px;
        height: 180px;
        flex-shrink: 0;
        object-fit: cover;
        border-radius: 20px;
        opacity: 0;
        animation: defeatZoom 1.6s ease-in-out forwards;
    }

    @keyframes defeatZoom {
        0% {
            opacity: 0;
            transform: scale(0.1);
        }
        35% {
            opacity: 1;
            transform: scale(3.2);
        }
        70% {
            opacity: 1;
            transform: scale(0.75);
        }
        100% {
            opacity: 1;
            transform: scale(1);
        }
    }

    .defeat-content {
        flex: 1;
        min-width: 0;
    }

    .defeat-title {
        opacity: 0;
        font-family: 'Baloo 2', cursive;
        font-size: clamp(22px, 4vw, 34px);
        line-height: 1.15;
        margin: 0 0 10px;
        animation: showDefeatText 0.6s ease forwards;
        animation-delay: 1.65s;
    }

    .defeat-message {
        opacity: 0;
        color: #6f687e;
        margin: 5px 0 18px;
        animation: showDefeatText 0.6s ease forwards;
        animation-delay: 1.9s;
    }

    .defeat-content .main-btn {
        opacity: 0;
        animation: showDefeatText 0.6s ease forwards;
        animation-delay: 2.1s;
    }

    @keyframes showDefeatText {
        from {
            opacity: 0;
            transform: translateY(12px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @media(max-width: 520px) {
        .overlay-card.defeat-card {
            gap: 12px;
            padding: 15px;
        }

        .defeat-photo {
            width: 110px;
            height: 140px;
        }

        .defeat-title {
            font-size: 21px;
        }

        .defeat-message {
            font-size: 12px;
        }
    }
`;

document.head.appendChild(defeatStyle);

// Clouds
for (let i = 0; i < 5; i++) {
    clouds.push({
        x: i * 220 + 40,
        y: 45 + (i % 3) * 35,
        s: 0.7 + (i % 2) * 0.25
    });
}

function roundedRect(x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
}

function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, 420);
    sky.addColorStop(0, '#8edfff');
    sky.addColorStop(1, '#e7fbff');

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 900, 420);

    ctx.fillStyle = '#9bdcaa';
    ctx.beginPath();
    ctx.moveTo(0, 330);

    for (let x = 0; x <= 900; x += 100) {
        ctx.quadraticCurveTo(x + 50, 250 + (x % 200), x + 100, 330);
    }

    ctx.lineTo(900, 420);
    ctx.lineTo(0, 420);
    ctx.fill();

    clouds.forEach(c => {
        ctx.fillStyle = '#ffffffcc';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 22 * c.s, 0, Math.PI * 2);
        ctx.arc(c.x + 22 * c.s, c.y - 10 * c.s, 28 * c.s, 0, Math.PI * 2);
        ctx.arc(c.x + 48 * c.s, c.y, 20 * c.s, 0, Math.PI * 2);
        ctx.fill();

        if (running) {
            c.x -= 0.35;
            if (c.x < -80) c.x = 950;
        }
    });

    ctx.fillStyle = '#5acb83';
    ctx.fillRect(0, groundY, 900, 38);

    ctx.fillStyle = '#319c62';
    ctx.fillRect(0, groundY + 29, 900, 9);

    ctx.strokeStyle = '#ffffff77';
    ctx.lineWidth = 3;

    for (let x = 0; x < 900; x += 55) {
        ctx.beginPath();
        ctx.moveTo(x - (frame * speed * 0.7 % 55), groundY + 12);
        ctx.lineTo(x + 18 - (frame * speed * 0.7 % 55), groundY + 12);
        ctx.stroke();
    }
}

function drawPlayer() {
    ctx.fillStyle = '#29485b33';
    ctx.beginPath();
    ctx.ellipse(player.x + 36, groundY + 3, 35, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    if (friendReady) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(player.x + 36, player.y + 35, 34, 0, Math.PI * 2);
        ctx.clip();

        ctx.drawImage(friendImg, player.x + 2, player.y + 1, 68, 68);
        ctx.restore();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(player.x + 36, player.y + 35, 35, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        roundedRect(player.x + 5, player.y + 4, 62, 65, 18, '#ffcf66');
        ctx.font = '42px sans-serif';
        ctx.fillText('😎', player.x + 10, player.y + 53);
    }

    ctx.strokeStyle = '#33264f';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';

    const legSwing = Math.sin(frame * 0.35) * 7;

    ctx.beginPath();
    ctx.moveTo(player.x + 25, player.y + 68);
    ctx.lineTo(player.x + 20 + legSwing, player.y + 80);

    ctx.moveTo(player.x + 48, player.y + 68);
    ctx.lineTo(player.x + 53 - legSwing, player.y + 80);
    ctx.stroke();

    ctx.font = 'bold 13px Nunito';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#33264f';
    ctx.fillText('MASS RA!', player.x + 36, player.y - 7);
}

function drawObstacle(o) {
    ctx.save();
    ctx.translate(o.x, o.y);

    if (o.type === 0) {
        roundedRect(0, 0, 42, 43, 9, '#ff6b8e');
        ctx.font = '27px sans-serif';
        ctx.fillText('📚', 4, 31);
    } else if (o.type === 1) {
        roundedRect(0, 0, 48, 38, 12, '#ffd166');
        ctx.font = '27px sans-serif';
        ctx.fillText('🩴', 7, 29);
    } else {
        roundedRect(0, 0, 46, 43, 10, '#9a82ef');
        ctx.font = '27px sans-serif';
        ctx.fillText('🥥', 7, 31);
    }

    ctx.restore();
}

function spawnObstacle() {
    const type = Math.floor(Math.random() * 3);

    obstacles.push({
        x: 930,
        y: groundY - 43,
        w: type === 1 ? 48 : 46,
        h: 43,
        type
    });
}

function jump() {
    if (!running) return;

    if (player.grounded) {
        player.vy = -14.5;
        player.grounded = false;
    }
}

function collision(a, b) {
    return a.x + player.w - 18 > b.x + 7 &&
        a.x + 18 < b.x + b.w - 7 &&
        a.y + player.h - 8 > b.y + 6 &&
        a.y + 12 < b.y + b.h;
}

function draw() {
    drawBackground();
    obstacles.forEach(drawObstacle);
    drawPlayer();
}

function loop() {
    if (!running) return;

    frame++;

    player.y += player.vy;
    player.vy += 0.72;

    if (player.y + player.h >= groundY) {
        player.y = groundY - player.h;
        player.vy = 0;
        player.grounded = true;
    }

    if (frame % Math.max(48, 95 - Math.floor(score / 100)) === 0) {
        spawnObstacle();
    }

    obstacles.forEach(o => o.x -= speed);
    obstacles = obstacles.filter(o => o.x > -70);

    score++;
    speed = 5 + Math.min(5, score / 500);

    scoreEl.textContent = Math.floor(score / 5);
    levelEl.textContent = 1 + Math.floor(score / 500);

    for (const o of obstacles) {
        if (collision(player, o)) {
            gameOver();
            return;
        }
    }

    draw();
    animationId = requestAnimationFrame(loop);
}

function startGame() {
    cancelAnimationFrame(animationId);

    // Stop defeat music when restarting
    defeatSound.pause();
    defeatSound.currentTime = 0;

    // Restore the normal starting screen
    overlay.innerHTML = `
        <div class="overlay-card">
            <div class="big-emoji">🤣</div>
            <h2>Ready ra, legend?</h2>
            <p>Jump over the obstacles. Don't let the gang roast you!</p>
            <button id="startBtn" class="main-btn" type="button">START GAME</button>
        </div>
    `;

    document.getElementById('startBtn').addEventListener('click', startGame);

    score = 0;
    frame = 0;
    speed = 5;
    obstacles = [];

    player.y = groundY - player.h;
    player.vy = 0;
    player.grounded = true;

    scoreEl.textContent = '0';
    levelEl.textContent = '1';

    overlay.classList.add('hidden');
    running = true;

    // Resume normal song only if music was enabled
    if (musicEnabled) {
        music.play().catch(() => {});
    }

    loop();
}

function gameOver() {
    running = false;
    cancelAnimationFrame(animationId);

    // Stop normal song completely
    music.pause();
    music.currentTime = 0;

    // Play only defeat sound
    defeatSound.currentTime = 0;
    defeatSound.play().catch(() => {});

    const finalScore = Math.floor(score / 5);

    if (finalScore > best) {
        best = finalScore;
        localStorage.setItem('massFriendBest', best);
        bestEl.textContent = best;
    }

    // Create defeat screen with photo on the side
    overlay.innerHTML = `
        <div class="overlay-card defeat-card">
            <img class="defeat-photo" src="gameover.jpeg" alt="Defeat photo">

            <div class="defeat-content">
                <h2 class="defeat-title">Appude out endhi ra puka 😂</h2>

                <p class="defeat-message">
                    You survived ${finalScore} points.
                    The gang is laughing… try again!
                </p>

                <button id="startBtn" class="main-btn" type="button">
                    PLAY AGAIN
                </button>
            </div>
        </div>
    `;

    document.getElementById('startBtn').addEventListener('click', startGame);

    overlay.classList.remove('hidden');
    draw();
}

// Controls
startBtn.addEventListener('click', startGame);
jumpBtn.addEventListener('click', jump);

canvas.addEventListener('pointerdown', () => {
    if (running) jump();
});

window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
    }
});

soundBtn.addEventListener('click', async () => {
    if (music.paused) {
        try {
            await music.play();
            musicEnabled = true;
            soundBtn.textContent = '🔊 Music: ON';
        } catch (e) {
            soundBtn.textContent = 'Tap again for music';
        }
    } else {
        music.pause();
        musicEnabled = false;
        soundBtn.textContent = '🔇 Music: OFF';
    }
});

draw();



