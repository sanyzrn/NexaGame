import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { CALLIGRAPHY_FONT, DEPTH, DESIGN_H, DESIGN_W } from '../config/display';
import { FEEL } from '../config/feel';
import type { School } from '../config/team';
import type { Boss } from '../entities/Boss';
import type { Decor } from '../entities/Decor';
import type { Enemy } from '../entities/Enemy';
import type { Hero } from '../entities/Hero';
import type { Atmosphere } from '../render/Atmosphere';
import { services } from '../services';
import { gradientText } from '../ui/kit';
import { shotFor } from './charge';
import type { FX } from './FX';
import type { HitOutcome, Point, ProjectileSystem } from './ProjectileSystem';
import type { TimeCtl } from './TimeCtl';

export interface PowerHost {
  fx: FX;
  timeCtl: TimeCtl;
  atmosphere: Atmosphere;
  hero: Hero;
  boss: Boss;
  decor: Decor;
  projectiles: ProjectileSystem;
  enemies(): readonly Enemy[];
  /** Aim on/off around the power (the anticipation belongs to the power). */
  setAim(on: boolean): void;
  /** A power's direct hit on an enemy (Rostami quake): effects, combo, group feed. */
  onEnemyHit(e: Enemy, damage: number, outcome: HitOutcome): void;
  /** The quake reached the Div. */
  onBossHit(damage: number, x: number, y: number): void;
  /** Simorghi: heal hearts, and lift the group's chain. */
  heal(hearts: number): void;
  raiseChain(): void;
}

type Palette = readonly [number, number];

/** Above the wave banner (y 700), below the HUD. */
const TITLE_Y = 470;

/**
 * The three school powers, each staged as anticipation → action → impact → aftermath:
 * - رستمی «خشم رستم»: the hero gathers ember light, stamps, and a quake races up the floor (cracks
 *   of fire): every enemy it reaches is hurt, knocked back and dazed (shields can't stop the
 *   ground); an armoured White Div's barrier shatters. Heavy power: breaking armour.
 * - آرشی «چشم عقاب»: time nearly stops, golden reticles lock onto up to three targets (the Div's
 *   gem first), then three golden arrows plunge onto them. Precision: weak points.
 * - سیمرغی «بال سیمرغ»: a feather spirals onto the bow, then the great bird's wings sweep the arena:
 *   a heart comes back, a ward rises around the hero, enemies under the wings slow, and the whole
 *   group's chain rises a tier. Support: the group.
 * Colours come from the power's palette (FEEL.powers.<school>.palettes[skin]), so a "power skin" is data.
 * Objects are built once and reused.
 */
export class Powers {
  private busy = false;
  private readonly cracks: Phaser.GameObjects.Graphics;
  private readonly quake: Phaser.GameObjects.Image;
  private readonly wings: Phaser.GameObjects.Image;
  private readonly feather: Phaser.GameObjects.Image;
  private readonly reticles: Phaser.GameObjects.Image[] = [];
  private readonly embers: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly feathers: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly title: Phaser.GameObjects.Text;
  private crackAlpha = 0;
  private crackLines: number[][] = [];
  private readonly tmp: Point = { x: 0, y: 0 };

  constructor(private readonly scene: Phaser.Scene, private readonly host: PowerHost) {
    // Normal blending throughout: additive light vanishes on the sunlit sand.
    this.cracks = scene.add.graphics().setDepth(DEPTH.floorFx + 2);
    this.quake = scene.add.image(0, 0, 'fx_ring').setDepth(DEPTH.floorFx + 3).setVisible(false);
    this.wings = scene.add.image(0, 0, 'fx_simorgh').setDepth(DEPTH.fx + 5).setVisible(false);
    this.feather = scene.add.image(0, 0, 'fx_feather').setDepth(DEPTH.aim + 2).setVisible(false);
    for (let i = 0; i < BALANCE.power.arashi.arrows; i++) {
      this.reticles.push(scene.add.image(0, 0, 'fx_ring').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.aim + 3).setVisible(false));
    }
    this.embers = scene.add.particles(0, 0, 'fx_spark', {
      emitting: false, lifespan: { min: 420, max: 800 }, speed: { min: 80, max: 380 }, scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 }, blendMode: 'ADD', maxParticles: 120,
    }).setDepth(DEPTH.fx + 1);
    this.feathers = scene.add.particles(0, 0, 'fx_feather', {
      emitting: false, lifespan: { min: 1800, max: 2800 }, speedY: { min: 60, max: 140 }, speedX: { min: -60, max: 60 },
      rotate: { start: -40, end: 220 }, scale: { min: 0.25, max: 0.45 }, alpha: { start: 1, end: 0 }, maxParticles: 40,
    }).setDepth(DEPTH.fx + 2);
    this.title = scene.add.text(DESIGN_W / 2, TITLE_Y, '', {
      fontFamily: CALLIGRAPHY_FONT, fontSize: '110px', rtl: true, stroke: '#2a1204', strokeThickness: 7,
      padding: { top: 40, bottom: 56, left: 20, right: 20 },
    }).setOrigin(0.5).setDepth(DEPTH.numbers + 10).setScrollFactor(0).setVisible(false);
  }

  get active(): boolean {
    return this.busy;
  }

  /** A power only goes off when it has something to do (so the meter is never wasted). */
  canCast(school: School): boolean {
    if (this.busy) return false;
    if (school === 'simorghi') return true;
    return this.host.boss.brain.fighting || this.host.enemies().some((e) => e.alive && e.hittable);
  }

  /** Casts the school's power; false if one is already running. */
  cast(school: School): boolean {
    if (this.busy) return false;
    this.busy = true;
    if (school === 'rostami') this.rostam();
    else if (school === 'arashi') this.eagle();
    else this.simorgh();
    return true;
  }

  update(realMs: number): void {
    if (this.crackAlpha > 0) {
      this.crackAlpha = Math.max(0, this.crackAlpha - realMs / FEEL.powers.rostami.crackFadeMs);
      this.drawCracks();
    }
    for (const r of this.reticles) {
      if (!r.visible) continue;
      const t = r.getData('target') as { x: () => number; y: () => number } | undefined;
      if (t) r.setPosition(t.x(), t.y());
      r.setRotation(r.rotation + realMs / 300);
    }
  }

  // ---------------------------------------------------------------- shared beats

  private palette(school: School): Palette {
    const P = FEEL.powers[school];
    return P.palettes[FEEL.powers.skin] ?? P.palettes.default;
  }

  /** The power's name in calligraphy, swelling in and drifting away. */
  private announce(school: School): void {
    const [color, glow] = this.palette(school);
    const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
    const t = this.title.setText(FEEL.powers[school].name).setVisible(true).setAlpha(0).setScale(0.6).setY(TITLE_Y);
    gradientText(t, ['#ffffff', hex(glow), hex(color)]);
    this.scene.tweens.killTweensOf(t);
    this.scene.tweens.chain({
      targets: t,
      tweens: [
        { alpha: 1, scale: 1, duration: 320, ease: 'Back.easeOut' },
        { alpha: 0, y: t.y - 50, duration: 420, delay: FEEL.powers.titleMs, ease: 'Cubic.easeIn' },
      ],
      onComplete: () => t.setVisible(false),
    });
  }

  /** Anticipation: time slows, the power's colour gathers at the bow. Then `then`. */
  private gather(school: School, ms: number, slow: number, then: () => void): void {
    const [color] = this.palette(school);
    const h = this.host;
    h.setAim(false);
    h.timeCtl.slowMo(slow, 1e9);
    this.announce(school);
    services.haptics.play('medium');
    const k = { v: 0 };
    this.scene.tweens.add({
      targets: k, v: 1, duration: ms, ease: 'Sine.easeIn',
      onUpdate: () => h.hero.powerCharge(k.v, color),
      onComplete: () => {
        h.hero.powerCharge(0, color);
        then();
      },
    });
    // Motes drawn in toward the bow.
    const n = services.settings.count(18);
    this.embers.setParticleTint(color);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 220 + Math.random() * 140;
      const p = this.embers.emitParticle(1, h.hero.bowX + Math.cos(a) * r, h.hero.bowY + Math.sin(a) * r);
      if (!p) break;
      p.velocityX = -Math.cos(a) * r * 1.6;
      p.velocityY = -Math.sin(a) * r * 1.6;
    }
  }

  private done(delay: number): void {
    this.scene.time.delayedCall(delay, () => {
      this.busy = false;
      this.host.setAim(true);
    });
  }

  // ---------------------------------------------------------------- رستمی: خشم رستم

  private rostam(): void {
    const P = FEEL.powers.rostami;
    const B = BALANCE.power.rostami;
    const h = this.host;
    const [color, glow] = this.palette('rostami');
    services.audio.play('drum', 0.9);
    this.scene.time.delayedCall(P.anticipationMs * 0.5, () => services.audio.play('drum', 1));
    this.scene.cameras.main.zoomTo(1.05, P.anticipationMs, 'Sine.easeIn');
    this.gather('rostami', P.anticipationMs, P.slowMo, () => {
      // Action: the stamp.
      h.timeCtl.slowMo(1, 0);
      const x0 = h.hero.x;
      const y0 = h.hero.y - 20;
      h.hero.release(true);
      h.fx.dustBurst(x0, y0, 26);
      h.fx.debris(x0, y0 - 10, 20);
      const cam = this.scene.cameras.main;
      cam.zoomTo(1, 500, 'Sine.easeOut');
      cam.shake(P.shake.ms, P.shake.intensity, true);
      h.atmosphere.shockwave(1.2, 700);
      services.audio.play('slam', 1.3);
      services.audio.play('shockwave', 1.2);
      services.haptics.play('heavy');
      // The quake front: a flattened ring racing up the floor, and cracks of fire behind it.
      const travelMs = B.radius / P.frontPxPerMs;
      this.quake.setVisible(true).setPosition(x0, y0).setTint(color).setAlpha(1).setScale(0.5, 0.2);
      this.scene.tweens.add({
        targets: this.quake, scaleX: (B.radius * 2) / 128, scaleY: (B.radius * 0.9) / 128, alpha: 0, duration: travelMs,
        ease: 'Cubic.easeOut', onComplete: () => this.quake.setVisible(false),
      });
      this.makeCracks(x0, y0, P.cracks);
      this.embers.setParticleTint(glow);
      this.embers.explode(services.settings.count(30), x0, y0 - 40);
      // Impact: every enemy the front reaches.
      for (const e of h.enemies()) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x - x0, e.y - y0);
        if (d > B.radius) continue;
        this.scene.time.delayedCall(d / P.frontPxPerMs, () => {
          if (!e.alive) return;
          const outcome = e.receiveArrow({ damage: B.damage, crit: false, x: e.hitX, y: e.hitY, dirX: 0, dirY: 0, bounces: 0 });
          if (outcome === 'hit') e.stagger(B.stunMs, B.pushPx);
          this.embers.setParticleTint(color);
          this.embers.explode(services.settings.count(8), e.x, e.y - 10);
          h.fx.dustBurst(e.x, e.y, 6);
          h.onEnemyHit(e, B.damage, outcome);
        });
      }
      // The Div, beyond the wall: the quake shakes him (and shatters his barrier).
      if (h.boss.brain.fighting) {
        const p = h.boss.chestPoint(this.tmp);
        const bx = p.x;
        const by = p.y;
        this.scene.time.delayedCall(Math.hypot(bx - x0, by - y0) / P.frontPxPerMs, () => {
          const dmg = h.boss.quake(B.bossDamage);
          if (dmg > 0) h.onBossHit(dmg, bx, by);
        });
      }
      // Aftermath: dust settles along the cracks as they cool.
      this.scene.time.delayedCall(travelMs * 0.6, () => {
        for (const line of this.crackLines) {
          const n = line.length;
          if (n >= 2) h.fx.dustBurst(line[n - 2], line[n - 1], 3);
        }
      });
      this.done(travelMs * 0.5);
    });
  }

  private makeCracks(x0: number, y0: number, n: number): void {
    this.crackLines = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * Math.PI * 1.1;
      const pts = [x0, y0];
      let x = x0;
      let y = y0;
      let ang = a;
      const steps = 5 + Math.floor(Math.random() * 4);
      for (let s = 0; s < steps; s++) {
        ang += (Math.random() - 0.5) * 0.7;
        const len = 40 + Math.random() * 60;
        x += Math.cos(ang) * len;
        y += Math.sin(ang) * len * 0.6;
        pts.push(x, y);
      }
      this.crackLines.push(pts);
    }
    this.crackAlpha = 1;
    this.drawCracks();
  }

  private drawCracks(): void {
    const g = this.cracks.clear();
    if (this.crackAlpha <= 0) return;
    const [color, glow] = this.palette('rostami');
    // A dark fissure, molten colour inside it, a bright seam down the middle.
    for (const [w, c, a] of [[14, 0x2a0a04, 0.55], [8, color, 0.95], [3, glow, 1]] as const) {
      g.lineStyle(w, c, a * this.crackAlpha);
      for (const pts of this.crackLines) {
        g.beginPath().moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
        g.strokePath();
      }
    }
  }

  // ---------------------------------------------------------------- آرشی: چشم عقاب

  private eagle(): void {
    const P = FEEL.powers.arashi;
    const B = BALANCE.power.arashi;
    const h = this.host;
    const [color, glow] = this.palette('arashi');
    // Targets: the Div's gem first (when he can be hit), then the enemies nearest the hero.
    const targets: { x: () => number; y: () => number; gem: boolean }[] = [];
    const boss = h.boss;
    if (boss.brain.fighting) {
      targets.push({ x: () => boss.gemPoint(this.tmp).x, y: () => boss.gemPoint(this.tmp).y, gem: true });
    }
    const foes = h.enemies().filter((e) => e.alive && e.hittable).sort((a, b) => b.y - a.y);
    for (const e of foes) {
      if (targets.length >= B.arrows) break;
      targets.push({ x: () => e.hitX, y: () => e.hitY, gem: false });
    }
    // Few targets: the rest go to the first one (usually the gem).
    while (targets.length && targets.length < B.arrows) targets.push(targets[0]);
    services.audio.play('screech');
    h.atmosphere.darken(0.25, 250);
    // Reticles lock on, one by one, during the anticipation.
    targets.forEach((t, i) => {
      this.scene.time.delayedCall(i * P.lockGapMs, () => {
        const r = this.reticles[i];
        r.setData('target', t).setVisible(true).setTint(color).setAlpha(1).setScale(2.2).setPosition(t.x(), t.y());
        this.scene.tweens.add({ targets: r, scale: 0.9, duration: 220, ease: 'Back.easeOut' });
        services.audio.play('tick', 0.5 + i * 0.25);
        services.haptics.play('tick');
      });
    });
    const ant = Math.max(P.anticipationMs, targets.length * P.lockGapMs + 200);
    this.gather('arashi', ant, P.slowMo, () => {
      // Action: three golden arrows, loosed in a fan, plunging onto their marks.
      h.timeCtl.slowMo(0.6, 700);
      h.atmosphere.darken(0, 400);
      const shot = shotFor({ charge: 1, phase: 'golden' });
      const bow = { x: h.hero.bowX, y: h.hero.bowY };
      targets.forEach((t, i) => {
        this.scene.time.delayedCall(i * B.staggerMs, () => {
          const spread = (i - (targets.length - 1) / 2) * 0.35;
          const dx = Math.sin(spread);
          const dy = -Math.cos(spread);
          h.hero.release(true);
          services.audio.play('release', 1);
          services.audio.play('golden');
          h.projectiles.fire(bow.x, bow.y, dx, dy, shot, {
            homing: () => {
              this.tmp.x = t.x();
              this.tmp.y = t.y();
              return this.tmp;
            },
            fromAbove: true,
          });
          const r = this.reticles[i];
          this.scene.tweens.add({ targets: r, scale: 2.4, alpha: 0, duration: 520, delay: 380, onComplete: () => r.setVisible(false) });
        });
      });
      services.haptics.play('heavy');
      h.fx.goldenBurst(bow.x, bow.y);
      // Aftermath: eagle feathers drift down.
      this.feathers.setParticleTint(glow);
      this.feathers.explode(services.settings.count(6), bow.x, bow.y - 60);
      this.done(targets.length * B.staggerMs + 500);
    });
    if (!targets.length) {
      // Nothing to lock onto: the eye opens, finds nothing, and closes (the meter is spent kindly small).
      this.reticles.forEach((r) => r.setVisible(false));
    }
  }

  // ---------------------------------------------------------------- سیمرغی: بال سیمرغ

  private simorgh(): void {
    const P = FEEL.powers.simorghi;
    const B = BALANCE.power.simorghi;
    const h = this.host;
    const [color, glow] = this.palette('simorghi');
    // Anticipation: a feather spirals down onto the bow.
    const f = this.feather.setVisible(true).setTint(glow).setAlpha(0).setScale(0.6).setPosition(h.hero.bowX + 160, h.hero.bowY - 420);
    services.audio.play('featherChime');
    const k = { v: 0 };
    this.scene.tweens.add({
      targets: k, v: 1, duration: P.anticipationMs, ease: 'Sine.easeInOut',
      onUpdate: () => {
        const a = k.v * Math.PI * 3;
        f.setPosition(h.hero.bowX + Math.cos(a) * 160 * (1 - k.v), h.hero.bowY - 420 * (1 - k.v) + Math.sin(a) * 30)
          .setRotation(Math.sin(a) * 0.6).setAlpha(Math.min(1, k.v * 3));
      },
      onComplete: () => f.setVisible(false),
    });
    this.gather('simorghi', P.anticipationMs, 0.5, () => {
      // Action: the wings sweep the arena from behind the hero to the wall.
      h.timeCtl.slowMo(1, 0);
      services.audio.play('screech');
      services.audio.play('whoosh');
      services.haptics.play('heavy');
      h.decor.gust(this.scene, P.sweepMs);
      h.atmosphere.gust(P.sweepMs);
      const w = this.wings.setVisible(true).setTint(color).setAlpha(0).setScale(3.2).setPosition(DESIGN_W / 2, DESIGN_H + 300);
      this.scene.tweens.add({ targets: w, alpha: 0.5, duration: P.sweepMs * 0.25 });
      this.scene.tweens.add({
        targets: w, y: -400, duration: P.sweepMs, ease: 'Sine.easeInOut',
        onUpdate: () => w.setScale(3.2 + 0.25 * Math.sin(this.scene.time.now / 120), 3.2),
        onComplete: () => w.setVisible(false),
      });
      this.scene.tweens.add({ targets: w, alpha: 0, duration: P.sweepMs * 0.3, delay: P.sweepMs * 0.7 });
      // Impact, as the wings pass: the hero first, then the arena from the bottom up.
      this.scene.time.delayedCall(P.sweepMs * 0.18, () => {
        h.heal(B.heal);
        h.hero.ward(B.wardMs);
        for (let i = 0; i < B.chainTiers; i++) h.raiseChain();
        this.embers.setParticleTint(glow);
        this.embers.explode(services.settings.count(24), h.hero.x, h.hero.y - 140);
        services.audio.play('heartFill');
      });
      for (const e of h.enemies()) {
        if (!e.alive) continue;
        const k2 = Phaser.Math.Clamp(1 - e.y / (DESIGN_H + 300), 0, 1);
        this.scene.time.delayedCall(P.sweepMs * (0.2 + 0.7 * k2), () => e.slow(B.slowMs, B.slow));
      }
      // Aftermath: feathers drift down over the arena.
      this.feathers.setParticleTint(glow);
      const n = services.settings.count(P.feathers);
      for (let i = 0; i < n; i++) {
        this.scene.time.delayedCall(i * 60, () => this.feathers.emitParticleAt(80 + Math.random() * (DESIGN_W - 160), 300 + Math.random() * 900, 1));
      }
      this.done(P.sweepMs * 0.5);
    });
  }
}
