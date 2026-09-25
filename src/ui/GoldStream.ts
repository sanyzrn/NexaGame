import Phaser from 'phaser';
import { FEEL } from '../config/feel';
import { services } from '../services';

interface Mote {
  img: Phaser.GameObjects.Image;
  on: boolean;
  wait: number;
  t: number;
  ms: number;
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  /** Group damage this mote delivers (only the lead mote of a stream carries it). */
  payload: number;
  spin: number;
}

/**
 * The visible link between "my shot" and "our goal": golden motes that rise from the hit point in a
 * curving stream and pour into the group bar at its fill edge. The lead mote delivers the damage the
 * moment it lands; the rest land as sparkles. Pooled (FEEL.stream.pool images plus one trail emitter).
 */
export class GoldStream {
  private readonly motes: Mote[] = [];
  private readonly trail: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly tgt = { x: 0, y: 0 };

  constructor(
    scene: Phaser.Scene,
    depth: number,
    /** Where motes land (the bar's fill edge; followed while they fly). */
    private readonly target: (out: { x: number; y: number }) => void,
    private readonly onLand: (payload: number, x: number, y: number) => void,
  ) {
    const S = FEEL.stream;
    this.trail = scene.add.particles(0, 0, 'fx_glow', {
      emitting: false, lifespan: 300, scale: { start: 0.42, end: 0 }, alpha: { start: 0.95, end: 0 },
      tint: [0xffb020, 0xffd24a, 0xffe590], maxParticles: 140,
    }).setDepth(depth);
    for (let i = 0; i < S.pool; i++) {
      // Normal blend: additive light vanishes over the sunlit sand.
      const img = scene.add.image(0, 0, 'fx_star').setTint(0xffc233)
        .setDepth(depth + 1).setVisible(false);
      this.motes.push({ img, on: false, wait: 0, t: 0, ms: 1, x0: 0, y0: 0, cx: 0, cy: 0, payload: 0, spin: 0 });
    }
  }

  /** A stream of `count` motes from (x, y) (HUD px) carrying `payload` group damage. */
  launch(x: number, y: number, count: number, payload: number): void {
    const S = FEEL.stream;
    const n = Math.max(1, services.settings.count(count));
    let lead = true;
    for (let i = 0; i < n; i++) {
      const m = this.motes.find((q) => !q.on);
      if (!m) {
        // Pool exhausted: the damage still has to land.
        if (lead) this.onLand(payload, this.tgtNow().x, this.tgtNow().y);
        return;
      }
      m.on = true;
      m.wait = i * S.staggerMs;
      m.t = 0;
      m.ms = S.flightMs[0] + Math.random() * (S.flightMs[1] - S.flightMs[0]);
      m.x0 = x + (Math.random() - 0.5) * 30;
      m.y0 = y + (Math.random() - 0.5) * 30;
      m.cx = x + (Math.random() - 0.5) * 2 * S.spreadPx;
      m.cy = y - S.liftPx * (0.6 + Math.random() * 0.6);
      m.payload = lead ? payload : 0;
      m.spin = (Math.random() - 0.5) * 12;
      m.img.setVisible(false).setPosition(m.x0, m.y0);
      lead = false;
    }
  }

  update(ms: number): void {
    const S = FEEL.stream;
    const t = this.tgtNow();
    for (const m of this.motes) {
      if (!m.on) continue;
      if (m.wait > 0) {
        m.wait -= ms;
        continue;
      }
      m.t += ms;
      const k = Math.min(1, m.t / m.ms);
      // Drifts up first, then rushes into the bar.
      const e = k * k * (1.6 - 0.6 * k);
      const u = 1 - e;
      const x = u * u * m.x0 + 2 * u * e * m.cx + e * e * t.x;
      const y = u * u * m.y0 + 2 * u * e * m.cy + e * e * t.y;
      const pop = k < 0.12 ? k / 0.12 : 1;
      m.img.setVisible(true).setPosition(x, y).setScale((0.75 - 0.3 * k) * pop).setRotation(m.img.rotation + m.spin * ms / 1000);
      if (Math.random() < S.trailChance) this.trail.emitParticleAt(x, y, 1);
      if (k >= 1) {
        m.on = false;
        m.img.setVisible(false);
        this.onLand(m.payload, t.x, t.y);
      }
    }
  }

  /** Lands everything at once (e.g. before the HUD closes). */
  flush(): void {
    const t = this.tgtNow();
    for (const m of this.motes) {
      if (!m.on) continue;
      m.on = false;
      m.img.setVisible(false);
      if (m.payload) this.onLand(m.payload, t.x, t.y);
    }
  }

  private tgtNow(): { x: number; y: number } {
    this.target(this.tgt);
    return this.tgt;
  }
}
