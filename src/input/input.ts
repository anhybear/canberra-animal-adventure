export interface InputState {
  moveX: number;
  moveY: number;
  jumpPressed: boolean;
  dashPressed: boolean;
}

export class InputController {
  state: InputState = { moveX: 0, moveY: 0, jumpPressed: false, dashPressed: false };
  private keys = new Set<string>();
  private joystickPointer: number | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private keyboardVector = { x: 0, y: 0 };
  private joystickVector = { x: 0, y: 0 };
  private smoothedVector = { x: 0, y: 0 };
  private lastKeyboardAt = 0;
  private lastTouchAt = 0;

  private readonly deadzone = 0.14;
  private readonly joystickRadius = 44;
  private readonly inputSmoothing = 16;
  private readonly lateralSensitivity = 0.72;

  constructor(private root: HTMLElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  bindTouch(joystick: HTMLElement, knob: HTMLElement, jump: HTMLElement, dash: HTMLElement) {
    joystick.addEventListener("pointerdown", (event) => {
      this.joystickPointer = event.pointerId;
      joystick.setPointerCapture(event.pointerId);
      const rect = joystick.getBoundingClientRect();
      this.joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this.updateJoystick(event.clientX, event.clientY, knob);
    });

    joystick.addEventListener("pointermove", (event) => {
      if (event.pointerId === this.joystickPointer) this.updateJoystick(event.clientX, event.clientY, knob);
    });

    const endStick = (event: PointerEvent) => {
      if (event.pointerId !== this.joystickPointer) return;
      this.joystickPointer = null;
      this.lastTouchAt = performance.now();
      this.joystickVector = { x: 0, y: 0 };
      knob.style.transform = "translate(-50%, -50%)";
    };
    joystick.addEventListener("pointerup", endStick);
    joystick.addEventListener("pointercancel", endStick);

    this.bindActionButton(jump, () => (this.state.jumpPressed = true));
    this.bindActionButton(dash, () => (this.state.dashPressed = true));
    this.root.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  poll(dt = 1 / 60): InputState {
    const x = (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) - (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0);
    const y = (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0) - (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0);
    this.keyboardVector = this.normalizeVector(x, y);

    const target = this.getActiveMoveVector();
    const smoothing = Math.hypot(target.x, target.y) > 0.01 ? this.inputSmoothing : this.inputSmoothing * 1.4;
    const blend = 1 - Math.exp(-smoothing * dt);
    this.smoothedVector.x += (target.x - this.smoothedVector.x) * blend;
    this.smoothedVector.y += (target.y - this.smoothedVector.y) * blend;
    if (Math.hypot(this.smoothedVector.x, this.smoothedVector.y) < 0.01) {
      this.smoothedVector.x = 0;
      this.smoothedVector.y = 0;
    }
    this.state.moveX = this.smoothedVector.x * this.lateralSensitivity;
    this.state.moveY = this.smoothedVector.y;

    if (this.keys.has("Space")) this.state.jumpPressed = true;
    if (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight")) this.state.dashPressed = true;
    return { ...this.state };
  }

  consumeButtons() {
    this.state.jumpPressed = false;
    this.state.dashPressed = false;
  }

  resetMovement() {
    this.keys.clear();
    this.joystickPointer = null;
    this.keyboardVector = { x: 0, y: 0 };
    this.joystickVector = { x: 0, y: 0 };
    this.smoothedVector = { x: 0, y: 0 };
    this.state = { moveX: 0, moveY: 0, jumpPressed: false, dashPressed: false };
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  private updateJoystick(clientX: number, clientY: number, knob: HTMLElement) {
    const dx = clientX - this.joystickCenter.x;
    const dy = clientY - this.joystickCenter.y;
    const distance = Math.min(this.joystickRadius, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    this.lastTouchAt = performance.now();
    this.joystickVector = this.applyDeadzone(x / this.joystickRadius, -y / this.joystickRadius);
  }

  private bindActionButton(button: HTMLElement, action: () => void) {
    const trigger = (event: Event) => {
      event.preventDefault();
      this.lastTouchAt = performance.now();
      action();
    };
    button.addEventListener("pointerdown", (event) => {
      button.setPointerCapture(event.pointerId);
      trigger(event);
    });
    button.addEventListener("touchstart", trigger, { passive: false });
  }

  private onKeyDown = (event: KeyboardEvent) => {
    this.keys.add(event.code);
    this.lastKeyboardAt = performance.now();
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
    this.lastKeyboardAt = performance.now();
  };

  private getActiveMoveVector() {
    const hasKeyboard = Math.hypot(this.keyboardVector.x, this.keyboardVector.y) > 0;
    const hasJoystick = this.joystickPointer !== null || Math.hypot(this.joystickVector.x, this.joystickVector.y) > 0;
    if (hasJoystick && (!hasKeyboard || this.lastTouchAt >= this.lastKeyboardAt)) return this.joystickVector;
    if (hasKeyboard) return this.keyboardVector;
    return { x: 0, y: 0 };
  }

  private applyDeadzone(x: number, y: number) {
    const magnitude = Math.hypot(x, y);
    if (magnitude <= this.deadzone) return { x: 0, y: 0 };
    const adjusted = Math.min(1, (magnitude - this.deadzone) / (1 - this.deadzone));
    return { x: (x / magnitude) * adjusted, y: (y / magnitude) * adjusted };
  }

  private normalizeVector(x: number, y: number) {
    const magnitude = Math.hypot(x, y);
    if (magnitude === 0) return { x: 0, y: 0 };
    return { x: x / magnitude, y: y / magnitude };
  }
}
