import type Phaser from 'phaser';

/**
 * World time: hit-stop (full freeze) and slow motion. Gameplay systems advance with the
 * returned world dt; tweens and registered particle emitters follow the same scale.
 * Input and UI keep running on real time.
 */
export class TimeCtl {
  scale = 1;
  private stopLeft = 0;
  private slowLeft = 0;
  private slowScale = 1;
  private readonly emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  track(emitter: Phaser.GameObjects.Particles.ParticleEmitter): Phaser.GameObjects.Particles.ParticleEmitter {
    this.emitters.push(emitter);
    return emitter;
  }

  hitStop(ms: number): void {
    this.stopLeft = Math.max(this.stopLeft, ms);
  }

  slowMo(scale: number, ms: number): void {
    this.slowScale = scale;
    this.slowLeft = ms;
  }

  /** Advances timers by real ms; returns world ms for this frame. */
  update(realMs: number): number {
    let s = 1;
    if (this.stopLeft > 0) {
      this.stopLeft -= realMs;
      s = 0;
    } else if (this.slowLeft > 0) {
      this.slowLeft -= realMs;
      s = this.slowScale;
    }
    if (s !== this.scale) {
      this.scale = s;
      this.scene.tweens.timeScale = s;
      for (const e of this.emitters) e.timeScale = s;
    }
    return realMs * s;
  }
}
