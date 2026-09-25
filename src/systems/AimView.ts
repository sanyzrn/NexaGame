import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { COLORS, DEPTH } from '../config/display';
import { rayCircle } from '../utils/geom';
import type { AimSystem } from './AimSystem';
import type { ArenaCollider } from './ArenaCollider';
import type { LockOn, Target } from './ProjectileSystem';

const MAX_DASHES = 90;
const RING_R = 62;
const RED = 0xff5a4a;
const BLOCKED = 0x9aa4b8;

/**
 * Aim visuals:
 * - dotted trajectory, exactly the arrow's path (first ricochet included), cut at the first enemy
 *   it would hit, with a lock-on reticle on that enemy (grey and crossed when a shield would block);
 * - charge ring around the bow (gold while the golden pulse is on);
 * - a soft ring around the fingertip, and a red cross when the finger is in the cancel zone.
 * The bow aura belongs to the hero.
 */
export class AimView {
  private readonly dashes: Phaser.GameObjects.Image[] = [];
  private readonly star: Phaser.GameObjects.Image;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly path: number[] = [];
  private march = 0;
  private t = 0;
  private lockAge = 0;
  private lockId = -1;
  private readonly lock: LockOn = { x: 0, y: 0, r: 0, weak: false };
  /** The Simorgh's feather is on the bow: the next arrow flies guided (the line shows it straight). */
  guided = false;

  constructor(
    scene: Phaser.Scene,
    private readonly aim: AimSystem,
    private readonly collider: ArenaCollider,
    private readonly launch: { x: number; y: number },
    private readonly targets: () => readonly Target[],
  ) {
    for (let i = 0; i < MAX_DASHES; i++) {
      this.dashes.push(scene.add.image(0, 0, 'fx_dash').setDepth(DEPTH.aim).setVisible(false));
    }
    this.star = scene.add.image(0, 0, 'fx_star').setDepth(DEPTH.aim + 1).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.gfx = scene.add.graphics().setDepth(DEPTH.aim + 2);
  }

  update(realMs: number): void {
    this.t += realMs;
    const aim = this.aim;
    const g = this.gfx.clear();

    if (!aim.aiming) {
      this.hideLine();
      this.lockId = -1;
      return;
    }
    const { x, y } = this.launch;

    if (aim.cancelling) {
      this.hideLine();
      this.lockId = -1;
      g.lineStyle(10, RED, 0.9).strokeCircle(x, y, RING_R);
      g.lineStyle(10, RED, 0.9)
        .lineBetween(x - 26, y - 26, x + 26, y + 26)
        .lineBetween(x + 26, y - 26, x - 26, y + 26);
      g.lineStyle(4, RED, 0.5).strokeCircle(aim.curX, aim.curY, 50);
      return;
    }

    const { charge, phase } = aim.state;
    const charging = aim.charging;
    const golden = charging && phase === 'golden';
    const lineColor = golden ? COLORS.gold : 0xfff6e0;

    // Trajectory, cut at the first enemy on it.
    const pv = BALANCE.preview;
    const bounces = this.collider.tracePath(x, y, aim.dirX, aim.dirY, pv.bounces, pv.maxLength, pv.afterBounceLength, this.path);
    const lock = this.cutAtTarget(golden || this.guided);
    this.march = (this.march + (realMs / 1000) * pv.marchSpeed) % (pv.dashLength + pv.dashGap);
    this.layDashes(lineColor, golden ? 1 : 0.85, lock === null);
    const bouncePoint = bounces > 0 && this.path.length > 4;
    if (bouncePoint) {
      this.star.setPosition(this.path[2], this.path[3]).setVisible(true).setTint(lineColor)
        .setRotation(this.t / 300).setScale(0.8 + Math.sin(this.t / 90) * 0.12);
    } else {
      this.star.setVisible(false);
    }

    if (lock) this.drawReticle(lock, golden, realMs);
    else this.lockId = -1;

    // Fingertip ring (peeks out around the finger).
    g.lineStyle(4, 0xffffff, 0.35).strokeCircle(aim.curX, aim.curY, 50);

    // Charge ring
    const start = -Math.PI / 2;
    const shown = charging ? charge : 0;
    g.lineStyle(12, 0x000000, 0.35).beginPath().arc(x, y, RING_R, 0, Math.PI * 2).strokePath();
    if (golden) {
      const p = 0.5 + 0.5 * Math.sin(this.t / 40);
      g.lineStyle(16 + 4 * p, COLORS.gold, 1).strokeCircle(x, y, RING_R);
      g.lineStyle(4, 0xffffff, 0.6 + 0.4 * p).strokeCircle(x, y, RING_R + 14 + 4 * p);
    } else if (shown > 0.001) {
      g.lineStyle(10, shown >= 1 ? 0xffe7a8 : 0xffffff, 1).beginPath().arc(x, y, RING_R, start, start + shown * Math.PI * 2).strokePath();
    }
  }

  /**
   * Finds the first hittable target along the traced path and truncates the path there.
   * Returns it with whether the arrow would arrive head-on into a shield.
   */
  private cutAtTarget(crit: boolean): { t: Target; blocked: boolean } | null {
    const r = BALANCE.arrow.radius;
    const p = this.path;
    for (let i = 2; i < p.length; i += 2) {
      const x0 = p[i - 2];
      const y0 = p[i - 1];
      const dx = p[i] - x0;
      const dy = p[i + 1] - y0;
      const len = Math.hypot(dx, dy);
      if (len === 0) continue;
      const ux = dx / len;
      const uy = dy / len;
      let best = len;
      let hit: Target | null = null;
      for (const t of this.targets()) {
        if (!t.hittable || t.passes?.(crit)) continue;
        const d = rayCircle(x0, y0, ux, uy, best, t.hitX, t.hitY, t.hitR + r);
        if (d >= 0 && d <= best) {
          best = d;
          hit = t;
        }
      }
      if (hit) {
        p.length = i + 2;
        p[i] = x0 + ux * best;
        p[i + 1] = y0 + uy * best;
        const L = this.lock;
        L.x = hit.hitX;
        L.y = hit.hitY;
        L.r = hit.hitR;
        L.weak = false;
        hit.lockOn?.(x0, y0, ux, uy, L);
        return { t: hit, blocked: hit.blocks?.(ux, uy, crit) ?? false };
      }
    }
    return null;
  }

  private drawReticle(lock: { t: Target; blocked: boolean }, golden: boolean, realMs: number): void {
    const { t, blocked } = lock;
    if (t.id !== this.lockId) {
      this.lockId = t.id;
      this.lockAge = 0;
    }
    this.lockAge += realMs;
    const g = this.gfx;
    const L = this.lock;
    // Weak points get a gold reticle that pulses harder.
    const color = blocked ? BLOCKED : golden || L.weak ? COLORS.gold : RED;
    // Snaps in from a larger ring, then breathes and spins slowly.
    const intro = Math.max(0, 1 - this.lockAge / 160);
    const r = L.r + 16 + intro * 40 + Math.sin(this.t / (L.weak ? 70 : 120)) * (L.weak ? 6 : 3);
    const rot = this.t / 700;
    g.lineStyle(7, color, 0.95);
    for (let k = 0; k < 4; k++) {
      const a = rot + (k * Math.PI) / 2;
      g.beginPath().arc(L.x, L.y, r, a - 0.42, a + 0.42).strokePath();
    }
    g.fillStyle(color, 0.9).fillCircle(L.x, L.y, 6);
    if (L.weak) g.lineStyle(3, 0xffffff, 0.8).strokeCircle(L.x, L.y, r + 10);
    if (blocked) {
      g.lineStyle(7, BLOCKED, 0.95).lineBetween(L.x - r * 0.6, L.y + r * 0.6, L.x + r * 0.6, L.y - r * 0.6);
    }
  }

  /** Lays dashes along the traced polyline with a marching offset; fades toward the end if nothing is hit. */
  private layDashes(color: number, alpha: number, fadeEnd: boolean): void {
    const pv = BALANCE.preview;
    const step = pv.dashLength + pv.dashGap;
    let total = 0;
    for (let i = 2; i < this.path.length; i += 2) total += Math.hypot(this.path[i] - this.path[i - 2], this.path[i + 1] - this.path[i - 1]);

    let used = 0;
    let travelled = 0;
    let d = this.march;
    for (let i = 2; i < this.path.length && used < MAX_DASHES; i += 2) {
      const x0 = this.path[i - 2];
      const y0 = this.path[i - 1];
      const dx = this.path[i] - x0;
      const dy = this.path[i + 1] - y0;
      const len = Math.hypot(dx, dy);
      if (len === 0) continue;
      const rot = Math.atan2(dy, dx);
      while (d < travelled + len && used < MAX_DASHES) {
        const t = (d - travelled) / len;
        const fade = fadeEnd ? 1 - Math.max(0, (d / total - 0.7) / 0.3) : 1;
        this.dashes[used++].setPosition(x0 + dx * t, y0 + dy * t).setRotation(rot).setTint(color).setAlpha(alpha * fade).setVisible(true);
        d += step;
      }
      travelled += len;
    }
    for (let i = used; i < MAX_DASHES; i++) this.dashes[i].setVisible(false);
  }

  private hideLine(): void {
    for (const d of this.dashes) if (d.visible) d.setVisible(false);
    this.star.setVisible(false);
  }
}
