import "./styles.css";
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

if (import.meta.env.DEV) {
  window.__canberraGame = game;
}

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
  }
}
