import Phaser from 'phaser';
import { Art } from '../assets/Art';
import { BALANCE } from '../config/balance';
import { DEPTH } from '../config/display';
import { FEEL } from '../config/feel';
import { ARENA } from '../data/arena';
import { rayCircle } from '../utils/geom';
import { Signal } from '../utils/Signal';
import { BOUNCE_EPSILON, type ArenaCollider, type StaticHit, type SurfaceKind } from './ArenaCollider';
import type { ShotStats } from './charge';
import type { FX } from './FX';

/** Anything an arrow can hit. Hit circle in world px. */
export interface Target {
  readonly id: number;
  readonly hittable: boolean;
  readonly hitX: number;
  readonly hitY: number;
  readonly hitR: number;
  /** Impact spark colour. */
  readonly color: number;
  /** True if an arrow travelling along (dirX, dirY) would be blocked (a shield head-on, a barrier). */
  blocks?(dirX: number, dirY: number, crit: boolean): boolean;
  /** True if such an arrow flies straight through it (a barrier letting golden arrows pass). */
  passes?(crit: boolean): boolean;
  /** Where the aim reticle goes for a ray entering it (e.g. snapping onto a weak point). */
  lockOn?(ox: number, oy: number, dx: number, dy: number, out: LockOn): void;
  /** Stops arrows even when they could pierce (a boss). */
  readonly solid?: boolean;
  /** Applies the hit; returns what happened. */
  receiveArrow(hit: ArrowHit): HitOutcome;
}

export interface LockOn {
  x: number;
  y: number;
  r: number;
  /** A weak point: the reticle shows it. */
  weak: boolean;
}

/** pass: the arrow went through without stopping (a barrier letting a golden arrow by). */
export type HitOutcome = 'hit' | 'kill' | 'blocked' | 'pass';

export interface Point {
  x: number;
  y: number;
}

export interface FireOptions {
  /** Steers toward this point while flying (null = stop steering). */
  homing?: () => Point | null;
  /** The Simorgh's feather arrow: turquoise trail, passes through small fry. */
  feather?: boolean;
}

export interface ArrowHit {
  damage: number;
  crit: boolean;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  bounces: number;
}

export interface HitEvent extends ArrowHit {
  target: Target;
  outcome: HitOutcome;
}

export interface ArrowEndEvent {
  kind: SurfaceKind | 'target' | 'expired';
  x: number;
  y: number;
  /** Enemies this arrow hit during its flight (0 = a miss, for the combo). */
  hits: number;
}

const enum Mode { Idle, Flying, Stuck, Deflected, Fading }

interface Arrow {
  img: Phaser.GameObjects.Image;
  mode: Mode;
  /** Flying: true. Stuck / deflected arrows are only visual. */
  active: boolean;
  /** Time spent stuck or deflected. */
  timer: number;
  rot: number;
  spin: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
  damage: number;
  crit: boolean;
  pierceLeft: number;
  bounces: number;
  life: number;
  hits: number;
  hitIds: number[];
  trailCarry: number;
  homing: (() => Point | null) | null;
  feather: boolean;
}

const POOL = 12;

export class ProjectileSystem {
  readonly onHit = new Signal<HitEvent>();
  readonly onBounce = new Signal<{ x: number; y: number; kind: SurfaceKind }>();
  readonly onEnd = new Signal<ArrowEndEvent>();

  private readonly arrows: Arrow[] = [];
  private readonly sh: StaticHit = { t: 0, nx: 0, ny: 0, kind: 'wall', bounces: false };
  private readonly hit: HitEvent = { damage: 0, crit: false, x: 0, y: 0, dirX: 0, dirY: 0, bounces: 0, target: null!, outcome: 'hit' };
  private readonly end: ArrowEndEvent = { kind: 'expired', x: 0, y: 0, hits: 0 };

  constructor(
    scene: Phaser.Scene,
    private readonly collider: ArenaCollider,
    private readonly targets: () => readonly Target[],
    private readonly fx: FX,
  ) {
    for (let i = 0; i < POOL; i++) {
      const img = Art.image(scene, 0, 0, 'arrow').setScale(BALANCE.arrow.scale).setDepth(DEPTH.arrows).setVisible(false);
      this.arrows.push({
        img, mode: Mode.Idle, active: false, timer: 0, rot: 0, spin: 0, vx: 0, vy: 0, x: 0, y: 0, dx: 0, dy: -1, speed: 0, damage: 0, crit: false,
        pierceLeft: 0, bounces: 0, life: 0, hits: 0, hitIds: [], trailCarry: 0, homing: null, feather: false,
      });
    }
  }

  get activeCount(): number {
    let n = 0;
    for (const a of this.arrows) if (a.active) n++;
    return n;
  }

  /** Positions of flying arrows, for the debug overlay. */
  forEachActive(fn: (x: number, y: number) => void): void {
    for (const a of this.arrows) if (a.active) fn(a.x, a.y);
  }

  fire(x: number, y: number, dx: number, dy: number, shot: ShotStats, opts?: FireOptions): void {
    const a = this.freeArrow();
    a.homing = opts?.homing ?? null;
    a.feather = opts?.feather ?? false;
    a.mode = Mode.Flying;
    a.active = true;
    a.x = x;
    a.y = y;
    a.dx = dx;
    a.dy = dy;
    a.speed = shot.speed;
    a.damage = shot.damage;
    a.crit = shot.crit;
    a.pierceLeft = shot.pierce;
    a.bounces = 0;
    a.life = BALANCE.arrow.maxLifeMs;
    a.hits = 0;
    a.hitIds.length = 0;
    a.trailCarry = 0;
    a.img.setVisible(true).setAlpha(1).setPosition(x, y).setRotation(Math.atan2(dy, dx))
      .setTint(a.feather ? 0xb8fff0 : shot.crit ? 0xfff0b0 : 0xffffff).setScale(BALANCE.arrow.scale * (shot.crit ? 1.15 : 1));
  }

  update(dt: number): void {
    for (const a of this.arrows) {
      if (a.mode === Mode.Flying) {
        a.life -= dt;
        if (a.life <= 0) {
          this.finish(a, 'expired', false);
          continue;
        }
        if (a.homing) this.steer(a, dt);
        this.step(a, (a.speed * dt) / 1000);
      } else if (a.mode === Mode.Stuck) {
        this.updateStuck(a, dt);
      } else if (a.mode === Mode.Deflected) {
        this.updateDeflected(a, dt);
      } else if (a.mode === Mode.Fading) {
        this.updateFading(a, dt);
      }
    }
  }

  /** A free arrow, or the one that has been stuck/deflected the longest. */
  private freeArrow(): Arrow {
    let best = this.arrows[0];
    for (const a of this.arrows) {
      if (a.mode === Mode.Idle) return a;
      if (a.mode !== Mode.Flying && (best.mode === Mode.Flying || a.timer > best.timer)) best = a;
    }
    return best;
  }

  /** Sunk into a pillar or wall: quivers, stays, fades. */
  private updateStuck(a: Arrow, dt: number): void {
    const A = FEEL.arrow;
    a.timer += dt;
    const q = a.timer < A.quiverMs ? (1 - a.timer / A.quiverMs) * Math.sin(a.timer / 16) : 0;
    const fade = a.timer - A.stickMs;
    a.img.setRotation(a.rot + Phaser.Math.DegToRad(A.quiverDeg) * q).setAlpha(fade > 0 ? Math.max(0, 1 - fade / A.stickFadeMs) : 1);
    if (fade >= A.stickFadeMs) this.release(a);
  }

  /** Bounced off a shield: tumbles away and fades. */
  private updateDeflected(a: Arrow, dt: number): void {
    const s = dt / 1000;
    a.timer += dt;
    a.vy += 1400 * s;
    a.x += a.vx * s;
    a.y += a.vy * s;
    a.rot += a.spin * s;
    const t = a.timer / FEEL.arrow.deflectMs;
    a.img.setPosition(a.x, a.y).setRotation(a.rot).setAlpha(Math.max(0, 1 - t));
    if (t >= 1) this.release(a);
  }

  /** Turns a guided arrow toward its target, at most homingDegPerSec. */
  private steer(a: Arrow, dt: number): void {
    const p = a.homing!();
    if (!p) return;
    const want = Math.atan2(p.y - a.y, p.x - a.x);
    const cur = Math.atan2(a.dy, a.dx);
    const diff = Phaser.Math.Angle.Wrap(want - cur);
    const max = Phaser.Math.DegToRad(FEEL.simorgh.homingDegPerSec) * (dt / 1000);
    const next = cur + Phaser.Math.Clamp(diff, -max, max);
    a.dx = Math.cos(next);
    a.dy = Math.sin(next);
  }

  /** Flew past everything into the sky: keeps going and fades. */
  private updateFading(a: Arrow, dt: number): void {
    a.timer += dt;
    const d = (a.speed * dt) / 1000;
    a.x += a.dx * d;
    a.y += a.dy * d;
    const t = a.timer / 180;
    a.img.setPosition(a.x, a.y).setAlpha(Math.max(0, 1 - t));
    if (t >= 1) this.release(a);
  }

  private release(a: Arrow): void {
    a.mode = Mode.Idle;
    a.img.setVisible(false);
  }

  private step(a: Arrow, distance: number): void {
    const r = BALANCE.arrow.radius;
    let remaining = distance;
    for (let guard = 0; guard < 8 && remaining > 0 && a.active; guard++) {
      const hasStatic = this.collider.castStatic(a.x, a.y, a.dx, a.dy, remaining, this.sh);
      let travel = hasStatic ? this.sh.t : remaining;

      let target: Target | null = null;
      for (const t of this.targets()) {
        if (!t.hittable || a.hitIds.includes(t.id)) continue;
        const tt = rayCircle(a.x, a.y, a.dx, a.dy, travel, t.hitX, t.hitY, t.hitR + r);
        if (tt >= 0 && tt <= travel) {
          travel = tt;
          target = t;
        }
      }

      const nx = a.x + a.dx * travel;
      const ny = a.y + a.dy * travel;
      a.trailCarry = this.fx.trail(a.x, a.y, nx, ny, a.crit, a.trailCarry, a.feather);
      a.x = nx;
      a.y = ny;
      remaining -= travel;

      if (target) {
        a.hitIds.push(target.id);
        const h = this.hit;
        h.damage = a.damage; h.crit = a.crit; h.x = a.x; h.y = a.y; h.dirX = a.dx; h.dirY = a.dy; h.bounces = a.bounces;
        const outcome = target.receiveArrow(h);
        if (outcome === 'hit' || outcome === 'kill') a.hits++;
        h.target = target;
        h.outcome = outcome;
        this.onHit.emit(h);
        if (outcome === 'pass') continue;
        if (outcome === 'blocked') this.deflect(a);
        else if (target.solid) this.finish(a, 'target', false);
        // The feather arrow flies through small fry on its way to the boss.
        else if (a.feather) continue;
        else if (a.pierceLeft > 0) a.pierceLeft--;
        else this.finish(a, 'target', false);
      } else if (hasStatic) {
        const s = this.sh;
        if (s.bounces && a.bounces < BALANCE.arrow.maxBounces) {
          const dot = a.dx * s.nx + a.dy * s.ny;
          a.dx -= 2 * dot * s.nx;
          a.dy -= 2 * dot * s.ny;
          a.x += s.nx * BOUNCE_EPSILON;
          a.y += s.ny * BOUNCE_EPSILON;
          a.bounces++;
          this.onBounce.emit({ x: a.x, y: a.y, kind: s.kind });
        } else if (s.kind === 'top' && a.y < ARENA.walls.top - 20) {
          // The top line is raised during the boss fight: past it there is only sky.
          this.finish(a, s.kind, false);
          a.mode = Mode.Fading;
          a.img.setVisible(true);
        } else {
          this.finish(a, s.kind, s.kind !== 'out');
        }
      }
    }
    if (a.active) a.img.setPosition(a.x, a.y).setRotation(Math.atan2(a.dy, a.dx));
  }

  private deflect(a: Arrow): void {
    const side = Math.random() < 0.5 ? -1 : 1;
    a.vx = -a.dx * 420 + side * 220;
    a.vy = -a.dy * 420 - 260;
    a.spin = side * (14 + Math.random() * 8);
    a.rot = Math.atan2(a.dy, a.dx);
    this.finish(a, 'target', false);
    a.mode = Mode.Deflected;
    a.timer = 0;
    a.img.setVisible(true);
  }

  private finish(a: Arrow, kind: ArrowEndEvent['kind'], stick: boolean): void {
    a.active = false;
    a.timer = 0;
    if (stick) {
      // Sink the tip into the surface.
      a.x += a.dx * FEEL.arrow.stickDepthPx;
      a.y += a.dy * FEEL.arrow.stickDepthPx;
      a.rot = Math.atan2(a.dy, a.dx);
      a.mode = Mode.Stuck;
    } else {
      a.mode = Mode.Idle;
      a.img.setVisible(false);
    }
    a.img.setPosition(a.x, a.y);
    const e = this.end;
    e.kind = kind; e.x = a.x; e.y = a.y; e.hits = a.hits;
    this.onEnd.emit(e);
  }
}
