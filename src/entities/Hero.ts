import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { COLORS, DEPTH, worldDepth } from '../config/display';
import { FEEL } from '../config/feel';
import { HERO } from '../data/entities';
import { BendSprite } from '../render/BendSprite';
import { Shadow } from '../render/Shadow';
import type { AimSystem } from '../systems/AimSystem';
import type { FX } from '../systems/FX';
import { Spring } from '../utils/ease';

const TAU = Math.PI * 2;

/**
 * Hero on the platform. Pose swaps (idle → draw → full, hurt when hit) plus code motion on a bendable
 * strip: breathing and cape sway at rest; lean back, tension and bow flex while drawing, leaning
 * further with a strained tremble at full power (anticipation); golden aura and sparkles during a gold
 * pulse; on release a recoil, a string snap, then a springy bow shake and cape flick (follow-through);
 * red flash, knockback and blinking when hurt. Also: the Simorgh's feather on the bow, and the blazing
 * bow of the team finisher. Runs on real time, like the aim.
 */
export class Hero {
  readonly body: BendSprite;
  readonly bowX: number;
  readonly bowY: number;
  private readonly aura: Phaser.GameObjects.Image;
  private readonly auraCore: Phaser.GameObjects.Image;
  private readonly feather: Phaser.GameObjects.Image;
  private readonly bigArrow: Phaser.GameObjects.Image;
  private readonly bigGlow: Phaser.GameObjects.Image;
  private readonly flick = new Spring(FEEL.hero.followThrough.hz, FEEL.hero.followThrough.damping);
  private readonly bowShake = new Spring(FEEL.hero.followThrough.hz * 2.2, FEEL.hero.followThrough.damping);
  private t = 0;
  /** Displayed draw amount 0..1 (follows the charge, eases out after release). */
  private draw = 0;
  private sinceRelease = 1e9;
  private releasePose: string = HERO.poses.idle;
  private hurtLeft = 0;
  private invulnerableLeft = 0;
  private shimmerLeft = 0;
  private lean = 0;
  private sparkleIn = 0;
  private punch = 0;
  private hasFeather = false;
  private blazing = 0;
  private blazeTarget = 0;

  constructor(scene: Phaser.Scene, readonly x: number, readonly y: number, private readonly fx: FX) {
    this.body = new BendSprite(scene, x, y, HERO.poses.idle, { rows: 9 });
    this.body.rope.setScale(HERO.scale).setDepth(worldDepth(y));
    this.body.swayStart = FEEL.hero.swayStart;
    new Shadow(scene, HERO.shadow, HERO.scale).place(x, y);
    this.bowX = x + HERO.bow.x;
    this.bowY = y + HERO.bow.y;
    this.aura = scene.add.image(this.bowX, this.bowY, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.aim - 2).setAlpha(0);
    this.auraCore = scene.add.image(this.bowX, this.bowY, 'fx_star').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.aim - 1)
      .setTint(0xfff2c0).setAlpha(0);
    this.feather = scene.add.image(this.bowX + 26, this.bowY - 10, 'fx_feather').setScale(0.45).setDepth(DEPTH.aim - 1).setVisible(false);
    this.bigGlow = scene.add.image(this.bowX, this.bowY - 120, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd24a)
      .setDepth(DEPTH.aim - 3).setVisible(false);
    this.bigArrow = scene.add.image(this.bowX, this.bowY, 'arrow').setRotation(-Math.PI / 2).setTint(0xffe9a0)
      .setDepth(DEPTH.aim - 1).setVisible(false);
  }

  /** Still blinking after a hit: further hits are ignored. */
  get invulnerable(): boolean {
    return this.invulnerableLeft > 0;
  }

  /** The Simorgh's feather rests on the bow: the next arrow flies guided. */
  get feathered(): boolean {
    return this.hasFeather;
  }

  setFeather(on: boolean): void {
    this.hasFeather = on;
    this.feather.setVisible(on);
    if (on) {
      this.feather.setScale(0);
      this.feather.scene.tweens.add({ targets: this.feather, scale: 0.45, duration: 380, ease: 'Back.easeOut' });
    }
  }

  /** The team finisher's blazing golden bow and giant nocked arrow (0 = off, 1 = fully charged). */
  setBlazing(level: number): void {
    this.blazeTarget = level;
  }

  /** The giant arrow leaves the bow. */
  releaseBlazing(): void {
    this.bigArrow.setVisible(false);
    this.bigGlow.setVisible(false);
    this.blazing = this.blazeTarget = 0;
    this.release(true);
  }

  release(crit: boolean): void {
    const T = FEEL.hero.followThrough;
    this.sinceRelease = 0;
    this.releasePose = crit ? HERO.poses.full : HERO.poses.draw;
    this.fx.snap(this.bowX, this.bowY, crit);
    // Follow-through: the cape flicks back, the bow shakes.
    this.flick.v += T.flickPx * 30 * (Math.random() < 0.5 ? -1 : 1);
    this.bowShake.x = T.bowShake * (crit ? 1.4 : 1);
    if (this.hasFeather) this.setFeather(false);
  }

  hurt(): void {
    const H = FEEL.hero.hurt;
    this.hurtLeft = H.ms;
    this.invulnerableLeft = Math.max(H.invulnerableMs, BALANCE.hero.invulnerableMs);
  }

  /** Revived by a teammate: back on his feet, invulnerable for `ms` under a golden shimmer. */
  revive(ms: number): void {
    this.hurtLeft = 0;
    this.shimmerLeft = ms;
    this.invulnerableLeft = ms;
    this.punch = 1;
    this.fx.goldenBurst(this.bowX, this.bowY - 60);
  }

  update(dt: number, aim: AimSystem): void {
    const F = FEEL.hero;
    this.t += dt;
    this.sinceRelease += dt;
    if (this.hurtLeft > 0) this.hurtLeft -= dt;
    if (this.invulnerableLeft > 0) this.invulnerableLeft -= dt;
    if (this.shimmerLeft > 0) this.shimmerLeft -= dt;
    this.flick.update(dt);
    this.bowShake.update(dt);
    this.punch = Math.max(0, this.punch - dt / 120);

    const charging = aim.charging;
    const phase = aim.state.phase;
    const golden = charging && phase === 'golden';
    const full = charging && aim.state.charge >= 1;
    if (charging) this.draw += (aim.state.charge - this.draw) * Math.min(1, dt / 40);
    else if (this.blazeTarget > 0) this.draw += (1 - this.draw) * Math.min(1, dt / 120);
    else this.draw *= Math.exp(-dt / (F.releaseEaseMs / 3));

    // Pose (a tiny scale punch hides each swap)
    let pose: string = HERO.poses.idle;
    if (this.hurtLeft > 0) pose = HERO.poses.hurt;
    else if (this.blazeTarget > 0) pose = HERO.poses.full;
    else if (charging) pose = full ? HERO.poses.full : HERO.poses.draw;
    else if (this.sinceRelease < F.releasePoseMs) pose = this.releasePose;
    const b = this.body;
    if (b.setPose(pose)) this.punch = 1;

    // Recoil: a quick backward nudge and squash that eases out.
    const R = F.recoil;
    const k = Math.min(1, this.sinceRelease / R.ms);
    const kick = this.sinceRelease < R.ms ? (k < 0.12 ? k / 0.12 : Math.pow((1 - k) / 0.88, 2)) : 0;
    const squash = R.squash * kick;

    // Hurt: knockback and red flash.
    const H = F.hurt;
    const hurtK = this.hurtLeft > 0 ? this.hurtLeft / H.ms : 0;
    const knock = H.knockbackPx * hurtK * hurtK;

    // Anticipation: at full power he leans further back and trembles with the strain.
    const strained = full || this.blazeTarget >= 1;
    const lean = strained ? F.fullLeanBackPx : F.leanBackPx;
    const strain = strained ? Math.sin(this.t / 21) * F.strainPx * (1 + this.blazing) : 0;

    const d = this.draw;
    const breath = Math.sin((this.t / F.breathMs) * TAU);
    b.stretch = 1 + F.breathe * breath * (1 - d) - squash;
    b.sway = F.swayPx * Math.sin((this.t / F.swayMs) * TAU) * (1 - d * 0.7) + this.flick.x + strain;
    b.endShift = lean * d;
    b.endWidth = 1 - F.bowFlex * d + this.bowShake.x * Math.sin(this.t / 9);
    b.update(dt);

    const target = aim.aiming ? Phaser.Math.Clamp(aim.dirX * F.leanTowardAim, -F.leanTowardAim, F.leanTowardAim) : 0;
    this.lean += (target - this.lean) * Math.min(1, dt / 80);
    const p = 1 + F.posePunch * Math.sin(this.punch * Math.PI);
    b.rope
      .setPosition(this.x, this.y + R.nudgePx * kick + knock)
      .setScale(HERO.scale * (1 - F.tension * d + squash) * p, HERO.scale * p)
      .setRotation(this.lean);

    // Hurt tint and invulnerability blink (or the rescue's golden shimmer, which doesn't blink).
    if (this.shimmerLeft > 0) {
      const S = F.shimmer;
      const fade = Math.min(1, this.shimmerLeft / 400);
      const w = (0.5 + 0.5 * Math.sin((this.t / 1000) * S.hz * TAU)) * fade;
      const mix = (shift: number) => Math.round(255 - (255 - ((S.tint >> shift) & 0xff)) * w);
      b.setTint(Phaser.Display.Color.GetColor(mix(16), mix(8), mix(0)));
      b.rope.setAlpha(1);
      if (Math.random() < 0.35 * fade) this.fx.sparkleAt(this.x, this.y - 170, 150);
    } else if (this.hurtLeft > H.ms - H.flashMs) {
      b.setTint(0xff3020, true);
    } else {
      const gb = Math.round(255 - 150 * hurtK);
      b.setTint(Phaser.Display.Color.GetColor(255, gb, gb));
    }
    if (this.shimmerLeft <= 0) {
      b.rope.setAlpha(this.invulnerableLeft > 0 && Math.floor(this.invulnerableLeft / H.blinkMs) % 2 === 0 ? 0.45 : 1);
    }

    if (this.hasFeather) {
      this.feather.setPosition(this.bowX + 26 + Math.sin(this.t / 400) * 4, this.bowY - 14 + Math.sin(this.t / 260) * 5)
        .setRotation(0.3 + Math.sin(this.t / 330) * 0.15);
    }
    this.updateBlaze(dt);
    this.updateAura(dt, charging, golden, aim.state.charge);
  }

  private updateBlaze(dt: number): void {
    this.blazing += (this.blazeTarget - this.blazing) * Math.min(1, dt / 250);
    const z = this.blazing;
    if (z < 0.01) {
      if (this.bigArrow.visible) {
        this.bigArrow.setVisible(false);
        this.bigGlow.setVisible(false);
      }
      return;
    }
    const S = FEEL.finisher.arrowScale;
    const tremble = Math.sin(this.t / 17) * 1.5 * z;
    this.bigArrow.setVisible(true).setPosition(this.bowX + tremble, this.bowY - 20).setScale(BALANCE.arrow.scale * S * (0.6 + 0.4 * z))
      .setAlpha(Math.min(1, z * 2));
    this.bigGlow.setVisible(true).setPosition(this.bowX, this.bowY - 90).setScale((2.5 + Math.sin(this.t / 60) * 0.3) * z, (5 + Math.sin(this.t / 70) * 0.4) * z)
      .setAlpha(0.8 * z);
    this.aura.setTint(COLORS.gold).setAlpha(z).setScale(2.4 + 0.6 * z + Math.sin(this.t / 50) * 0.3);
    if (Math.random() < z * 0.6) this.fx.sparkleAt(this.bowX, this.bowY - 80, 120 * z);
  }

  private updateAura(dt: number, charging: boolean, golden: boolean, charge: number): void {
    const A = FEEL.hero.aura;
    if (this.blazing > 0.01) return;
    if (golden) {
      const p = 0.5 + 0.5 * Math.sin((this.t / A.pulseMs) * TAU);
      this.aura.setTint(COLORS.gold).setAlpha(A.alpha).setScale(A.scale[0] + (A.scale[1] - A.scale[0]) * p);
      this.auraCore.setAlpha(0.5 + 0.5 * p).setScale(0.9 + 0.4 * p).setRotation(this.t / 400);
      this.sparkleIn -= dt;
      if (this.sparkleIn <= 0) {
        this.sparkleIn = FEEL.hero.sparkleEveryMs;
        this.fx.sparkleAt(this.bowX, this.bowY, 70);
      }
      return;
    }
    this.auraCore.setAlpha(Math.max(0, this.auraCore.alpha - dt / 120));
    if (this.hasFeather) {
      // The feather's turquoise shimmer.
      const p = 0.5 + 0.5 * Math.sin(this.t / 180);
      this.aura.setTint(0x5ff0d8).setAlpha(0.35 + 0.25 * p).setScale(1.6 + 0.3 * p);
    } else if (charging) {
      this.aura.setTint(charge >= 1 ? 0xffe0a0 : 0xfff0c8).setAlpha(0.12 + charge * 0.3).setScale(1 + charge * 0.8);
    } else {
      this.aura.setAlpha(Math.max(0, this.aura.alpha - dt / 150));
    }
  }
}
