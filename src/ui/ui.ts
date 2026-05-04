import { animals, collectibles, credits } from "../assets/manifest";
import type { GameApp } from "../render/gameApp";

export function createUI(root: HTMLElement, game: GameApp) {
  root.innerHTML = `
    <main class="game-shell">
      <div class="canvas-host" data-canvas-host></div>
      <section class="animal-picker" data-picker>
        <div class="picker-copy">
          <p class="kicker">Canberra Animal Adventure</p>
          <h1>Choose your explorer</h1>
          <p>Roam a playful Canberra, find landmark badges, and unlock a celebration scarf.</p>
        </div>
        <div class="animal-cards">
          ${animals
            .map(
              (animal) => `
                <button class="animal-card" data-animal="${animal.id}">
                  <img class="animal-preview" src="${import.meta.env.BASE_URL}character-portraits/${animal.id}.svg" alt="${animal.name} explorer portrait" />
                  <strong>${animal.name}</strong>
                  <small>${animal.skill}</small>
                  <span>${animal.tagline}</span>
                </button>
              `,
            )
            .join("")}
        </div>
      </section>
      <section class="hud" data-hud>
        <div class="objective-chip">
          <span data-progress>0/5 landmark badges</span>
          <strong data-objective>Find Parliament</strong>
          <small data-hint>Run through glowing rings to collect gumleaves.</small>
        </div>
        <div class="hud-actions">
          <button class="icon-button restart-hud" data-main-restart aria-label="Restart adventure">Restart</button>
          <button class="icon-button" data-menu aria-label="Open field guide">Guide</button>
        </div>
      </section>
      <section class="toast" data-toast hidden>
        <strong data-toast-title></strong>
        <span data-toast-detail></span>
      </section>
      <section class="touch-layer">
        <div class="joystick" data-joystick><span data-knob></span></div>
        <div class="action-buttons">
          <button data-jump>Jump</button>
          <button data-dash>Dash</button>
        </div>
      </section>
      <dialog class="guide" data-guide>
        <div class="guide-header">
          <h2>Field guide</h2>
          <button data-close-guide aria-label="Close guide">Close</button>
        </div>
        <div class="guide-grid">
          <section>
            <h3>Badges</h3>
            <p class="guide-note" data-gumleaf-progress>0/${collectibles.length} gumleaves collected</p>
            <div class="badge-list" data-badges></div>
          </section>
          <section>
            <h3>Controls</h3>
            <p>Move with the left pad or WASD. Jump to hop over paths. Dash for a burst across bridges.</p>
            <button data-mute></button>
            <button data-change-animal>Change animal</button>
            <button class="restart-button" data-restart>Restart adventure</button>
          </section>
          <section>
            <h3>Credits</h3>
            ${credits.map((credit) => `<p>${credit}</p>`).join("")}
          </section>
        </div>
      </dialog>
    </main>
  `;

  const canvasHost = root.querySelector<HTMLElement>("[data-canvas-host]")!;
  game.mount(canvasHost);
  const picker = root.querySelector<HTMLElement>("[data-picker]")!;
  const menu = root.querySelector<HTMLButtonElement>("[data-menu]")!;
  const mainRestart = root.querySelector<HTMLButtonElement>("[data-main-restart]")!;
  const guide = root.querySelector<HTMLDialogElement>("[data-guide]")!;
  const closeGuide = root.querySelector<HTMLButtonElement>("[data-close-guide]")!;
  const objective = root.querySelector<HTMLElement>("[data-objective]")!;
  const progress = root.querySelector<HTMLElement>("[data-progress]")!;
  const hint = root.querySelector<HTMLElement>("[data-hint]")!;
  const gumleafProgress = root.querySelector<HTMLElement>("[data-gumleaf-progress]")!;
  const badges = root.querySelector<HTMLElement>("[data-badges]")!;
  const toast = root.querySelector<HTMLElement>("[data-toast]")!;
  const toastTitle = root.querySelector<HTMLElement>("[data-toast-title]")!;
  const toastDetail = root.querySelector<HTMLElement>("[data-toast-detail]")!;
  const mute = root.querySelector<HTMLButtonElement>("[data-mute]")!;
  const restart = root.querySelector<HTMLButtonElement>("[data-restart]")!;
  const changeAnimal = root.querySelector<HTMLButtonElement>("[data-change-animal]")!;

  game.bindTouch(
    root.querySelector<HTMLElement>("[data-joystick]")!,
    root.querySelector<HTMLElement>("[data-knob]")!,
    root.querySelector<HTMLElement>("[data-jump]")!,
    root.querySelector<HTMLElement>("[data-dash]")!,
  );

  root.querySelectorAll<HTMLButtonElement>("[data-animal]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.animal === "jaguar" ? "jaguar" : "koala";
      game.chooseAnimal(id);
      picker.hidden = true;
      update();
    });
  });

  menu.addEventListener("click", () => {
    update();
    guide.showModal();
  });
  mainRestart.addEventListener("click", () => {
    game.restartAdventure();
    guide.close();
    picker.hidden = false;
    update();
  });
  closeGuide.addEventListener("click", () => guide.close());
  mute.addEventListener("click", () => game.setMuted(!game.state.save.muted));
  changeAnimal.addEventListener("click", () => {
    guide.close();
    picker.hidden = false;
  });
  restart.addEventListener("click", () => {
    game.restartAdventure();
    guide.close();
    picker.hidden = false;
    update();
  });

  function update() {
    const snapshot = game.state.snapshot();
    picker.hidden = Boolean(snapshot.player);
    objective.textContent =
      snapshot.save.unlockedLandmarks.length >= game.getLandmarkStatus().length
        ? "All badges found. Explore freely."
        : `Next: ${snapshot.objective.shortName}`;
    progress.textContent = snapshot.progressText;
    mute.textContent = snapshot.save.muted ? "Sound off" : "Sound on";
    hint.textContent =
      snapshot.save.gumleafScore === 0
        ? "Run through glowing rings to collect gumleaves."
        : `${snapshot.save.gumleafScore} gumleaves collected. They keep growing back.`;
    gumleafProgress.textContent = `${snapshot.save.gumleafScore} gumleaves collected`;
    badges.innerHTML = game
      .getLandmarkStatus()
      .map(
        (landmark) => `
          <div class="badge ${landmark.unlocked ? "unlocked" : ""}">
            <span></span>
            <strong>${landmark.shortName}</strong>
            <small>${landmark.unlocked ? "Badge found" : landmark.description}</small>
          </div>
        `,
      )
      .join("");
  }

  function reward(title: string, detail: string) {
    toast.hidden = false;
    toastTitle.textContent = title;
    toastDetail.textContent = detail;
    window.setTimeout(() => {
      toast.hidden = true;
    }, 3400);
    update();
  }

  update();
  return { canvasHost, update, reward };
}
