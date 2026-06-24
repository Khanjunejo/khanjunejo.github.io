// ═══════════════════════════════════════════
//  MEMORY MATCH PRO  —  js/memory.js
// ═══════════════════════════════════════════

const SYMBOLS = [
  "🍎","🍌","🍇","🍉","🍒","🥝","🍍","🍑",
  "🥥","🍋","🍓","🍈","🍐","🍊","🥭","🫐",
  "🍏","🍅","🫒","🥑","🌽","🥕","🍄","🧅"
];

const LEVELS = {
  easy:   { pairs: 3,  cols: 3, time: 45  },
  medium: { pairs: 8,  cols: 4, time: 120 },
  hard:   { pairs: 18, cols: 6, time: 200 }
};

// ── State ────────────────────────────────────
let firstCard    = null;
let secondCard   = null;
let boardLocked  = false;
let moves        = 0;
let matches      = 0;
let totalPairs   = 0;
let timeLeft     = 0;
let maxTime      = 0;
let ticker       = null;
let gameActive   = false;
let soundEnabled = true;
let comboCount   = 0;
let frozen       = false;
let currentLevel = "easy";
let hintUses     = 2;
let freezeUses   = 1;
let peekUses     = 1;

let best = {};
try { best = JSON.parse(localStorage.getItem("mmp_best") || "{}"); } catch(e) {}

// ── DOM ──────────────────────────────────────
const boardEl       = document.getElementById("gameBoard");
const movesEl       = document.getElementById("movesEl");
const matchesEl     = document.getElementById("matchesEl");
const starsEl       = document.getElementById("starsEl");
const timerValEl    = document.getElementById("timerVal");
const timerBarEl    = document.getElementById("timerBar");
const resultPanel   = document.getElementById("resultPanel");
const resultEmoji   = document.getElementById("resultEmoji");
const resultTitle   = document.getElementById("resultTitle");
const resultStarsEl = document.getElementById("resultStars");
const resultSub     = document.getElementById("resultSub");
const bestEl        = document.getElementById("bestEl");
const hintCountEl   = document.getElementById("hintCount");
const freezeCountEl = document.getElementById("freezeCount");
const peekCountEl   = document.getElementById("peekCount");
const btnHint       = document.getElementById("btnHint");
const btnFreeze     = document.getElementById("btnFreeze");
const btnPeek       = document.getElementById("btnPeek");
const soundBtn      = document.getElementById("soundBtn");
const comboToast    = document.getElementById("comboToast");

// ── Audio ────────────────────────────────────
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  if (!soundEnabled) return;
  try {
    ensureAudio();
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);

    if (type === "flip") {
      o.type = "sine";
      o.frequency.setValueAtTime(520, t);
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.start(t); o.stop(t + 0.1);

    } else if (type === "match") {
      o.type = "triangle";
      o.frequency.setValueAtTime(660, t);
      o.frequency.setValueAtTime(880, t + 0.09);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.start(t); o.stop(t + 0.25);

    } else if (type === "wrong") {
      o.type = "sawtooth";
      o.frequency.setValueAtTime(200, t);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.start(t); o.stop(t + 0.18);

    } else if (type === "win") {
      [523, 659, 784, 1046].forEach((f, i) => {
        const oo = audioCtx.createOscillator();
        const gg = audioCtx.createGain();
        oo.connect(gg); gg.connect(audioCtx.destination);
        oo.frequency.setValueAtTime(f, t + i * 0.11);
        gg.gain.setValueAtTime(0.15, t + i * 0.11);
        gg.gain.exponentialRampToValueAtTime(0.001, t + i * 0.11 + 0.2);
        oo.start(t + i * 0.11); oo.stop(t + i * 0.11 + 0.2);
      });

    } else if (type === "lose") {
      o.type = "sawtooth";
      o.frequency.setValueAtTime(330, t);
      o.frequency.linearRampToValueAtTime(100, t + 0.5);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.start(t); o.stop(t + 0.6);

    } else if (type === "hint") {
      o.type = "sine";
      o.frequency.setValueAtTime(820, t);
      o.frequency.setValueAtTime(1060, t + 0.08);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.start(t); o.stop(t + 0.2);

    } else if (type === "combo") {
      [880, 1100, 1320].forEach((f, i) => {
        const oo = audioCtx.createOscillator();
        const gg = audioCtx.createGain();
        oo.connect(gg); gg.connect(audioCtx.destination);
        oo.frequency.setValueAtTime(f, t + i * 0.07);
        gg.gain.setValueAtTime(0.13, t + i * 0.07);
        gg.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.14);
        oo.start(t + i * 0.07); oo.stop(t + i * 0.07 + 0.14);
      });
    }
  } catch(e) {}
}

// ── Shuffle ──────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Card Size ────────────────────────────────
// Calculates best card pixel size to fit the
// board inside the viewport without overflow
function calcCardSize(cols) {
  const maxW = Math.min(window.innerWidth - 48, 600);
  const gap   = 8;
  const size  = Math.floor((maxW - gap * (cols - 1)) / cols);
  return Math.max(44, Math.min(size, 90));
}

// ── Start Game ───────────────────────────────
function startGame(level) {
  window._lastLevel = level;
  currentLevel      = level;

  // Clear old timer
  clearInterval(ticker);
  ticker = null;

  // Reset state
  firstCard   = null;
  secondCard  = null;
  boardLocked = false;
  moves       = 0;
  matches     = 0;
  comboCount  = 0;
  frozen      = false;
  hintUses    = 2;
  freezeUses  = 1;
  peekUses    = 1;

  const cfg  = LEVELS[level];
  totalPairs = cfg.pairs;
  maxTime    = cfg.time;
  timeLeft   = cfg.time;

  // Power-up counters
  hintCountEl.textContent   = hintUses;
  freezeCountEl.textContent = freezeUses;
  peekCountEl.textContent   = peekUses;

  resultPanel.classList.remove("show");

  // Card size
  const cols = cfg.cols;
  const size = calcCardSize(cols);
  const fs   = Math.floor(size * 0.42); // emoji font-size

  // Build board
  boardEl.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`;
  boardEl.innerHTML = "";

  const pool    = SYMBOLS.slice(0, cfg.pairs);
  const doubled = shuffle([...pool, ...pool]);

  doubled.forEach(sym => {
    const card = document.createElement("div");
    card.className   = "card";
    card.dataset.sym = sym;
    card.style.width  = size + "px";
    card.style.height = size + "px";

    card.innerHTML = `
      <div class="card-inner">
        <div class="card-back" style="font-size:${Math.floor(size*0.35)}px">🎴</div>
        <div class="card-front" style="font-size:${fs}px">${sym}</div>
      </div>`;

    card.addEventListener("click", onCardClick);
    boardEl.appendChild(card);
  });

  gameActive = true;
  updateHUD();
  updateBestDisplay();
  runTimer();
}

// ── HUD ──────────────────────────────────────
function updateHUD() {
  movesEl.textContent   = moves;
  matchesEl.textContent = matches + "/" + totalPairs;
  starsEl.textContent   = starStr();
  timerValEl.textContent = timeLeft;

  const pct = maxTime > 0 ? timeLeft / maxTime : 1;
  timerBarEl.style.width      = (pct * 100) + "%";
  timerBarEl.style.background = pct > 0.5 ? "#38bdf8" : pct > 0.25 ? "#fbbf24" : "#f87171";
  timerValEl.style.color      = pct < 0.25 ? "#f87171" : "var(--text)";

  btnHint.disabled   = hintUses <= 0   || !gameActive;
  btnFreeze.disabled = freezeUses <= 0 || !gameActive;
  btnPeek.disabled   = peekUses <= 0   || !gameActive;
}

function starStr() {
  const r = totalPairs > 0 ? moves / totalPairs : 0;
  return r <= 1.4 ? "⭐⭐⭐" : r <= 2.2 ? "⭐⭐" : "⭐";
}

function starCount() {
  const r = totalPairs > 0 ? moves / totalPairs : 0;
  return r <= 1.4 ? 3 : r <= 2.2 ? 2 : 1;
}

// ── Timer ────────────────────────────────────
function runTimer() {
  clearInterval(ticker);
  ticker = setInterval(() => {
    if (!gameActive || frozen) return;
    timeLeft--;
    updateHUD();
    if (timeLeft <= 0) {
      clearInterval(ticker);
      gameActive = false;
      playSound("lose");
      showResult(false);
    }
  }, 1000);
}

// ── Card Click ───────────────────────────────
function onCardClick(e) {
  const card = e.currentTarget;

  // Guard conditions
  if (!gameActive)                          return;
  if (boardLocked)                          return;
  if (card.classList.contains("flipped"))   return;
  if (card.classList.contains("matched"))   return;
  if (card === firstCard)                   return;

  // Flip this card
  card.classList.add("flipped");
  playSound("flip");

  if (!firstCard) {
    firstCard = card;
    return;
  }

  // Second card picked
  secondCard  = card;
  boardLocked = true;
  moves++;
  updateHUD();

  const isMatch = firstCard.dataset.sym === secondCard.dataset.sym;

  if (isMatch) {
    // Match!
    comboCount++;
    if (comboCount >= 2) {
      showToast(comboCount);
      playSound("combo");
    } else {
      playSound("match");
    }

    const c1 = firstCard;
    const c2 = secondCard;

    setTimeout(() => {
      c1.classList.add("matched");
      c2.classList.add("matched");
      c1.removeEventListener("click", onCardClick);
      c2.removeEventListener("click", onCardClick);
      matches++;
      updateHUD();

      firstCard   = null;
      secondCard  = null;
      boardLocked = false;

      if (matches === totalPairs) {
        clearInterval(ticker);
        gameActive = false;
        saveBest(currentLevel, moves);
        setTimeout(() => { playSound("win"); showResult(true); }, 400);
      }
    }, 300);

  } else {
    // No match
    comboCount = 0;
    playSound("wrong");

    const c1 = firstCard;
    const c2 = secondCard;

    c1.classList.add("wrong");
    c2.classList.add("wrong");

    firstCard   = null;
    secondCard  = null;

    setTimeout(() => {
      c1.classList.remove("flipped", "wrong");
      c2.classList.remove("flipped", "wrong");
      boardLocked = false;
    }, 950);
  }
}

// ── Result Panel ─────────────────────────────
function showResult(won) {
  resultPanel.classList.add("show");
  resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });

  if (won) {
    const s = starCount();
    resultEmoji.textContent = s === 3 ? "🏆" : s === 2 ? "🎉" : "👍";
    resultTitle.textContent = "YOU WIN!";
    resultTitle.style.color = "var(--success)";
    resultStarsEl.textContent = "⭐".repeat(s);
    resultSub.textContent   = `${moves} moves · ${maxTime - timeLeft}s · ${s} star${s > 1 ? "s" : ""}`;
  } else {
    resultEmoji.textContent   = "💀";
    resultTitle.textContent   = "TIME'S UP!";
    resultTitle.style.color   = "var(--danger)";
    resultStarsEl.textContent = "";
    resultSub.textContent     = `Matched ${matches} of ${totalPairs} pairs`;
  }
}

// ── Best Score ───────────────────────────────
function saveBest(level, m) {
  if (!best[level] || m < best[level]) {
    best[level] = m;
    localStorage.setItem("mmp_best", JSON.stringify(best));
  }
  updateBestDisplay();
}

function updateBestDisplay() {
  const b = best[currentLevel];
  bestEl.textContent = b ? b + " moves" : "—";
}

// ── Toast ────────────────────────────────────
let toastTimer = null;

function showToast(val) {
  const msgs = { 2:"🔥 COMBO x2!", 3:"🔥🔥 x3!", 4:"⚡ x4!", 5:"💥 x5 INSANE!" };
  comboToast.textContent = typeof val === "number"
    ? (msgs[val] || "💥 x" + val + "!")
    : val;
  comboToast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => comboToast.classList.remove("show"), 1500);
}

// ── Power-ups ────────────────────────────────
function useHint() {
  if (hintUses <= 0 || !gameActive) return;
  hintUses--;
  hintCountEl.textContent = hintUses;
  playSound("hint");

  const hidden = [...boardEl.querySelectorAll(".card:not(.matched):not(.flipped)")];
  hidden.forEach(c => c.classList.add("flipped"));
  setTimeout(() => {
    hidden.forEach(c => {
      if (!c.classList.contains("matched")) c.classList.remove("flipped");
    });
  }, 1000);
  updateHUD();
}

function useFreeze() {
  if (freezeUses <= 0 || !gameActive) return;
  freezeUses--;
  freezeCountEl.textContent = freezeUses;
  playSound("hint");
  frozen = true;
  timerBarEl.style.background = "#818cf8";
  showToast("❄️ Frozen +7s!");
  setTimeout(() => {
    frozen = false;
    timeLeft += 7;
    updateHUD();
  }, 7000);
  updateHUD();
}

function usePeek() {
  if (peekUses <= 0 || !gameActive || boardLocked) return;
  peekUses--;
  peekCountEl.textContent = peekUses;
  playSound("hint");

  const hidden = shuffle([...boardEl.querySelectorAll(".card:not(.matched):not(.flipped)")]);
  hidden.slice(0, 2).forEach(c => c.classList.add("flipped"));
  setTimeout(() => {
    hidden.slice(0, 2).forEach(c => {
      if (!c.classList.contains("matched")) c.classList.remove("flipped");
    });
  }, 1200);
  updateHUD();
}

// ── Sound ────────────────────────────────────
function toggleSound() {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? "🔊 Sound" : "🔇 Muted";
}

// ── Reset ────────────────────────────────────
function resetGame() {
  clearInterval(ticker);
  ticker      = null;
  gameActive  = false;
  firstCard   = null;
  secondCard  = null;
  boardLocked = false;
  boardEl.innerHTML = "";
  resultPanel.classList.remove("show");
  movesEl.textContent    = "0";
  matchesEl.textContent  = "0/0";
  starsEl.textContent    = "⭐⭐⭐";
  timerValEl.textContent = "--";
  timerBarEl.style.width      = "100%";
  timerBarEl.style.background = "var(--primary)";
  updateBestDisplay();
}
