import "./styles.css";
import { collectibles } from "./assets/manifest";
import { GameApp } from "./render/gameApp";
import { createUI } from "./ui/ui";

const appRoot = document.querySelector<HTMLElement>("#app");
if (!appRoot) throw new Error("Missing #app root");

const canvasHost = document.createElement("div");
canvasHost.className = "canvas-host bootstrap";
appRoot.appendChild(canvasHost);

let ui: ReturnType<typeof createUI>;
const game = new GameApp(canvasHost, {
  onSnapshot: () => ui?.update(),
  onReward: (title, detail) => ui?.reward(title, detail),
});

window.__canberraGame = game;
window.render_game_to_text = () => {
  const player = game.state.player;
  const remainingGumleaves = collectibles.filter((item) => !game.state.save.collectedItems.includes(item.id)).map((item) => item.id);
  return JSON.stringify({
    coordinateSystem: "world: x east-west, z north-south, y height",
    selectedAnimal: game.state.save.animal,
    player: player
      ? {
          animal: player.animal,
          x: Number(player.position.x.toFixed(2)),
          y: Number(player.position.y.toFixed(2)),
          z: Number(player.position.z.toFixed(2)),
          grounded: player.grounded,
          dashCooldown: Number(player.dashCooldown.toFixed(2)),
        }
      : null,
    progress: {
      landmarks: game.state.save.unlockedLandmarks.length,
      gumleaves: game.state.save.gumleafScore,
      remainingGumleaves,
    },
  });
};

ui = createUI(appRoot, game);
canvasHost.remove();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // The game remains playable without offline caching.
    });
  });
}

declare global {
  interface Window {
    __canberraGame?: GameApp;
    render_game_to_text?: () => string;
  }
}
