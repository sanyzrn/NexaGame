import Phaser from 'phaser';
import { DEPTH, DESIGN_H, DESIGN_W } from '../config/display';
import type { MoodDef } from '../data/moods';
import { weatherStrength, type WeatherDef } from '../data/weather';
import { services } from '../services';
import { vGradientTex } from '../ui/kit';

/** A particle texture drawn once per game (rain streak, snowflake, leaf). */
function particleTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): string {
  if (scene.textures.exists(key)) return key;
  const t = scene.textures.createCanvas(key, w, h);
  if (!t) return 'fx_spark';
  draw(t.getContext());
  t.refresh();
  return key;
}

export interface SkyHooks {
  /** A lightning bolt struck the ground here (weather `strikes`): damage what stands there. */
  onStrike(x: number, y: number): void;
  /** Where a bolt should land (an enemy's position), or null for a random spot. */
  strikeTarget(): { x: number; y: number } | null;
}

/**
 * The sky over the arena: the run's mood (time of day / season — grade, darkness, ambient life,
 * firelight at night) and the weather that rolls in mid-run (rain, storm, sandstorm, snow, fog,
 * thunder). Everything sits over the world but under arrows, the aim line and the UI, so even a
 * storm that hides the whole field leaves the dotted aim line to trust.
 */
export class Sky {
  private readonly veil: Phaser.GameObjects.Rectangle;
  private readonly flash: Phaser.GameObjects.Rectangle;
  private readonly bolt: Phaser.GameObjects.Graphics;
  private readonly fireGlows: Phaser.GameObjects.Image[] = [];
  private fall: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private weather: WeatherDef | null = null;
  private wt = 0;
  private nextBolt = 0;
  private revealLeft = 0;
  private t = 0;

  constructor(private readonly scene: Phaser.Scene, readonly mood: MoodDef, flames: readonly { x: number; y: number }[], private readonly hooks: SkyHooks, paintedBg: boolean) {
    const g = mood.grade;
    // A painted mood background already carries its light: the runtime grade is only a whisper.
    if (g) {
      scene.add.image(-40, -40, vGradientTex(scene, `ui_grad_mood_${mood.id}`, g.top, g.mid, g.bottom))
        .setOrigin(0).setDisplaySize(DESIGN_W + 80, DESIGN_H + 80).setBlendMode(Phaser.BlendModes.MULTIPLY)
        .setDepth(DEPTH.grade + 1).setAlpha(paintedBg ? g.alpha * 0.25 : g.alpha);
    }
    scene.add.rectangle(0, 0, DESIGN_W, DESIGN_H, 0x02040c, paintedBg ? mood.darkness * 0.3 : mood.darkness)
      .setOrigin(0).setDepth(DEPTH.grade + 2);
    if (mood.wash) {
      scene.add.rectangle(0, 0, DESIGN_W, DESIGN_H, mood.wash.color, 1).setOrigin(0).setDepth(DEPTH.grade + 2)
        .setBlendMode(Phaser.BlendModes.SCREEN).setAlpha(paintedBg ? mood.wash.alpha * 0.3 : mood.wash.alpha);
    }
    // Firelight: at night the braziers become the arena's lamps.
    if (mood.fireGlow > 1.05) {
      for (const f of flames) {
        const glow = scene.add.image(f.x, f.y - 20, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff9a3a)
          .setDepth(DEPTH.grade + 3).setScale(2.2 * mood.fireGlow).setAlpha(0.22 * mood.fireGlow);
        this.fireGlows.push(glow);
      }
    }
    // Pre-filled: the snow is already falling (fireflies already out) when the arena appears.
    this.makeAmbient(mood)?.fastForward(6000);
    // Fill is opaque; the veil's strength is its alpha (a zero fill alpha would multiply it away).
    this.veil = scene.add.rectangle(0, 0, DESIGN_W, DESIGN_H, 0x000000, 1).setOrigin(0).setDepth(DEPTH.grade + 5).setAlpha(0);
    this.flash = scene.add.rectangle(0, 0, DESIGN_W, DESIGN_H, 0xeef2ff, 1).setAlpha(0).setOrigin(0).setDepth(DEPTH.flash - 2)
      .setBlendMode(Phaser.BlendModes.ADD).setScrollFactor(0);
    this.bolt = scene.add.graphics().setDepth(DEPTH.fx + 5).setBlendMode(Phaser.BlendModes.ADD);
  }

  /** The weather now, and how strong it is (0..1), for gameplay effects. */
  get current(): { def: WeatherDef; strength: number } | null {
    return this.weather ? { def: this.weather, strength: weatherStrength(this.wt, this.weather.ms) } : null;
  }

  begin(w: WeatherDef): void {
    this.end();
    this.weather = w;
    this.wt = 0;
    this.nextBolt = w.lightningMs ? 1600 : Infinity;
    this.veil.setFillStyle(w.veil, 1).setAlpha(0);
    this.fall = this.makeFall(w);
    services.audio.play(w.id === 'thunder' || w.id === 'storm' ? 'shockwave' : 'whoosh');
  }

  end(): void {
    this.weather = null;
    this.veil.setAlpha(0);
    if (this.fall) {
      const f = this.fall;
      f.stop();
      this.scene.time.delayedCall(2500, () => f.destroy());
      this.fall = null;
    }
  }

  update(dt: number): void {
    this.t += dt;
    // Firelight flickers.
    for (let i = 0; i < this.fireGlows.length; i++) {
      const base = 0.22 * this.mood.fireGlow;
      this.fireGlows[i].setAlpha(base * (0.85 + 0.15 * Math.sin(this.t / 90 + i * 1.7) + 0.08 * Math.sin(this.t / 37 + i)));
    }
    const w = this.weather;
    if (!w) return;
    this.wt += dt;
    const k = weatherStrength(this.wt, w.ms);
    if (this.wt >= w.ms) {
      this.end();
      return;
    }
    // Lightning: the veil tears open for a moment, a bolt forks down, thunder follows.
    this.revealLeft = Math.max(0, this.revealLeft - dt);
    const reveal = this.revealLeft > 0 ? this.revealLeft / 260 : 0;
    this.veil.setAlpha(w.hide * k * (1 - 0.85 * reveal));
    if (w.lightningMs && k > 0.4) {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) {
        this.nextBolt = w.lightningMs[0] + Math.random() * (w.lightningMs[1] - w.lightningMs[0]);
        this.lightning(w.strikes);
      }
    }
    if (this.fall) this.fall.setAlpha(Math.min(1, k * 1.4));
    this.bolt.setAlpha(Math.max(0, this.bolt.alpha - dt / 220));
  }

  private lightning(strike: boolean): void {
    const target = strike ? this.hooks.strikeTarget() : null;
    const x1 = target?.x ?? 200 + Math.random() * 680;
    const y1 = target?.y ?? 500 + Math.random() * 700;
    this.revealLeft = 260;
    this.flash.setAlpha(0.55);
    this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: 320, ease: 'Cubic.easeOut' });
    // A jagged fork from the sky to the strike point.
    const g = this.bolt.clear().setAlpha(1);
    const drawFork = (width: number, color: number, alpha: number) => {
      g.lineStyle(width, color, alpha).beginPath();
      let x = x1 + (Math.random() - 0.5) * 200;
      let y = -20;
      g.moveTo(x, y);
      const steps = 9;
      for (let i = 1; i <= steps; i++) {
        const k = i / steps;
        x = x + (x1 - x) * (1 / (steps - i + 1)) + (i < steps ? (Math.random() - 0.5) * 70 : 0);
        y = -20 + (y1 + 20) * k;
        g.lineTo(x, y);
      }
      g.strokePath();
    };
    drawFork(18, 0x8aa8ff, 0.35);
    drawFork(6, 0xffffff, 1);
    services.audio.play('boom', 0.7);
    services.haptics.play('medium');
    this.scene.cameras.main.shake(180, 0.004);
    if (strike) this.hooks.onStrike(x1, y1);
  }

  private makeAmbient(mood: MoodDef): Phaser.GameObjects.Particles.ParticleEmitter | null {
    const s = this.scene;
    const n = (x: number) => 1000 / services.settings.count(x);
    switch (mood.ambience) {
      case 'fireflies':
        return s.add.particles(0, 0, 'fx_spark', {
          x: { min: 140, max: 940 }, y: { min: 380, max: 1500 }, lifespan: { min: 2400, max: 4200 },
          speedX: { min: -18, max: 18 }, speedY: { min: -22, max: 6 }, scale: { start: 0.5, end: 0.1 },
          alpha: { start: 0, end: 1, ease: (v: number) => Math.sin(v * Math.PI) }, tint: [0xd8ff7a, 0xfff08a],
          blendMode: 'ADD', frequency: n(5), maxParticles: 40,
        }).setDepth(DEPTH.motes);
      case 'snow':
        return s.add.particles(0, 0, this.flakeTex(), {
          x: { min: -40, max: DESIGN_W + 40 }, y: -20, lifespan: 9000, speedY: { min: 50, max: 110 }, speedX: { min: -25, max: 25 },
          scale: { min: 0.4, max: 1 }, alpha: { min: 0.5, max: 0.9 }, frequency: n(16), maxParticles: 150,
        }).setDepth(DEPTH.motes);
      case 'leaves':
        return s.add.particles(0, 0, this.leafTex(), {
          x: { min: -40, max: DESIGN_W }, y: { min: -40, max: 900 }, lifespan: 7000, speedX: { min: 40, max: 120 }, speedY: { min: 50, max: 110 },
          rotate: { start: 0, end: 720 }, scale: { min: 0.6, max: 1.1 }, tint: [0xe08a2a, 0xc8502a, 0xf0c050],
          alpha: { start: 0.95, end: 0.3 }, frequency: n(2.5), maxParticles: 30,
        }).setDepth(DEPTH.motes);
      case 'mist':
        return s.add.particles(0, 0, 'fx_glow', {
          x: { min: 0, max: DESIGN_W }, y: { min: 400, max: 1600 }, lifespan: 8000, speedX: { min: 8, max: 26 },
          scale: { start: 5, end: 8 }, alpha: { start: 0, end: 1, ease: (v: number) => 0.12 * Math.sin(v * Math.PI) }, tint: 0xffffff,
          frequency: n(1.2), maxParticles: 14,
        }).setDepth(DEPTH.grade + 4);
      default:
        return null;
    }
  }

  private makeFall(w: WeatherDef): Phaser.GameObjects.Particles.ParticleEmitter | null {
    const s = this.scene;
    const n = (x: number) => 1000 / services.settings.count(x);
    switch (w.id) {
      case 'rain':
      case 'storm':
        return s.add.particles(0, 0, this.rainTex(), {
          x: { min: -200, max: DESIGN_W + 100 }, y: -60, lifespan: 900, speedY: { min: 2200, max: 2800 },
          speedX: w.id === 'storm' ? { min: 500, max: 700 } : { min: 150, max: 220 },
          rotate: w.id === 'storm' ? -14 : -4, alpha: { start: 0.55, end: 0.2 }, scale: { min: 0.7, max: 1.2 },
          frequency: n(w.id === 'storm' ? 220 : 140), maxParticles: 260,
        }).setDepth(DEPTH.grade + 6).setAlpha(0);
      case 'sandstorm':
        return s.add.particles(0, 0, 'fx_smoke', {
          x: -120, y: { min: 0, max: DESIGN_H }, lifespan: 2600, speedX: { min: 700, max: 1100 }, speedY: { min: -60, max: 60 },
          scale: { start: 1.6, end: 3.4 }, alpha: { start: 0.45, end: 0 }, tint: [0xc8a060, 0xa88048, 0xe0c080],
          frequency: n(40), maxParticles: 120,
        }).setDepth(DEPTH.grade + 6).setAlpha(0);
      case 'snow':
        return s.add.particles(0, 0, this.flakeTex(), {
          x: { min: -100, max: DESIGN_W + 100 }, y: -20, lifespan: 5200, speedY: { min: 220, max: 380 }, speedX: { min: -80, max: 40 },
          scale: { min: 0.6, max: 1.6 }, alpha: { min: 0.6, max: 1 }, frequency: n(70), maxParticles: 260,
        }).setDepth(DEPTH.grade + 6).setAlpha(0);
      case 'fog':
        return s.add.particles(0, 0, 'fx_glow', {
          x: { min: -300, max: DESIGN_W }, y: { min: 300, max: 1700 }, lifespan: 7000, speedX: { min: 40, max: 90 },
          scale: { start: 7, end: 11 }, alpha: { start: 0, end: 1, ease: (v: number) => 0.3 * Math.sin(v * Math.PI) }, tint: 0xe8ecf4,
          frequency: n(4), maxParticles: 30,
        }).setDepth(DEPTH.grade + 6).setAlpha(0);
      default:
        return null;
    }
  }

  private rainTex(): string {
    return particleTex(this.scene, 'fx_rain', 6, 64, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, 'rgba(200,215,255,0)');
      g.addColorStop(1, 'rgba(220,230,255,0.9)');
      ctx.fillStyle = g;
      ctx.fillRect(2, 0, 2, 64);
    });
  }

  private flakeTex(): string {
    return particleTex(this.scene, 'fx_flake', 16, 16, (ctx) => {
      const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.5, 'rgba(240,246,255,0.8)');
      g.addColorStop(1, 'rgba(240,246,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 16, 16);
    });
  }

  private leafTex(): string {
    return particleTex(this.scene, 'fx_leaf', 22, 14, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(11, 7, 10, 5, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.moveTo(2, 9);
      ctx.lineTo(20, 5);
      ctx.stroke();
    });
  }
}
