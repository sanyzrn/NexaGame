import Phaser from 'phaser';
import { Art } from '../assets/Art';
import { DEPTH, DESIGN_H, DESIGN_W } from '../config/display';
import { FEEL } from '../config/feel';
import { ARENA } from '../data/arena';
import { services } from '../services';
import type { TimeCtl } from '../systems/TimeCtl';

/**
 * Background, golden-hour grade, vignette, light shafts and floating dust motes. All code-side,
 * so it works the same over placeholders and real art.
 *
 * The background is drawn by a tiny shader that makes foliage-coloured pixels (yellow-green hues —
 * the trees and bushes painted into the art) outside the floor and the platform sway very slightly.
 * On Canvas it falls back to a plain image.
 *
 * Story beats drive it too: darkening, desaturating the world, a barrel-distortion shockwave, a wind
 * gust, and the final flood of golden light with bloom. Shader FX (colour matrix, barrel, bloom) run
 * only in WebGL with full effects; "light effects" falls back to plain overlays.
 */
export class Atmosphere {
  private readonly shafts: Phaser.GameObjects.Image[] = [];
  private readonly shaftPhase: number[] = [];
  private readonly shaftPeriod: number[] = [];
  private readonly motes: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly gradeMul: Phaser.GameObjects.Image;
  private readonly gradeAdd: Phaser.GameObjects.Image;
  private readonly dark: Phaser.GameObjects.Rectangle;
  private readonly gold: Phaser.GameObjects.Rectangle;
  /** The omen of the day: a coloured grade over the world for the whole run (null = none). */
  private omen: Phaser.GameObjects.Image | null = null;
  private backdrop: Phaser.GameObjects.Shader | null = null;
  private colorMatrix: Phaser.FX.ColorMatrix | null = null;
  private bloom: Phaser.FX.Bloom | null = null;
  private readonly fxLevel = { desat: 0, gust: 0 };
  private shaftBoost = 1;
  private t = 0;

  constructor(private readonly scene: Phaser.Scene, time: TimeCtl) {
    this.addBackdrop();

    // Oversized by a margin so camera shake never reveals an ungraded strip at the edges.
    const m = 24;
    const cover = (key: string, blend: Phaser.BlendModes, depth: number) =>
      scene.add.image(-m, -m, key).setOrigin(0).setDisplaySize(DESIGN_W + m * 2, DESIGN_H + m * 2)
        .setBlendMode(blend).setDepth(depth).setScrollFactor(0);
    this.gradeMul = cover('fx_grade_mul', Phaser.BlendModes.MULTIPLY, DEPTH.grade);
    this.gradeAdd = cover('fx_grade_add', Phaser.BlendModes.ADD, DEPTH.grade + 1);
    this.dark = scene.add.rectangle(-m, -m, DESIGN_W + m * 2, DESIGN_H + m * 2, 0x05030a, 1).setOrigin(0)
      .setScrollFactor(0).setDepth(DEPTH.grade + 2).setAlpha(0);
    this.gold = scene.add.rectangle(-m, -m, DESIGN_W + m * 2, DESIGN_H + m * 2, 0xffc860, 1).setOrigin(0)
      .setScrollFactor(0).setDepth(DEPTH.grade + 3).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);

    // Light shafts from the sun corner, fanning across the arena.
    const S = FEEL.light.shafts;
    const left = FEEL.light.sunSide === 'left';
    for (let i = 0; i < S.count; i++) {
      const k = S.count > 1 ? i / (S.count - 1) : 0.5;
      const x = left ? -60 + k * 520 : DESIGN_W + 60 - k * 520;
      const angle = (left ? -1 : 1) * Phaser.Math.DegToRad(S.angleDeg + k * 10);
      const img = scene.add.image(x, -80, 'fx_shaft').setOrigin(0.5, 0).setRotation(angle)
        .setDisplaySize(S.width * (0.8 + 0.4 * ((i * 7) % 3) / 2), S.length).setTint(S.color)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.shafts).setAlpha(0);
      this.shafts.push(img);
      this.shaftPhase.push(i * 2.1);
      this.shaftPeriod.push(Phaser.Math.Linear(S.periodMs[0], S.periodMs[1], ((i * 5) % 7) / 6));
    }

    // Dust motes / embers drifting in the warm light.
    const M = FEEL.motes;
    const lifeAvg = (M.lifeMs[0] + M.lifeMs[1]) / 2;
    this.motes = time.track(scene.add.particles(0, 0, 'fx_glow', {
      x: { min: 0, max: DESIGN_W },
      y: { min: 0, max: DESIGN_H },
      lifespan: { min: M.lifeMs[0], max: M.lifeMs[1] },
      speed: { min: M.speed[0], max: M.speed[1] },
      angle: left ? { min: -60, max: 40 } : { min: 140, max: 240 },
      scale: { min: M.scale[0], max: M.scale[1] },
      tint: [...M.colors],
      alpha: {
        onEmit: () => 0,
        // Fade in and out over the life, with a slow twinkle.
        onUpdate: (p, _key, t) => Math.sin(t * Math.PI) * M.alpha * (0.65 + 0.35 * Math.sin(p.lifeCurrent / 380)),
      },
      blendMode: 'ADD',
      frequency: lifeAvg / M.count,
      maxParticles: M.count,
      advance: lifeAvg,
    }).setDepth(DEPTH.motes));

    this.applyQuality(services.settings.reducedEffects);
    const off = services.settings.onReducedChange.add(({ on }) => this.applyQuality(on));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  /**
   * The omen of the day: a soft colour grade multiplied over the arena (created from a vertical
   * gradient texture key, e.g. built with kit.vGradientTex). Alpha 0 clears it.
   */
  applyOmen(texKey: string | null, alpha: number, ms = 600): void {
    if (!texKey || alpha <= 0) {
      if (this.omen) this.scene.tweens.add({ targets: this.omen, alpha: 0, duration: ms, onComplete: () => this.omen?.setVisible(false) });
      return;
    }
    if (!this.omen) {
      const m = 24;
      this.omen = this.scene.add.image(-m, -m, texKey).setOrigin(0)
        .setDisplaySize(DESIGN_W + m * 2, DESIGN_H + m * 2)
        .setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(DEPTH.grade + 1.5).setScrollFactor(0).setAlpha(0);
    } else {
      this.omen.setTexture(texKey);
    }
    this.omen.setVisible(true);
    this.scene.tweens.killTweensOf(this.omen);
    this.scene.tweens.add({ targets: this.omen, alpha, duration: ms, ease: 'Sine.easeInOut' });
  }

  update(realMs: number): void {
    this.t += realMs;
    const A = FEEL.light.shafts.alpha;
    for (let i = 0; i < this.shafts.length; i++) {
      const s = this.shafts[i];
      if (!s.visible) continue;
      const p = 0.5 + 0.5 * Math.sin(this.shaftPhase[i] + (this.t / this.shaftPeriod[i]) * Math.PI * 2);
      s.setAlpha((A[0] + (A[1] - A[0]) * p) * this.shaftBoost);
    }
    if (this.colorMatrix) {
      this.colorMatrix.reset();
      this.colorMatrix.saturate(-this.fxLevel.desat);
    }
    if (this.backdrop) this.backdrop.setUniform('uAmp.value', ((FEEL.foliage.ampPx * (1 + this.fxLevel.gust * 4)) / DESIGN_W));
  }

  /** Shader FX allowed right now (WebGL, full effects). */
  get fxAllowed(): boolean {
    return FEEL.shaderFx && this.scene.game.renderer.type === Phaser.WEBGL && !services.settings.reducedEffects;
  }

  /** Darken the whole world (story beats: the boss rising, the finisher). */
  darken(alpha: number, ms: number): void {
    this.scene.tweens.killTweensOf(this.dark);
    this.scene.tweens.add({ targets: this.dark, alpha, duration: ms, ease: 'Sine.easeInOut' });
  }

  /** Drain the colour from the world (0..1). Falls back to darkening without shader FX. */
  desaturate(amount: number, ms: number): void {
    const cam = this.scene.cameras.main;
    if (this.fxAllowed && !this.colorMatrix && amount > 0) this.colorMatrix = cam.postFX.addColorMatrix();
    this.scene.tweens.killTweensOf(this.fxLevel);
    this.scene.tweens.add({
      targets: this.fxLevel, desat: amount, duration: ms, ease: 'Sine.easeInOut',
      onComplete: () => {
        if (amount === 0 && this.colorMatrix) {
          cam.postFX.remove(this.colorMatrix as unknown as Phaser.FX.Controller);
          this.colorMatrix = null;
        }
      },
    });
  }

  /** A radial shockwave: the screen bulges and snaps back. */
  shockwave(strength: number, ms: number): void {
    if (!this.fxAllowed) return;
    const cam = this.scene.cameras.main;
    const barrel = cam.postFX.addBarrel(1);
    this.scene.tweens.add({
      targets: barrel, amount: 1 + 0.12 * strength, duration: ms * 0.25, ease: 'Expo.easeOut', yoyo: true,
      hold: 20, onComplete: () => cam.postFX.remove(barrel),
    });
  }

  /** Wind: the painted foliage and the dust motes stir. */
  gust(ms: number): void {
    this.scene.tweens.add({ targets: this.fxLevel, gust: 1, duration: ms * 0.3, ease: 'Sine.easeOut', yoyo: true, hold: ms * 0.4 });
    this.motes.speedX = { min: 80, max: 180 } as never;
    this.scene.time.delayedCall(ms, () => { this.motes.speedX = { min: -10, max: 20 } as never; });
  }

  /** The finale: golden light floods the arena and the grade shifts from dusk to bright gold. */
  flood(ms: number): void {
    const tw = this.scene.tweens;
    tw.add({ targets: this.dark, alpha: 0, duration: ms * 0.3 });
    tw.add({ targets: this.gradeMul, alpha: 0.25, duration: ms, ease: 'Sine.easeOut' });
    tw.add({ targets: this.gold, alpha: { from: 0.55, to: 0.12 }, duration: ms, ease: 'Cubic.easeOut' });
    tw.add({ targets: this, shaftBoost: 2.4, duration: ms, ease: 'Sine.easeOut' });
    this.gradeAdd.setAlpha(1);
    if (this.fxAllowed) {
      this.bloom = this.scene.cameras.main.postFX.addBloom(0xffffff, 1, 1, 1, 0, 4);
      tw.add({ targets: this.bloom, strength: { from: 2.2, to: 0.9 }, duration: ms, ease: 'Cubic.easeOut' });
    }
  }

  private applyQuality(reduced: boolean): void {
    for (const s of this.shafts) s.setVisible(!reduced);
    const n = services.settings.count(FEEL.motes.count);
    const lifeAvg = (FEEL.motes.lifeMs[0] + FEEL.motes.lifeMs[1]) / 2;
    this.motes.maxParticles = n;
    this.motes.frequency = lifeAvg / n;
  }

  private addBackdrop(): void {
    const scene = this.scene;
    const ref = Art.ref('bg_arena_01');
    const webgl = scene.game.renderer.type === Phaser.WEBGL;
    if (!webgl || ref.frame !== undefined) {
      Art.image(scene, 0, 0, 'bg_arena_01').setDepth(DEPTH.bg);
      return;
    }
    const w = ARENA.walls;
    const pl = ARENA.platform;
    const shader = new Phaser.Display.BaseShader('foliage', FOLIAGE_FRAG, undefined, {
      uAmp: { type: '1f', value: FEEL.foliage.ampPx / DESIGN_W },
      uSpeed: { type: '1f', value: FEEL.foliage.speed },
      // Never sway: the floor rectangle (left, top, right, bottom) and the platform ellipse, as 0..1 of the screen.
      uFloor: { type: '4f', value: { x: w.left / DESIGN_W, y: w.top / DESIGN_H, z: w.right / DESIGN_W, w: ARENA.attackY / DESIGN_H } },
      uPlat: { type: '4f', value: { x: pl.x / DESIGN_W, y: pl.y / DESIGN_H, z: (pl.r * 1.15) / DESIGN_W, w: (pl.r * 0.75) / DESIGN_H } },
    });
    this.backdrop = scene.add.shader(shader, 0, 0, DESIGN_W, DESIGN_H)
      .setOrigin(0)
      .setChannel0(ref.texture, { wrapS: 'clamp_to_edge', wrapT: 'clamp_to_edge' } as never)
      .setDepth(DEPTH.bg);
  }
}

const FOLIAGE_FRAG = `
precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform sampler2D iChannel0;
uniform float uAmp;
uniform float uSpeed;
uniform vec4 uFloor;
uniform vec4 uPlat;
varying vec2 fragCoord;

// Foliage in this golden-hour art is warm (olive, yellow-green): pick it by hue, not by "g > r".
// Stone and sand sit at 20-40 degrees, leaves at 45+; grey and very bright pixels (gold lines) are skipped.
float foliage(vec3 c) {
  float mx = max(c.r, max(c.g, c.b));
  float mn = min(c.r, min(c.g, c.b));
  float d = mx - mn;
  if (d < 0.04) return 0.0;
  float h;
  if (mx == c.r) h = (c.g - c.b) / d;
  else if (mx == c.g) h = 2.0 + (c.b - c.r) / d;
  else h = 4.0 + (c.r - c.g) / d;
  h *= 60.0;
  if (h < 0.0) h += 360.0;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  return smoothstep(40.0, 50.0, h) * (1.0 - smoothstep(110.0, 140.0, h))
    * smoothstep(0.2, 0.35, d / mx) * (1.0 - smoothstep(0.6, 0.72, lum));
}

void main() {
  vec2 uv = vec2(fragCoord.x / resolution.x, 1.0 - fragCoord.y / resolution.y);
  vec4 base = texture2D(iChannel0, uv);
  // Only outside the floor rectangle (soft edge), where the art has its trees and bushes.
  float inX = smoothstep(uFloor.x - 0.01, uFloor.x + 0.03, uv.x) * (1.0 - smoothstep(uFloor.z - 0.03, uFloor.z + 0.01, uv.x));
  float inY = smoothstep(uFloor.y - 0.01, uFloor.y + 0.02, uv.y) * (1.0 - smoothstep(uFloor.w - 0.02, uFloor.w + 0.02, uv.y));
  vec2 pd = (uv - uPlat.xy) / uPlat.zw;
  float outside = (1.0 - inX * inY) * smoothstep(0.9, 1.1, length(pd));
  float t = time * uSpeed;
  float wave = sin(t + uv.y * 9.0 + uv.x * 4.0) * 0.65 + sin(t * 1.7 + uv.y * 23.0) * 0.35;
  vec4 moved = texture2D(iChannel0, uv + vec2(wave * uAmp, 0.0));
  float m = outside * max(foliage(base.rgb), foliage(moved.rgb));
  gl_FragColor = vec4(mix(base.rgb, moved.rgb, m), 1.0);
}
`;
