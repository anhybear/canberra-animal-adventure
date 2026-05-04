import * as THREE from "three";
import { collectibles, landmarks } from "../assets/manifest";

export interface CollectibleObject {
  id: string;
  pivot: THREE.Object3D;
}

export type Collider =
  | {
      kind: "box";
      id: string;
      center: [number, number];
      halfSize: [number, number];
    }
  | {
      kind: "circle";
      id: string;
      center: [number, number];
      radius: number;
    };

export interface WorldBuild {
  root: THREE.Group;
  landmarkBeacons: Map<string, THREE.Object3D>;
  collectiblePivots: CollectibleObject[];
  colliders: Collider[];
}

export function createWorld(): WorldBuild {
  const root = new THREE.Group();
  const landmarkBeacons = new Map<string, THREE.Object3D>();
  const collectiblePivots: CollectibleObject[] = [];
  const colliders = createColliders();

  const grass = new THREE.Mesh(
    new THREE.CircleGeometry(62, 96),
    new THREE.MeshStandardMaterial({ color: "#71aa71", roughness: 0.95 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  root.add(grass);

  addLake(root);
  addRoads(root);
  addBridge(root, -12);
  addBridge(root, 12);
  addTreeFields(root);
  addLandmarks(root, landmarkBeacons);
  addCollectibles(root, collectiblePivots);
  addBoundaryHills(root);

  return { root, landmarkBeacons, collectiblePivots, colliders };
}

function createColliders(): Collider[] {
  return [
    { kind: "box", id: "parliament-building", center: [0, -28], halfSize: [4.7, 3.35] },
    { kind: "circle", id: "questacon-building", center: [-24, -10], radius: 3.25 },
    { kind: "box", id: "memorial-building", center: [0, 29], halfSize: [3.9, 2.55] },
    { kind: "circle", id: "telstra-tower", center: [30, 20], radius: 2.3 },
    { kind: "circle", id: "arboretum-dome", center: [-32, 22], radius: 2.15 },
  ];
}

function addLake(root: THREE.Group) {
  const lake = new THREE.Mesh(
    new THREE.ShapeGeometry(makeLakeShape()),
    new THREE.MeshStandardMaterial({ color: "#48a7be", roughness: 0.38, metalness: 0.04, transparent: true, opacity: 0.88 }),
  );
  lake.rotation.x = -Math.PI / 2;
  lake.position.y = 0.03;
  lake.receiveShadow = true;
  root.add(lake);
}

function makeLakeShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-39, -3);
  shape.bezierCurveTo(-29, -9, -12, -7, -2, -5);
  shape.bezierCurveTo(12, -2, 26, -8, 40, -2);
  shape.bezierCurveTo(29, 6, 11, 7, -1, 5);
  shape.bezierCurveTo(-16, 3, -29, 8, -39, -3);
  return shape;
}

function addRoads(root: THREE.Group) {
  const roadMat = new THREE.MeshStandardMaterial({ color: "#59605c", roughness: 0.88 });
  const paths: Array<[number, number, number, number]> = [
    [0, 0, 4.2, 82],
    [0, 0, 82, 3.2],
    [-25, 5, 3, 42],
    [28, 5, 3, 45],
    [-17, -20, 36, 3],
    [18, 21, 30, 3],
  ];
  paths.forEach(([x, z, width, depth]) => {
    const road = new THREE.Mesh(new THREE.BoxGeometry(width, 0.06, depth), roadMat);
    road.position.set(x, 0.045, z);
    road.receiveShadow = true;
    root.add(road);
  });
}

function addBridge(root: THREE.Group, z: number) {
  const bridgeMat = new THREE.MeshStandardMaterial({ color: "#d0c19d", roughness: 0.78 });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(10, 0.42, 2.3), bridgeMat);
  bridge.position.set(0, 0.34, z);
  bridge.castShadow = true;
  bridge.receiveShadow = true;
  root.add(bridge);
  for (const x of [-4.6, 4.6]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 2.7), bridgeMat);
    rail.position.set(x, 0.86, z);
    rail.castShadow = true;
    root.add(rail);
  }
}

function addTreeFields(root: THREE.Group) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: "#6c4a2e", roughness: 0.9 });
  const leafMats = ["#4f9b5d", "#68aa58", "#76b36f"].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.82 }));
  for (let i = 0; i < 96; i += 1) {
    const angle = i * 2.399;
    const radius = 18 + ((i * 13) % 42);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(z) < 8 && Math.abs(x) < 43) continue;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 0.85, 6), trunkMat);
    trunk.position.y = 0.42;
    trunk.castShadow = true;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.64 + (i % 3) * 0.1, 1.25, 7), leafMats[i % leafMats.length]);
    crown.position.y = 1.28;
    crown.castShadow = true;
    tree.add(trunk, crown);
    tree.position.set(x, 0, z);
    tree.rotation.y = angle;
    root.add(tree);
  }
}

function addLandmarks(root: THREE.Group, beacons: Map<string, THREE.Object3D>) {
  for (const landmark of landmarks) {
    const group = new THREE.Group();
    group.position.set(...landmark.position);
    group.name = landmark.id;
    const material = new THREE.MeshStandardMaterial({ color: landmark.color, roughness: 0.72 });

    if (landmark.id === "parliament") {
      group.add(box([6.8, 0.9, 4.6], material, [0, 0.45, 0]));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 1.6, 4), new THREE.MeshStandardMaterial({ color: "#7ebc78", roughness: 0.88 }));
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 1.45;
      roof.castShadow = true;
      group.add(roof);
      group.add(cylinder(0.08, 4.7, "#ebf2f0", [0, 4.2, 0]));
      group.add(box([1.6, 0.48, 0.12], new THREE.MeshStandardMaterial({ color: "#245f83" }), [0.8, 6.35, 0]));
    } else if (landmark.id === "questacon") {
      group.add(cylinder(2.6, 1.4, landmark.color, [0, 0.72, 0]));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.09, 8, 48), new THREE.MeshStandardMaterial({ color: "#f35f4b", roughness: 0.55 }));
      ring.position.y = 1.7;
      ring.rotation.x = Math.PI / 2.7;
      group.add(ring);
    } else if (landmark.id === "war-memorial") {
      group.add(box([5.8, 1.2, 3.4], material, [0, 0.6, 0]));
      group.add(cylinder(1.2, 1.7, "#c9d6c8", [0, 1.8, 0]));
      group.add(box([1.8, 0.05, 8.5], new THREE.MeshStandardMaterial({ color: "#4ba5ba", transparent: true, opacity: 0.75 }), [0, 0.08, -5.6]));
    } else if (landmark.id === "telstra") {
      group.add(cylinder(0.34, 8.3, "#dce8ed", [0, 4.15, 0]));
      group.add(cylinder(1.1, 0.7, "#6b879e", [0, 6.1, 0]));
      group.add(cylinder(0.08, 3.5, "#e6f0f5", [0, 8.3, 0]));
    } else {
      for (let i = 0; i < 13; i += 1) {
        const angle = (i / 13) * Math.PI * 2;
        const tree = new THREE.Group();
        tree.add(cylinder(0.12, 0.85, "#74543d", [0, 0.42, 0]));
        tree.add(cone(0.54, 1.1, "#5aa268", [0, 1.22, 0]));
        tree.position.set(Math.cos(angle) * 2.6, 0, Math.sin(angle) * 2.6);
        group.add(tree);
      }
      group.add(cylinder(1.4, 0.22, "#e8d48a", [0, 0.12, 0]));
    }

    const beacon = cylinder(0.18, 1.2, "#fff6a4", [0, 2.6, 0]);
    beacon.name = `${landmark.id}-beacon`;
    group.add(beacon);
    beacons.set(landmark.id, beacon);
    root.add(group);
  }
}

function addCollectibles(root: THREE.Group, pivots: CollectibleObject[]) {
  const leafMat = new THREE.MeshStandardMaterial({ color: "#d8e95b", roughness: 0.52, emissive: "#3c4609", emissiveIntensity: 0.18 });
  const ringMat = new THREE.MeshStandardMaterial({ color: "#fff2a5", roughness: 0.4, emissive: "#cfae20", emissiveIntensity: 0.35, transparent: true, opacity: 0.86 });
  collectibles.forEach((item, index) => {
    const pivot = new THREE.Group();
    pivot.name = item.id;
    pivot.position.set(...item.position);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.045, 8, 48), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.18;
    pivot.add(ring);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 8), leafMat);
    leaf.scale.set(0.45, 0.1, 1);
    leaf.rotation.z = index * 0.7;
    leaf.castShadow = true;
    pivot.add(leaf);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.82, 16, 10), new THREE.MeshStandardMaterial({ color: "#fff2a5", emissive: "#d8e95b", emissiveIntensity: 0.22, transparent: true, opacity: 0.24 }));
    glow.scale.set(1, 0.38, 1);
    pivot.add(glow);
    root.add(pivot);
    pivots.push({ id: item.id, pivot });
  });
}

function addBoundaryHills(root: THREE.Group) {
  const mat = new THREE.MeshStandardMaterial({ color: "#5f935d", roughness: 0.96 });
  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * Math.PI * 2;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(5 + (i % 4), 2.2 + (i % 3), 8), mat);
    hill.position.set(Math.cos(angle) * 63, 0.2, Math.sin(angle) * 63);
    hill.rotation.y = angle;
    hill.receiveShadow = true;
    root.add(hill);
  }
}

function box(size: [number, number, number], material: THREE.Material, position: [number, number, number]) {
  const item = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  item.position.set(...position);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function cylinder(radius: number, height: number, color: string, position: [number, number, number]) {
  const item = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 18), new THREE.MeshStandardMaterial({ color, roughness: 0.68 }));
  item.position.set(...position);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function cone(radius: number, height: number, color: string, position: [number, number, number]) {
  const item = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.84 }));
  item.position.set(...position);
  item.castShadow = true;
  return item;
}
