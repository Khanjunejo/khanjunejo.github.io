// ═══════════════════════════════════════════════════
//  FLAPPY BIRD PRO — js/flappy.js
// ═══════════════════════════════════════════════════

const canvas = document.getElementById("flappyCanvas");
const ctx    = canvas.getContext("2d");

// ── Config ──────────────────────────────────────────
const BIRD_RADIUS  = 15;
const PIPE_WIDTH   = 60;
const PIPE_GAP     = 155;
const GRAVITY      = 0.25;
const JUMP_STR     = -5.5;
const HIT_BUFFER   = 4;
const PIPE_INTERVAL = 90;  // frames between pipes

// ── Themes ──────────────────────────────────────────
const themes = [
  { name: "Sky ☁️",    bg: "#87CEEB", bird: "#ffdd00", pipe: "#2e7d32", cap: "#1b5e20", ground: "#8BC34A", cloud: "#ffffff" },
  { name: "Night 🌙",  bg: "#0d1b2a", bird: "#00e5ff", pipe: "#ff073a", cap: "#b71c1c", ground: "#1a237e", cloud: "#1e3a5f" },
  { name: "Forest 🌳", bg: "#c8e6c9", bird: "#1b5e20", pipe: "#8B4513", cap: "#5d2906", ground: "#558b2f", cloud: "#a5d6a7" },
  { name: "Sunset 🌅", bg: "#ff7043", bird: "#fff176", pipe: "#4a148c", cap: "#311b92", ground: "#bf360c", cloud: "#ffccbc" },
  { name: "Space 🚀",  bg: "#0a0a1a", bird: "#e040fb", pipe: "#00bfa5", cap: "#007c6e", ground: "#1a1a2e", cloud: "#1a237e" }
];

// ── State ───────────────────────────────────────────
let bird, pipes, score, frameCount;
let gameActive   = false;
let paused       = false;
let soundEnabled = true;
let themeIndex   = 0;
let currentSpeed = 3;
let highScore    = parseInt(localStorage.getItem("flappyHighScore") || "0");
let animFrame    = null;
let showingStart = true;   // show "tap to start" splash
let medals       = { bronze: 10, silver: 25, gold: 50 };

// ── Web Audio (no external files needed) ────────────
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
  if (!soundEnabled) return;
  try {
    ensureAudio();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    const t = audioCtx.currentTime;

    if (type === "jump") {
      o.frequency.setValueAtTime(600, t);
      o.frequency.linearRampToValueAtTime(900, t + 0.08);
      o.type = "sine";
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.start(t); o.stop(t + 0.12);
    } else if (type === "coin") {
      o.frequency.setValueAtTime(880, t);
      o.frequency.setValueAtTime(1100, t + 0.05);
      o.type = "triangle";
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.start(t); o.stop(t + 0.18);
    } else if (type === "lose") {
      o.frequency.setValueAtTime(400, t);
      o.frequency.linearRampToValueAtTime(100, t + 0.4);
      o.type = "sawtooth";
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.start(t); o.stop(t + 0.6);
    } else if (type === "milestone") {
      o.frequency.setValueAtTime(523, t);
      o.frequency.setValueAtTime(659, t + 0.1);
      o.frequency.setValueAtTime(784, t + 0.2);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      o.start(t); o.stop(t + 0.4);
    }
  } catch(e) {}
}

// ── DOM refs ────────────────────────────────────────
const scoreEl    = document.getElementById("flappyScore");
const highScEl   = document.getElementById("highScore");
const themeEl    = document.getElementById("themeName");
const pauseBtn   = document.getElementById("pauseBtn");
const soundBtn   = document.getElementById("soundBtn");

// ── Init / Reset ────────────────────────────────────
function init() {
  cancelAnimationFrame(animFrame);

  bird = { x: 80, y: canvas.height / 2, vy: 0, angle: 0, flap: 0 };
  pipes        = [];
  score        = 0;
  frameCount   = 0;
  currentSpeed = 3;
  gameActive   = true;
  paused       = false;
  showingStart = false;

  pauseBtn.textContent = "⏸ Pause";
  updateHUD();
  loop();
}

function updateHUD() {
  scoreEl.textContent  = score;
  highScEl.textContent = highScore;
  themeEl.textContent  = themes[themeIndex].name;
}

// ── Game Loop ────────────────────────────────────────
function loop() {
  if (!gameActive || paused) return;
  physics();
  render();
  frameCount++;
  animFrame = requestAnimationFrame(loop);
}

// ── Physics ──────────────────────────────────────────
function physics() {
  // Bird
  bird.vy    += GRAVITY;
  bird.y     += bird.vy;
  bird.angle  = Math.min(Math.PI / 3, Math.max(-Math.PI / 4, bird.vy / 10));
  bird.flap   = (bird.flap + 1) % 10;

  // Spawn pipes
  if (frameCount % PIPE_INTERVAL === 0) spawnPipe();

  // Move & check pipes
  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    p.x -= currentSpeed;

    // Score
    if (!p.passed && bird.x > p.x + PIPE_WIDTH) {
      score++;
      p.passed = true;
      scoreEl.textContent = score;

      if (score % 5 === 0) {
        currentSpeed += 0.25;
        playSound("milestone");
      } else {
        playSound("coin");
      }

      if (score > highScore) {
        highScore = score;
        localStorage.setItem("flappyHighScore", highScore);
        highScEl.textContent = highScore;
      }
    }

    // Collision
    if (
      bird.x + BIRD_RADIUS - HIT_BUFFER > p.x &&
      bird.x - BIRD_RADIUS + HIT_BUFFER < p.x + PIPE_WIDTH
    ) {
      if (
        bird.y - BIRD_RADIUS + HIT_BUFFER < p.top ||
        bird.y + BIRD_RADIUS - HIT_BUFFER > p.bottom
      ) {
        die();
        return;
      }
    }

    // Remove off-screen
    if (p.x + PIPE_WIDTH < 0) pipes.splice(i, 1);
  }

  // Floor / ceiling
  if (bird.y + BIRD_RADIUS > canvas.height || bird.y - BIRD_RADIUS < 0) die();
}

function spawnPipe() {
  const min = 55;
  const space = canvas.height - PIPE_GAP;
  const top = Math.floor(Math.random() * (space - min * 2)) + min;
  pipes.push({ x: canvas.width, top, bottom: top + PIPE_GAP, passed: false });
}

// ── Render ────────────────────────────────────────────
function render() {
  const theme = themes[themeIndex];

  // Background
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Clouds (parallax)
  drawClouds(theme);

  // Ground strip
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, canvas.height - 18, canvas.width, 18);

  // Pipes
  pipes.forEach(p => drawPipe(p, theme));

  // Bird
  drawBird(theme);

  // Start splash
  if (showingStart) drawSplash();

  // Pause overlay
  if (paused && gameActive) drawPauseOverlay();
}

function drawClouds(theme) {
  ctx.fillStyle = theme.cloud;
  ctx.globalAlpha = 0.55;
  const offset = (frameCount * 0.4) % canvas.width;
  [[60, 60], [180, 90], [310, 55], [420, 80]].forEach(([cx, cy]) => {
    const x = ((cx - offset + canvas.width * 2) % (canvas.width + 80)) - 40;
    ctx.beginPath();
    ctx.arc(x,      cy,     22, 0, Math.PI * 2);
    ctx.arc(x + 20, cy - 8, 17, 0, Math.PI * 2);
    ctx.arc(x + 40, cy,     22, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawPipe(p, theme) {
  const capH = 20, capExtra = 6;

  // Body
  ctx.fillStyle = theme.pipe;
  ctx.fillRect(p.x, 0, PIPE_WIDTH, p.top);
  ctx.fillRect(p.x, p.bottom, PIPE_WIDTH, canvas.height - p.bottom);

  // Caps
  ctx.fillStyle = theme.cap;
  ctx.fillRect(p.x - capExtra / 2, p.top - capH, PIPE_WIDTH + capExtra, capH);
  ctx.fillRect(p.x - capExtra / 2, p.bottom,      PIPE_WIDTH + capExtra, capH);

  // Shine
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(p.x + 6, 0, 8, p.top);
  ctx.fillRect(p.x + 6, p.bottom, 8, canvas.height - p.bottom);
}

function drawBird(theme) {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.angle);

  // Body
  ctx.fillStyle = theme.bird;
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_RADIUS, BIRD_RADIUS - 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing flap
  const wingY = bird.flap < 5 ? 4 : -2;
  ctx.fillStyle = theme.bird;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.ellipse(-4, wingY, 9, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Eye white
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(8, -5, 5, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(9.5, -5, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.moveTo(13, -2);
  ctx.lineTo(20, 0);
  ctx.lineTo(13,  3);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawSplash() {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px 'Space Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("FLAPPY BIRD PRO", canvas.width / 2, canvas.height / 2 - 30);

  ctx.font = "16px 'Space Grotesk', sans-serif";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("Tap or press Space to start", canvas.width / 2, canvas.height / 2 + 10);

  ctx.font = "13px 'Space Grotesk', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("Best: " + highScore, canvas.width / 2, canvas.height / 2 + 40);
  ctx.textAlign = "left";
}

function drawPauseOverlay() {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px 'Space Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
  ctx.textAlign = "left";
}

// ── Game Over ─────────────────────────────────────────
function die() {
  if (!gameActive) return;
  gameActive = false;
  playSound("lose");

  // Draw game over screen
  setTimeout(() => drawGameOver(), 200);
}

function drawGameOver() {
  // Dim
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Panel
  const pw = 280, ph = 200;
  const px = (canvas.width - pw) / 2, py = (canvas.height - ph) / 2;
  ctx.fillStyle = "#1a1830";
  roundRect(px, py, pw, ph, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(56,189,248,0.4)";
  ctx.lineWidth = 1.5;
  roundRect(px, py, pw, ph, 18);
  ctx.stroke();

  // Medal
  const medal = score >= medals.gold ? "🥇" : score >= medals.silver ? "🥈" : score >= medals.bronze ? "🥉" : "💀";
  ctx.font = "42px serif";
  ctx.textAlign = "center";
  ctx.fillText(medal, canvas.width / 2, py + 55);

  ctx.fillStyle = "#f87171";
  ctx.font = "bold 20px 'Space Mono', monospace";
  ctx.fillText("GAME OVER", canvas.width / 2, py + 90);

  ctx.fillStyle = "#e2e0f0";
  ctx.font = "15px 'Space Grotesk', sans-serif";
  ctx.fillText("Score: " + score + "  |  Best: " + highScore, canvas.width / 2, py + 120);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "13px 'Space Grotesk', sans-serif";
  ctx.fillText("Tap / Space to play again", canvas.width / 2, py + 155);

  ctx.textAlign = "left";
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Input ─────────────────────────────────────────────
function triggerJump() {
  if (showingStart) { init(); return; }
  if (!gameActive)  { init(); return; }
  if (paused) return;
  bird.vy = JUMP_STR;
  playSound("jump");
}

document.addEventListener("keydown", e => {
  if (e.code === "Space" || e.key === " ") { e.preventDefault(); triggerJump(); }
});

canvas.addEventListener("touchstart", e => { e.preventDefault(); triggerJump(); }, { passive: false });
canvas.addEventListener("mousedown",  () => triggerJump());

// ── Controls exposed to HTML ───────────────────────────
window.resetFlappy = () => init();

window.togglePause = () => {
  if (!gameActive) return;
  paused = !paused;
  pauseBtn.textContent = paused ? "▶ Resume" : "⏸ Pause";
  if (!paused) loop();
};

window.switchTheme = () => {
  themeIndex = (themeIndex + 1) % themes.length;
  themeEl.textContent = themes[themeIndex].name;
  if (!gameActive || paused) render();
};

window.toggleSound = () => {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? "🔊 Sound" : "🔇 Muted";
};

// ── Splash on load ─────────────────────────────────────
(function splash() {
  showingStart = true;
  const theme = themes[themeIndex];
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawClouds(theme);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, canvas.height - 18, canvas.width, 18);
  drawBird(theme);
  drawSplash();
})();
