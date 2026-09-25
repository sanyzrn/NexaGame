import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { COLORS, DEPTH, FONT_FAMILY } from '../config/display';
import { FEEL } from '../config/feel';
import { ENEMIES } from '../data/entities';
import type { Enemy } from '../entities/Enemy';
import { services } from '../services';
import { GhostFinger } from '../ui/GhostFinger';
import { gradientText, parchmentTex } from '../ui/kit';
import type { AimSystem } from './AimSystem';
import type { ArenaCollider } from './ArenaCollider';

type Point = { x: number; y: number };

export interface TutorialHost {
  bow: Point;
  aim: AimSystem;
  collider: ArenaCollider;
  /** The ricochet step's shield-bearer, bursting in at (x, y) (its feet). */
  spawnShield(x: number, y: number): Enemy;
  /** The HUD's «رد کردن» button. */
  showSkip(onSkip: () => void): void;
  hideSkip(): void;
  onDone(skipped: boolean): void;
}

type Step = 'shoot' | 'golden' | 'ricochet' | 'done';

/** Up in the empty part of the arena, clear of the ghost finger and the bow. */
const CAPTION_Y = 470;
const WORDS = ['بکش', 'نگه دار', 'رها کن!'];

/**
 * First play only, hands-on: the waves wait while the player learns by doing.
 * 1. A ghost finger shows drag → hold → release (the words light up in step with it); the step ends
 *    with the player's first real shot.
 * 2. Hold for the golden window: the first time it opens, «حالا!» bursts over the bow; ends on a
 *    golden release (or moves on kindly after a few tries).
 * 3. One shield-bearer; a marching gold path shows a ricochet that reaches it from the side (found by
 *    tracing the real arena, pillars included); ends when it falls.
 * Skippable from the HUD; stored with Settings.markTutorialDone (localStorage, guarded).
 */
export class Tutorial {
  private step: Step = 'shoot';
  private readonly ghost: GhostFinger;
  private readonly caption: Phaser.GameObjects.Container;
  private readonly words: Phaser.GameObjects.Text[] = [];
  private readonly line: Phaser.GameObjects.Text;
  private readonly sub: Phaser.GameObjects.Text;
  private readonly hintG: Phaser.GameObjects.Graphics;
  private readonly offs: (() => void)[] = [];
  private idle = 0;
  private tries = 0;
  private shield: Enemy | null = null;
  private hint: number[] = [];
  private hintAim: Point = { x: 0, y: 0 };
  private hintIn = 0;
  private march = 0;
  private busy = false;
  private readonly pts: number[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly host: TutorialHost) {
    const depth = DEPTH.aim + 20;
    this.hintG = scene.add.graphics().setDepth(DEPTH.aim - 1);
    this.ghost = new GhostFinger(scene, host.bow, depth);

    const paper = scene.add.image(0, 0, parchmentTex(scene, 760, 150));
    WORDS.forEach((w, i) => {
      this.words.push(scene.add.text((1 - i) * 230, -8, w, {
        fontFamily: FONT_FAMILY, fontSize: '46px', fontStyle: '900', color: COLORS.inkCss, rtl: true,
      }).setOrigin(0.5).setAlpha(0.4));
    });
    const dots = [115, -115].map((x) => scene.add.text(x, -8, '·', { fontFamily: FONT_FAMILY, fontSize: '46px', color: '#8a5a1a' }).setOrigin(0.5));
    this.line = scene.add.text(0, -18, '', {
      fontFamily: FONT_FAMILY, fontSize: '36px', fontStyle: '900', color: COLORS.inkCss, rtl: true,
    }).setOrigin(0.5).setVisible(false);
    this.sub = scene.add.text(0, 30, '', {
      fontFamily: FONT_FAMILY, fontSize: '28px', fontStyle: '900', color: '#8a4a06', rtl: true,
    }).setOrigin(0.5).setVisible(false);
    this.caption = scene.add.container(540, CAPTION_Y, [paper, ...this.words, ...dots, this.line, this.sub])
      .setDepth(DEPTH.floorFx + 5).setAlpha(0).setScale(0.85);
    scene.tweens.add({ targets: this.caption, alpha: 1, scale: 1, duration: 420, ease: 'Back.easeOut' });

    const aim = host.aim;
    this.offs.push(aim.onFire.add((e) => this.onFire(e.shot.crit)));
    this.offs.push(aim.onGoldenOpen.add(() => this.onGolden()));
    host.showSkip(() => this.finish(true));
    this.enterShoot();
  }

  get active(): boolean {
    return this.step !== 'done';
  }

  /** Team toasts stay away while the basics are being learned. */
  get quiet(): boolean {
    return this.step === 'shoot' || this.step === 'golden';
  }

  update(ms: number): void {
    if (this.step === 'done') return;
    const aim = this.host.aim;
    if (aim.aiming) this.idle = 0;
    else this.idle += ms;
    const showGhost = !this.busy && !aim.aiming && this.idle >= (this.step === 'shoot' && this.tries === 0 ? 300 : FEEL.tutorial.ghostIdleMs);
    if (this.step === 'ricochet') this.updateRicochet(ms, showGhost);
    else if (showGhost) this.ghost.show(this.step === 'golden' ? { x: 620, y: 800 } : { x: 640, y: 700 }, this.step === 'golden');
    else this.ghost.hide();
    this.ghost.update(ms);
    if (this.step === 'shoot') this.lightWord(aim.aiming ? (aim.charging && aim.state.charge >= 0.3 ? 1 : 0) : this.ghost.beat);
  }

  // ---------------------------------------------------------------- steps

  private enterShoot(): void {
    this.step = 'shoot';
    this.setWords(true);
  }

  private enterGolden(): void {
    this.step = 'golden';
    this.tries = 0;
    this.setWords(false);
    this.say('نگه دار تا کمان طلایی شود…', 'در درخشش طلایی رها کن');
  }

  private enterRicochet(): void {
    this.step = 'ricochet';
    this.say('سپر از روبه‌رو تیر نمی‌خورد!', 'تیر را به دیوار یا ستون بزن تا از پهلو بخورد');
    const spot = this.shieldSpot();
    this.shield = this.host.spawnShield(spot.x, spot.y);
    this.hintIn = 0;
  }

  private onFire(crit: boolean): void {
    if (this.busy) return;
    if (this.step === 'shoot') {
      this.tries++;
      this.praise('آفرین!', () => this.enterGolden());
    } else if (this.step === 'golden') {
      if (crit) {
        this.praise('ضربهٔ طلایی!', () => this.enterRicochet());
        return;
      }
      this.tries++;
      if (this.tries >= FEEL.tutorial.goldenTries) this.praise('کم‌کم دستت می‌آید', () => this.enterRicochet());
      else this.say('کمی صبر… در درخشش طلایی رها کن', `${'●'.repeat(this.tries)}${'○'.repeat(FEEL.tutorial.goldenTries - this.tries)}`);
    }
  }

  /** «حالا!» over the bow while the golden step is on. */
  private onGolden(): void {
    if (this.step !== 'golden' || this.busy) return;
    const b = this.host.bow;
    const now = gradientText(this.scene.add.text(b.x, b.y - 300, 'حالا!', {
      fontFamily: FONT_FAMILY, fontSize: '110px', fontStyle: '900', rtl: true, stroke: '#3a1a04', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(DEPTH.numbers + 5).setScale(0.3), ['#ffffff', '#ffe27a', '#e09020']);
    const ring = this.scene.add.image(b.x, b.y, 'fx_ring').setTint(0xffd24a).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.aim + 5).setScale(0.4);
    this.scene.tweens.add({ targets: now, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: now, alpha: 0, y: now.y - 40, duration: 260, delay: BALANCE.bow.goldenMs, onComplete: () => now.destroy() });
    this.scene.tweens.add({ targets: ring, scale: 3.2, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    services.haptics.play('medium');
  }

  private updateRicochet(ms: number, showGhost: boolean): void {
    const e = this.shield;
    if (!e || !e.alive) {
      this.hintG.clear();
      this.ghost.hide();
      if (!this.busy) this.praise('تو آماده‌ای، پهلوان!', () => this.finish(false), 1.4);
      return;
    }
    this.hintIn -= ms;
    if (this.hintIn <= 0) {
      this.hintIn = 150;
      this.findHint(e);
    }
    this.march = (this.march + ms * 0.12) % 40;
    const g = this.hintG.clear();
    if (this.hint.length >= 6 && !this.host.aim.aiming) {
      const pulse = 0.65 + 0.35 * Math.sin(this.scene.time.now / 220);
      g.fillStyle(0xffd24a, 0.9 * pulse);
      for (let i = 0; i + 3 < this.hint.length; i += 2) {
        const x0 = this.hint[i];
        const y0 = this.hint[i + 1];
        const x1 = this.hint[i + 2];
        const y1 = this.hint[i + 3];
        const len = Math.hypot(x1 - x0, y1 - y0);
        for (let d = this.march; d < len; d += 40) g.fillCircle(x0 + ((x1 - x0) * d) / len, y0 + ((y1 - y0) * d) / len, 7);
      }
      // The bounce point gets a little gold flare.
      g.lineStyle(4, 0xfff0b0, pulse).strokeCircle(this.hint[2], this.hint[3], 16 + 6 * pulse);
    }
    if (showGhost && this.hint.length >= 6) this.ghost.show(this.hintAim);
    else this.ghost.hide();
  }

  /**
   * Searches aim angles for a one-bounce path whose second leg meets the shield-bearer from the side
   * (not head-on) without touching it on the first leg. Uses the same collider as the arrows.
   */
  private findHint(e: Enemy): void {
    this.searchHint(e.hitX, e.hitY, e.hitR, true);
  }

  /**
   * Where the shield-bearer appears: the highest spot (most time to learn) that still has a side-on
   * ricochet past the pillars. It only walks down from there, which keeps a path open.
   */
  private shieldSpot(): Point {
    const hb = ENEMIES.shield.hitbox;
    for (let y = 700; y <= 1100; y += 25) {
      for (const x of [540, 470, 610, 400, 680]) {
        if (this.searchHint(x + hb.x, y + hb.y, hb.r, false)) return { x, y };
      }
    }
    return { x: 540, y: 1000 };
  }

  /** Arriving head-on (up the screen) the shield stops it; the same rule as Enemy.blocks. */
  private static headOn(dirY: number): boolean {
    return -dirY > Math.cos(Phaser.Math.DegToRad(BALANCE.enemies.shield.frontalDeg));
  }

  private searchHint(tx: number, ty: number, tr: number, keep: boolean): boolean {
    const b = this.host.bow;
    const min = BALANCE.bow.minAimAngleDeg;
    let best = Infinity;
    if (keep) this.hint.length = 0;
    for (let deg = min; deg <= 180 - min; deg += 0.5) {
      const a = Phaser.Math.DegToRad(-deg);
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const n = this.host.collider.tracePath(b.x, b.y, dx, dy, 1, 2600, 1600, this.pts);
      if (n !== 1 || this.pts.length < 6) continue;
      const p = this.pts;
      if (segDist(p[0], p[1], p[2], p[3], tx, ty) < tr + 16) continue;
      const d = segDist(p[2], p[3], p[4], p[5], tx, ty);
      if (d > tr * 0.6 || d >= best) continue;
      const lx = p[4] - p[2];
      const ly = p[5] - p[3];
      const ll = Math.hypot(lx, ly) || 1;
      if (Tutorial.headOn(ly / ll)) continue;
      best = d;
      if (!keep) return true;
      // Stop the path at the enemy.
      const t = Math.max(0, Math.min(1, ((tx - p[2]) * lx + (ty - p[3]) * ly) / (ll * ll)));
      this.hint.length = 0;
      this.hint.push(p[0], p[1], p[2], p[3], p[2] + lx * t, p[3] + ly * t);
      this.hintAim.x = b.x + dx * 400;
      this.hintAim.y = b.y + dy * 400;
    }
    return best < Infinity;
  }

  // ---------------------------------------------------------------- captions

  private setWords(on: boolean): void {
    for (const w of this.words) w.setVisible(on);
    for (const o of this.caption.list) if (o instanceof Phaser.GameObjects.Text && o.text === '·') o.setVisible(on);
    this.line.setVisible(!on);
    this.sub.setVisible(!on);
  }

  private lightWord(i: number): void {
    this.words.forEach((w, j) => {
      const on = j === i;
      w.setAlpha(on ? 1 : 0.4).setColor(on ? (j === 2 ? '#b3261e' : '#8a4a06') : COLORS.inkCss).setScale(on ? 1.15 : 1);
    });
  }

  private say(line: string, sub = ''): void {
    this.line.setText(line).setY(sub ? -18 : 0);
    this.sub.setText(sub);
    for (const t of [this.line, this.sub]) t.setScale(t.width > 680 ? 680 / t.width : 1);
    this.scene.tweens.add({ targets: this.caption, scale: { from: 1.06, to: 1 }, duration: 260, ease: 'Back.easeOut' });
  }

  /** Big praise over the caption, then `next`. */
  private praise(text: string, next: () => void, hold = 1): void {
    this.busy = true;
    this.ghost.hide();
    const t = gradientText(this.scene.add.text(540, CAPTION_Y + 170, text, {
      fontFamily: FONT_FAMILY, fontSize: '72px', fontStyle: '900', rtl: true, stroke: '#3a1a04', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(DEPTH.numbers + 5).setScale(0.4));
    services.audio.play('featherChime');
    this.scene.tweens.add({ targets: t, scale: 1, duration: 320, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: t, alpha: 0, y: t.y - 50, duration: 360, delay: FEEL.tutorial.praiseMs * hold, ease: 'Cubic.easeIn',
      onComplete: () => {
        t.destroy();
        this.busy = false;
        if (this.step !== 'done') next();
      },
    });
  }

  private finish(skipped: boolean): void {
    if (this.step === 'done') return;
    this.step = 'done';
    services.settings.markTutorialDone();
    this.host.hideSkip();
    this.offs.forEach((off) => off());
    this.ghost.hide();
    this.hintG.clear();
    this.scene.tweens.add({
      targets: this.caption, alpha: 0, y: CAPTION_Y + 30, scale: 0.9, duration: 420, ease: 'Cubic.easeIn',
      onComplete: () => {
        this.caption.destroy();
        this.ghost.destroy();
        this.hintG.destroy();
      },
    });
    this.host.onDone(skipped);
  }
}

function segDist(x0: number, y0: number, x1: number, y1: number, px: number, py: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2));
  return Math.hypot(x0 + dx * t - px, y0 + dy * t - py);
}
