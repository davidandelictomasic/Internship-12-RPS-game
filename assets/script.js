const createGameBtn = document.getElementById("create-game-btn");
const startGameBtn = document.getElementById("start-game-btn");
const gameArea = document.getElementById("game-area");
const result = document.getElementById("result");
const moveBtns = document.querySelectorAll(".move-btn");
const moves = ["rock", "scissors", "paper"];

let roundIds = [];

createGameBtn.addEventListener("click", async () => {
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

  startGameBtn.hidden = false;
});

startGameBtn.addEventListener("click", () => {
  startGameBtn.hidden = true;
  gameArea.hidden = false;
  result.textContent = " Pick your move!";
});

moveBtns.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const playerMove = btn.dataset.move;
    moveBtns.forEach((b) => (b.disabled = true));

    const id = roundIds[0];

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

    result.textContent = `You: ${playerMove} | Bot: ${botMove} → ${outcome}`;
  });
});

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
