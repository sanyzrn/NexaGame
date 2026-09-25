import Phaser from 'phaser';
import { DEPTH } from '../config/display';
import { FEEL } from '../config/feel';
import { services } from '../services';
import { easeInOutSine } from '../utils/ease';
import type { TimeCtl } from './TimeCtl';

export interface SimorghHost {
  /** Where the feather lands. */
  bow(): { x: number; y: number };
  onGust(ms: number): void;
  onFeatherLanded(x: number, y: number): void;
}

const FROM = { x: -520, y: 1560 };
const TO = { x: 1620, y: 180 };

/**
 * Surprise (FEEL.simorgh): the Simorgh, the great bird who guards Zal's line in the Shahnameh and
 * guided Rostam's one fateful arrow. Her shadow sweeps across the arena on a gust of wind, feathers
 * drift down, and one glowing feather settles on the hero's bow — the next arrow flies true.
 * About two seconds; the fight never stops.
 */
export class Simorgh {
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly feather: Phaser.GameObjects.Image;
  private readonly featherGlow: Phaser.GameObjects.Image;
  private readonly falling: Phaser.GameObjects.Particles.ParticleEmitter;
  private t = -1;
  private featherT = -1;
  private fx0 = 0;
  private fy0 = 0;

  constructor(scene: Phaser.Scene, time: TimeCtl, private readonly host: SimorghHost) {
    const S = FEEL.simorgh;
    const angle = Math.atan2(TO.y - FROM.y, TO.x - FROM.x) + Math.PI / 2;
    this.shadow = scene.add.image(FROM.x, FROM.y, 'fx_simorgh').setTint(0x12060a).setAlpha(0)
      .setScale(S.shadowScale).setRotation(angle).setDepth(DEPTH.shadows + 1).setVisible(false);
    this.featherGlow = scene.add.image(0, 0, 'fx_glow').setTint(0x5ff0d8).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.fx).setVisible(false);
    this.feather = scene.add.image(0, 0, 'fx_feather').setScale(0.6).setDepth(DEPTH.fx + 1).setVisible(false);
    this.falling = time.track(scene.add.particles(0, 0, 'fx_feather', {
      emitting: false, lifespan: { min: 1800, max: 2600 }, speedY: { min: 40, max: 90 }, speedX: { min: -60, max: 60 },
      rotate: { min: -40, max: 40 }, scale: { start: 0.32, end: 0.22 }, alpha: { start: 0.9, end: 0 }, maxParticles: 20,
    }).setDepth(DEPTH.fx - 1));
  }

  get flying(): boolean {
    return this.t >= 0 || this.featherT >= 0;
  }

  fly(): void {
    if (this.flying) return;
    this.t = 0;
    this.shadow.setVisible(true);
    services.audio.play('screech');
    this.host.onGust(FEEL.simorgh.gustMs);
  }

  update(dt: number): void {
    const S = FEEL.simorgh;
    if (this.t >= 0) {
      this.t += dt;
      const k = Math.min(1, this.t / S.sweepMs);
      const e = easeInOutSine(k);
      const x = FROM.x + (TO.x - FROM.x) * e;
      const y = FROM.y + (TO.y - FROM.y) * e;
      // Wing beats: the shadow's span breathes.
      const flap = 0.85 + 0.2 * Math.sin(this.t / 60);
      this.shadow.setPosition(x, y).setScale(S.shadowScale * flap, S.shadowScale).setAlpha(S.shadowAlpha * Math.sin(k * Math.PI));
      if (Math.random() < 0.25) this.falling.emitParticleAt(x + Phaser.Math.Between(-120, 120), Math.max(120, y - 200), services.settings.count(1));
      if (k >= 0.45 && this.featherT < 0 && this.shadow.visible) {
        this.featherT = 0;
        this.fx0 = Math.min(900, Math.max(180, x));
        this.fy0 = Math.max(260, y - 250);
        this.feather.setVisible(true).setAlpha(0);
        this.featherGlow.setVisible(true).setAlpha(0);
      }
      if (k >= 1) {
        this.t = -1;
        this.shadow.setVisible(false);
      }
    }
    if (this.featherT >= 0) this.updateFeather(dt);
  }

  /** The chosen feather drifts down, swaying, onto the bow. */
  private updateFeather(dt: number): void {
    this.featherT += dt;
    const k = Math.min(1, this.featherT / FEEL.simorgh.featherFlyMs);
    const e = easeInOutSine(k);
    const bow = this.host.bow();
    const x = this.fx0 + (bow.x - this.fx0) * e + Math.sin(k * Math.PI * 3) * 90 * (1 - k);
    const y = this.fy0 + (bow.y - 20 - this.fy0) * e;
    this.feather.setPosition(x, y).setAlpha(Math.min(1, k * 4)).setRotation(Math.sin(k * Math.PI * 3) * 0.6);
    this.featherGlow.setPosition(x, y).setAlpha(0.8 * Math.min(1, k * 4)).setScale(1.4 + 0.3 * Math.sin(this.featherT / 90));
    if (k >= 1) {
      this.featherT = -1;
      this.feather.setVisible(false);
      this.featherGlow.setVisible(false);
      services.audio.play('featherChime');
      this.host.onFeatherLanded(bow.x, bow.y);
    }
  }
}
