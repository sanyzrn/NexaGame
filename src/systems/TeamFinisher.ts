import Phaser from 'phaser';
import { CALLIGRAPHY_FONT, DESIGN_H, DESIGN_W, FONT_FAMILY } from '../config/display';
import { FEEL } from '../config/feel';
import type { FinisherDef } from '../data/finishers';
import type { TeamMember } from '../config/team';
import { services } from '../services';
import { avatarTex } from '../ui/avatar';
import { gradientText } from '../ui/kit';
import { easeOutBack, easeInOutSine } from '../utils/ease';

/** What the finisher needs from the world. */
export interface FinisherHost {
  /** Ring centre in screen px (the hero's chest; the camera is at rest while charging). */
  ringCenter(): { x: number; y: number };
  /** 0..1 as segments light (the bow can start glowing). */
  onProgress(k: number): void;
  /** Every segment lit: the bow blazes. */
  onReady(): void;
  /** Released: `full` = every segment was lit. The host fires the arrow. */
  onRelease(full: boolean): void;
}

type Phase = 'waiting' | 'holding' | 'ready' | 'done';

interface Spirit {
  c: Phaser.GameObjects.Container;
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  t: number;
  arrived: boolean;
  launched: boolean;
}

/**
 * A team finisher, driven by a FinisherDef: the calligraphic title, a golden ring around the hero
 * split into one segment per group member (the player last), and — while the player HOLDS — each
 * segment lighting as that member's golden spirit flies in from the screen edge, with a heartbeat.
 * Releasing early still fires, weaker. Lives in the HUD scene so the world's desaturation never
 * touches it. Reusable for any boss: give it another def and member list.
 */
export class TeamFinisher {
  private readonly items: Phaser.GameObjects.GameObject[] = [];
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly ringGlow: Phaser.GameObjects.Graphics;
  private readonly prompt: Phaser.GameObjects.Text;
  private readonly title: Phaser.GameObjects.Container;
  private readonly spirits: Spirit[] = [];
  private readonly trail: Phaser.GameObjects.Particles.ParticleEmitter;
  private phase: Phase = 'waiting';
  private holdMs = 0;
  private lit = 0;
  private arrived = 0;
  private pulse = 0;
  private t = 0;
  private ringIn = 0;
  private collapse = -1;
  private pointerId = -1;
  private readonly cx: number;
  private readonly cy: number;
  private readonly onUpdate: (time: number, delta: number) => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly def: FinisherDef,
    private readonly members: readonly TeamMember[],
    private readonly host: FinisherHost,
  ) {
    const c = host.ringCenter();
    this.cx = c.x;
    this.cy = c.y;
    this.ringGlow = this.add(scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(60));
    this.ring = this.add(scene.add.graphics().setDepth(61));
    this.trail = this.add(scene.add.particles(0, 0, 'fx_glow', {
      emitting: false, lifespan: 380, scale: { start: 0.5, end: 0 }, alpha: { start: 0.9, end: 0 },
      tint: [def.color, def.glow], blendMode: 'ADD', maxParticles: 120,
    }).setDepth(62));
    this.title = this.buildTitle();
    this.prompt = this.add(scene.add.text(this.cx, this.cy + FEEL.finisher.ringRadius + 70, def.holdPrompt, {
      fontFamily: FONT_FAMILY, fontSize: '44px', fontStyle: '900', color: '#fff4d0', rtl: true,
      stroke: '#3a2208', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(63).setAlpha(0));
    scene.tweens.add({ targets: this.prompt, alpha: 1, duration: 400, delay: FEEL.finisher.titleMs });
    this.members.forEach((m, i) => this.spirits.push(this.buildSpirit(m, i)));

    this.onUpdate = (_time, delta) => this.update(Math.min(delta, 50));
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.down, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.up, this);
  }

  get segments(): number {
    return this.members.length;
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.onUpdate);
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.down, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.up, this);
    for (const o of this.items) o.destroy();
    for (const s of this.spirits) s.c.destroy();
    this.title.destroy();
  }

  // ---------------------------------------------------------------- input

  private down(p: Phaser.Input.Pointer): void {
    if (this.phase !== 'waiting' || this.ringIn < 0.6) return;
    if (this.scene.input.hitTestPointer(p).length > 0) return;
    this.pointerId = p.id;
    this.phase = 'holding';
    this.prompt.setText(this.def.holdPrompt);
  }

  private up(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId || (this.phase !== 'holding' && this.phase !== 'ready')) return;
    const full = this.phase === 'ready';
    this.phase = 'done';
    this.collapse = 0;
    this.scene.tweens.add({ targets: [this.prompt, this.title], alpha: 0, duration: 250 });
    this.host.onRelease(full);
  }

  // ---------------------------------------------------------------- update

  private update(ms: number): void {
    this.t += ms;
    this.ringIn = Math.min(1, this.ringIn + ms / 500);
    this.pulse = Math.max(0, this.pulse - ms / 380);
    const n = this.segments;

    if (this.phase === 'holding') {
      this.holdMs += ms;
      const want = Math.min(n, Math.floor(this.holdMs / this.def.segmentMs) + 1);
      while (this.lit < want) this.launch(this.lit++);
    }
    for (const s of this.spirits) this.updateSpirit(s, ms);
    if (this.phase === 'holding' && this.arrived >= n) {
      this.phase = 'ready';
      this.prompt.setText(this.def.releasePrompt);
      this.scene.tweens.add({ targets: this.prompt, scale: { from: 1.4, to: 1 }, duration: 400, ease: 'Back.easeOut' });
      this.host.onReady();
    }
    if (this.phase === 'waiting' || this.phase === 'holding') {
      this.prompt.setScale(1 + 0.05 * Math.sin(this.t / 160));
    }
    if (this.collapse >= 0) this.collapse = Math.min(1, this.collapse + ms / 320);
    this.drawRing();
  }

  private drawRing(): void {
    const F = FEEL.finisher;
    const n = this.segments;
    const gap = Phaser.Math.DegToRad(F.segmentGapDeg);
    const intro = easeOutBack(this.ringIn, 1.6);
    const collapse = this.collapse < 0 ? 1 : 1 - easeInOutSine(this.collapse);
    const r = F.ringRadius * intro * collapse * (1 + 0.06 * this.pulse);
    const g = this.ring.clear();
    const glow = this.ringGlow.clear();
    if (r < 2) return;
    const ready = this.phase === 'ready' || this.phase === 'done';
    const spin = this.t / 3000;
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + spin + (i / n) * Math.PI * 2 + gap / 2;
      const a1 = a0 + (Math.PI * 2) / n - gap;
      const on = i < this.arrived;
      g.lineStyle(on ? 16 : 8, on ? this.def.color : 0x6a5020, on ? 1 : 0.55);
      g.beginPath().arc(this.cx, this.cy, r, a0, a1).strokePath();
      if (on) {
        glow.lineStyle(34 + (ready ? 10 * Math.sin(this.t / 70) : 0), this.def.glow, ready ? 0.55 : 0.35);
        glow.beginPath().arc(this.cx, this.cy, r, a0, a1).strokePath();
      }
    }
    if (ready) glow.lineStyle(6, 0xffffff, 0.6 + 0.4 * Math.sin(this.t / 50)).strokeCircle(this.cx, this.cy, r + 26);
  }

  // ---------------------------------------------------------------- spirits

  private buildSpirit(m: TeamMember, i: number): Spirit {
    const scene = this.scene;
    const key = m.avatar ?? avatarTex(scene, { name: m.name, color: m.color });
    const orb = scene.add.image(0, 0, 'fx_glow').setTint(this.def.color).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2);
    const avatar = scene.add.image(0, 0, key).setDisplaySize(77, 77);
    const name = scene.add.text(0, 52, m.name, {
      fontFamily: FONT_FAMILY, fontSize: '28px', fontStyle: '900', color: '#fff4d0', rtl: true, stroke: '#3a2208', strokeThickness: 6,
    }).setOrigin(0.5);
    const c = scene.add.container(0, 0, [orb, avatar, name]).setDepth(64).setVisible(false);
    // Enter from alternating screen edges.
    const left = i % 2 === 0;
    const x0 = left ? -80 : DESIGN_W + 80;
    const y0 = Phaser.Math.Between(420, 1300);
    return { c, x0, y0, cx: DESIGN_W / 2 + (left ? -260 : 260), cy: Math.min(y0, 700), t: 0, arrived: false, launched: false };
  }

  private launch(i: number): void {
    const s = this.spirits[i];
    s.launched = true;
    s.c.setVisible(true).setPosition(s.x0, s.y0).setAlpha(0).setScale(0.6);
  }

  /** Where segment i sits on the ring. */
  private segmentPoint(i: number): { x: number; y: number } {
    const n = this.segments;
    const a = -Math.PI / 2 + this.t / 3000 + ((i + 0.5) / n) * Math.PI * 2;
    const r = FEEL.finisher.ringRadius + 70;
    return { x: this.cx + Math.cos(a) * r, y: this.cy + Math.sin(a) * r };
  }

  private updateSpirit(s: Spirit, ms: number): void {
    if (!s.launched) return;
    const i = this.spirits.indexOf(s);
    const end = this.segmentPoint(i);
    if (this.collapse >= 0) {
      // Everyone pours into the bow.
      const k = easeInOutSine(this.collapse);
      s.c.setPosition(end.x + (this.cx - end.x) * k, end.y + (this.cy - 130 - end.y) * k).setScale(0.8 * (1 - k)).setAlpha(1 - k * 0.8);
      return;
    }
    if (s.arrived) {
      s.c.setPosition(end.x, end.y + Math.sin(this.t / 300 + i) * 6).setScale(0.8 + 0.08 * this.pulse);
      return;
    }
    s.t += ms;
    const k = Math.min(1, s.t / FEEL.finisher.spiritFlyMs);
    const e = easeInOutSine(k);
    // Quadratic bezier: edge → sweeping control point → ring segment.
    const u = 1 - e;
    const x = u * u * s.x0 + 2 * u * e * s.cx + e * e * end.x;
    const y = u * u * s.y0 + 2 * u * e * s.cy + e * e * end.y;
    s.c.setPosition(x, y).setAlpha(Math.min(1, k * 3)).setScale(0.6 + 0.4 * e);
    if (Math.random() < services.settings.count(2) / 2) this.trail.emitParticleAt(x, y, 1);
    if (k >= 1) {
      s.arrived = true;
      this.arrived++;
      this.pulse = 1;
      services.audio.play('heartbeat');
      services.haptics.play(this.arrived >= this.segments ? 'heavy' : 'medium');
      this.trail.explode(services.settings.count(12), end.x, end.y);
      this.host.onProgress(this.arrived / this.segments);
    }
  }

  // ---------------------------------------------------------------- title

  private buildTitle(): Phaser.GameObjects.Container {
    const scene = this.scene;
    const [big, small] = this.def.title.split(' — ');
    const a = gradientText(scene.add.text(0, -40, big, {
      fontFamily: CALLIGRAPHY_FONT, fontSize: '120px', rtl: true, stroke: '#3a1a04', strokeThickness: 6,
      padding: { top: 40, bottom: 60, left: 20, right: 20 },
    }).setOrigin(0.5), ['#fff8d8', '#ffd24a', '#c07a1e']);
    const b = gradientText(scene.add.text(0, 90, small ?? '', {
      fontFamily: CALLIGRAPHY_FONT, fontSize: '64px', rtl: true, stroke: '#3a1a04', strokeThickness: 5,
      padding: { top: 30, bottom: 40, left: 20, right: 20 },
    }).setOrigin(0.5), ['#fffbe8', '#ffe39a', '#e0a040']);
    if (FEEL.shaderFx && scene.game.renderer.type === Phaser.WEBGL && !services.settings.reducedEffects) {
      a.preFX?.addGlow(0xffc040, 4, 0, false, 0.1, 12);
    }
    const c = scene.add.container(DESIGN_W / 2, DESIGN_H * 0.3, [a, b]).setDepth(65).setAlpha(0).setScale(1.3);
    const T = FEEL.finisher.titleMs;
    scene.tweens.add({ targets: c, alpha: 1, scale: 1, duration: T, ease: 'Expo.easeOut' });
    scene.tweens.add({ targets: b, alpha: { from: 0, to: 1 }, y: { from: 120, to: 90 }, duration: T, delay: T * 0.4, ease: 'Cubic.easeOut' });
    return c;
  }

  private add<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.items.push(o);
    return o;
  }
}
