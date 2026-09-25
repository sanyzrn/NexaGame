import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { FEEL } from '../config/feel';
import { easeInOutSine, easeOutCubic } from '../utils/ease';
import { ghostFingerTex } from './kit';

type Point = { x: number; y: number };

/** Which part of the gesture the ghost is showing: 0 drag, 1 hold, 2 release (-1 = between loops). */
export type GhostBeat = -1 | 0 | 1 | 2;

/**
 * The tutorial's ghost hand. It loops the real gesture over FEEL.tutorial.ghostLoopMs: touches down
 * by the bow (a ripple), drags toward the aim point while a dotted line runs from the bow through
 * the finger, holds while a ring fills around the fingertip (turning gold at the end, the golden
 * window), then lifts, and a ghost arrow flies off along the line. `holdOnly` skips the drag
 * (the golden step). Pooled objects; nothing is created per frame.
 */
export class GhostFinger {
  private readonly finger: Phaser.GameObjects.Image;
  private readonly ripple: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly line: Phaser.GameObjects.Graphics;
  private readonly arrow: Phaser.GameObjects.Image;
  private t = 0;
  private on = false;
  private fade = 0;
  private holdOnly = false;
  private readonly from: Point = { x: 0, y: 0 };
  private readonly to: Point = { x: 0, y: 0 };
  beat: GhostBeat = -1;

  constructor(scene: Phaser.Scene, private readonly bow: Point, depth: number) {
    this.line = scene.add.graphics().setDepth(depth);
    this.ring = scene.add.graphics().setDepth(depth + 1);
    this.ripple = scene.add.image(0, 0, 'fx_ring').setDepth(depth + 1).setAlpha(0);
    this.arrow = scene.add.image(0, 0, 'arrow').setScale(BALANCE.arrow.scale).setDepth(depth).setAlpha(0).setTint(0xffffff);
    this.finger = scene.add.image(0, 0, ghostFingerTex(scene)).setOrigin(0.5, 0.06).setDepth(depth + 2).setAlpha(0);
  }

  /** Shows the gesture toward `aim` (scene px). */
  show(aim: Point, holdOnly = false): void {
    const dx = aim.x - this.bow.x;
    const dy = aim.y - this.bow.y;
    const len = Math.hypot(dx, dy) || 1;
    this.to.x = this.bow.x + (dx / len) * 430;
    this.to.y = this.bow.y + (dy / len) * 430;
    this.from.x = this.bow.x + (dx / len) * 150 + 30;
    this.from.y = this.bow.y + (dy / len) * 150 + 40;
    this.holdOnly = holdOnly;
    if (!this.on) this.t = 0;
    this.on = true;
  }

  hide(): void {
    this.on = false;
  }

  update(ms: number): void {
    this.fade = Phaser.Math.Clamp(this.fade + (this.on ? ms : -ms) / 250, 0, 1);
    if (this.fade <= 0) {
      this.clear();
      return;
    }
    const L = FEEL.tutorial.ghostLoopMs * (this.holdOnly ? 1.2 : 1);
    this.t = (this.t + ms) % L;
    const k = this.t / L;
    // Timeline (fractions of the loop).
    const [aIn, aPress, aDrag, aHold, aLift] = this.holdOnly ? [0.08, 0.14, 0.14, 0.78, 0.84] : [0.08, 0.14, 0.42, 0.74, 0.8];
    let x = this.from.x;
    let y = this.from.y;
    let alpha = 1;
    let scale = 1;
    let charge = 0;
    this.beat = -1;
    if (this.holdOnly) {
      x = this.to.x;
      y = this.to.y;
    }
    if (k < aIn) {
      alpha = k / aIn;
      scale = 1.15 - 0.15 * alpha;
    } else if (k < aPress) {
      scale = 1 - 0.1 * easeOutCubic((k - aIn) / (aPress - aIn));
      if (this.ripple.alpha <= 0.01) this.ripple.setScale(0.2).setAlpha(0.8);
    } else if (k < aDrag) {
      const e = easeInOutSine((k - aPress) / (aDrag - aPress));
      x = this.from.x + (this.to.x - this.from.x) * e;
      y = this.from.y + (this.to.y - this.from.y) * e;
      scale = 0.9;
      this.beat = 0;
    } else if (k < aHold) {
      x = this.to.x;
      y = this.to.y;
      scale = 0.9;
      charge = (k - aDrag) / (aHold - aDrag);
      this.beat = 1;
    } else if (k < aLift) {
      x = this.to.x;
      y = this.to.y;
      const u = (k - aHold) / (aLift - aHold);
      scale = 0.9 + 0.25 * u;
      alpha = 1 - u;
      charge = 1;
      this.beat = 2;
      if (this.arrow.alpha <= 0.01) this.arrow.setAlpha(1).setData('t', 0);
    } else {
      alpha = 0;
      this.beat = 2;
    }
    if (this.holdOnly && k >= aPress && k < aHold) x += Math.sin(this.t / 60) * 0.6;

    const a = alpha * this.fade;
    this.finger.setPosition(x, y + 6).setScale(scale).setAlpha(a * 0.9);
    // Ripple on touch.
    if (this.ripple.alpha > 0) {
      this.ripple.setPosition(x, y).setScale(this.ripple.scale + ms / 350).setAlpha(Math.max(0, this.ripple.alpha - ms / 400));
    }
    // Dotted aim line from the bow through the finger while touching.
    const g = this.line.clear();
    const r = this.ring.clear();
    const touching = k >= aIn && k < aLift;
    if (touching) {
      const dx = x - this.bow.x;
      const dy = y - this.bow.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const golden = charge > 0.72;
      g.fillStyle(golden ? 0xffd24a : 0xffffff, 0.8 * this.fade);
      for (let d = 40; d < len + 380; d += 44) g.fillCircle(this.bow.x + ux * d, this.bow.y + uy * d, 6);
      if (charge > 0) {
        const col = golden ? 0xffd24a : 0xffffff;
        r.lineStyle(8, 0x000000, 0.25 * this.fade).strokeCircle(x, y, 58);
        r.lineStyle(8, col, 0.95 * this.fade);
        r.beginPath().arc(x, y, 58, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, charge / 0.72), false).strokePath();
        if (golden) r.lineStyle(4, 0xfff4c0, (0.5 + 0.5 * Math.sin(this.t / 40)) * this.fade).strokeCircle(x, y, 72);
      }
    }
    // The ghost arrow leaves along the line.
    if (this.arrow.alpha > 0) {
      const at = (this.arrow.getData('t') as number) + ms;
      this.arrow.setData('t', at);
      const dx = this.to.x - this.bow.x;
      const dy = this.to.y - this.bow.y;
      const len = Math.hypot(dx, dy) || 1;
      const d = 40 + at * 2.2;
      this.arrow.setPosition(this.bow.x + (dx / len) * d, this.bow.y + (dy / len) * d).setRotation(Math.atan2(dy, dx))
        .setAlpha(Math.max(0, 0.85 - at / 450) * this.fade);
    }
  }

  destroy(): void {
    for (const o of [this.finger, this.ripple, this.ring, this.line, this.arrow]) o.destroy();
  }

  private clear(): void {
    this.finger.setAlpha(0);
    this.ripple.setAlpha(0);
    this.arrow.setAlpha(0);
    this.line.clear();
    this.ring.clear();
    this.beat = -1;
  }
}
