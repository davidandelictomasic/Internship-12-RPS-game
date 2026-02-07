const createGameBtn = document.getElementById("create-game-btn");
const moves = ["rock", "scissors", "paper"];

createGameBtn.addEventListener("click", async () => {
  
  const gameId = Date.now();

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
    console.log(obj)
  }
  
});