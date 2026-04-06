const board = document.getElementById("gameBoard");
const scoreDisplay = document.getElementById("score");
const timerDisplay = document.getElementById("timer");
const starDisplay = document.getElementById("stars");
const winStars = document.getElementById("winStars");

let symbols = ["🍎","🍌","🍇","🍉","🍒","🥝","🍍","🍑","🥥","🍋","🍓","🍈","🍐","🍊","🥭","🫐","🍏","🍅"];

let cards = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;

let moves = 0;
let matches = 0;
let totalPairs = 0;
let timer = 0;
let interval;
let gameActive = false;

// 🔊 SOUND SYSTEM
const sounds = {
  pop: new Audio("sounds/pop.mp3"),   // flip card
  win: new Audio("sounds/win.mp3"),   // match or final win
  lose: new Audio("sounds/lose.mp3")  // time over
};

function playSound(type){
  if(sounds[type]){
    sounds[type].currentTime = 0;
    sounds[type].play();
  }
}

// 🔀 SHUFFLE
function shuffle(array){
  for(let i=array.length-1;i>0;i--){
    let j=Math.floor(Math.random()*(i+1));
    [array[i],array[j]]=[array[j],array[i]];
  }
  return array;
}

// 🎮 START GAME
function startGame(level){
  clearInterval(interval);
  resetState();
  gameActive = true;

  if(level==="easy"){
    cards = symbols.slice(0,3);
    timer = 30;
    board.style.gridTemplateColumns = "repeat(3, 80px)";
  }
  else if(level==="medium"){
    cards = symbols.slice(0,8);
    timer = 120;
    board.style.gridTemplateColumns = "repeat(4, 80px)";
  }
  else{
    cards = symbols.slice(0,18);
    timer = 180;
    board.style.gridTemplateColumns = "repeat(6, 80px)";
  }

  cards = [...cards, ...cards];
  totalPairs = cards.length / 2;

  createBoard();
  startTimer();
}

// 🔄 RESET STATE
function resetState(){
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  moves = 0;
  matches = 0;
  winStars.innerHTML = "";
}

// 🃏 CREATE BOARD
function createBoard(){
  board.innerHTML = "";
  scoreDisplay.innerText = `Moves: 0 | Matches: 0`;
  starDisplay.innerText = "⭐ Stars: 3";

  let shuffled = shuffle([...cards]);

  shuffled.forEach(symbol=>{
    let card = document.createElement("div");
    card.classList.add("card");
    card.dataset.symbol = symbol;
    card.innerText = "";

    card.addEventListener("click", flipCard);

    board.appendChild(card);
  });
}

// 🔄 FLIP CARD
function flipCard(){
  if(!gameActive) return;
  if(lockBoard) return;
  if(this.classList.contains("hide")) return;
  if(this === firstCard) return;

  this.classList.add("flipped");
  this.innerText = this.dataset.symbol;

  playSound("pop"); // 🔊 flip sound

  if(!firstCard){
    firstCard = this;
    return;
  }

  secondCard = this;
  lockBoard = true;
  moves++;

  checkMatch();
}

// ✅ CHECK MATCH
function checkMatch(){
  let isMatch = firstCard.dataset.symbol === secondCard.dataset.symbol;

  if(isMatch){
    disableCards();
  } else {
    unflipCards();
  }

  updateStars();
}

// 🎉 MATCH FOUND
function disableCards(){
  setTimeout(()=>{
    firstCard.classList.add("hide");
    secondCard.classList.add("hide");

    playSound("win"); // 🔊 match sound

    matches++;

    scoreDisplay.innerText = `Moves: ${moves} | Matches: ${matches}`;

    resetTurn();

    // 🏆 ALL MATCHED
    if(matches === totalPairs){
      clearInterval(interval);
      gameActive = false;

      playSound("win"); // 🔊 final win sound

      showStars();
    }

  },300);
}

// ❌ NOT MATCH
function unflipCards(){
  setTimeout(()=>{
    firstCard.classList.remove("flipped");
    firstCard.innerText = "";

    secondCard.classList.remove("flipped");
    secondCard.innerText = "";

    scoreDisplay.innerText = `Moves: ${moves} | Matches: ${matches}`;

    resetTurn();

  },800);
}

// 🔁 RESET TURN
function resetTurn(){
  [firstCard, secondCard] = [null, null];
  lockBoard = false;
}

// ⭐ STAR SYSTEM
function updateStars(){
  let stars = 3;

  if(moves > totalPairs * 2) stars = 2;
  if(moves > totalPairs * 3) stars = 1;

  starDisplay.innerText = "⭐ Stars: " + stars;
}

// 🏆 WIN DISPLAY
function showStars(){
  let stars = starDisplay.innerText.replace("⭐ Stars: ","");
  winStars.innerHTML = `⭐ ${stars} Stars 🎉 YOU WIN in ${moves} moves!`;
}

// ⏱ TIMER
function startTimer(){
  timerDisplay.innerText = "⏱ Time: " + timer;

  interval = setInterval(()=>{
    if(!gameActive) return;

    timer--;
    timerDisplay.innerText = "⏱ Time: " + timer;

    if(timer <= 0){
      clearInterval(interval);
      gameActive = false;

      winStars.innerHTML = "💀 Time Over!";
      playSound("lose"); // 🔊 lose sound
    }

  },1000);
}

// 🔄 RESET GAME
function resetMemory(){
  clearInterval(interval);
  board.innerHTML = "";
  scoreDisplay.innerText = "Moves: 0 | Matches: 0";
  timerDisplay.innerText = "⏱ Time: 0";
  starDisplay.innerText = "⭐ Stars: 0";
  winStars.innerHTML = "";
  gameActive = false;
}