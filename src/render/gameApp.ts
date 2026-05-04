import * as THREE from "three";
import { animals, collectibles, landmarks } from "../assets/manifest";
import { InputController } from "../input/input";
import { GameState } from "../simulation/gameState";
import { createAnimalRig, type AnimalRig } from "./animals";
import { createWorld, type WorldBuild } from "./world";

export interface GameAppEvents {
  onSnapshot: () => void;
  onReward: (title: string, detail: string) => void;
}

export class GameApp {
  readonly state = new GameState();
  readonly input: InputController;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(58, 1, 0.1, 220);
  private renderer: THREE.WebGLRenderer;
  private clock = new THREE.Clock();
  private world: WorldBuild;
  private animalRig: AnimalRig | null = null;
  private particles: THREE.Mesh[] = [];
  private frameCount = 0;
  private disposed = false;
  private audio: AudioContext | null = null;
  private moveTrailTimer = 0;
  private respawnTimers = new Map<string, number>();
  private characterPointer: number | null = null;
  private dragAnchor = new THREE.Vector2();

  constructor(private canvasHost: HTMLElement, private events: GameAppEvents) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvasHost.appendChild(this.renderer.domElement);
    this.input = new InputController(canvasHost);

    this.scene.background = new THREE.Color("#88d5d3");
    this.scene.fog = new THREE.Fog("#88d5d3", 54, 118);
    this.addLighting();
    this.world = createWorld();
    this.scene.add(this.world.root);
    this.state.save.collectedItems.forEach((id, index) => {
      this.respawnTimers.set(id, 2 + index * 0.8);
    });
    this.camera.position.set(0, 8, 15);
    this.resize();
    window.addEventListener("resize", this.resize);
    this.renderer.domElement.addEventListener("pointerdown", this.onCanvasPointerDown);
    this.renderer.domElement.addEventListener("pointermove", this.onCanvasPointerMove);
    this.renderer.domElement.addEventListener("pointerup", this.onCanvasPointerEnd);
    this.renderer.domElement.addEventListener("pointercancel", this.onCanvasPointerEnd);
    this.ensureAnimalRig();
    this.renderer.setAnimationLoop(this.tick);
  }

  get canvasElement() {
    return this.renderer.domElement;
  }

  mount(host: HTMLElement) {
    this.canvasHost = host;
    this.canvasHost.appendChild(this.renderer.domElement);
    this.resize();
  }

  chooseAnimal(id: "koala" | "jaguar") {
    this.state.chooseAnimal(id);
    this.ensureAnimalRig(true);
    this.camera.position.set(0, 7.8, 17);
    this.events.onSnapshot();
  }

  restartAdventure() {
    this.state.restartAdventure();
    this.clearAnimalRig();
    this.respawnTimers.clear();
    this.input.resetMovement();
    this.events.onSnapshot();
  }

  bindTouch(joystick: HTMLElement, knob: HTMLElement, jump: HTMLElement, dash: HTMLElement) {
    this.input.bindTouch(joystick, knob, jump, dash);
  }

  setMuted(muted: boolean) {
    this.state.setMuted(muted);
    this.events.onSnapshot();
  }

  getPlayerScreenPosition() {
    return this.projectPlayerToScreen();
  }

  destroy() {
    this.disposed = true;
    window.removeEventListener("resize", this.resize);
    this.renderer.domElement.removeEventListener("pointerdown", this.onCanvasPointerDown);
    this.renderer.domElement.removeEventListener("pointermove", this.onCanvasPointerMove);
    this.renderer.domElement.removeEventListener("pointerup", this.onCanvasPointerEnd);
    this.renderer.domElement.removeEventListener("pointercancel", this.onCanvasPointerEnd);
    this.input.destroy();
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
  }

  private tick = () => {
    if (this.disposed) return;
    const dt = Math.min(0.033, this.clock.getDelta());
    const elapsed = this.clock.elapsedTime;
    this.updatePlayer(dt, elapsed);
    this.updateScene(elapsed, dt);
    this.renderer.render(this.scene, this.camera);
    this.frameCount += 1;
    if (this.frameCount % 45 === 0) this.events.onSnapshot();
  };

  private updatePlayer(dt: number, elapsed: number) {
    const player = this.state.player;
    if (!player) return;
    const animal = this.state.animalDefinition;
    const input = this.input.poll(dt);
    const turning = Math.abs(input.moveX) > 0.03;
    const hasForwardInput = Math.abs(input.moveY) > 0.05;
    const moving = hasForwardInput || turning;
    const forwardAmount = hasForwardInput ? Math.abs(input.moveY) : Math.abs(input.moveX) * 0.45;
    const moveDirection = input.moveY < -0.05 ? -1 : 1;
    const targetSpeed = moving ? animal.speed * Math.min(1, forwardAmount) * moveDirection : 0;

    if (turning) {
      const turnRate = player.dashTimer > 0 ? 1.8 : 2.45;
      player.heading -= input.moveX * turnRate * dt;
    }

    if (moving) {
      const targetVelocityX = Math.sin(player.heading) * targetSpeed;
      const targetVelocityZ = Math.cos(player.heading) * targetSpeed;
      const currentSpeed = Math.hypot(player.velocity.x, player.velocity.z);
      const absoluteTargetSpeed = Math.abs(targetSpeed);
      const turnDot =
        currentSpeed > 0.01
          ? (player.velocity.x * targetVelocityX + player.velocity.z * targetVelocityZ) / Math.max(0.001, currentSpeed * absoluteTargetSpeed)
          : 1;
      const acceleration = player.dashTimer > 0 ? 36 : turnDot < -0.2 ? 24 : 16;
      player.velocity.x = THREE.MathUtils.damp(player.velocity.x, targetVelocityX, acceleration, dt);
      player.velocity.z = THREE.MathUtils.damp(player.velocity.z, targetVelocityZ, acceleration, dt);
    } else {
      player.velocity.x = THREE.MathUtils.damp(player.velocity.x, 0, 13, dt);
      player.velocity.z = THREE.MathUtils.damp(player.velocity.z, 0, 13, dt);
    }

    if (input.jumpPressed && player.grounded) {
      player.velocity.y = 10.8;
      player.velocity.x += Math.sin(player.heading) * 2.2;
      player.velocity.z += Math.cos(player.heading) * 2.2;
      player.grounded = false;
      this.spawnJumpRing(player.position.x, player.position.z, animal.color);
      this.playTone(260, 0.12);
    }
    if (input.dashPressed && player.dashCooldown <= 0) {
      player.velocity.x = Math.sin(player.heading) * animal.dash;
      player.velocity.z = Math.cos(player.heading) * animal.dash;
      player.dashCooldown = 0.95;
      player.dashTimer = 0.22;
      this.spawnTrail(player.position.x, player.position.y + 0.7, player.position.z, animal.color);
      this.events.onReward("Dash burst", "Zoom forward to cross gaps and grab gumleaves.");
      this.playTone(460, 0.12);
    }
    this.input.consumeButtons();

    player.velocity.y -= 18 * dt;
    if (player.dashTimer > 0) {
      player.dashTimer = Math.max(0, player.dashTimer - dt);
      player.velocity.x = Math.sin(player.heading) * Math.max(Math.hypot(player.velocity.x, player.velocity.z), animal.speed * 1.65);
      player.velocity.z = Math.cos(player.heading) * Math.max(Math.hypot(player.velocity.x, player.velocity.z), animal.speed * 1.65);
    }
    player.position.x += player.velocity.x * dt;
    player.position.y += player.velocity.y * dt;
    player.position.z += player.velocity.z * dt;
    this.resolveWorldCollisions();
    const horizontalSpeed = Math.hypot(player.velocity.x, player.velocity.z);
    if (horizontalSpeed > 2.2 && player.grounded) {
      this.moveTrailTimer -= dt;
      if (this.moveTrailTimer <= 0) {
        this.spawnMovePuff(player.position.x, player.position.z, animal.color);
        this.moveTrailTimer = 0.1;
      }
    } else {
      this.moveTrailTimer = 0;
    }
    const radius = Math.hypot(player.position.x, player.position.z);
    if (radius > 57) {
      const scale = 57 / radius;
      player.position.x *= scale;
      player.position.z *= scale;
    }
    if (player.position.y <= 0) {
      player.position.y = 0;
      player.velocity.y = 0;
      player.grounded = true;
    }
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);

    if (this.animalRig) {
      this.animalRig.root.position.set(player.position.x, player.position.y, player.position.z);
      this.animalRig.root.rotation.y = player.heading;
      this.animalRig.update(elapsed, Math.hypot(player.velocity.x, player.velocity.z), !player.grounded);
      this.animalRig.scarf.visible = this.state.save.cosmetics.includes("golden-scarf") || this.state.save.unlockedLandmarks.length > 0;
    }
    this.updateCamera(dt);
    const before = this.state.save.unlockedLandmarks.length;
    this.state.updateDiscovery();
    if (this.state.newlyUnlocked && this.state.save.unlockedLandmarks.length > before) {
      const landmark = this.state.newlyUnlocked;
      this.spawnBurst(landmark.position[0], 2.2, landmark.position[2], landmark.color);
      this.playTone(620, 0.16);
      this.events.onReward(`${landmark.shortName} badge`, landmark.description);
    }
    const collected = this.state.collectNearbyItem();
    if (collected) {
      this.hideCollectible(collected.id);
      this.respawnTimers.set(collected.id, 8 + (this.state.save.gumleafScore % 5) * 1.5);
      this.spawnBurst(collected.position[0], 1.4, collected.position[2], "#d8e95b");
      this.playTone(760, 0.12);
      this.events.onReward("Gumleaf collected", `${collected.name}: ${this.state.save.gumleafScore} total. More will grow back.`);
    }
  }

  private updateCamera(dt: number) {
    const player = this.state.player;
    if (!player) return;
    const behind = new THREE.Vector3(Math.sin(player.heading) * -9, 6.2, Math.cos(player.heading) * -9);
    const target = new THREE.Vector3(player.position.x, player.position.y, player.position.z).add(behind);
    this.camera.position.lerp(target, 1 - Math.exp(-dt * 4.8));
    this.camera.lookAt(player.position.x, player.position.y + 1.35, player.position.z);
  }

  private onCanvasPointerDown = (event: PointerEvent) => {
    if (this.characterPointer !== null || !this.state.player) return;
    const screen = this.projectPlayerToScreen();
    const distance = Math.hypot(event.clientX - screen.x, event.clientY - screen.y);
    if (distance > this.getCharacterTouchRadius()) return;

    event.preventDefault();
    this.characterPointer = event.pointerId;
    this.dragAnchor.set(screen.x, screen.y);
    this.renderer.domElement.setPointerCapture(event.pointerId);
    this.updateCharacterDrag(event);
  };

  private onCanvasPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== this.characterPointer) return;
    event.preventDefault();
    this.updateCharacterDrag(event);
  };

  private onCanvasPointerEnd = (event: PointerEvent) => {
    if (event.pointerId !== this.characterPointer) return;
    event.preventDefault();
    this.characterPointer = null;
    this.input.clearCharacterDrag();
    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) {
      this.renderer.domElement.releasePointerCapture(event.pointerId);
    }
  };

  private updateCharacterDrag(event: PointerEvent) {
    const radius = this.getCharacterTouchRadius();
    const x = THREE.MathUtils.clamp((event.clientX - this.dragAnchor.x) / radius, -1, 1);
    const y = THREE.MathUtils.clamp((this.dragAnchor.y - event.clientY) / radius, -1, 1);
    this.input.setCharacterDragVector(x, y);
  }

  private projectPlayerToScreen() {
    const player = this.state.player;
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    if (!player || rect.width === 0 || rect.height === 0) return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

    const point = new THREE.Vector3(player.position.x, player.position.y + 1.05, player.position.z).project(this.camera);
    return {
      x: rect.left + (point.x + 1) * 0.5 * rect.width,
      y: rect.top + (1 - point.y) * 0.5 * rect.height,
    };
  }

  private getCharacterTouchRadius() {
    const canvas = this.renderer.domElement;
    const shortestSide = Math.min(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);
    return THREE.MathUtils.clamp(shortestSide * 0.13, 76, 124);
  }

  private updateScene(elapsed: number, dt: number) {
    this.world.landmarkBeacons.forEach((beacon, id) => {
      const unlocked = this.state.save.unlockedLandmarks.includes(id);
      beacon.scale.setScalar(unlocked ? 1.25 + Math.sin(elapsed * 4) * 0.08 : 0.9 + Math.sin(elapsed * 2.2) * 0.06);
      const mat = (beacon as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.emissive = new THREE.Color(unlocked ? "#f9e87d" : "#394508");
      mat.emissiveIntensity = unlocked ? 0.52 : 0.18;
    });
    this.world.collectiblePivots.forEach(({ id, pivot }, index) => {
      const collected = this.state.save.collectedItems.includes(id);
      pivot.visible = !collected;
      if (collected) return;
      pivot.rotation.y = elapsed * 1.8 + index;
      pivot.position.y = 0.9 + Math.sin(elapsed * 2.4 + index) * 0.16;
      pivot.scale.setScalar(1 + Math.sin(elapsed * 3 + index) * 0.05);
    });
    this.updateRespawns(dt);
    this.particles = this.particles.filter((particle) => {
      particle.userData.life -= dt;
      particle.position.addScaledVector(particle.userData.velocity, dt);
      particle.scale.multiplyScalar(0.985);
      if (particle.userData.life <= 0) {
        this.scene.remove(particle);
        return false;
      }
      return true;
    });
  }

  private ensureAnimalRig(force = false) {
    const player = this.state.player;
    if (!player) return;
    if (this.animalRig && !force) return;
    if (this.animalRig) this.scene.remove(this.animalRig.root);
    const definition = animals.find((animal) => animal.id === player.animal) ?? animals[0];
    this.animalRig = createAnimalRig(definition);
    this.animalRig.root.position.set(player.position.x, player.position.y, player.position.z);
    this.scene.add(this.animalRig.root);
  }

  private clearAnimalRig() {
    if (!this.animalRig) return;
    this.scene.remove(this.animalRig.root);
    this.animalRig = null;
  }

  private resolveWorldCollisions() {
    const player = this.state.player;
    if (!player) return;
    const playerRadius = player.animal === "jaguar" ? 0.92 : 0.78;

    for (const collider of this.world.colliders) {
      if (collider.kind === "circle") {
        const dx = player.position.x - collider.center[0];
        const dz = player.position.z - collider.center[1];
        const distance = Math.hypot(dx, dz);
        const minimum = collider.radius + playerRadius;
        if (distance > 0 && distance < minimum) {
          const nx = dx / distance;
          const nz = dz / distance;
          player.position.x = collider.center[0] + nx * minimum;
          player.position.z = collider.center[1] + nz * minimum;
          this.removeVelocityIntoNormal(nx, nz);
        } else if (distance === 0) {
          player.position.z = collider.center[1] + minimum;
          this.removeVelocityIntoNormal(0, 1);
        }
      } else {
        const nearestX = THREE.MathUtils.clamp(player.position.x, collider.center[0] - collider.halfSize[0], collider.center[0] + collider.halfSize[0]);
        const nearestZ = THREE.MathUtils.clamp(player.position.z, collider.center[1] - collider.halfSize[1], collider.center[1] + collider.halfSize[1]);
        const dx = player.position.x - nearestX;
        const dz = player.position.z - nearestZ;
        const distance = Math.hypot(dx, dz);
        if (distance > 0 && distance < playerRadius) {
          const nx = dx / distance;
          const nz = dz / distance;
          player.position.x = nearestX + nx * playerRadius;
          player.position.z = nearestZ + nz * playerRadius;
          this.removeVelocityIntoNormal(nx, nz);
        } else if (distance === 0 && pointInsideBox(player.position.x, player.position.z, collider.center, collider.halfSize)) {
          const left = Math.abs(player.position.x - (collider.center[0] - collider.halfSize[0]));
          const right = Math.abs(collider.center[0] + collider.halfSize[0] - player.position.x);
          const top = Math.abs(player.position.z - (collider.center[1] - collider.halfSize[1]));
          const bottom = Math.abs(collider.center[1] + collider.halfSize[1] - player.position.z);
          const edge = Math.min(left, right, top, bottom);
          if (edge === left) {
            player.position.x = collider.center[0] - collider.halfSize[0] - playerRadius;
            this.removeVelocityIntoNormal(-1, 0);
          } else if (edge === right) {
            player.position.x = collider.center[0] + collider.halfSize[0] + playerRadius;
            this.removeVelocityIntoNormal(1, 0);
          } else if (edge === top) {
            player.position.z = collider.center[1] - collider.halfSize[1] - playerRadius;
            this.removeVelocityIntoNormal(0, -1);
          } else {
            player.position.z = collider.center[1] + collider.halfSize[1] + playerRadius;
            this.removeVelocityIntoNormal(0, 1);
          }
        }
      }
    }
  }

  private removeVelocityIntoNormal(nx: number, nz: number) {
    const player = this.state.player;
    if (!player) return;
    const dot = player.velocity.x * nx + player.velocity.z * nz;
    if (dot >= 0) return;
    player.velocity.x -= dot * nx;
    player.velocity.z -= dot * nz;
  }

  private hideCollectible(id: string) {
    const item = this.world.collectiblePivots.find((candidate) => candidate.id === id);
    if (item) item.pivot.visible = false;
  }

  private updateRespawns(dt: number) {
    for (const [id, remaining] of this.respawnTimers) {
      const next = remaining - dt;
      if (next > 0) {
        this.respawnTimers.set(id, next);
        continue;
      }
      this.respawnTimers.delete(id);
      this.state.respawnItem(id);
      const item = this.world.collectiblePivots.find((candidate) => candidate.id === id);
      if (item) {
        item.pivot.visible = true;
        this.spawnBurst(item.pivot.position.x, 1.1, item.pivot.position.z, "#fff2a5");
      }
      this.events.onSnapshot();
    }
  }

  private spawnBurst(x: number, y: number, z: number, color: string) {
    for (let i = 0; i < 24; i += 1) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 + (i % 3) * 0.025, 8, 6),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 }),
      );
      particle.position.set(x, y, z);
      particle.userData.life = 1 + Math.random() * 0.5;
      particle.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 5, 2 + Math.random() * 5, (Math.random() - 0.5) * 5);
      this.scene.add(particle);
      this.particles.push(particle);
    }
  }

  private spawnTrail(x: number, y: number, z: number, color: string) {
    for (let i = 0; i < 18; i += 1) {
      const particle = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 0.58),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 }),
      );
      particle.position.set(x + (Math.random() - 0.5), y, z + (Math.random() - 0.5));
      particle.rotation.y = this.state.player?.heading ?? 0;
      particle.userData.life = 0.55;
      particle.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 2.2, (Math.random() - 0.5) * 4);
      this.scene.add(particle);
      this.particles.push(particle);
    }
  }

  private spawnJumpRing(x: number, z: number, color: string) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.045, 8, 44),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.32, transparent: true, opacity: 0.85 }),
    );
    ring.position.set(x, 0.12, z);
    ring.rotation.x = Math.PI / 2;
    ring.userData.life = 0.5;
    ring.userData.velocity = new THREE.Vector3(0, 0.15, 0);
    this.scene.add(ring);
    this.particles.push(ring);
  }

  private spawnMovePuff(x: number, z: number, color: string) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 6),
      new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.55 }),
    );
    particle.position.set(x + (Math.random() - 0.5) * 0.45, 0.12, z + (Math.random() - 0.5) * 0.45);
    particle.userData.life = 0.38;
    particle.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.45, 0.35, (Math.random() - 0.5) * 0.45);
    this.scene.add(particle);
    this.particles.push(particle);
  }

  private playTone(frequency: number, duration: number) {
    if (this.state.save.muted) return;
    this.audio ??= new AudioContext();
    const oscillator = this.audio.createOscillator();
    const gain = this.audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, this.audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, this.audio.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.audio.currentTime + duration);
    oscillator.connect(gain).connect(this.audio.destination);
    oscillator.start();
    oscillator.stop(this.audio.currentTime + duration + 0.02);
  }

  private addLighting() {
    const hemi = new THREE.HemisphereLight("#ddfbff", "#547047", 2.4);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight("#fff8df", 3.6);
    sun.position.set(-15, 28, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -55;
    sun.shadow.camera.right = 55;
    sun.shadow.camera.top = 55;
    sun.shadow.camera.bottom = -55;
    this.scene.add(sun);
  }

  private resize = () => {
    const width = this.canvasHost.clientWidth || window.innerWidth;
    const height = this.canvasHost.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  getLandmarkStatus() {
    return landmarks.map((landmark) => ({
      ...landmark,
      unlocked: this.state.save.unlockedLandmarks.includes(landmark.id),
    }));
  }
}

function pointInsideBox(x: number, z: number, center: [number, number], halfSize: [number, number]) {
  return (
    x >= center[0] - halfSize[0] &&
    x <= center[0] + halfSize[0] &&
    z >= center[1] - halfSize[1] &&
    z <= center[1] + halfSize[1]
  );
}
