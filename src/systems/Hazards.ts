import Phaser from 'phaser';
import { Art } from '../assets/Art';
import { BALANCE } from '../config/balance';
import { DEPTH } from '../config/display';
import { FEEL } from '../config/feel';
import type { Point } from './ProjectileSystem';
import type { ArrowHit, HitOutcome, Target } from './ProjectileSystem';
import type { FX } from './FX';

export type HazardKind = 'rock' | 'boulder';

export interface HazardHost {
  /** A slinger's rock landed. */
  onRockLand(x: number, y: number, nearHero: boolean): void;
  /** A boulder landed: crush enemies near (x, y); stagger the bow if nearHero. */
  onBoulderLand(x: number, y: number, nearHero: boolean): void;
  /** Shot out of the air! */
  onIntercept(kind: HazardKind, x: number, y: number): void;
}

interface Hazard extends Target {
  kind: HazardKind;
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  warn: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  active: boolean;
  t: number;
  ms: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  arcPx: number;
  spin: number;
  hp: number;
  radius: number;
  lastX: number;
  lastY: number;
  trailCarry: number;
  trailT: number;
}

const ROCKS = 6;
const BOULDERS = 3;
let nextId = 800001;

/**
 * Things thrown at the hero: slinger stones and the White Div's boulders. Both fly a lobbing arc
 * toward a landing point, and both are Targets — a well-timed arrow shatters them mid-air (an
 * intercept). Boulders mark their landing spot with a pulsing warning ring; when one lands near the
 * hero the bow is staggered (never a heart), and enemies caught under it are crushed.
 */
export class Hazards {
  private readonly items: Hazard[] = [];
  private readonly live: Hazard[] = [];
  private tTotal = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly fx: FX,
    private readonly host: HazardHost,
    /** The hero's bow, for "was the landing close enough to stagger" and rock aiming. */
    private readonly heroPos: () => Point,
  ) {
    const live = this.live;
    const make = (kind: HazardKind, texKey: string): Hazard => {
      const img = Art.image(scene, 0, 0, texKey).setVisible(false).setDepth(DEPTH.fx);
      const glow = scene.add.image(0, 0, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx - 2).setVisible(false);
      const warn = scene.add.image(0, 0, 'fx_ring').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floorFx).setVisible(false);
      const shadow = scene.add.image(0, 0, 'fx_shadow').setTint(0x1c1006).setDepth(DEPTH.shadows).setVisible(false);
      const h: Hazard = {
        kind, img, glow, warn, shadow, active: false, t: 0, ms: 1, x0: 0, y0: 0, x1: 0, y1: 0, arcPx: 0,
        spin: 1, hp: 1, radius: 10, lastX: 0, lastY: 0, trailCarry: 0, trailT: 0,
        id: nextId++,
        get hittable() { return h.active; },
        get hitX() { return h.img.x; },
        get hitY() { return h.img.y; },
        get hitR() { return h.radius; },
        get color() { return h.kind === 'boulder' ? 0xb35cd1 : 0xa8a8b0; },
        solid: true,
        receiveArrow(hit: ArrowHit): HitOutcome {
          if (!h.active) return 'pass';
          h.hp -= hit.damage;
          if (h.hp > 0) return 'hit'; // chipped, not shattered — the arrow is spent
          // Shattered: it is gone for good — out of the flight list, so it never "lands".
          Hazards.release(h);
          const i = live.indexOf(h);
          if (i >= 0) live.splice(i, 1);
          host.onIntercept(h.kind, h.img.x, h.img.y);
          return 'hit';
        },
      };
      return h;
    };
    for (let i = 0; i < ROCKS; i++) this.items.push(make('rock', 'rock'));
    for (let i = 0; i < BOULDERS; i++) this.items.push(make('boulder', 'boulder'));
  }

  /** Flying hazards as Targets (for arrows and the aim reticle). */
  targets(): readonly Target[] {
    return this.live;
  }

  get count(): number {
    return this.live.length;
  }

  /** Is this arrow target one of our flying rocks/boulders? */
  owns(t: unknown): boolean {
    const k = (t as { kind?: unknown }).kind;
    return k === 'rock' || k === 'boulder';
  }

  /** A slinger lets one fly at the hero's bow (± a little spread). */
  rock(fromX: number, fromY: number, toX: number, toY: number): void {
    const R = BALANCE.enemies.slinger.rock;
    const spread = (Math.random() * 2 - 1) * R.aimSpreadPx;
    this.launch('rock', fromX, fromY, toX + spread, toY, R.flightMs, R.arcPx, R.hp, R.radius);
  }

  /** The White Div hurls a chunk of the wall. */
  boulder(fromX: number, fromY: number, toX: number, toY: number): void {
    const B = BALANCE.boss.boulders;
    this.launch('boulder', fromX, fromY, toX, toY, B.flightMs, B.arcPx, B.hp, B.radius);
  }

  private launch(kind: HazardKind, x0: number, y0: number, x1: number, y1: number, ms: number, arcPx: number, hp: number, radius: number): void {
    const h = this.items.find((q) => !q.active && q.kind === kind);
    if (!h) return;
    h.active = true;
    h.t = 0;
    h.ms = ms;
    h.x0 = x0;
    h.y0 = y0;
    h.x1 = x1;
    h.y1 = y1;
    h.arcPx = arcPx;
    h.hp = hp;
    h.radius = radius;
    h.spin = Math.random() < 0.5 ? -1 : 1;
    h.lastX = x0;
    h.lastY = y0;
    h.trailCarry = 0;
    h.trailT = 0;
    h.img.setVisible(true).setPosition(x0, y0).setRotation(Math.random() * Math.PI).clearTint().setAlpha(1)
      .setDisplaySize(radius * 2, radius * 2);
    h.glow.setVisible(kind === 'boulder').setTint(0xb35cd1).setPosition(x0, y0).setScale(radius / 26);
    h.warn.setVisible(kind === 'boulder').setPosition(x1, y1).setTint(0xff5a3a).setAlpha(FEEL.hazards.warn.alpha);
    const ss = (radius / 64) * FEEL.hazards.boulder.shadowScale;
    h.shadow.setVisible(true).setPosition(x1, y1).setAlpha(0.3).setScale(ss, ss * 0.5);
    this.live.push(h);
  }

  private static release(h: Hazard): void {
    h.active = false;
    h.img.setVisible(false);
    h.glow.setVisible(false);
    h.warn.setVisible(false);
    h.shadow.setVisible(false);
  }

  update(dt: number): void {
    this.tTotal += dt;
    const F = FEEL.hazards;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const h = this.live[i];
      h.t += dt;
      const raw = Math.min(1, h.t / h.ms);
      // Gravity: slow at the top of the lob, rushing in at the end.
      const k = raw * raw * 0.65 + raw * 0.35;
      const x = h.x0 + (h.x1 - h.x0) * k;
      const y = h.y0 + (h.y1 - h.y0) * k - Math.sin(k * Math.PI) * h.arcPx;
      const spin = (h.kind === 'rock' ? F.rock.spinDegPerSec : F.boulder.spinDegPerSec) * h.spin * (Math.PI / 180) * (dt / 1000);
      h.img.setRotation(h.img.rotation + spin).setPosition(x, y);
      h.glow.setPosition(x, y);
      h.shadow.setPosition(h.x0 + (h.x1 - h.x0) * k, h.y0 + (h.y1 - h.y0) * k)
        .setAlpha(0.12 + 0.22 * Math.sin(raw * Math.PI));
      h.trailCarry = this.fx.trail(h.lastX, h.lastY, x, y, false, h.trailCarry);
      h.lastX = x;
      h.lastY = y;
      if (h.kind === 'boulder') {
        h.trailT -= dt;
        if (h.trailT <= 0) {
          h.trailT = F.boulder.trailEvery;
          this.fx.debris(x, y, 1);
        }
        const W = F.warn;
        h.warn
          .setScale(W.from + (W.to - W.from) * raw + 0.08 * Math.sin((this.tTotal / 1000) * W.pulseHz * Math.PI * 2))
          .setAlpha(F.warn.alpha * (0.55 + 0.45 * raw));
      }
      if (raw >= 1) {
        this.live.splice(i, 1);
        this.land(h);
      }
    }
  }

  private land(h: Hazard): void {
    Hazards.release(h);
    const hero = this.heroPos();
    const nearHero = Math.hypot(h.x1 - hero.x, h.y1 - hero.y) < (h.kind === 'boulder' ? BALANCE.boss.boulders.heroStaggerRadius : 170);
    if (h.kind === 'boulder') {
      this.fx.shake('boulder');
      this.fx.dustBurst(h.x1, h.y1, FEEL.hazards.boulderBurst);
      this.fx.debris(h.x1, h.y1, Math.round(FEEL.hazards.boulderBurst * 0.6));
      this.fx.ring(h.x1, h.y1, 0xd8c8a8, 0.4, 3.4, 520);
      this.host.onBoulderLand(h.x1, h.y1, nearHero);
    } else {
      this.fx.dustBurst(h.x1, h.y1, FEEL.hazards.rockBurst);
      this.host.onRockLand(h.x1, h.y1, nearHero);
    }
  }
}
