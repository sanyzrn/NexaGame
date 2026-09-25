import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { CALLIGRAPHY_FONT, DEPTH, DESIGN_W, FONT_FAMILY } from '../config/display';
import { FEEL } from '../config/feel';
import type { Enemy } from '../entities/Enemy';
import { services } from '../services';
import type { GroupMember } from '../services/GameService';
import { gradientText } from '../ui/kit';
import type { HitOutcome } from './ProjectileSystem';

export interface VolleyArcher {
  member: GroupMember;
  name: string;
  color: number;
  avatar: string;
}

export interface VolleyHost {
  /** Candidates (alive enemies). */
  enemies(): readonly Enemy[];
  /** An ally arrow struck `e`. */
  onHit(e: Enemy, archer: VolleyArcher, damage: number, outcome: HitOutcome, x: number, y: number): void;
  /** An ally arrow found nothing left to hit and stuck in the floor. */
  onMiss(x: number, y: number): void;
}

interface Shot {
  archer: VolleyArcher;
  on: boolean;
  wait: number;
  t: number;
  x0: number;
  y0: number;
  tx: number;
  ty: number;
  target: Enemy | null;
  arrow: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  carry: number;
}

interface Stand {
  c: Phaser.GameObjects.Container;
  x: number;
}

const ROW_Y = 1862;

/**
 * Surprise: تیرباران هم‌رزمان (the host's volley). A war horn; the teammates who are in the fight rise
 * along the bottom edge behind the hero (their avatars, names and a banner line); one by one each
 * looses an arrow in their school's colour that arcs high over the arena and plunges onto the enemy
 * nearest the hero (downward, so shields don't stop it), their name popping above the hit. Then they
 * sink back. Everything is pooled and built once.
 */
export class Volley {
  private readonly shots: Shot[] = [];
  private readonly stands: Stand[] = [];
  private readonly tags: Phaser.GameObjects.Text[] = [];
  private readonly trail: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly caption: Phaser.GameObjects.Text;
  private t = -1;
  private count = 0;
  private landed = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly host: VolleyHost) {
    const V = FEEL.volley;
    this.trail = scene.add.particles(0, 0, 'fx_glow', {
      emitting: false, lifespan: 300, scale: { start: 0.55, end: 0 }, alpha: { start: 0.9, end: 0 }, blendMode: 'ADD', maxParticles: 160,
    }).setDepth(DEPTH.arrows - 1);
    for (let i = 0; i < V.maxArrows; i++) {
      const arrow = scene.add.image(0, 0, 'arrow').setScale(BALANCE.arrow.scale).setDepth(DEPTH.arrows).setVisible(false);
      const glow = scene.add.image(0, 0, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.arrows - 1).setScale(1.2).setVisible(false);
      this.shots.push({
        archer: null as unknown as VolleyArcher, on: false, wait: 0, t: 0, x0: 0, y0: 0, tx: 0, ty: 0, target: null, arrow, glow, carry: 0,
      });
      const orb = scene.add.image(0, 0, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setScale(2);
      const avatar = scene.add.image(0, 0, 'fx_glow');
      const name = scene.add.text(0, -62, '', {
        fontFamily: FONT_FAMILY, fontSize: '26px', fontStyle: '900', color: '#ffffff', rtl: true, stroke: '#1a0e04', strokeThickness: 5,
      }).setOrigin(0.5);
      this.stands.push({ c: scene.add.container(0, ROW_Y, [orb, avatar, name]).setDepth(DEPTH.aim - 5).setVisible(false), x: 0 });
      this.tags.push(scene.add.text(0, 0, '', {
        fontFamily: FONT_FAMILY, fontSize: '34px', fontStyle: '900', color: '#ffffff', rtl: true, stroke: '#1a0e04', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(DEPTH.numbers).setVisible(false));
    }
    this.caption = gradientText(scene.add.text(DESIGN_W / 2, ROW_Y - 118, 'هم‌رزمان پشتت هستند!', {
      fontFamily: CALLIGRAPHY_FONT, fontSize: '60px', rtl: true, stroke: '#3a1a04', strokeThickness: 5,
      padding: { top: 24, bottom: 36, left: 16, right: 16 },
    }).setOrigin(0.5).setDepth(DEPTH.numbers).setAlpha(0), ['#fffbe8', '#ffe07a', '#d08a20']);
  }

  get active(): boolean {
    return this.t >= 0;
  }

  /** Calls the volley with these teammates (one arrow each, up to FEEL.volley.maxArrows). */
  start(archers: readonly VolleyArcher[]): boolean {
    const V = FEEL.volley;
    if (this.active || archers.length === 0) return false;
    this.count = Math.min(V.maxArrows, archers.length);
    this.t = 0;
    this.landed = 0;
    services.audio.play('horn');
    services.haptics.play('medium');
    // Spread along the bottom edge, leaving the hero's spot in the middle clear.
    const n = this.count;
    for (let i = 0; i < n; i++) {
      const a = archers[i];
      const side = i % 2 === 0 ? 1 : -1;
      const rank = Math.floor(i / 2);
      const x = DESIGN_W / 2 + side * (230 + rank * 120);
      const st = this.stands[i];
      st.x = x;
      const [orb, avatar, name] = st.c.list as [Phaser.GameObjects.Image, Phaser.GameObjects.Image, Phaser.GameObjects.Text];
      orb.setTint(a.color);
      avatar.setTexture(a.avatar).setDisplaySize(84, 84);
      name.setText(a.name).setColor(`#${a.color.toString(16).padStart(6, '0')}`);
      st.c.setPosition(x, ROW_Y + 200).setVisible(true).setAlpha(1).setScale(1);
      this.scene.tweens.add({ targets: st.c, y: ROW_Y, duration: V.riseMs, delay: i * 70, ease: 'Back.easeOut' });

      const s = this.shots[i];
      s.archer = a;
      s.on = true;
      s.wait = V.firstShotMs + i * V.staggerMs;
      s.t = 0;
      s.target = null;
      s.carry = 0;
    }
    this.caption.setAlpha(0).setScale(0.7);
    this.scene.tweens.add({ targets: this.caption, alpha: 1, scale: 1, duration: 500, ease: 'Back.easeOut' });
    return true;
  }

  update(dt: number): void {
    if (!this.active) return;
    const V = FEEL.volley;
    this.t += dt;
    for (let i = 0; i < this.count; i++) this.updateShot(this.shots[i], dt, i);
    if (this.landed >= this.count && this.t > V.firstShotMs + this.count * V.staggerMs + V.flightMs + V.holdMs) this.finish();
  }

  private updateShot(s: Shot, dt: number, i: number): void {
    const V = FEEL.volley;
    if (!s.on) return;
    if (s.wait > 0) {
      s.wait -= dt;
      if (s.wait <= 0) this.loose(s, i);
      return;
    }
    s.t += dt;
    if (s.target && s.target.hittable) {
      s.tx = s.target.hitX;
      s.ty = s.target.hitY;
    }
    const k = Math.min(1, s.t / V.flightMs);
    // Arcs up over the arena, then plunges: a parabola on top of the straight line.
    const x = s.x0 + (s.tx - s.x0) * k;
    const lift = V.arcPx * 4 * k * (1 - k);
    const y = s.y0 + (s.ty - s.y0) * k - lift;
    const dx = (s.tx - s.x0) / V.flightMs;
    const dy = (s.ty - s.y0) / V.flightMs - (V.arcPx * 4 * (1 - 2 * k)) / V.flightMs;
    const prevX = s.arrow.x;
    const prevY = s.arrow.y;
    s.arrow.setPosition(x, y).setRotation(Math.atan2(dy, dx));
    s.glow.setPosition(x, y);
    s.carry = this.trailSeg(prevX, prevY, x, y, s.archer.color, s.carry);
    if (k >= 1) this.land(s, x, y, dx, dy);
  }

  private loose(s: Shot, i: number): void {
    const st = this.stands[i];
    s.x0 = st.x;
    s.y0 = ROW_Y - 20;
    s.target = this.pickTarget(i);
    if (s.target) {
      s.tx = s.target.hitX;
      s.ty = s.target.hitY;
    } else {
      s.tx = st.x + (Math.random() - 0.5) * 300;
      s.ty = 900;
    }
    s.arrow.setPosition(s.x0, s.y0).setTint(0xffffff).setVisible(true);
    s.glow.setPosition(s.x0, s.y0).setTint(s.archer.color).setVisible(true);
    services.audio.play('volley');
    this.scene.tweens.add({ targets: st.c, scale: { from: 1.25, to: 1 }, duration: 260, ease: 'Back.easeOut' });
  }

  /** Nearest to the hero first; each archer takes the next one down the list. */
  private pickTarget(i: number): Enemy | null {
    const list = this.host.enemies().filter((e) => e.alive && e.hittable).sort((a, b) => b.y - a.y);
    return list.length ? list[i % list.length] : null;
  }

  private land(s: Shot, x: number, y: number, dx: number, dy: number): void {
    s.on = false;
    s.arrow.setVisible(false);
    s.glow.setVisible(false);
    this.landed++;
    const e = s.target;
    if (e && e.hittable && Math.hypot(e.hitX - x, e.hitY - y) < e.hitR + 60) {
      const len = Math.hypot(dx, dy) || 1;
      const dmg = FEEL.volley.damage;
      const outcome = e.receiveArrow({ damage: dmg, crit: false, x, y, dirX: dx / len, dirY: Math.abs(dy / len), bounces: 0 });
      this.host.onHit(e, s.archer, dmg, outcome, x, y);
      this.tag(s.archer, x, y - e.hitR - 30);
    } else {
      this.host.onMiss(x, y);
    }
  }

  private tag(a: VolleyArcher, x0: number, y0: number): void {
    const t = this.tags.find((q) => !q.visible) ?? this.tags[0];
    let stack = 0;
    for (const q of this.tags) if (q !== t && q.visible && Math.abs(q.x - x0) < 140 && Math.abs(q.y - y0) < 90) stack++;
    const x = x0 + (stack % 2 ? 1 : -1) * Math.min(1, stack) * 70;
    const y = y0 - stack * 38;
    this.scene.tweens.killTweensOf(t);
    t.setText(a.name).setColor(`#${a.color.toString(16).padStart(6, '0')}`).setPosition(x, y).setVisible(true).setAlpha(1).setScale(0.4);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 700, delay: 420, ease: 'Cubic.easeIn', onComplete: () => t.setVisible(false) });
  }

  private trailSeg(x0: number, y0: number, x1: number, y1: number, color: number, carry: number): number {
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len <= 0 || len > 400) return 0;
    const spacing = services.settings.reducedEffects ? 26 : 16;
    this.trail.setParticleTint(color);
    let d = spacing - carry;
    while (d <= len) {
      const t = d / len;
      this.trail.emitParticleAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 1);
      d += spacing;
    }
    return len - (d - spacing);
  }

  private finish(): void {
    this.t = -1;
    this.scene.tweens.add({ targets: this.caption, alpha: 0, duration: 400 });
    for (let i = 0; i < this.count; i++) {
      const st = this.stands[i];
      this.scene.tweens.add({
        targets: st.c, y: ROW_Y + 200, alpha: 0, duration: 420, delay: i * 50, ease: 'Back.easeIn',
        onComplete: () => st.c.setVisible(false),
      });
    }
  }
}
