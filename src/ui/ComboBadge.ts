import Phaser from 'phaser';
import { Art } from '../assets/Art';
import { FONT_FAMILY } from '../config/display';
import { FEEL } from '../config/feel';
import { services } from '../services';
import { faDigits } from '../utils/fa';
import { gradientText } from './kit';

const BADGE_SCALE = 0.62;

interface Shard {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  spin: number;
}

/**
 * Combo counter (ui_combo_badge): appears at ×2; every hit punches the badge and pops the number;
 * flames rise behind it, hotter per tier (FEEL.combo.tiers); when the streak breaks the badge
 * shatters into pieces of its own art that tumble away. Shards are pre-made crops of the badge.
 */
export class ComboBadge {
  readonly root: Phaser.GameObjects.Container;
  private readonly art: Phaser.GameObjects.Image;
  private readonly text: Phaser.GameObjects.Text;
  private readonly heat: Phaser.GameObjects.Image;
  private readonly flames: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly shards: Shard[] = [];
  private combo = 0;
  private tier = -1;
  private flameAcc = 0;
  private shatterT = -1;
  private t = 0;
  private baseY = 0;
  /** Flame particle size for the current tier. */
  private flameBase = 0.5;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number, depth: number) {
    const C = FEEL.combo;
    this.baseY = y;
    this.flames = scene.add.particles(0, 0, 'fx_flame', {
      emitting: false, lifespan: { min: 420, max: 700 }, speedY: { min: -170, max: -90 }, speedX: { min: -25, max: 25 },
      scale: { onEmit: () => this.flameBase * (0.8 + Math.random() * 0.5), onUpdate: (_p, _k, t) => this.flameBase * (1 - 0.75 * t) },
      alpha: { start: 0.85, end: 0 }, rotate: { min: -12, max: 12 },
      tint: 0xff8a2a, maxParticles: 60,
    }).setDepth(depth - 1);
    this.heat = scene.add.image(0, 0, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff8a2a).setAlpha(0).setScale(4);
    // The art scale is on the children, so the container's scale can pop around 1.
    this.art = Art.image(scene, 0, 0, 'ui_combo_badge').setScale(BADGE_SCALE);
    this.text = scene.add.text(0, 2, '×۰', {
      fontFamily: FONT_FAMILY, fontSize: '62px', fontStyle: '900', stroke: '#fff3c4', strokeThickness: 7,
    }).setOrigin(0.5);
    gradientText(this.text, C.textStops[0]);
    this.root = scene.add.container(x, y, [this.heat, this.art, this.text]).setDepth(depth).setVisible(false);

    // Shards: a grid of crops of the badge art, each pivoting on its own centre.
    const n = C.shatter.grid;
    const w = this.art.width;
    const h = this.art.height;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const img = Art.image(scene, 0, 0, 'ui_combo_badge').setScale(BADGE_SCALE).setDepth(depth).setVisible(false);
        img.setCrop((c * w) / n, (r * h) / n, w / n, h / n);
        img.setOrigin((c + 0.5) / n, (r + 0.5) / n);
        this.shards.push({ img, vx: 0, vy: 0, spin: 0 });
      }
    }
  }

  /** Rest position (safe-area changes). */
  setBaseY(y: number): void {
    this.baseY = y;
    this.root.setY(y);
  }

  get value(): number {
    return this.combo;
  }

  set(n: number): void {
    const prev = this.combo;
    this.combo = n;
    const b = this.root;
    if (n >= 2) {
      this.setTier(this.tierOf(n));
      this.text.setText(`×${faDigits(String(n))}`);
      this.scene.tweens.killTweensOf([b, this.text]);
      b.setVisible(true).setAlpha(1).setAngle(0).setY(this.baseY);
      if (prev < 2) {
        b.setScale(0);
        this.scene.tweens.add({ targets: b, scale: 1, duration: 320, ease: 'Back.easeOut' });
      } else {
        b.setScale(1.22);
        this.scene.tweens.add({ targets: b, scale: 1, duration: 260, ease: 'Back.easeOut' });
        this.scene.tweens.add({ targets: b, angle: { from: n % 2 ? -8 : 8, to: 0 }, duration: 300, ease: 'Sine.easeOut' });
      }
      // The number itself pops a little harder than the badge.
      this.scene.tweens.add({ targets: this.text, scale: { from: 1.55, to: 1 }, duration: 300, ease: 'Back.easeOut' });
    } else if (prev >= 2) {
      this.shatter();
    }
  }

  /** Silently hides it (victory). */
  clear(): void {
    this.combo = 0;
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({ targets: this.root, alpha: 0, duration: 300, onComplete: () => this.root.setVisible(false) });
    this.setTier(-1);
  }

  update(ms: number): void {
    const C = FEEL.combo;
    this.t += ms;
    if (this.root.visible && this.tier >= 0) {
      const rate = services.settings.count(C.flames[this.tier]);
      this.flameAcc += (rate * ms) / 1000;
      const tint = C.flameTint[this.tier];
      while (this.flameAcc >= 1) {
        this.flameAcc--;
        this.flames.setParticleTint(tint[Math.floor(Math.random() * tint.length)]);
        const a = Math.random() * Math.PI * 2;
        this.flames.emitParticleAt(this.root.x + Math.cos(a) * 52, this.root.y + Math.sin(a) * 40 - 10, 1);
      }
      const pulse = 0.5 + 0.5 * Math.sin(this.t / (this.tier >= 3 ? 70 : 140));
      this.heat.setAlpha([0, 0.18, 0.32, 0.5][this.tier] * (0.7 + 0.3 * pulse));
    }
    if (this.shatterT >= 0) this.updateShatter(ms);
  }

  private tierOf(n: number): number {
    const tiers = FEEL.combo.tiers;
    let t = 0;
    for (let i = 0; i < tiers.length; i++) if (n >= tiers[i]) t = i;
    return t;
  }

  private setTier(tier: number): void {
    if (tier === this.tier) return;
    const up = tier > this.tier && this.tier >= 0;
    this.tier = tier;
    if (tier < 0) return;
    this.flameBase = FEEL.combo.flameScale[tier];
    gradientText(this.text, FEEL.combo.textStops[tier]);
    this.heat.setTint(FEEL.combo.flameTint[tier][0]);
    if (up) {
      // Tier-up: a burst of flame from the badge.
      this.flames.setParticleTint(FEEL.combo.flameTint[tier][0]);
      this.flames.explode(services.settings.count(12), this.root.x, this.root.y);
    }
  }

  private shatter(): void {
    const S = FEEL.combo.shatter;
    const b = this.root;
    this.scene.tweens.killTweensOf(b);
    b.setVisible(false);
    const n = S.grid;
    const k = BADGE_SCALE;
    const w = this.art.width * k;
    const h = this.art.height * k;
    this.shards.forEach((s, i) => {
      const c = i % n;
      const r = Math.floor(i / n);
      const ox = ((c + 0.5) / n - 0.5) * w;
      const oy = ((r + 0.5) / n - 0.5) * h;
      const a = Math.atan2(oy, ox || 0.001);
      const sp = S.speed[0] + Math.random() * (S.speed[1] - S.speed[0]);
      s.vx = Math.cos(a) * sp + (Math.random() - 0.5) * 80;
      s.vy = Math.sin(a) * sp - 220;
      s.spin = (Math.random() - 0.5) * 2 * S.spinDeg;
      s.img.setPosition(b.x + ox, b.y + oy).setAngle(0).setAlpha(1).setVisible(true).setTintFill(0xffffff);
    });
    this.shatterT = 0;
    this.setTier(-1);
    services.audio.play('comboBreak');
  }

  private updateShatter(ms: number): void {
    const S = FEEL.combo.shatter;
    this.shatterT += ms;
    const dt = ms / 1000;
    const k = this.shatterT / S.ms;
    for (const s of this.shards) {
      s.vy += S.gravity * dt;
      s.img.x += s.vx * dt;
      s.img.y += s.vy * dt;
      s.img.angle += s.spin * dt;
      s.img.setAlpha(Math.max(0, 1 - k * k));
      // White flash for the first frames, then the art's own colours.
      if (this.shatterT > 70) s.img.clearTint();
    }
    if (k >= 1) {
      this.shatterT = -1;
      for (const s of this.shards) s.img.setVisible(false);
    }
  }
}
