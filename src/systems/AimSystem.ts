import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { Signal } from '../utils/Signal';
import { chargeAt, clampAim, shotFor, type ChargeState, type ShotStats } from './charge';

export interface FireEvent {
  dirX: number;
  dirY: number;
  charge: number;
  shot: ShotStats;
}

/**
 * Point-and-release aiming, like a bubble shooter: touch anywhere and the arrow is nocked; the aim
 * points from the bow to the finger and follows it as it slides; the bow charges while the finger is
 * down; lifting fires. Dragging back down below the hero and lifting there cancels.
 *
 * One pointer at a time. You can aim during the short cooldown after a shot; charging starts when
 * it ends. Runs on real time so the golden pulse never stretches during hit-stop.
 */
export class AimSystem {
  readonly onStart = new Signal();
  readonly onGoldenOpen = new Signal();
  readonly onFire = new Signal<FireEvent>();
  readonly onCancel = new Signal();

  enabled = true;
  /** Unit aim direction, smoothed (always points up the screen). This is what gets fired. */
  dirX = 0;
  dirY = -1;
  /** Current finger position. */
  curX = 0;
  curY = 0;
  heldMs = 0;
  cooldownLeft = 0;
  readonly state: ChargeState = { charge: 0, phase: 'charging' };

  private pointerId = -1;
  /** Aim angle the finger asks for, and the smoothed one shown and fired. */
  private target = -Math.PI / 2;
  private angle = -Math.PI / 2;

  constructor(
    scene: Phaser.Scene,
    private readonly bow: { x: number; y: number },
    private readonly isBlocked: (p: Phaser.Input.Pointer) => boolean,
  ) {
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }

  get aiming(): boolean {
    return this.pointerId !== -1;
  }

  /** True while the bow is actually drawing (aiming and not in cooldown). */
  get charging(): boolean {
    return this.aiming && this.cooldownLeft <= 0;
  }

  /** The finger is low enough that lifting it cancels the shot. */
  get cancelling(): boolean {
    return this.aiming && this.curY > this.bow.y + BALANCE.bow.cancelBelowPx;
  }

  update(realMs: number): void {
    if (this.cooldownLeft > 0) this.cooldownLeft -= realMs;
    if (!this.aiming) return;

    // Smooth the angle toward the finger (frame-rate independent).
    const k = 1 - Math.exp(-realMs / BALANCE.bow.aimSmoothingMs);
    this.angle += (this.target - this.angle) * k;
    this.dirX = Math.cos(this.angle);
    this.dirY = Math.sin(this.angle);

    if (!this.charging) return;
    const wasGolden = this.state.phase === 'golden';
    this.heldMs += realMs;
    chargeAt(this.heldMs, BALANCE.bow, this.state);
    if (!wasGolden && this.state.phase === 'golden') this.onGoldenOpen.emit();
  }

  cancel(): void {
    if (!this.aiming) return;
    this.pointerId = -1;
    this.onCancel.emit();
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (!this.enabled || this.aiming || this.isBlocked(p)) return;
    this.pointerId = p.id;
    this.curX = p.x;
    this.curY = p.y;
    this.heldMs = 0;
    this.state.charge = 0;
    this.state.phase = 'charging';
    this.aimAtFinger();
    // The first touch snaps: no smoothing from wherever the last shot pointed.
    this.angle = this.target;
    this.dirX = Math.cos(this.angle);
    this.dirY = Math.sin(this.angle);
    this.onStart.emit();
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    this.curX = p.x;
    this.curY = p.y;
    this.aimAtFinger();
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    // The up position is ignored on purpose: lifting a finger jitters it.
    this.pointerId = -1;
    if (this.cooldownLeft > 0 || this.curY > this.bow.y + BALANCE.bow.cancelBelowPx) {
      this.onCancel.emit();
      return;
    }
    this.cooldownLeft = BALANCE.bow.cooldownMs;
    this.onFire.emit({ dirX: this.dirX, dirY: this.dirY, charge: this.state.charge, shot: shotFor(this.state) });
  }

  /** Target angle from the bow to the finger, kept above the minimum elevation. */
  private aimAtFinger(): void {
    if (this.cancelling) return;
    const dx = this.curX - this.bow.x;
    const dy = this.curY - this.bow.y;
    if (dx * dx + dy * dy < BALANCE.bow.aimMinDistance * BALANCE.bow.aimMinDistance) return;
    this.target = clampAim(Math.atan2(dy, dx));
  }
}

