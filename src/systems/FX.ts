import Phaser from 'phaser';
import { COLORS, DEPTH, DESIGN_H, DESIGN_W } from '../config/display';
import { FEEL } from '../config/feel';
import { services } from '../services';
import type { TimeCtl } from './TimeCtl';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;
type EmitterConfig = Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;

const P = FEEL.particles;
const RING_POOL = 3;

interface Ring {
  img: Phaser.GameObjects.Image;
  age: number;
  life: number;
  from: number;
  to: number;
}

/**
 * Code-generated effects. Every burst comes from a pre-allocated particle emitter (Phaser recycles
 * dead particles), so effects allocate nothing per frame. Counts go through `settings.count`, which
 * halves them in reduced-effects mode. `maxParticles` per emitter is the particle budget.
 */
export class FX {
  private readonly emitters: Emitter[] = [];
  private readonly trailWhite: Emitter;
  private readonly trailGold: Emitter;
  private readonly trailFeather: Emitter;
  private readonly sparks: Emitter;
  private readonly sparkGold: Emitter;
  private readonly flare: Emitter;
  private readonly dust: Emitter;
  private readonly smoke: Emitter;
  private readonly magic: Emitter;
  private readonly sparkle: Emitter;
  private readonly coins: Emitter;
  private readonly clangSparks: Emitter;
  private readonly debrisE: Emitter;
  private readonly rings: Ring[] = [];
  private readonly flash: Phaser.GameObjects.Rectangle;
  private flashLeft = 0;
  private flashAlpha = 0;
  private flashMs = 1;
  private lastStepShake = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly time: TimeCtl) {
    const add = (texture: string, config: EmitterConfig, depth: number = DEPTH.fx): Emitter => {
      const e = time.track(scene.add.particles(0, 0, texture, { emitting: false, ...config }).setDepth(depth));
      this.emitters.push(e);
      return e;
    };
    const A = FEEL.arrow;

    this.trailWhite = add('fx_glow', {
      lifespan: A.trail.lifeMs, scale: { start: A.trail.scale, end: 0 }, alpha: { start: A.trail.alpha, end: 0 },
      tint: 0xfff4d8, blendMode: 'ADD', maxParticles: P.trailMax,
    }, DEPTH.arrows - 1);
    this.trailGold = add('fx_glow', {
      lifespan: A.critTrail.lifeMs, scale: { start: A.critTrail.scale, end: 0 }, alpha: { start: A.critTrail.alpha, end: 0 },
      tint: [COLORS.gold, 0xffe9a8], blendMode: 'ADD', maxParticles: P.trailMax,
    }, DEPTH.arrows - 1);
    this.trailFeather = add('fx_glow', {
      lifespan: 420, scale: { start: 0.9, end: 0 }, alpha: { start: 1, end: 0 },
      tint: [0x5ff0d8, 0xfff0a0, 0x9ffff0], blendMode: 'ADD', maxParticles: 120,
    }, DEPTH.arrows - 1);
    this.sparks = add('fx_spark', {
      lifespan: { min: 180, max: 360 }, speed: { min: 180, max: 540 }, scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 }, tint: 0xffffff, blendMode: 'ADD', maxParticles: 150,
    });
    this.sparkGold = add('fx_spark', {
      lifespan: { min: 260, max: 520 }, speed: { min: 260, max: 820 }, scale: { start: 1.6, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [COLORS.gold, 0xffffff, COLORS.goldDeep], blendMode: 'ADD', maxParticles: 120,
    });
    this.flare = add('fx_star', {
      lifespan: 260, scale: { start: 0.4, end: 1.6 }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 45 },
      tint: 0xffffff, blendMode: 'ADD', maxParticles: 12,
    });
    this.dust = add('fx_smoke', {
      lifespan: { min: 380, max: 620 }, speed: { min: 30, max: 120 }, angle: { min: 180, max: 360 },
      scale: { start: 0.35, end: 1.1 }, alpha: { start: 0.55, end: 0 }, tint: [0xcdb58a, 0xb89c6e], maxParticles: 80,
    }, DEPTH.floorFx);
    // Dark swirling smoke (spawn, death, lunge). Velocities are set per particle in `swirl`.
    this.smoke = add('fx_smoke', {
      lifespan: { min: 480, max: 820 }, scale: { start: 0.45, end: 1.5 }, alpha: { start: 0.85, end: 0 },
      rotate: { min: 0, max: 360 }, tint: [0x2a0d3a, 0x45195e, 0x5e2a7e], maxParticles: 120,
    });
    this.magic = add('fx_glow', {
      lifespan: { min: 300, max: 560 }, speed: { min: 40, max: 160 }, scale: { start: 0.6, end: 0 },
      alpha: { start: 0.8, end: 0 }, tint: [0xb35cd1, 0x8a3ab8], blendMode: 'ADD', maxParticles: 50,
    });
    this.sparkle = add('fx_star', {
      lifespan: { min: 320, max: 620 }, speed: { min: 20, max: 90 }, scale: { start: 0.32, end: 0 },
      rotate: { min: 0, max: 90 }, alpha: { start: 1, end: 0 }, tint: [COLORS.gold, 0xfff2b0, 0xffffff],
      blendMode: 'ADD', gravityY: -40, maxParticles: 90,
    });
    // Coin-like flips: fly up, spin, fall.
    this.coins = add('fx_spark', {
      lifespan: { min: 600, max: 850 }, speed: { min: 260, max: 460 }, angle: { min: 235, max: 305 },
      gravityY: 1200, alpha: { start: 1, end: 0.2 }, tint: [COLORS.gold, 0xffe08a, COLORS.goldDeep], blendMode: 'ADD',
      scaleY: 0.9,
      scaleX: { onEmit: () => 0.9, onUpdate: (p) => 0.9 * Math.abs(Math.cos(p.lifeCurrent / 45)) + 0.1 },
      maxParticles: 60,
    });
    this.clangSparks = add('fx_spark', {
      lifespan: { min: 120, max: 260 }, speed: { min: 380, max: 900 }, scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [0xffffff, 0xfff0b0, 0xffc860], blendMode: 'ADD', gravityY: 900, maxParticles: 60,
    });

    // Stone chips thrown up by slams, tumbling down.
    this.debrisE = add('fx_stone', {
      lifespan: { min: 900, max: 1400 }, speed: { min: 220, max: 560 }, angle: { min: 200, max: 340 },
      gravityY: 1500, rotate: { min: 0, max: 720 }, scale: { min: 0.8, max: 1.8 }, alpha: { start: 1, end: 0.6 },
      maxParticles: 90,
    });
    for (let i = 0; i < RING_POOL; i++) {
      const img = scene.add.image(0, 0, 'fx_ring').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx).setVisible(false);
      this.rings.push({ img, age: 0, life: 1, from: 0, to: 0 });
    }
    this.flash = scene.add.rectangle(DESIGN_W / 2, DESIGN_H / 2, DESIGN_W + 80, DESIGN_H + 80, 0xffffff, 1)
      .setScrollFactor(0).setDepth(DEPTH.flash).setAlpha(0);
  }

  private n(count: number): number {
    return services.settings.count(count);
  }

  /** Alive particles over all effect emitters (debug overlay). */
  get aliveCount(): number {
    let n = 0;
    for (const e of this.emitters) n += e.getAliveParticleCount();
    return n;
  }

  /** Sum of every effect emitter's particle cap. */
  get budget(): number {
    let n = 0;
    for (const e of this.emitters) n += e.maxParticles;
    return n;
  }

  update(realMs: number): void {
    for (const r of this.rings) {
      if (!r.img.visible) continue;
      r.age += realMs;
      const t = Math.min(1, r.age / r.life);
      const e = 1 - (1 - t) * (1 - t) * (1 - t);
      r.img.setScale(r.from + (r.to - r.from) * e).setAlpha(1 - t);
      if (t >= 1) r.img.setVisible(false);
    }
    if (this.flashLeft > 0) {
      this.flashLeft -= realMs;
      this.flash.setAlpha(this.flashAlpha * Math.max(0, this.flashLeft / this.flashMs));
    }
  }

  /** Particles along an arrow's travelled segment (spacing-based, so fast arrows leave no gaps). */
  trail(x0: number, y0: number, x1: number, y1: number, crit: boolean, carry: number, feather = false): number {
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len <= 0) return carry;
    const e = feather ? this.trailFeather : crit ? this.trailGold : this.trailWhite;
    const spacing = FEEL.arrow.trailSpacing * (services.settings.reducedEffects ? 1.6 : 1);
    let d = spacing - carry;
    while (d <= len) {
      const t = d / len;
      e.emitParticleAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 1);
      d += spacing;
    }
    return len - (d - spacing);
  }

  /** Impact sparks in the target's colour (+ gold burst and a flare on crits). */
  hitSparks(x: number, y: number, crit: boolean, color: number): void {
    this.sparks.setParticleTint(color);
    this.sparks.explode(this.n(P.hitSparks), x, y);
    if (crit) {
      this.sparkGold.explode(this.n(P.critSparks), x, y);
      this.flare.explode(1, x, y);
    }
  }

  bounce(x: number, y: number): void {
    this.sparks.setParticleTint(0xfff4d8);
    this.sparks.explode(this.n(P.bounceSparks), x, y);
    this.flare.explode(1, x, y);
  }

  /** Metal clang off a shield: fast white-gold sparks that fall. */
  clang(x: number, y: number): void {
    this.clangSparks.explode(this.n(P.clang), x, y);
    this.flare.explode(1, x, y);
  }

  absorb(x: number, y: number): void {
    this.dust.explode(this.n(P.absorbDust), x, y);
  }

  /** Small dust puff at the feet (heavy steps). */
  stepDust(x: number, y: number): void {
    this.dust.explode(this.n(P.stepDust), x, y);
  }

  goldenBurst(x: number, y: number): void {
    this.sparkGold.explode(this.n(P.goldenBurst), x, y);
    this.ring(x, y, COLORS.gold, 0.3, 1.6, 320);
  }

  /** A few gold twinkles around the bow while the golden window is open. */
  sparkleAt(x: number, y: number, radius: number): void {
    const a = Math.random() * Math.PI * 2;
    const r = radius * (0.4 + Math.random() * 0.6);
    this.sparkle.emitParticleAt(x + Math.cos(a) * r, y + Math.sin(a) * r, 1);
  }

  /** Bow-string snap on release: a short sideways spray. */
  snap(x: number, y: number, crit: boolean): void {
    this.sparks.setParticleTint(crit ? COLORS.gold : 0xfff4d8);
    const n = this.n(P.snap);
    for (let i = 0; i < n; i++) {
      const p = this.sparks.emitParticle(1, x, y);
      if (!p) break;
      const side = i % 2 ? 1 : -1;
      p.velocityX = side * (260 + Math.random() * 260);
      p.velocityY = (Math.random() - 0.5) * 160;
    }
  }

  /** Swirling dark-purple smoke with magic glints (spawn, death, lunge). */
  swirl(x: number, y: number, count: number, radius = 36): void {
    const n = this.n(count);
    const dir = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const p = this.smoke.emitParticle(1, x + Math.cos(a) * radius, y + Math.sin(a) * radius * 0.55);
      if (!p) break;
      const s = 70 + Math.random() * 60;
      // tangential (swirl) + outward + a little rise
      p.velocityX = -Math.sin(a) * s * dir + Math.cos(a) * 30;
      p.velocityY = Math.cos(a) * s * 0.55 * dir + Math.sin(a) * 18 - 40;
    }
    this.magic.explode(this.n(Math.ceil(count / 2)), x, y);
  }

  /** Gold sparkles bursting out (enemy death). */
  sparkles(x: number, y: number): void {
    for (let i = this.n(P.deathSparkles); i > 0; i--) {
      const p = this.sparkle.emitParticle(1, x, y);
      if (!p) break;
      const a = Math.random() * Math.PI * 2;
      const s = 90 + Math.random() * 180;
      p.velocityX = Math.cos(a) * s;
      p.velocityY = Math.sin(a) * s - 60;
    }
  }

  /** Coin-like gold flips (combo feedback on kills); more coins for bigger combos. */
  coinBurst(x: number, y: number, combo: number): void {
    this.coins.explode(this.n(P.comboCoins + Math.min(8, combo)), x, y);
  }

  critFlash(): void {
    this.flashTo(FEEL.critFlash.alpha, FEEL.critFlash.ms);
  }

  /** A full-screen white flash of any strength. */
  flashTo(alpha: number, ms: number): void {
    this.flashAlpha = alpha;
    this.flashMs = ms;
    this.flashLeft = ms;
    this.flash.setAlpha(alpha);
  }

  /** Stone debris thrown up by a heavy impact. */
  debris(x: number, y: number, count: number): void {
    this.debrisE.explode(this.n(count), x, y);
  }

  /** A big dust cloud (slams, stumbles). */
  dustBurst(x: number, y: number, count: number): void {
    this.dust.explode(this.n(count), x, y);
  }

  shake(kind: keyof typeof FEEL.shake): void {
    const s = FEEL.shake[kind];
    if (kind === 'step') {
      // Many heavy walkers must not turn into a constant rumble.
      const now = this.scene.time.now;
      if (now - this.lastStepShake < 140) return;
      this.lastStepShake = now;
    }
    this.scene.cameras.main.shake(s.ms, s.intensity, kind !== 'step');
  }

  hitStop(): void {
    this.time.hitStop(FEEL.hitStopMs);
  }

  /** An expanding ring (golden bursts, shockwaves). */
  ring(x: number, y: number, color: number, from: number, to: number, life: number): void {
    const r = this.rings.find((q) => !q.img.visible) ?? this.rings[0];
    r.age = 0;
    r.life = life;
    r.from = from;
    r.to = to;
    r.img.setPosition(x, y).setTint(color).setScale(from).setAlpha(1).setVisible(true);
  }
}
