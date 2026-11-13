const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const gameContent = $("#gameContent");
const gameStatus = $("#gameStatus");
const gameStage = $("#gameStage");
const gamesSection = $("#games");
let activeGame = null;
let toastTimer;

$("#year").textContent = new Date().getFullYear();

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}
function getScores() {
  try { return JSON.parse(localStorage.getItem("gamezoneScores")) || {}; }
  catch { return {}; }
}
function saveScore(name, score, detail = "") {
  const scores = getScores();
  if (!scores[name] || score > scores[name].score) {
    scores[name] = { score, detail, date: new Date().toLocaleDateString() };
    localStorage.setItem("gamezoneScores", JSON.stringify(scores));
    renderScores();
  }
}
function renderScores() {
  const list = $("#scoreList");
  const entries = Object.entries(getScores()).sort((a,b) => b[1].score - a[1].score);
  if (!entries.length) {
    list.innerHTML = '<div class="score-empty">No records yet. Play a game to add your first score!</div>';
    return;
  }
  list.innerHTML = entries.map(([name, data], index) =>
    `<div class="score-row"><span class="score-rank">#${index+1}</span><span class="score-name">${name}<small style="display:block;color:#77819d;font-size:9px;font-weight:400">${data.detail || "Personal best"}</small></span><span class="score-value">${data.score} pts</span></div>`
  ).join("");
}
renderScores();

function openGame(game) {
  activeGame = game;
  const titles = {tic:"Tic-Tac-Toe", memory:"Memory Match", number:"Number Guess", rps:"Rock Paper Scissors"};
  $("#stageTitle").textContent = titles[game];
  gameStage.classList.remove("hidden");
  gameStage.scrollIntoView({behavior:"smooth", block:"start"});
  const renderers = {tic:renderTicTacToe, memory:renderMemory, number:renderNumberGuess, rps:renderRPS};
  renderers[game]();
}
$$("[data-game]").forEach(button => button.addEventListener("click", () => openGame(button.dataset.game)));
$("#backToGames").addEventListener("click", () => {
  gameStage.classList.add("hidden");
  gamesSection.scrollIntoView({behavior:"smooth"});
});
$("#resetScores").addEventListener("click", () => {
  if (confirm("Clear all personal best records saved in this browser?")) {
    localStorage.removeItem("gamezoneScores"); renderScores(); showToast("Records cleared.");
  }
});

// Search and category filters
let selectedFilter = "all";
function filterGames() {
  const query = $("#gameSearch").value.trim().toLowerCase();
  let visible = 0;
  $$(".game-card").forEach(card => {
    const matchesCategory = selectedFilter === "all" || card.dataset.category === selectedFilter;
    const matchesQuery = card.dataset.name.includes(query);
    card.classList.toggle("hidden", !(matchesCategory && matchesQuery));
    if (matchesCategory && matchesQuery) visible++;
  });
  $("#emptyState").classList.toggle("hidden", visible !== 0);
}
$("#gameSearch").addEventListener("input", filterGames);
$$(".filter-chip").forEach(chip => chip.addEventListener("click", () => {
  $$(".filter-chip").forEach(item => item.classList.remove("selected"));
  chip.classList.add("selected");
  selectedFilter = chip.dataset.filter;
  filterGames();
}));

// Mobile navigation
$("#menuToggle").addEventListener("click", () => {
  const nav = $("#mainNav");
  const open = nav.classList.toggle("open");
  $("#menuToggle").setAttribute("aria-expanded", String(open));
});
$$(".nav-link").forEach(link => link.addEventListener("click", () => $("#mainNav").classList.remove("open")));

// GAME 1: Tic-Tac-Toe
function renderTicTacToe() {
  let board = Array(9).fill("");
  let turn = "X", finished = false;
  gameStatus.textContent = "Two-player mode";
  gameContent.innerHTML = `<p class="game-instructions">Take turns with a friend. First to get three in a row wins.</p>
    <div class="ttt-board">${board.map((_,i)=>`<button class="ttt-cell" data-cell="${i}" aria-label="Cell ${i+1}"></button>`).join("")}</div>
    <p class="game-message" id="gameMessage">Player X's turn</p><button class="game-button" id="restartTic">Restart game</button>`;
  const cells = $$(".ttt-cell");
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  cells.forEach(cell => cell.addEventListener("click", () => {
    const i = Number(cell.dataset.cell);
    if (board[i] || finished) return;
    board[i] = turn; cell.textContent = turn; cell.classList.toggle("o", turn === "O");
    const won = wins.some(line => line.every(index => board[index] === turn));
    if (won) {
      finished = true; $("#gameMessage").textContent = `Player ${turn} wins! Great game.`;
      gameStatus.textContent = `Player ${turn} won`;
      if (turn === "X") saveScore("Tic-Tac-Toe", 10, "Player X victory");
    } else if (board.every(Boolean)) {
      finished = true; $("#gameMessage").textContent = "It's a draw. Try again!";
      gameStatus.textContent = "Draw";
    } else {
      turn = turn === "X" ? "O" : "X";
      $("#gameMessage").textContent = `Player ${turn}'s turn`;
    }
  }));
  $("#restartTic").addEventListener("click", renderTicTacToe);
}

// GAME 2: Memory Match
function renderMemory() {
  const symbols = ["✦","◈","✿","☾","⚡","❖","✧","●"];
  let deck = [...symbols,...symbols].sort(() => Math.random() - .5);
  let flipped = [], matched = [], moves = 0, locked = false, started = Date.now(), interval;
  gameStatus.textContent = "Find all 8 pairs";
  gameContent.innerHTML = `<p class="game-instructions">Find all matching pairs using as few moves as possible.</p>
    <div class="game-stats"><span>Moves: <strong id="moves">0</strong></span><span>Matched: <strong id="matched">0/8</strong></span><span>Time: <strong id="memoryTime">0s</strong></span></div>
    <div class="memory-board">${deck.map((_,i)=>`<button class="memory-card" data-card="${i}" aria-label="Hidden card">?</button>`).join("")}</div>
    <p class="game-message" id="memoryMessage">Find your first pair!</p><button class="game-button" id="restartMemory">Shuffle & restart</button>`;
  clearInterval(interval);
  interval = setInterval(() => { const el=$("#memoryTime"); if(el) el.textContent=Math.floor((Date.now()-started)/1000)+"s"; else clearInterval(interval); },1000);
  $$(".memory-card").forEach(card => card.addEventListener("click", () => {
    const i=Number(card.dataset.card);
    if(locked || matched.includes(i) || flipped.includes(i)) return;
    card.textContent=deck[i]; card.classList.add("flipped"); flipped.push(i);
    if(flipped.length===2) {
      moves++; $("#moves").textContent=moves;
      const [a,b]=flipped;
      if(deck[a]===deck[b]) {
        matched.push(a,b); flipped=[]; $("#matched").textContent=`${matched.length/2}/8`;
        matched.forEach(index=>$$(`[data-card="${index}"]`)[0].classList.add("matched"));
        if(matched.length===16) {
          clearInterval(interval);
          const seconds=Math.floor((Date.now()-started)/1000);
          $("#memoryMessage").textContent=`All pairs found in ${moves} moves and ${seconds} seconds!`;
          gameStatus.textContent="You completed the board";
          saveScore("Memory Match",Math.max(10,100-moves),`${moves} moves · ${seconds}s`);
        }
      } else {
        locked=true;
        setTimeout(()=>{[a,b].forEach(index=>{const el=$$(`[data-card="${index}"]`)[0];el.textContent="?";el.classList.remove("flipped");});flipped=[];locked=false;},750);
      }
    }
  }));
  $("#restartMemory").addEventListener("click",renderMemory);
}

// GAME 3: Number Guess
function renderNumberGuess() {
  let secret=Math.floor(Math.random()*100)+1, attempts=7, done=false;
  gameStatus.textContent="7 attempts available";
  gameContent.innerHTML=`<p class="game-instructions">I'm thinking of a number between 1 and 100. Can you find it?</p>
    <div class="game-stats"><span>Attempts left: <strong id="attemptsLeft">7</strong></span></div>
    <form class="guess-form" id="guessForm"><input id="guessInput" type="number" min="1" max="100" placeholder="Enter 1–100" required><button class="game-button">Make a guess</button></form>
    <p class="game-message" id="guessMessage" aria-live="polite">Your first guess is waiting...</p><button class="game-button secondary" id="restartGuess">New number</button>`;
  $("#guessForm").addEventListener("submit", e=>{
    e.preventDefault(); if(done) return;
    const input=$("#guessInput"), guess=Number(input.value);
    if(!Number.isInteger(guess)||guess<1||guess>100){$("#guessMessage").textContent="Enter a whole number from 1 to 100.";return;}
    attempts--; $("#attemptsLeft").textContent=attempts;
    if(guess===secret){
      done=true; const points=attempts*10+30;
      $("#guessMessage").textContent=`Correct! ${secret} was the number. You earned ${points} points.`;
      gameStatus.textContent="Number found"; saveScore("Number Guess",points,`${7-attempts} guesses`);
    } else if(attempts===0){
      done=true; $("#guessMessage").textContent=`Out of attempts! The number was ${secret}.`;
      gameStatus.textContent="Round over";
    } else {
      $("#guessMessage").textContent=guess<secret?"Too low — try a higher number.":"Too high — try a lower number.";
      gameStatus.textContent=`${attempts} attempts left`;
    }
    input.value="";
  });
  $("#restartGuess").addEventListener("click",renderNumberGuess);
}

// GAME 4: Rock Paper Scissors
function renderRPS() {
  let playerScore=0, computerScore=0;
  const options=[{name:"Rock",icon:"✊"},{name:"Paper",icon:"✋"},{name:"Scissors",icon:"✌"}];
  gameStatus.textContent="First to play wins the round";
  gameContent.innerHTML=`<p class="game-instructions">Choose your move. The computer will make its choice.</p>
    <div class="game-stats"><span>You: <strong id="playerScore">0</strong></span><span>Computer: <strong id="computerScore">0</strong></span></div>
    <div class="rps-choices">${options.map(o=>`<button class="rps-choice" data-choice="${o.name}" aria-label="${o.name}">${o.icon}<span>${o.name}</span></button>`).join("")}</div>
    <p class="game-message" id="rpsMessage">Make your move!</p><button class="game-button secondary" id="resetRps">Reset score</button>`;
  $$(".rps-choice").forEach(button=>button.addEventListener("click",()=>{
    const player=button.dataset.choice, computer=options[Math.floor(Math.random()*3)].name;
    let result;
    if(player===computer) result="It's a tie!";
    else if((player==="Rock"&&computer==="Scissors")||(player==="Paper"&&computer==="Rock")||(player==="Scissors"&&computer==="Paper")){result="You win this round!";playerScore++;}
    else {result="Computer wins this round.";computerScore++;}
    $("#playerScore").textContent=playerScore; $("#computerScore").textContent=computerScore;
    $("#rpsMessage").textContent=`You chose ${player}; computer chose ${computer}. ${result}`;
    gameStatus.textContent=`${playerScore} — ${computerScore}`;
    if(playerScore>0) saveScore("Rock Paper Scissors",playerScore,"Rounds won");
  }));
  $("#resetRps").addEventListener("click",renderRPS);
}
