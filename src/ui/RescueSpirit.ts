import Phaser from 'phaser';
import { CALLIGRAPHY_FONT, DESIGN_H, DESIGN_W, FONT_FAMILY } from '../config/display';
import { FEEL } from '../config/feel';
import { services } from '../services';
import { gradientText, spotDimTex } from './kit';

export interface RescueHost {
  /** The spirit reached the hero: revive now. */
  onRevive(): void;
  /** The screen is back to normal. */
  onDone(): void;
}

/**
 * یاری هم‌رزم, the HUD half: the screen dims to a spotlight on the hero, a teammate's golden spirit
 * (their avatar in a gold orb, their name under it) flies in from the group's banner on a sweeping
 * curve, the line "X به یاری‌ات آمد!" rises, and on arrival the spirit bursts into light over the
 * hero. Builds its few objects on demand (once per run at most) and destroys them after.
 */
export class RescueSpirit {
  private readonly items: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    depth: number,
    from: { x: number; y: number },
    hero: { x: number; y: number },
    member: { name: string; avatar: string; color: number },
    private readonly host: RescueHost,
  ) {
    const R = FEEL.rescue;
    const dim = this.add(scene.add.image(0, 0, spotDimTex(scene, hero.x / DESIGN_W, hero.y / DESIGN_H))
      .setOrigin(0).setDisplaySize(DESIGN_W, DESIGN_H).setDepth(depth).setAlpha(0));
    scene.tweens.add({ targets: dim, alpha: R.dimAlpha, duration: R.dimInMs });

    const trail = this.add(scene.add.particles(0, 0, 'fx_glow', {
      emitting: false, lifespan: 520, scale: { start: 0.8, end: 0 }, alpha: { start: 0.9, end: 0 },
      tint: [0xffd24a, 0xfff0b0, member.color], blendMode: 'ADD', maxParticles: 90,
    }).setDepth(depth + 1));
    const orb = scene.add.image(0, 0, 'fx_glow').setTint(0xffd24a).setBlendMode(Phaser.BlendModes.ADD).setScale(3.2);
    const halo = scene.add.image(0, 0, 'fx_star').setTint(0xfff2c0).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6).setAlpha(0.7);
    const avatar = scene.add.image(0, 0, member.avatar).setDisplaySize(104, 104);
    const name = scene.add.text(0, 82, member.name, {
      fontFamily: FONT_FAMILY, fontSize: '36px', fontStyle: '900', color: '#fff4d0', rtl: true, stroke: '#3a2208', strokeThickness: 7,
    }).setOrigin(0.5);
    const tag = scene.add.text(0, 122, 'یاری هم‌رزم', {
      fontFamily: FONT_FAMILY, fontSize: '24px', fontStyle: '900', color: '#ffe08a', rtl: true, stroke: '#3a2208', strokeThickness: 5,
    }).setOrigin(0.5);
    const spirit = this.add(scene.add.container(from.x, from.y, [orb, halo, avatar, name, tag]).setDepth(depth + 2).setScale(0.3).setAlpha(0));

    const line = this.add(gradientText(scene.add.text(DESIGN_W / 2, hero.y - 560, `${member.name} به یاری‌ات آمد!`, {
      fontFamily: CALLIGRAPHY_FONT, fontSize: '84px', rtl: true, stroke: '#3a1a04', strokeThickness: 6,
      padding: { top: 30, bottom: 44, left: 20, right: 20 },
    }).setOrigin(0.5).setDepth(depth + 2).setAlpha(0), ['#fffbe8', '#ffe07a', '#d08a20']));

    const end = { x: hero.x, y: hero.y - 170 };
    const ctrl = { x: DESIGN_W * 0.18, y: (from.y + end.y) * 0.45 };
    const state = { k: 0 };
    let t = 0;
    scene.time.delayedCall(R.spiritDelayMs, () => {
      services.audio.play('rescue');
      services.haptics.play('medium');
      scene.tweens.add({ targets: line, alpha: 1, y: line.y - 30, duration: 600, ease: 'Cubic.easeOut' });
      scene.tweens.add({
        targets: state, k: 1, duration: R.spiritFlyMs, ease: 'Sine.easeInOut',
        onUpdate: () => {
          const e = state.k;
          const u = 1 - e;
          const x = u * u * from.x + 2 * u * e * ctrl.x + e * e * end.x;
          const y = u * u * from.y + 2 * u * e * ctrl.y + e * e * end.y;
          t = state.k * R.spiritFlyMs;
          spirit.setPosition(x, y + Math.sin(t / 90) * 6).setAlpha(Math.min(1, e * 4)).setScale(0.3 + 0.7 * Math.min(1, e * 2.2));
          halo.setRotation(t / 400);
          if (Math.random() < services.settings.count(3) / 3) trail.emitParticleAt(x, y, 2);
        },
        onComplete: () => this.arrive(spirit, trail, dim, line, end),
      });
    });
  }

  private arrive(
    spirit: Phaser.GameObjects.Container, trail: Phaser.GameObjects.Particles.ParticleEmitter,
    dim: Phaser.GameObjects.Image, line: Phaser.GameObjects.Text, end: { x: number; y: number },
  ): void {
    const R = FEEL.rescue;
    const scene = this.scene;
    trail.explode(services.settings.count(40), end.x, end.y);
    services.haptics.play('heavy');
    this.host.onRevive();
    scene.tweens.add({ targets: spirit, scale: 2.2, alpha: 0, duration: 520, ease: 'Cubic.easeOut' });
    scene.tweens.add({ targets: line, alpha: 0, duration: 400, delay: R.reviveHoldMs });
    scene.tweens.add({
      targets: dim, alpha: 0, duration: R.undimMs, delay: R.reviveHoldMs,
      onComplete: () => {
        this.host.onDone();
        this.destroy();
      },
    });
  }

  destroy(): void {
    for (const o of this.items) o.destroy();
    this.items.length = 0;
  }

  private add<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.items.push(o);
    return o;
  }
}
