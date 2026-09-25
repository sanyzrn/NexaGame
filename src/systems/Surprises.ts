import Phaser from 'phaser';
import { CALLIGRAPHY_FONT, DEPTH, DESIGN_W, FONT_FAMILY } from '../config/display';
import { FEEL } from '../config/feel';
import type { Enemy } from '../entities/Enemy';
import type { Hero } from '../entities/Hero';
import { services } from '../services';
import { gradientText } from '../ui/kit';
import type { FX } from './FX';
import type { TimeCtl } from './TimeCtl';

export interface SurpriseHost {
  fx: FX;
  hero: Hero;
  timeCtl: TimeCtl;
  /** The Homa's shadow touched the hero. */
  onHomaBlessing(): void;
}

const LABELS = 4;
/** Big lines sit clear of the wave banner (y 700). */
const BIG_Y = 520;

/**
 * Rare and skill-born moments in the arena (each behind a flag in FEEL.surprises):
 * trick-shot calls with a beat of slow motion, the Homa (bird of fortune) gliding over, the
 * fleeing imp's «!», the flame bow's announcement. Labels are pooled; the Homa is built once.
 */
export class Surprises {
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly homa: Phaser.GameObjects.Image;
  private readonly homaShadow: Phaser.GameObjects.Image;
  private homaT = -1;
  private blessed = false;
  private readonly big: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene, private readonly host: SurpriseHost) {
    for (let i = 0; i < LABELS; i++) {
      this.labels.push(scene.add.text(0, 0, '', {
        fontFamily: FONT_FAMILY, fontSize: '52px', fontStyle: '900', rtl: true, stroke: '#2a1204', strokeThickness: 8,
      }).setOrigin(0.5).setDepth(DEPTH.numbers + 4).setVisible(false));
    }
    this.big = scene.add.text(DESIGN_W / 2, BIG_Y, '', {
      fontFamily: CALLIGRAPHY_FONT, fontSize: '92px', rtl: true, stroke: '#2a1204', strokeThickness: 7,
      padding: { top: 36, bottom: 50, left: 20, right: 20 },
    }).setOrigin(0.5).setDepth(DEPTH.numbers + 6).setScrollFactor(0).setVisible(false);
    this.homa = scene.add.image(0, 0, 'fx_simorgh').setTint(0xffd878).setDepth(DEPTH.fx + 6).setVisible(false);
    this.homaShadow = scene.add.image(0, 0, 'fx_simorgh').setTint(0x1c1006).setAlpha(0.28).setDepth(DEPTH.shadows + 1).setVisible(false);
  }

  get homaFlying(): boolean {
    return this.homaT >= 0;
  }

  update(ms: number): void {
    if (this.homaT >= 0) this.updateHoma(ms);
  }

  // ---------------------------------------------------------------- calls

  /** A floating call at a world point (trick shots, «!»). */
  call(text: string, x: number, y: number, stops: readonly string[] = ['#ffffff', '#ffe27a', '#e09020'], size = 52): void {
    const t = this.labels.find((q) => !q.visible) ?? this.labels[0];
    this.scene.tweens.killTweensOf(t);
    t.setText(text).setFontSize(size).setPosition(Phaser.Math.Clamp(x, 200, DESIGN_W - 200), y).setVisible(true).setAlpha(1).setScale(0.3);
    gradientText(t, stops);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 520, delay: 700, ease: 'Cubic.easeIn', onComplete: () => t.setVisible(false) });
  }

  /** A big calligraphic line across the arena (rare moments). */
  proclaim(text: string, stops: readonly string[] = ['#fffbe8', '#ffe07a', '#d08a20']): void {
    const t = this.big.setText(text).setVisible(true).setAlpha(0).setScale(0.7).setY(BIG_Y);
    gradientText(t, stops);
    this.scene.tweens.killTweensOf(t);
    this.scene.tweens.chain({
      targets: t,
      tweens: [
        { alpha: 1, scale: 1, duration: 420, ease: 'Back.easeOut' },
        { alpha: 0, y: t.y - 50, duration: 500, delay: 1300, ease: 'Cubic.easeIn' },
      ],
      onComplete: () => t.setVisible(false),
    });
  }

  /**
   * A skilful arrow: two kills with one arrow, or a kill after ricochets. Returns true when it
   * was one (the caller rewards it).
   */
  trickShot(kills: number, bounces: number, x: number, y: number): boolean {
    if (!FEEL.surprises.trickShot.enabled || kills < 1) return false;
    const T = FEEL.surprises.trickShot;
    if (kills >= 2) {
      this.call('یک تیر، دو دیو!', x, y - 80, ['#ffffff', '#ffd0a0', '#ff6a3a'], 60);
    } else if (bounces >= 2) {
      this.call('کمانهٔ دوگانه!', x, y - 80, ['#ffffff', '#a0f0ff', '#3a9aff'], 64);
      this.host.timeCtl.slowMo(T.slowMo, T.slowMs);
      this.scene.cameras.main.zoomTo(1.06, 160, 'Sine.easeOut', true);
      this.scene.time.delayedCall(T.slowMs, () => this.scene.cameras.main.zoomTo(1, 300, 'Sine.easeInOut', true));
    } else if (bounces >= 1) {
      this.call('تیر کمانه‌ای!', x, y - 80);
    } else {
      return false;
    }
    services.audio.play('newBest');
    services.haptics.play('medium');
    this.host.fx.sparkles(x, y);
    return true;
  }

  /** A fleeing imp's alarm: a «!» pops over its head. */
  alarm(e: Enemy): void {
    this.call('!', e.hitX, e.hitY - e.hitR - 40, ['#ffffff', '#ffe0a0', '#ff5a3a'], 70);
    services.audio.play('taunt');
  }

  /** Five golden releases in a row. */
  flameBow(): void {
    const h = this.host.hero;
    this.call('کمان آذرین!', h.bowX, h.bowY - 260, ['#fff4d0', '#ffb040', '#e0401a'], 60);
    services.audio.play('chainUp', 3);
    services.haptics.play('medium');
  }

  // ---------------------------------------------------------------- the Homa

  /**
   * هما, the bird of fortune: it glides across the sky over the arena, its shadow sliding along the
   * floor; whoever the Homa's shadow falls on is blessed (in the old stories, made a king).
   */
  flyHoma(): void {
    if (this.homaT >= 0 || !FEEL.surprises.homa.enabled) return;
    this.homaT = 0;
    this.blessed = false;
    const s = FEEL.surprises.homa.scale;
    this.homa.setVisible(true).setScale(s).setAlpha(0);
    this.homaShadow.setVisible(true).setScale(s * 0.9, s * 0.45).setAlpha(0);
    services.audio.play('featherChime');
    this.proclaim('هما!', ['#fffbe8', '#ffe8a0', '#e0a030']);
  }

  private updateHoma(ms: number): void {
    const H = FEEL.surprises.homa;
    this.homaT += ms;
    const k = Math.min(1, this.homaT / H.crossMs);
    // The shadow crosses the floor right over the hero; the bird flies high above it.
    const sx = 1260 - 1440 * k;
    const sy = 1500 + 300 * k;
    const bx = sx + 60;
    const by = sy - 1000 + Math.sin(this.homaT / 500) * 30;
    const fade = Math.min(1, k * 6, (1 - k) * 6);
    const flap = 1 + 0.18 * Math.sin(this.homaT / 110);
    const s = H.scale;
    this.homa.setPosition(bx, by).setScale(s, s * flap).setAlpha(0.95 * fade).setRotation(-0.2);
    this.homaShadow.setPosition(sx, sy).setScale(s * 0.9, s * 0.45 * flap).setAlpha(0.28 * fade);
    if (Math.random() < 0.5) this.host.fx.sparkleAt(bx, by, 120);
    const hero = this.host.hero;
    if (!this.blessed && Math.hypot(sx - hero.x, sy - hero.y) < 130) {
      this.blessed = true;
      this.host.onHomaBlessing();
    }
    if (k >= 1) {
      this.homaT = -1;
      this.homa.setVisible(false);
      this.homaShadow.setVisible(false);
    }
  }
}
