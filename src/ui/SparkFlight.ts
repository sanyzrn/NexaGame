import Phaser from 'phaser';
import { FEEL } from '../config/feel';
import { services } from '../services';

type Point = { x: number; y: number };

interface Flight {
  on: boolean;
  img: Phaser.GameObjects.Image;
  core: Phaser.GameObjects.Image;
  t: number;
  x0: number;
  y0: number;
  target: (out: Point) => void;
  color: number;
  onLand: () => void;
}

const POOL = 6;

/**
 * A small glowing spark that flies from a teammate's toast to what their action touched (the group
 * bar, the chain flame) on a gentle arc, leaving a coloured trail, and fires `onLand` when it gets
 * there. Pooled; if the pool is ever exhausted the effect lands at once.
 */
export class SparkFlight {
  private readonly flights: Flight[] = [];
  private readonly trail: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly p: Point = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, depth: number) {
    this.trail = scene.add.particles(0, 0, 'fx_glow', {
      emitting: false, lifespan: 340, scale: { start: 0.5, end: 0 }, alpha: { start: 0.95, end: 0 }, maxParticles: 90,
    }).setDepth(depth);
    for (let i = 0; i < POOL; i++) {
      const img = scene.add.image(0, 0, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setScale(1.1).setDepth(depth + 1).setVisible(false);
      const core = scene.add.image(0, 0, 'fx_star').setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setDepth(depth + 2).setVisible(false);
      this.flights.push({ on: false, img, core, t: 0, x0: 0, y0: 0, target: () => {}, color: 0xffffff, onLand: () => {} });
    }
  }

  fly(x: number, y: number, color: number, target: (out: Point) => void, onLand: () => void): void {
    const f = this.flights.find((q) => !q.on);
    if (!f) {
      onLand();
      return;
    }
    f.on = true;
    f.t = 0;
    f.x0 = x;
    f.y0 = y;
    f.target = target;
    f.color = color;
    f.onLand = onLand;
    f.img.setTint(color).setPosition(x, y).setVisible(true);
    f.core.setPosition(x, y).setVisible(true);
  }

  update(ms: number): void {
    const dur = FEEL.toast.sparkMs;
    for (const f of this.flights) {
      if (!f.on) continue;
      f.t += ms;
      const k = Math.min(1, f.t / dur);
      f.target(this.p);
      const e = k * k * (3 - 2 * k);
      // Arc: bows outward (toward the screen centre) on the way.
      const mx = (f.x0 + this.p.x) / 2 - 140;
      const my = Math.min(f.y0, this.p.y) - 60;
      const u = 1 - e;
      const x = u * u * f.x0 + 2 * u * e * mx + e * e * this.p.x;
      const y = u * u * f.y0 + 2 * u * e * my + e * e * this.p.y;
      f.img.setPosition(x, y).setScale(1.1 + 0.4 * Math.sin(f.t / 40));
      f.core.setPosition(x, y).setRotation(f.t / 90);
      if (Math.random() < services.settings.count(2) / 2) {
        this.trail.setParticleTint(f.color);
        this.trail.emitParticleAt(x, y, 1);
      }
      if (k >= 1) {
        f.on = false;
        f.img.setVisible(false);
        f.core.setVisible(false);
        this.trail.setParticleTint(f.color);
        this.trail.explode(services.settings.count(10), x, y);
        f.onLand();
      }
    }
  }
}
