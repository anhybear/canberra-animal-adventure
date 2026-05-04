import type { AnimalId } from "../assets/manifest";

const SAVE_KEY = "canberra-animal-adventure-save";

export interface SaveData {
  animal: AnimalId | null;
  unlockedLandmarks: string[];
  collectedBadges: string[];
  collectedItems: string[];
  gumleafScore: number;
  cosmetics: string[];
  lastSpawn: [number, number, number];
  muted: boolean;
}

export const defaultSave: SaveData = {
  animal: null,
  unlockedLandmarks: [],
  collectedBadges: [],
  collectedItems: [],
  gumleafScore: 0,
  cosmetics: [],
  lastSpawn: [0, 0, 8],
  muted: false,
};

export function createDefaultSave(): SaveData {
  return {
    animal: defaultSave.animal,
    unlockedLandmarks: [...defaultSave.unlockedLandmarks],
    collectedBadges: [...defaultSave.collectedBadges],
    collectedItems: [...defaultSave.collectedItems],
    gumleafScore: defaultSave.gumleafScore,
    cosmetics: [...defaultSave.cosmetics],
    lastSpawn: [...defaultSave.lastSpawn],
    muted: defaultSave.muted,
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createDefaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      animal: parsed.animal === "koala" || parsed.animal === "jaguar" ? parsed.animal : null,
      unlockedLandmarks: Array.isArray(parsed.unlockedLandmarks) ? parsed.unlockedLandmarks : [],
      collectedBadges: Array.isArray(parsed.collectedBadges) ? parsed.collectedBadges : [],
      collectedItems: Array.isArray(parsed.collectedItems) ? parsed.collectedItems : [],
      gumleafScore: typeof parsed.gumleafScore === "number" ? parsed.gumleafScore : 0,
      cosmetics: Array.isArray(parsed.cosmetics) ? parsed.cosmetics : [],
      lastSpawn: isVector(parsed.lastSpawn) ? parsed.lastSpawn : [0, 0, 8],
      muted: Boolean(parsed.muted),
    };
  } catch {
    return createDefaultSave();
  }
}

export function saveGame(data: SaveData) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function resetSave() {
  const freshSave = createDefaultSave();
  saveGame(freshSave);
  return freshSave;
}

function isVector(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === "number");
}
