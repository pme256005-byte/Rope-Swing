// Game Constants
const GRAVITY = 0.25;
const FRICTION = 0.995;

// Game State
let gameState = {
    score: 0,
    highScore: parseInt(localStorage.getItem('rope-high-score') || '0'),
    status: 'START', // START, PLAYING, GAMEOVER
    commentary: 'Tap to hook the ceiling!'
};

// Physics State
let pos = { x: 100, y: 300 };
let prevPos = { x: 95, y: 300 };
let anchor = null;
let ropeLength = 0;
let anchors = [];
let cameraX = 0;

// Game Loop
let animationFrameId = null;
let canvas, ctx;

// DOM Elements
let scoreValueEl, highScoreValueEl, commentaryTextEl;
let startModalEl, gameOverModalEl, controlsHelpEl;
let startButtonEl, restartButtonEl;
let finalScoreEl;

// Initialize game
function init() {
    // Get DOM elements
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    scoreValueEl = document.getElementById('score-value');
    highScoreValueEl = document.getElementById('high-score-value');
    commentaryTextEl = document.getElementById('commentary-text');
    
    startModalEl = document.getElementById('start-modal');
    gameOverModalEl = document.getElementById('game-over-modal');
    controlsHelpEl = document.getElementById('controls-help');
    
    startButtonEl = document.getElementById('start-button');
    restartButtonEl = document.getElementById('restart-button');
    finalScoreEl = document.getElementById('final-score');

    // Set up canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Event listeners
    document.addEventListener('pointerdown', handleInteraction);
    startButtonEl.addEventListener('click', startGame);
    restartButtonEl.addEventListener('click', startGame);

    // Initialize high score display
    highScoreValueEl.textContent = gameState.highScore;

    // Update controls help visibility
    updateUI();

    // Start game loop
    gameLoop();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function initGame() {
    pos = { x: 100, y: 400 };
    prevPos = { x: 92, y: 395 };
    anchor = null;
    ropeLength = 0;
    cameraX = 0;
    gameState.score = 0;
    gameState.status = 'PLAYING';

    // Generate initial anchors
    anchors = [];
    for (let i = 0; i < 10; i++) {
        anchors.push({
            id: Math.random().toString(),
            x: 300 + i * 400 + (Math.random() - 0.5) * 100,
            y: 100 + Math.random() * 150,
            active: true
        });
    }

    updateScoreDisplay();
    updateCommentary('Swing through the neon void!');
    updateUI();
}

function handleInteraction(e) {
    if (gameState.status !== 'PLAYING') {
        return; // Let the button handle it
    }

    if (!anchor) {
        // Find closest anchor ahead
        const nextAnchors = anchors.filter(a => a.x > pos.x);
        if (nextAnchors.length > 0) {
            const closest = nextAnchors.reduce((prev, curr) => 
                (Math.abs(curr.x - pos.x) < Math.abs(prev.x - pos.x) ? curr : prev)
            );
            anchor = closest;
            const dx = pos.x - closest.x;
            const dy = pos.y - closest.y;
            ropeLength = Math.sqrt(dx * dx + dy * dy);
        }
    } else {
        anchor = null;
    }
}

function update() {
    if (gameState.status !== 'PLAYING') return;

    // 1. Verlet Physics
    const vx = (pos.x - prevPos.x) * FRICTION;
    const vy = (pos.y - prevPos.y) * FRICTION;

    prevPos = { ...pos };
    pos.x += vx;
    pos.y += vy + GRAVITY;

    // 2. Rope Constraint
    if (anchor) {
        const dx = pos.x - anchor.x;
        const dy = pos.y - anchor.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > ropeLength) {
            const nx = dx / dist;
            const ny = dy / dist;
            pos.x = anchor.x + nx * ropeLength;
            pos.y = anchor.y + ny * ropeLength;
        }
    }

    // 3. Camera & Procedural anchors
    cameraX += (pos.x - cameraX - 200) * 0.1;
    
    if (pos.x > anchors[anchors.length - 1].x - 1000) {
        const last = anchors[anchors.length - 1];
        anchors.push({
            id: Math.random().toString(),
            x: last.x + 400 + (Math.random() - 0.5) * 150,
            y: 100 + Math.random() * 200,
            active: true
        });
    }

    // Clean up old anchors
    if (anchors.length > 20) {
        anchors = anchors.slice(-15);
    }

    // 4. Scoring
    const currentScore = Math.floor(pos.x / 100);
    if (currentScore > gameState.score) {
        gameState.score = currentScore;
        updateScoreDisplay();
    }

    // 5. Bounds check
    if (pos.y > canvas.height + 100 || pos.y < -500) {
        handleGameOver(currentScore);
    }
}

function draw() {
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background Grid
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    const gridSize = 100;
    const offsetX = -cameraX % gridSize;
    for (let x = offsetX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Draw Anchors
    anchors.forEach(a => {
        ctx.fillStyle = anchor?.id === a.id ? '#00f2ff' : '#333';
        ctx.shadowBlur = anchor?.id === a.id ? 15 : 0;
        ctx.shadowColor = '#00f2ff';
        ctx.beginPath();
        ctx.arc(a.x - cameraX, a.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Draw Rope
    if (anchor) {
        ctx.strokeStyle = '#00f2ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pos.x - cameraX, pos.y);
        ctx.lineTo(anchor.x - cameraX, anchor.y);
        ctx.stroke();
        
        // Glow effect
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    // Draw Player
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
        ctx.arc(pos.x - cameraX, pos.y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Body trail
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pos.x - cameraX, pos.y);
    const trailX = pos.x - (pos.x - prevPos.x) * 5;
    const trailY = pos.y - (pos.y - prevPos.y) * 5;
    ctx.lineTo(trailX - cameraX, trailY);
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function gameLoop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function startGame() {
    initGame();
}

function handleGameOver(score) {
    gameState.status = 'GAMEOVER';
    
    // Update high score
    if (score > gameState.highScore) {
        gameState.highScore = score;
        localStorage.setItem('rope-high-score', score.toString());
        highScoreValueEl.textContent = score;
    }
    
    // Update final score display
    finalScoreEl.textContent = `Distance: ${score}m`;
    
    // Generate witty commentary
    const comments = [
        "Gravity remains undefeated!",
        "That was... not optimal.",
        "The void claims another!",
        "Swing and a miss!",
        "Better luck next orbit!",
        "The neon lights fade...",
        "Physics: 1, You: 0",
        "Back to the drawing board!",
        "The rope wasn't feeling it.",
        "Try, try again!"
    ];
    const randomComment = comments[Math.floor(Math.random() * comments.length)];
    updateCommentary(randomComment);
    
    updateUI();
}

function updateScoreDisplay() {
    scoreValueEl.textContent = gameState.score;
}

function updateCommentary(text) {
    gameState.commentary = text;
    commentaryTextEl.textContent = `"${text}"`;
}

function updateUI() {
    // Update modal visibility
    startModalEl.classList.toggle('active', gameState.status === 'START');
    gameOverModalEl.classList.toggle('active', gameState.status === 'GAMEOVER');
    
    // Update controls help visibility
    controlsHelpEl.style.display = gameState.status === 'PLAYING' ? 'block' : 'none';
    
    // Update button text
    startButtonEl.textContent = gameState.status === 'START' ? 'PLAY' : 'RETRY';
}

// Initialize when page loads
window.addEventListener('load', init);