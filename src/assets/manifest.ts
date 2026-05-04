export type AnimalId = "koala" | "jaguar";

export interface AnimalDefinition {
  id: AnimalId;
  name: string;
  tagline: string;
  skill: string;
  color: string;
  accent: string;
  speed: number;
  dash: number;
}

export interface LandmarkDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  position: [number, number, number];
  radius: number;
  color: string;
}

export interface CollectibleDefinition {
  id: string;
  name: string;
  description: string;
  position: [number, number, number];
}

export const animals: AnimalDefinition[] = [
  {
    id: "koala",
    name: "Koala",
    tagline: "Climbs ramps, finds gumleaf shortcuts, and takes victory naps.",
    skill: "Leaf Glide",
    color: "#b7beb6",
    accent: "#eef2ec",
    speed: 8.2,
    dash: 27,
  },
  {
    id: "jaguar",
    name: "Jaguar",
    tagline: "Bounds across bridges, pounces through plazas, and finds secret routes.",
    skill: "Pounce Dash",
    color: "#d99743",
    accent: "#2a1a12",
    speed: 9.6,
    dash: 31,
  },
];

export const landmarks: LandmarkDefinition[] = [
  {
    id: "parliament",
    name: "Parliament House",
    shortName: "Parliament",
    description: "Run up the grassy roof and ring the flag beacon.",
    position: [0, 0, -28],
    radius: 5.6,
    color: "#d8e7dc",
  },
  {
    id: "questacon",
    name: "Questacon",
    shortName: "Questacon",
    description: "Spin the science rings to charge the discovery badge.",
    position: [-24, 0, -10],
    radius: 4.8,
    color: "#f3ca6b",
  },
  {
    id: "war-memorial",
    name: "Australian War Memorial",
    shortName: "Memorial",
    description: "Follow the quiet avenue and light the reflection pool.",
    position: [0, 0, 29],
    radius: 5.2,
    color: "#c8d0c4",
  },
  {
    id: "telstra",
    name: "Telstra Tower",
    shortName: "Telstra Tower",
    description: "Climb Black Mountain and touch the sky signal.",
    position: [30, 0, 20],
    radius: 5,
    color: "#a8bed8",
  },
  {
    id: "arboretum",
    name: "National Arboretum",
    shortName: "Arboretum",
    description: "Weave through tree circles and collect the seed badge.",
    position: [-32, 0, 22],
    radius: 5.6,
    color: "#78b66a",
  },
];

export const collectibles: CollectibleDefinition[] = [
  {
    id: "gumleaf-bridge",
    name: "Starter gumleaf",
    description: "A bright gumleaf on the first bridge path.",
    position: [0, 0.9, 8],
  },
  {
    id: "gumleaf-flag",
    name: "Flag gumleaf",
    description: "A bright gumleaf near the hill to Parliament.",
    position: [13, 0.9, -17],
  },
  {
    id: "gumleaf-questacon",
    name: "Science gumleaf",
    description: "A gumleaf glowing near Questacon.",
    position: [-18, 0.9, 9],
  },
  {
    id: "gumleaf-lake",
    name: "Lake gumleaf",
    description: "A gumleaf floating by the lake road.",
    position: [21, 0.9, 11],
  },
  {
    id: "gumleaf-west",
    name: "Western gumleaf",
    description: "A gumleaf hidden near the western trees.",
    position: [-36, 0.9, -1],
  },
  {
    id: "gumleaf-east",
    name: "Eastern gumleaf",
    description: "A gumleaf tucked beside the eastern road.",
    position: [35, 0.9, -8],
  },
  {
    id: "gumleaf-memorial",
    name: "Memorial gumleaf",
    description: "A gumleaf beside the northern avenue.",
    position: [8, 0.9, 37],
  },
];

export const credits = [
  "Animal characters are original low-poly procedural game models built for this PWA.",
  "External free CC animal models were reviewed for the production path; this first build uses custom optimized meshes to keep iPad loading reliable.",
  "Canberra landmarks are stylized, game-friendly interpretations rather than survey-accurate models.",
];
