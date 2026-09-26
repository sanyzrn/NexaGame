import Phaser from 'phaser';
import { Art } from '../assets/Art';
import { DEPTH, worldDepth } from '../config/display';
import { FEEL } from '../config/feel';
import { PILLAR, PROPS, type ShadowDef } from '../data/entities';
import { BendSprite } from '../render/BendSprite';
import { Shadow } from '../render/Shadow';
import { services } from '../services';
import type { TimeCtl } from '../systems/TimeCtl';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

export interface DecorDef {
  key: string;
  x: number;
  y: number;
  scale: number;
  flip?: boolean;
}

interface Animated {
  update(dt: number): void;
}

/** Shared wind strength, 0..1 on top of the normal breeze (gusts). */
const WIND = { gust: 0 };

/** Smooth pseudo-noise in about -1..1: three incommensurate sines. */
function wobble(t: number, seed: number): number {
  return Math.sin(t * 0.0113 + seed) * 0.5 + Math.sin(t * 0.0291 + seed * 1.7) * 0.3 + Math.sin(t * 0.0537 + seed * 2.9) * 0.2;
}

/** Arena props: pillars, pots, braziers (flicker, floor glow, sparks) and banners (wind sway). */
export class Decor {
  private readonly items: Animated[] = [];
  private readonly sparks: Emitter;
  private readonly braziers: Brazier[] = [];
  /** The omen of the day can fan the flames (fireMul > 1 = bigger, brighter). */
  fireMul = 1;

  constructor(scene: Phaser.Scene, time: TimeCtl, decor: readonly DecorDef[], pillars: readonly { x: number; y: number }[]) {
    this.sparks = time.track(scene.add.particles(0, 0, 'fx_spark', {
      emitting: false,
      lifespan: { min: 700, max: 1300 },
      speedY: { min: -120, max: -60 },
      speedX: { min: -24, max: 24 },
      gravityY: -30,
      scale: { start: 0.45, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffd166, 0xff9a3a, 0xff6a1a],
      blendMode: 'ADD',
      maxParticles: 40,
    }).setDepth(DEPTH.fx - 1));

    for (const p of pillars) staticProp(scene, PILLAR.key, p.x, p.y, PILLAR.scale, PILLAR.shadow);
    for (const d of decor) {
      if (d.key === 'brazier') {
        const b = new Brazier(scene, d, this.sparks);
        this.items.push(b);
        this.braziers.push(b);
      } else if (d.key === 'banner') this.items.push(new Banner(scene, d));
      else staticProp(scene, d.key, d.x, d.y, d.scale, d.key === 'pot' ? PROPS.pot.shadow : null, d.flip);
    }
  }

  /** World positions of the brazier flames (an arrow through one catches fire). */
  flames(): readonly { x: number; y: number }[] {
    return this.braziers;
  }

  update(dt: number): void {
    for (const b of this.braziers) b.mul = this.fireMul;
    for (const it of this.items) it.update(dt);
  }

  /** A gust of wind: banners flap hard, then settle. */
  gust(scene: Phaser.Scene, ms: number): void {
    scene.tweens.killTweensOf(WIND);
    scene.tweens.add({ targets: WIND, gust: 1, duration: ms * 0.25, ease: 'Sine.easeOut', yoyo: true, hold: ms * 0.4, onComplete: () => { WIND.gust = 0; } });
  }
}

function staticProp(scene: Phaser.Scene, key: string, x: number, y: number, scale: number, shadow: ShadowDef | null, flip = false): void {
  const img = Art.image(scene, x, y, key).setScale(scale).setDepth(worldDepth(y));
  if (flip) img.setFlipX(!img.flipX);
  if (shadow) new Shadow(scene, shadow, scale).place(x, y);
}

class Brazier implements Animated {
  private readonly outer: Phaser.GameObjects.Image;
  private readonly inner: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly fx: number;
  private readonly fy: number;
  private readonly flameScale: number;
  /** Set by Decor.fireMul (the omen of the day). */
  mul = 1;
  private readonly seed = Math.random() * 100;
  private t = Math.random() * 10000;
  private sparkIn = 0;

  get x(): number {
    return this.fx;
  }
  get y(): number {
    return this.fy - 30; // the flame's heart, a little above the bowl
  }

  constructor(scene: Phaser.Scene, d: DecorDef, private readonly sparks: Emitter) {
    const { x, y, scale } = d;
    staticProp(scene, 'brazier', x, y, scale, PROPS.brazier.shadow, d.flip);
    const f = PROPS.brazier.flame;
    this.fx = x + f.x * scale;
    this.fy = y + f.y * scale;
    // fx_flame is 128 px tall with its base at ~0.9.
    this.flameScale = ((f.h * scale) / 110) * FEEL.brazier.flameScale;
    const depth = worldDepth(y) + 0.5;
    this.outer = scene.add.image(this.fx, this.fy, 'fx_flame').setOrigin(0.5, 0.9).setTint(0xff7a1c)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
    this.inner = scene.add.image(this.fx, this.fy, 'fx_flame').setOrigin(0.5, 0.9).setTint(0xffe38a)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 0.1);
    this.glow = scene.add.image(x, y - 4, 'fx_glow').setTint(FEEL.brazier.glow.tint)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floorGlow).setScale(FEEL.brazier.glow.scale, FEEL.brazier.glow.scale * 0.55);
    this.sparkIn = Phaser.Math.Between(0, FEEL.brazier.sparkEveryMs[1]);
  }

  update(dt: number): void {
    this.t += dt;
    const B = FEEL.brazier;
    const a = wobble(this.t, this.seed);
    const b = wobble(this.t * 1.3, this.seed + 5);
    const s = this.flameScale * this.mul;
    this.outer.setScale(s * (1 + a * B.flicker.w), s * (1 + b * B.flicker.h)).setAlpha(B.flameAlpha * (0.85 + 0.15 * a)).setRotation(a * 0.06);
    this.inner.setScale(s * 0.6 * (1 + b * 0.08), s * 0.62 * (1 + a * 0.18)).setAlpha(B.flameAlpha * (0.9 + 0.1 * b)).setRotation(b * 0.05);
    const g = 0.5 + 0.5 * (a * 0.7 + b * 0.3);
    this.glow.setAlpha(B.glow.alpha[0] + (B.glow.alpha[1] - B.glow.alpha[0]) * g);

    this.sparkIn -= dt;
    if (this.sparkIn <= 0) {
      this.sparkIn = Phaser.Math.Between(B.sparkEveryMs[0], B.sparkEveryMs[1]);
      const n = services.settings.count(Phaser.Math.Between(B.sparkCount[0], B.sparkCount[1]));
      this.sparks.emitParticleAt(this.fx + Phaser.Math.Between(-8, 8), this.fy - 20 * s, n);
    }
  }
}

class Banner implements Animated {
  private readonly body: BendSprite;
  private readonly period: number;
  private t = Math.random() * 10000;

  constructor(scene: Phaser.Scene, d: DecorDef) {
    this.body = new BendSprite(scene, d.x, d.y, 'banner', { pin: 'top', rows: 7 });
    const r = this.body.rope.setScale(d.scale);
    if (d.flip) this.body.setMirror(true);
    // Hangs on the side walls: sort by its bottom edge.
    r.setDepth(worldDepth(d.y + 400 * d.scale));
    this.body.swayCurve = 1.4;
    this.period = Phaser.Math.Between(FEEL.banner.periodMs[0], FEEL.banner.periodMs[1]);
    this.update(0);
  }

  update(dt: number): void {
    this.t += dt;
    const B = FEEL.banner;
    const p = (this.t / this.period) * Math.PI * 2;
    const b = this.body;
    const g = WIND.gust;
    b.rope.setRotation(Phaser.Math.DegToRad(B.swayDeg) * (Math.sin(p) + g * (2 + Math.sin(this.t / 90))));
    b.sway = B.tailPx * (Math.sin(p - 0.9) + g * (4 + 2 * Math.sin(this.t / 70)));
    b.wave = B.billow * (1 + g * 4);
    b.wavePhase = p * 1.6 + (g * this.t) / 60;
    b.update();
  }
}
