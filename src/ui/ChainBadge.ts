import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { FONT_FAMILY } from '../config/display';
import { FEEL } from '../config/feel';
import { services } from '../services';
import { faMultiplier } from '../utils/fa';
import { flameIconTex, gradientText } from './kit';

const TEXT_STOPS: readonly (readonly string[])[] = [
  ['#fff0c0', '#ffb040', '#c05010'],
  ['#fff0c0', '#ffb040', '#c05010'],
  ['#fffbe0', '#ffd24a', '#d07a14'],
  ['#ffffff', '#fff0a0', '#ffc040'],
];

/**
 * زنجیرهٔ درفش: a flame in a countdown ring with the multiplier under it. Each tier escalates the look:
 * the flame grows and turns from orange to gold to white-hot with a blue core, the glow deepens and
 * embers rise faster. Rising a tier flares and pops the number; dropping one puffs smoke and shrinks.
 * The ring drains with the burn time and blinks when it is nearly out; the player's hits nudge it.
 */
export class ChainBadge {
  readonly root: Phaser.GameObjects.Container;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly flame: Phaser.GameObjects.Image;
  private readonly core: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly mult: Phaser.GameObjects.Text;
  private readonly caption: Phaser.GameObjects.Text;
  private readonly embers: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private tier = 0;
  /** Displayed flame size, eases toward the tier's. */
  private size = 0;
  private t = 0;
  private emberAcc = 0;
  private nudge = 0;
  private flareK = 0;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number, depth: number) {
    const C = FEEL.chain;
    this.glow = scene.add.image(0, -6, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.ring = scene.add.graphics();
    this.flame = scene.add.image(0, 26, flameIconTex(scene)).setOrigin(0.5, 0.97).setScale(0);
    this.core = scene.add.image(0, 24, flameIconTex(scene)).setOrigin(0.5, 0.97).setScale(0);
    this.mult = scene.add.text(0, C.ringR + 30, '', {
      fontFamily: FONT_FAMILY, fontSize: '40px', fontStyle: '900', stroke: '#2a1002', strokeThickness: 6,
    }).setOrigin(0.5);
    this.caption = scene.add.text(0, C.ringR + 64, 'زنجیره', {
      fontFamily: FONT_FAMILY, fontSize: '20px', fontStyle: '900', color: '#f6e7c8', rtl: true, stroke: '#1a0e04', strokeThickness: 4,
    }).setOrigin(0.5);
    this.root = scene.add.container(x, y, [this.glow, this.ring, this.flame, this.core, this.mult, this.caption])
      .setDepth(depth).setAlpha(0).setVisible(false);
    // Emitters live outside the container (particles need scene space); they follow `root`.
    this.embers = scene.add.particles(0, 0, 'fx_spark', {
      emitting: false, lifespan: { min: 500, max: 900 }, speedY: { min: -140, max: -60 }, speedX: { min: -30, max: 30 },
      scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xff8a1c, 0xffc23a, 0xffe07a],
      maxParticles: 50,
    }).setDepth(depth + 1);
    this.smoke = scene.add.particles(0, 0, 'fx_smoke', {
      emitting: false, lifespan: 600, speedY: { min: -90, max: -40 }, speedX: { min: -40, max: 40 },
      scale: { start: 0.4, end: 1.1 }, alpha: { start: 0.6, end: 0 }, tint: 0x3a2a2a, maxParticles: 14,
    }).setDepth(depth - 1);
  }

  get x(): number {
    return this.root.x;
  }
  get y(): number {
    return this.root.y;
  }

  /** Shows a tier (0 hides it). `animate` plays the rise / drop moment. */
  setTier(tier: number, animate = true): void {
    const prev = this.tier;
    if (tier === prev) return;
    this.tier = tier;
    const scene = this.scene;
    scene.tweens.killTweensOf(this.root);
    if (tier > 0) {
      const m = BALANCE.chain.multipliers[tier];
      this.mult.setText(faMultiplier(m));
      gradientText(this.mult, TEXT_STOPS[tier]);
      if (prev === 0) {
        this.root.setVisible(true).setAlpha(0).setScale(0.4);
        scene.tweens.add({ targets: this.root, alpha: 1, scale: 1, duration: animate ? 420 : 0, ease: 'Back.easeOut' });
      } else {
        this.root.setVisible(true).setAlpha(1).setScale(1);
      }
    }
    if (!animate) {
      this.size = FEEL.chain.flameScale[tier];
      if (tier === 0) this.root.setVisible(false);
      return;
    }
    if (tier > prev) {
      this.flareK = 1;
      scene.tweens.add({ targets: this.mult, scale: { from: 1.8, to: 1 }, duration: 480, ease: 'Back.easeOut' });
      this.embers.explode(services.settings.count(10 + tier * 6), this.root.x, this.root.y - 10);
      services.audio.play('chainUp', tier);
      services.haptics.play('light');
    } else {
      this.smoke.explode(services.settings.count(8), this.root.x, this.root.y - 10);
      services.audio.play('chainDown');
      scene.tweens.add({ targets: this.mult, scale: { from: 0.7, to: 1 }, duration: 300, ease: 'Sine.easeOut' });
      if (tier === 0) {
        scene.tweens.add({ targets: this.root, alpha: 0, scale: 0.6, duration: 500, ease: 'Cubic.easeIn', onComplete: () => this.root.setVisible(false) });
      }
    }
  }

  /** The player's hit fed the flame. */
  fed(): void {
    this.nudge = 1;
  }

  update(ms: number, progress: number): void {
    const C = FEEL.chain;
    if (!this.root.visible) return;
    this.t += ms;
    const tier = this.tier;
    const want = C.flameScale[tier];
    this.size += (want - this.size) * Math.min(1, ms / 220);
    this.nudge = Math.max(0, this.nudge - ms / 250);
    this.flareK = Math.max(0, this.flareK - ms / 600);

    // Flame: flicker (independent x/y jitter) and a lick of sway.
    const s = this.size * (1 + 0.35 * this.flareK + 0.08 * this.nudge);
    const fx = 1 + 0.08 * Math.sin(this.t / 53) + 0.05 * Math.sin(this.t / 31);
    const fy = 1 + 0.1 * Math.sin(this.t / 71 + 1) + 0.06 * Math.sin(this.t / 23);
    const col = C.flameTint[Math.max(1, tier)];
    this.flame.setScale(s * fx, s * fy).setTint(col).setAngle(4 * Math.sin(this.t / 180));
    this.core.setScale(s * 0.55 * fy, s * 0.6 * fx).setTint(C.coreTint[Math.max(1, tier)]).setAlpha(0.9).setAngle(-3 * Math.sin(this.t / 150));
    const ga = C.glowAlpha[tier] * (0.8 + 0.2 * Math.sin(this.t / (tier >= 3 ? 90 : 160))) + 0.4 * this.flareK;
    this.glow.setTint(col).setAlpha(ga).setScale(2.2 + tier * 0.5 + this.flareK * 1.5);

    // Countdown ring.
    const R = C.ringR;
    const g = this.ring.clear();
    // A dark medallion behind the flame, so it reads over the bright arena.
    g.fillStyle(0x140a06, 0.78).fillCircle(0, 0, R + 4);
    g.lineStyle(9, 0x1a0e08, 0.75).strokeCircle(0, 0, R);
    const warn = progress < C.warnAt && Math.floor(this.t / 160) % 2 === 0;
    const ringCol = warn ? 0xff5a3a : C.ringColor[Math.max(1, tier)];
    if (progress > 0) {
      g.lineStyle(7 + this.nudge * 3, ringCol, 1);
      g.beginPath().arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress, false).strokePath();
      // Glinting head of the fuse.
      const a = -Math.PI / 2 + Math.PI * 2 * progress;
      g.fillStyle(0xffffff, 0.9).fillCircle(Math.cos(a) * R, Math.sin(a) * R, 4 + this.nudge * 2);
    }

    // Embers.
    this.emberAcc += (services.settings.count(C.embers[tier]) * ms) / 1000;
    while (this.emberAcc >= 1) {
      this.emberAcc--;
      this.embers.emitParticleAt(this.root.x + (Math.random() - 0.5) * 30 * this.size, this.root.y - 20 * this.size, 1);
    }
  }
}
