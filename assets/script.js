const createGameBtn = document.getElementById("create-game-btn");
const startGameBtn = document.getElementById("start-game-btn");
const gameArea = document.getElementById("game-area");
const result = document.getElementById("result");
const moveBtns = document.querySelectorAll(".move-btn");
const nextRoundBtn = document.getElementById("next-round-btn");
const reviewGameBtn = document.getElementById("review-game-btn");
const reviewArea = document.getElementById("review-area");
const finishGameBtn = document.getElementById("finish-game-btn");
const loader = document.getElementById("loader");
const timerFill = document.getElementById("timer-fill");
const moves = ["rock", "scissors", "paper"];

const TIMER_SECONDS = 10;
let timerInterval = null;

const clickSound = new Audio("assets/lesiakower-laptop-touchpad-click-384384 (1).mp3");

function playClickSound() {
  clickSound.currentTime = 0;
  clickSound.play();
}

document.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", playClickSound);
});

let roundIds = [];
let currentRound = 0;

createGameBtn.addEventListener("click", async () => {
  createGameBtn.hidden = true;
  loader.hidden = false;

  const gameId = Date.now();
  roundIds = [];

  for (let i = 1; i <= 5; i++) {
    const botMove = moves[Math.floor(Math.random() * 3)];
    const res = await fetch("https://api.restful-api.dev/objects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `rps-game-${gameId}`,
        data: { gameId, round: i, bot: botMove, player: "pending" },
      }),
    });
    const obj = await res.json();
    roundIds.push(obj.id);
    console.log(obj);
  }

  loader.hidden = true;
  createGameBtn.hidden = false;
  startGameBtn.hidden = false;
});

startGameBtn.addEventListener("click", () => {
  currentRound = 0;
  startGameBtn.hidden = true;
  reviewGameBtn.hidden = true;
  reviewArea.hidden = true;
  gameArea.hidden = false;
  moveBtns.forEach((btn) => (btn.disabled = false));
  result.textContent = `Round ${currentRound + 1} of 5 — Pick your move!`;
  result.className = "";
  startTimer();
});

moveBtns.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const playerMove = btn.dataset.move;
    stopTimer();
    moveBtns.forEach((b) => (b.disabled = true));

    const id = roundIds[currentRound];

    const getRes = await fetch(`https://api.restful-api.dev/objects/${id}`);
    const roundData = await getRes.json();

    await fetch(`https://api.restful-api.dev/objects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: roundData.name,
        data: {
          gameId: roundData.data.gameId,
          round: roundData.data.round,
          bot: roundData.data.bot,
          player: playerMove,
        },
      }),
    });

    const botMove = roundData.data.bot;
    const outcome = getOutcome(playerMove, botMove);

    result.textContent = `Round ${currentRound + 1}: You: ${playerMove} | Bot: ${botMove} → ${outcome}`;
    result.className = outcome.toLowerCase();

    if (currentRound < 4) {
      nextRoundBtn.hidden = false;
    } else {
      finishGameBtn.hidden = false;
    }
  });
});

nextRoundBtn.addEventListener("click", () => {
  currentRound++;
  nextRoundBtn.hidden = true;
  moveBtns.forEach((btn) => (btn.disabled = false));
  result.textContent = `Round ${currentRound + 1} of 5 — Pick your move!`;
  result.className = "";
  startTimer();
});

finishGameBtn.addEventListener("click", () => {
  finishGameBtn.hidden = true;
  gameArea.hidden = true;
  reviewGameBtn.hidden = false;
});

reviewGameBtn.addEventListener("click", async () => {
  if (!reviewArea.hidden) {
    reviewArea.hidden = true;
    return;
  }

  reviewArea.hidden = false;

  const query = roundIds.map((id) => "id=" + id).join("&");
  const res = await fetch("https://api.restful-api.dev/objects?" + query);
  const rounds = await res.json();

  let wins = 0;
  let html = "<h2>Game Review</h2>";

  for (let i = 0; i < rounds.length; i++) {
    const r = rounds[i];
    const outcome = getOutcome(r.data.player, r.data.bot);
    if (outcome === "Win") wins++;
    html +=
      "<p class='review-" + outcome.toLowerCase() + "'>Round " + r.data.round +
      ": You: " + r.data.player +
      " | Bot: " + r.data.bot +
      " → " + outcome + "</p>";
  }

  html += "<p><strong>Score: " + wins + "/5</strong></p>";
  reviewArea.innerHTML = html;
});

function startTimer() {
  clearInterval(timerInterval);
  let timeLeft = TIMER_SECONDS * 10;
  timerFill.style.width = "100%";
  timerFill.className = "";

  timerInterval = setInterval(() => {
    timeLeft--;
    const percent = (timeLeft / (TIMER_SECONDS * 10)) * 100;
    timerFill.style.width = percent + "%";

    if (percent <= 30) {
      timerFill.className = "danger";
    } else if (percent <= 60) {
      timerFill.className = "warning";
    }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      const randomBtn = document.querySelectorAll(".move-btn:not(:disabled)");
      if (randomBtn.length > 0) {
        const pick = randomBtn[Math.floor(Math.random() * randomBtn.length)];
        pick.click();
      }
    }
  }, 100);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function getOutcome(player, bot) {
  if (player === bot) return "Draw";
  if (
    (player === "rock" && bot === "scissors") ||
    (player === "scissors" && bot === "paper") ||
    (player === "paper" && bot === "rock")
  )
    return "Win";
  return "Lose";
}
