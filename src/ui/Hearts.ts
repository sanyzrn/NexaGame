import Phaser from 'phaser';
import { Art } from '../assets/Art';
import { FEEL } from '../config/feel';
import { services } from '../services';

/**
 * The hero's hearts. Losing one: it flashes white, swells, breaks into red shards and wobbles
 * empty. Getting one back (the rescue): a gold glow gathers, the heart grows back from nothing with
 * an elastic pop, a ring and golden sparks.
 */
export class Hearts {
  readonly root: Phaser.GameObjects.Container;
  private readonly hearts: Phaser.GameObjects.Image[] = [];
  private readonly glows: Phaser.GameObjects.Image[] = [];
  private readonly full: boolean[] = [];
  private readonly shards: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly gold: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private readonly scene: Phaser.Scene, count: number, depth: number) {
    const H = FEEL.hearts;
    const parts: Phaser.GameObjects.GameObject[] = [];
    for (let i = 0; i < count; i++) {
      const x = H.x + i * H.gap;
      const glow = scene.add.image(x, H.y, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd24a).setAlpha(0).setScale(2.4);
      const h = Art.image(scene, x, H.y, 'ui_heart_full').setScale(H.scale);
      this.glows.push(glow);
      this.hearts.push(h);
      this.full.push(true);
      parts.push(glow, h);
    }
    this.root = scene.add.container(0, 0, parts).setDepth(depth);
    this.shards = scene.add.particles(0, 0, 'fx_spark', {
      emitting: false, lifespan: { min: 380, max: 650 }, speed: { min: 160, max: 420 }, gravityY: 1100,
      scale: { start: 1.2, end: 0 }, tint: [0xe0312b, 0xff7a6a, 0xffffff], maxParticles: 40,
    }).setDepth(depth + 1);
    this.gold = scene.add.particles(0, 0, 'fx_star', {
      emitting: false, lifespan: { min: 400, max: 700 }, speed: { min: 60, max: 220 }, scale: { start: 0.35, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [0xffd24a, 0xfff2b0, 0xffffff], blendMode: 'ADD', maxParticles: 30,
    }).setDepth(depth + 1);
  }

  /** Draw order (the rescue lifts them above its dim). */
  setDepth(depth: number): void {
    this.root.setDepth(depth);
    this.shards.setDepth(depth + 1);
    this.gold.setDepth(depth + 1);
  }

  /** Shows `n` full hearts; `animate` plays the break / refill on the hearts that changed. */
  set(n: number, animate = true): void {
    this.hearts.forEach((h, i) => {
      const full = i < n;
      if (animate && this.full[i] && !full) this.breakHeart(i);
      else if (animate && !this.full[i] && full) this.refill(i);
      else Art.setPose(h, full ? 'ui_heart_full' : 'ui_heart_empty');
      this.full[i] = full;
    });
  }

  private pos(h: Phaser.GameObjects.Image): { x: number; y: number } {
    return { x: this.root.x + h.x, y: this.root.y + h.y };
  }

  private breakHeart(i: number): void {
    const h = this.hearts[i];
    const S = FEEL.hearts.scale;
    this.scene.tweens.killTweensOf(h);
    h.setScale(S).setAngle(0).setTintFill(0xffffff);
    this.scene.tweens.add({
      targets: h, scale: S * 1.45, duration: 110, ease: 'Quad.easeOut', yoyo: true,
      onYoyo: () => {
        h.clearTint();
        Art.setPose(h, 'ui_heart_empty');
        const p = this.pos(h);
        this.shards.explode(services.settings.count(14), p.x, p.y);
      },
    });
    this.scene.tweens.add({ targets: h, angle: { from: -14, to: 0 }, duration: 380, ease: 'Elastic.easeOut' });
  }

  private refill(i: number): void {
    const h = this.hearts[i];
    const g = this.glows[i];
    const S = FEEL.hearts.scale;
    const ms = FEEL.hearts.refillMs;
    this.scene.tweens.killTweensOf([h, g]);
    Art.setPose(h, 'ui_heart_full');
    h.setScale(0).setAngle(0).setTintFill(0xfff0b0);
    g.setAlpha(0).setScale(0.5);
    // The glow gathers first, then the heart pops out of it.
    this.scene.tweens.add({ targets: g, alpha: 1, scale: 2.6, duration: ms * 0.45, ease: 'Sine.easeOut' });
    this.scene.tweens.add({
      targets: h, scale: S, duration: ms, delay: ms * 0.3, ease: 'Elastic.easeOut',
      onStart: () => {
        const p = this.pos(h);
        this.gold.explode(services.settings.count(14), p.x, p.y);
        services.audio.play('heartFill');
      },
      onComplete: () => h.clearTint(),
    });
    this.scene.tweens.add({ targets: g, alpha: 0, scale: 3.4, duration: 700, delay: ms * 0.6, ease: 'Cubic.easeIn' });
    this.scene.time.delayedCall(ms * 0.55, () => h.clearTint());
  }
}
