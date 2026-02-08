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
let roundIds = [];
let localRounds = [];
let useLocal = false;
let currentRound = 0;

const clickSound = new Audio(
  "assets/lesiakower-laptop-touchpad-click-384384 (1).mp3",
);

function playClickSound() {
  clickSound.currentTime = 0;
  clickSound.play();
}

document.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", playClickSound);
});

const savedGame = localStorage.getItem("lastGame");
if (savedGame) {
  reviewGameBtn.hidden = false;
}

createGameBtn.addEventListener("click", async () => {
  createGameBtn.hidden = true;
  loader.hidden = false;
  gameArea.hidden = true;
  reviewArea.hidden = true;
  stopTimer();

  const gameId = Date.now();
  roundIds = [];
  localRounds = [];
  useLocal = false;

  try {
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
      if (!res.ok) throw new Error("API error");
      const obj = await res.json();
      roundIds.push(obj.id);
      localRounds.push({ gameId, round: i, bot: botMove, player: "pending" });
      console.log(obj);
    }
  } catch (err) {
    console.log("API failed, using local mode:", err);
    useLocal = true;
    roundIds = [];
    localRounds = [];
    for (let i = 1; i <= 5; i++) {
      const botMove = moves[Math.floor(Math.random() * 3)];
      localRounds.push({ gameId, round: i, bot: botMove, player: "pending" });
      roundIds.push(i - 1);
    }
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

    let botMove;

    if (useLocal) {
      botMove = localRounds[currentRound].bot;
      localRounds[currentRound].player = playerMove;
    } else {
      try {
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

        botMove = roundData.data.bot;
        localRounds[currentRound].player = playerMove;
      } catch (err) {
        console.log("API failed on move, using local:", err);
        useLocal = true;
        botMove = localRounds[currentRound].bot;
        localRounds[currentRound].player = playerMove;
      }
    }
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

  localStorage.setItem(
    "lastGame",
    JSON.stringify({
      roundIds: roundIds,
      localRounds: localRounds,
      useLocal: useLocal,
    }),
  );
});

reviewGameBtn.addEventListener("click", async () => {
  if (!reviewArea.hidden) {
    reviewArea.hidden = true;
    return;
  }

  reviewArea.hidden = false;

  const saved = JSON.parse(localStorage.getItem("lastGame"));
  if (!saved) return;

  let rounds;

  if (saved.useLocal) {
    rounds = saved.localRounds;
  } else {
    try {
      const query = saved.roundIds.map((id) => "id=" + id).join("&");
      const res = await fetch("https://api.restful-api.dev/objects?" + query);
      const data = await res.json();
      rounds = data.map((r) => r.data);
    } catch (err) {
      console.log("API failed on review, using local:", err);
      rounds = saved.localRounds;
    }
  }

  let wins = 0;
  let html = "<h2>Game Review</h2>";

  for (let i = 0; i < rounds.length; i++) {
    const r = rounds[i];
    const outcome = getOutcome(r.player, r.bot);
    if (outcome === "Win") wins++;
    html +=
      "<p class='review-" +
      outcome.toLowerCase() +
      "'>Round " +
      r.round +
      ": You: " +
      r.player +
      " | Bot: " +
      r.bot +
      " → " +
      outcome +
      "</p>";
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
