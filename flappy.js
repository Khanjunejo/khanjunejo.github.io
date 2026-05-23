const canvas = document.getElementById("flappyCanvas");
const ctx = canvas.getContext("2d");

// --- Configuration ---
const birdRadius = 15;
const pipeWidth = 60;
const pipeGap = 150; // Increased slightly for better playability
const gravity = 0.25;
const jumpStrength = -5.5;

let bird, pipes, score, highScore, gameActive, paused, themeIndex, frameCount;
let currentSpeed = 3;

// 🔊 SOUND SYSTEM
const sounds = {
    lose: new Audio("https://actions.google.com/sounds/v1/cartoon/clime_up_the_ladder.ogg"), // Example URLs
    coin: new Audio("https://actions.google.com/sounds/v1/foley/beeps_and_clicks.ogg"),
    jump: new Audio("https://actions.google.com/sounds/v1/cartoon/pop.ogg")
};

function playSound(name) {
    if (sounds[name]) {
        sounds[name].currentTime = 0;
        sounds[name].play().catch(() => {}); // Catch block prevents errors if browser blocks audio
    }
}

const themes = [
    { name: "Sky ☁️", bg: "#87CEEB", bird: "#ffdd00", pipe: "#2e7d32", accent: "#ffffff" },
    { name: "Night 🌙", bg: "#0f0f2f", bird: "#00ffff", pipe: "#ff073a", accent: "#333366" },
    { name: "Forest 🌳", bg: "#c0f0c0", bird: "#2e7d32", pipe: "#8B4513", accent: "#558b2f" }
];

themeIndex = 0;
highScore = localStorage.getItem("flappyHighScore") || 0;

// --- Core Logic ---

function init() {
    bird = { 
        x: 80, 
        y: canvas.height / 2, 
        vy: 0, 
        angle: 0 
    };
    pipes = [];
    score = 0;
    frameCount = 0;
    currentSpeed = 3;
    gameActive = true;
    paused = false;

    updateUI();
    gameLoop(); 
}

function updateUI() {
    document.getElementById("themeName").innerText = "Theme: " + themes[themeIndex].name;
    document.getElementById("flappyScore").innerText = "Score: " + score;
    document.getElementById("highScore").innerText = "Best: " + highScore;
}

function addPipe() {
    const minPipeHeight = 50;
    const spaceForPipes = canvas.height - pipeGap;
    const topHeight = Math.floor(Math.random() * (spaceForPipes - minPipeHeight * 2)) + minPipeHeight;
    
    pipes.push({
        x: canvas.width,
        top: topHeight,
        bottom: topHeight + pipeGap,
        passed: false
    });
}

function gameOver() {
    gameActive = false;
    playSound("lose");

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("flappyHighScore", highScore);
    }
    
    // Visual feedback: brief screen shake or flash could go here
    updateUI();
}

// --- Input Handling ---

const triggerJump = () => {
    if (!gameActive) {
        init();
        return;
    }
    if (paused) return;
    
    bird.vy = jumpStrength;
    playSound("jump");
};

document.addEventListener("keydown", e => { if (e.key === " ") triggerJump(); });
canvas.addEventListener("touchstart", (e) => { e.preventDefault(); triggerJump(); });

// --- Rendering & Physics ---

function gameLoop() {
    if (!gameActive || paused) return;

    updatePhysics();
    draw();
    
    frameCount++;
    requestAnimationFrame(gameLoop);
}

function updatePhysics() {
    // Bird Physics
    bird.vy += gravity;
    bird.y += bird.vy;
    
    // Rotation based on velocity
    bird.angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (bird.vy / 10)));

    // Pipe Management
    if (frameCount % 90 === 0) addPipe(); // New pipe every 90 frames

    for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i];
        p.x -= currentSpeed;

        // Score logic
        if (!p.passed && bird.x > p.x + pipeWidth) {
            score++;
            p.passed = true;
            playSound("coin");
            document.getElementById("flappyScore").innerText = "Score: " + score;
            
            // Increase difficulty every 5 points
            if(score % 5 === 0) currentSpeed += 0.2; 
        }

        // Collision logic (Hitbox)
        const hitBoxBuffer = 4; // Makes it more forgiving
        if (bird.x + birdRadius - hitBoxBuffer > p.x && bird.x - birdRadius + hitBoxBuffer < p.x + pipeWidth) {
            if (bird.y - birdRadius + hitBoxBuffer < p.top || bird.y + birdRadius - hitBoxBuffer > p.bottom) {
                gameOver();
            }
        }

        // Remove off-screen pipes
        if (p.x + pipeWidth < 0) pipes.splice(i, 1);
    }

    // Floor/Ceiling collision
    if (bird.y + birdRadius > canvas.height || bird.y - birdRadius < 0) {
        gameOver();
    }
}

function draw() {
    const theme = themes[themeIndex];
    
    // 1. Background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Pipes
    pipes.forEach(p => {
        ctx.fillStyle = theme.pipe;
        // Top Pipe
        ctx.fillRect(p.x, 0, pipeWidth, p.top);
        // Bottom Pipe
        ctx.fillRect(p.x, p.bottom, pipeWidth, canvas.height - p.bottom);
        
        // Pipe Caps (adds a little detail)
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.fillRect(p.x, p.top - 20, pipeWidth, 20);
        ctx.fillRect(p.x, p.bottom, pipeWidth, 20);
    });

    // 3. Bird (with Rotation)
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.angle);
    
    ctx.fillStyle = theme.bird;
    ctx.beginPath();
    // Drawing an ellipse/wing shape makes it look more "bird-like" than a circle
    ctx.arc(0, 0, birdRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(8, -5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(10, -5, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// --- Global Controls ---
window.resetFlappy = init;
window.togglePause = () => { paused = !paused; if(!paused) gameLoop(); };
window.switchTheme = () => {
    themeIndex = (themeIndex + 1) % themes.length;
    updateUI();
};

init();s