import { animals, collectibles, landmarks, type AnimalId, type CollectibleDefinition, type LandmarkDefinition } from "../assets/manifest";
import { loadSave, resetSave, saveGame, type SaveData } from "./save";

export interface PlayerState {
  animal: AnimalId;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  heading: number;
  grounded: boolean;
  dashCooldown: number;
  dashTimer: number;
}

export interface GameSnapshot {
  save: SaveData;
  player: PlayerState | null;
  objective: LandmarkDefinition;
  newlyUnlocked: LandmarkDefinition | null;
  progressText: string;
}

export class GameState {
  save = loadSave();
  player: PlayerState | null = this.save.animal ? this.createPlayer(this.save.animal) : null;
  newlyUnlocked: LandmarkDefinition | null = null;

  get animalDefinition() {
    return animals.find((animal) => animal.id === this.player?.animal) ?? animals[0];
  }

  chooseAnimal(animal: AnimalId) {
    this.save.animal = animal;
    this.player = this.createPlayer(animal);
    this.persist();
  }

  setMuted(muted: boolean) {
    this.save.muted = muted;
    this.persist();
  }

  restartAdventure() {
    this.save = resetSave();
    this.player = null;
    this.newlyUnlocked = null;
  }

  updateDiscovery() {
    if (!this.player) return;
    this.newlyUnlocked = null;
    for (const landmark of landmarks) {
      const dx = landmark.position[0] - this.player.position.x;
      const dz = landmark.position[2] - this.player.position.z;
      if (Math.hypot(dx, dz) <= landmark.radius && !this.save.unlockedLandmarks.includes(landmark.id)) {
        this.save.unlockedLandmarks.push(landmark.id);
        this.save.collectedBadges.push(`${landmark.id}-badge`);
        if (this.save.unlockedLandmarks.length === landmarks.length && !this.save.cosmetics.includes("golden-scarf")) {
          this.save.cosmetics.push("golden-scarf");
        }
        this.newlyUnlocked = landmark;
        this.persist();
        return;
      }
    }
  }

  collectNearbyItem(): CollectibleDefinition | null {
    if (!this.player) return null;
    for (const item of collectibles) {
      if (this.save.collectedItems.includes(item.id)) continue;
      const dx = item.position[0] - this.player.position.x;
      const dz = item.position[2] - this.player.position.z;
      if (Math.hypot(dx, dz) <= 3.4) {
        this.save.collectedItems.push(item.id);
        this.save.gumleafScore += 1;
        this.persist();
        return item;
      }
    }
    return null;
  }

  respawnItem(id: string) {
    this.save.collectedItems = this.save.collectedItems.filter((itemId) => itemId !== id);
    this.persist();
  }

  getObjective() {
    return landmarks.find((landmark) => !this.save.unlockedLandmarks.includes(landmark.id)) ?? landmarks[0];
  }

  snapshot(): GameSnapshot {
    const objective = this.getObjective();
    const count = this.save.unlockedLandmarks.length;
    return {
      save: this.save,
      player: this.player,
      objective,
      newlyUnlocked: this.newlyUnlocked,
      progressText:
        count === landmarks.length
          ? `${this.save.gumleafScore} gumleaves collected`
          : `${count}/${landmarks.length} landmark badges · ${this.save.gumleafScore} gumleaves`,
    };
  }

  persist() {
    if (this.player) {
      this.save.lastSpawn = [this.player.position.x, this.player.position.y, this.player.position.z];
    }
    saveGame(this.save);
  }

  private createPlayer(animal: AnimalId): PlayerState {
    const [x, y, z] = this.save.lastSpawn;
    return {
      animal,
      position: { x, y, z },
      velocity: { x: 0, y: 0, z: 0 },
      heading: Math.PI,
      grounded: true,
      dashCooldown: 0,
      dashTimer: 0,
    };
  }
}
