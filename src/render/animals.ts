import * as THREE from "three";
import { type AnimalDefinition, type AnimalId } from "../assets/manifest";

export interface AnimalRig {
  root: THREE.Group;
  head: THREE.Object3D;
  body: THREE.Object3D;
  legs: THREE.Object3D[];
  tail?: THREE.Object3D;
  scarf: THREE.Object3D;
  update: (time: number, speed: number, airborne: boolean) => void;
}

export function createAnimalRig(animal: AnimalDefinition): AnimalRig {
  return animal.id === "koala" ? createKoala(animal) : createJaguar(animal);
}

function createKoala(animal: AnimalDefinition): AnimalRig {
  const root = new THREE.Group();
  root.name = "koala-rig";
  const bodyMat = mat(animal.color, 0.74, 0.55);
  const lightMat = mat(animal.accent, 0.9, 0.45);
  const darkMat = mat("#303633", 0.65, 0.7);

  const body = mesh(new THREE.SphereGeometry(0.72, 18, 14), bodyMat, [0, 0.82, 0]);
  body.scale.set(0.92, 1.05, 0.72);
  root.add(body);

  const belly = mesh(new THREE.SphereGeometry(0.45, 16, 10), lightMat, [0, 0.74, 0.42]);
  belly.scale.set(0.9, 0.78, 0.32);
  root.add(belly);

  const head = mesh(new THREE.SphereGeometry(0.55, 18, 14), bodyMat, [0, 1.55, 0.05]);
  head.scale.set(1.06, 0.9, 0.9);
  root.add(head);

  const ears = [
    mesh(new THREE.SphereGeometry(0.26, 14, 10), bodyMat, [-0.42, 1.72, 0.02]),
    mesh(new THREE.SphereGeometry(0.26, 14, 10), bodyMat, [0.42, 1.72, 0.02]),
  ];
  ears.forEach((ear) => root.add(ear));

  const nose = mesh(new THREE.SphereGeometry(0.13, 12, 8), darkMat, [0, 1.48, 0.5]);
  nose.scale.set(1.1, 0.78, 0.72);
  root.add(nose);
  addEyes(root, [-0.18, 1.62, 0.45], [0.18, 1.62, 0.45]);

  const legs = makeLegs(root, bodyMat, 0.42);
  const arms = [
    mesh(new THREE.CapsuleGeometry(0.13, 0.44, 6, 10), bodyMat, [-0.61, 0.82, 0.08]),
    mesh(new THREE.CapsuleGeometry(0.13, 0.44, 6, 10), bodyMat, [0.61, 0.82, 0.08]),
  ];
  arms.forEach((arm, index) => {
    arm.rotation.z = index === 0 ? 0.48 : -0.48;
    root.add(arm);
    legs.push(arm);
  });
  const scarf = createScarf("#e55c45");
  scarf.position.y = 1.18;
  root.add(scarf);

  return {
    root,
    head,
    body,
    legs,
    scarf,
    update: (time, speed, airborne) => animateRig(time, speed, airborne, root, head, body, legs, undefined, scarf),
  };
}

function createJaguar(animal: AnimalDefinition): AnimalRig {
  const root = new THREE.Group();
  root.name = "jaguar-rig";
  const bodyMat = mat(animal.color, 0.78, 0.48);
  const darkMat = mat("#201612", 0.72, 0.68);
  const creamMat = mat("#f1d89d", 0.82, 0.5);
  const noseMat = mat("#120c09", 0.62, 0.42);

  const body = mesh(new THREE.SphereGeometry(0.72, 20, 12), bodyMat, [0, 0.72, 0]);
  body.scale.set(0.82, 0.52, 1.7);
  root.add(body);

  const shoulders = mesh(new THREE.SphereGeometry(0.48, 16, 10), bodyMat, [0, 0.78, 0.72]);
  shoulders.scale.set(1.28, 0.78, 0.72);
  root.add(shoulders);

  const haunches = mesh(new THREE.SphereGeometry(0.46, 16, 10), bodyMat, [0, 0.72, -0.74]);
  haunches.scale.set(1.08, 0.7, 0.78);
  root.add(haunches);

  const chest = mesh(new THREE.SphereGeometry(0.36, 14, 10), creamMat, [0, 0.66, 0.98]);
  chest.scale.set(0.98, 0.72, 0.32);
  root.add(chest);

  const head = mesh(new THREE.SphereGeometry(0.43, 18, 12), bodyMat, [0, 1.03, 1.15]);
  head.scale.set(1.1, 0.84, 1.02);
  root.add(head);

  const snout = mesh(new THREE.SphereGeometry(0.22, 14, 8), creamMat, [0, 0.94, 1.5]);
  snout.scale.set(1.52, 0.72, 0.88);
  root.add(snout);

  const nose = mesh(new THREE.SphereGeometry(0.075, 10, 8), noseMat, [0, 0.96, 1.69]);
  nose.scale.set(1.55, 0.72, 0.72);
  root.add(nose);

  addEyes(root, [-0.18, 1.12, 1.5], [0.18, 1.12, 1.5]);

  const ears = [
    mesh(new THREE.SphereGeometry(0.13, 12, 8), bodyMat, [-0.33, 1.29, 1.02]),
    mesh(new THREE.SphereGeometry(0.13, 12, 8), bodyMat, [0.33, 1.29, 1.02]),
  ];
  ears.forEach((ear) => {
    ear.scale.set(1.08, 0.86, 0.66);
    root.add(ear);
  });

  addJaguarRosettes(root, darkMat);
  addJaguarFaceMarks(root, darkMat);

  const legs: THREE.Object3D[] = [];
  for (const x of [-0.43, 0.43]) {
    for (const z of [-0.74, 0.72]) {
      const leg = mesh(new THREE.CapsuleGeometry(0.14, 0.52, 6, 8), bodyMat, [x, 0.32, z]);
      leg.scale.set(1.05, 1, 0.92);
      root.add(leg);
      legs.push(leg);

      const paw = mesh(new THREE.SphereGeometry(0.15, 10, 8), bodyMat, [x, 0.08, z + 0.08]);
      paw.scale.set(1.42, 0.48, 1);
      root.add(paw);
    }
  }

  const tail = mesh(new THREE.CapsuleGeometry(0.075, 1.14, 6, 12), bodyMat, [0, 0.7, -1.22]);
  tail.rotation.x = 1.28;
  tail.rotation.z = 0.18;
  root.add(tail);
  addJaguarTailMarks(root, darkMat);

  const scarf = createScarf("#3aa3a0");
  scarf.position.set(0, 0.96, 0.92);
  root.add(scarf);

  return {
    root,
    head,
    body,
    legs,
    tail,
    scarf,
    update: (time, speed, airborne) => animateRig(time, speed, airborne, root, head, body, legs, tail, scarf),
  };
}

function addJaguarRosettes(root: THREE.Group, material: THREE.Material) {
  const rosettePositions: Array<[number, number, number, number]> = [
    [-0.53, 0.86, -0.82, 0.1],
    [-0.56, 0.76, -0.32, -0.12],
    [-0.53, 0.92, 0.24, 0.18],
    [-0.48, 0.8, 0.76, -0.08],
    [0.53, 0.84, -0.66, -0.14],
    [0.56, 0.78, -0.08, 0.09],
    [0.53, 0.9, 0.46, -0.2],
    [-0.24, 1.11, -0.62, 0.12],
    [0.22, 1.12, -0.18, -0.16],
    [-0.2, 1.11, 0.36, 0.08],
  ];

  for (const [x, y, z, rotation] of rosettePositions) {
    const rosette = mesh(new THREE.TorusGeometry(0.07, 0.012, 5, 10), material, [x, y, z]);
    const isBackSpot = y > 1.08;
    rosette.rotation.y = isBackSpot ? 0 : Math.PI / 2;
    rosette.rotation.x = isBackSpot ? Math.PI / 2 : rotation;
    rosette.rotation.z = rotation;
    rosette.scale.set(1.25, 0.85, 1);
    root.add(rosette);

    if (Math.abs(z) < 0.7) {
      const center = mesh(new THREE.SphereGeometry(0.018, 6, 4), material, [x * 1.01, y, z]);
      center.scale.set(1, 0.75, 0.5);
      root.add(center);
    }
  }

  for (const position of [
    [-0.16, 1.12, 1.2],
    [0.16, 1.12, 1.2],
    [-0.3, 0.98, 1.28],
    [0.3, 0.98, 1.28],
    [-0.36, 0.7, 1.02],
    [0.36, 0.7, 1.02],
  ] as Array<[number, number, number]>) {
    const spot = mesh(new THREE.SphereGeometry(0.035, 8, 6), material, position);
    spot.scale.z = 0.35;
    root.add(spot);
  }
}

function addJaguarTailMarks(root: THREE.Group, material: THREE.Material) {
  for (const [y, z, scale] of [
    [0.67, -1.46, 1],
    [0.72, -1.66, 0.92],
  ] as Array<[number, number, number]>) {
    const ring = mesh(new THREE.TorusGeometry(0.082 * scale, 0.012, 5, 10), material, [0, y, z]);
    ring.rotation.x = Math.PI / 2;
    ring.scale.set(0.82, 1, 1);
    root.add(ring);
  }

  const tip = mesh(new THREE.SphereGeometry(0.072, 8, 6), material, [0, 0.75, -1.82]);
  tip.scale.set(0.92, 0.92, 1.25);
  root.add(tip);
}

function addJaguarFaceMarks(root: THREE.Group, material: THREE.Material) {
  const marks = [
    mesh(new THREE.BoxGeometry(0.035, 0.16, 0.018), material, [-0.2, 1.02, 1.55]),
    mesh(new THREE.BoxGeometry(0.035, 0.16, 0.018), material, [0.2, 1.02, 1.55]),
    mesh(new THREE.BoxGeometry(0.28, 0.022, 0.018), material, [0, 0.86, 1.56]),
  ];

  marks[0].rotation.z = -0.22;
  marks[1].rotation.z = 0.22;
  marks.forEach((mark) => root.add(mark));
}

function makeLegs(root: THREE.Group, material: THREE.Material, zSpan: number) {
  const legs: THREE.Object3D[] = [];
  for (const x of [-0.43, 0.43]) {
    for (const z of [-zSpan / 2, zSpan / 2]) {
      const leg = mesh(new THREE.CapsuleGeometry(0.12, 0.48, 6, 8), material, [x, 0.36, z]);
      leg.rotation.x = 0.05;
      root.add(leg);
      legs.push(leg);
    }
  }
  return legs;
}

function addEyes(root: THREE.Group, left: [number, number, number], right: [number, number, number]) {
  const eyeMat = mat("#111817", 0.5, 0.35);
  for (const position of [left, right]) {
    const eye = mesh(new THREE.SphereGeometry(0.045, 10, 8), eyeMat, position);
    root.add(eye);
  }
}

function createScarf(color: string) {
  const scarf = new THREE.Group();
  const material = mat(color, 0.82, 0.42);
  scarf.add(mesh(new THREE.TorusGeometry(0.38, 0.045, 8, 28), material, [0, 0, 0]));
  const tail = mesh(new THREE.BoxGeometry(0.14, 0.46, 0.06), material, [0.32, -0.18, 0.08]);
  tail.rotation.z = -0.22;
  scarf.add(tail);
  return scarf;
}

function animateRig(
  time: number,
  speed: number,
  airborne: boolean,
  root: THREE.Group,
  head: THREE.Object3D,
  body: THREE.Object3D,
  legs: THREE.Object3D[],
  tail: THREE.Object3D | undefined,
  scarf: THREE.Object3D,
) {
  const run = Math.min(1, speed / 9);
  const bounce = airborne ? 0.08 : Math.abs(Math.sin(time * 10)) * 0.06 * run;
  root.position.y = bounce;
  body.rotation.x = Math.sin(time * 5.4) * 0.04 * run;
  head.rotation.y = Math.sin(time * 2.1) * 0.08;
  head.rotation.x = airborne ? -0.16 : Math.sin(time * 4.7) * 0.035 * run;
  legs.forEach((leg, index) => {
    leg.rotation.x = Math.sin(time * 9 + index * Math.PI) * 0.45 * run + (airborne ? -0.45 : 0);
  });
  if (tail) tail.rotation.z = Math.sin(time * 6) * 0.22 * run;
  scarf.rotation.y = Math.sin(time * 5) * 0.05;
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number]) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(...position);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function mat(color: string, roughness: number, metalness: number) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: metalness * 0.08 });
}
