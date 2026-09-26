import Phaser from 'phaser';
import { CALLIGRAPHY_FONT, DESIGN_H, DESIGN_W, FONT_FAMILY } from '../config/display';
import { loadEraArt } from '../assets/eraSkins';
import type { EraDef } from '../data/eras';
import { services } from '../services';
import { Button } from '../ui/Button';
import { dividerTex, gradientText, vGradientTex } from '../ui/kit';
import { faDigits } from '../utils/fa';

const COUNT_MS = 2600;

function yearLabel(y: number): string {
  return y < 0 ? `${faDigits(String(-y))} پیش از میلاد` : `${faDigits(String(y))} میلادی`;
}

/**
 * سفر در زمان — between two eras. Sand streams upward through the dark, the year counter rolls from
 * the old era to the new one (ticking faster, then slowing into place with a drum), and the new
 * era's name lands in calligraphy with its place, its arrival line, the new foe and the era's rule.
 * «به میدان!» starts the first run of the new era.
 */
export class TimeJumpScene extends Phaser.Scene {
  private from!: EraDef;
  private to!: EraDef;
  private done = false;
  /** The new era's real art, fetched while the years roll. */
  private art: Promise<boolean> = Promise.resolve(true);

  constructor() {
    super('TimeJump');
  }

  create(data: { from: EraDef; to: EraDef }): void {
    this.from = data.from;
    this.to = data.to;
    this.done = false;
    this.art = loadEraArt(this, this.to, 8000);
    const cx = DESIGN_W / 2;
    const tint = this.to.testTint;

    this.add.image(0, 0, vGradientTex(this, 'ui_grad_timejump', '#060a1c', '#12183a', '#2a1a10')).setOrigin(0).setDisplaySize(DESIGN_W, DESIGN_H);
    const glow = this.add.image(cx, DESIGN_H * 0.42, 'fx_glow').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setScale(14, 10).setAlpha(0.18);
    this.tweens.add({ targets: glow, alpha: 0.32, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // The sands of time, rushing upward (fast while the years roll, then a gentle drift).
    const sand = this.add.particles(0, 0, 'fx_spark', {
      x: { min: 0, max: DESIGN_W }, y: DESIGN_H + 20,
      lifespan: 2200, speedY: { min: -1400, max: -700 }, speedX: { min: -40, max: 40 },
      scale: { start: 0.7, end: 0.1 }, alpha: { start: 0.9, end: 0 },
      tint: [0xffd890, 0xffb050, tint], blendMode: 'ADD',
      frequency: 1000 / services.settings.count(90), maxParticles: 200,
    });

    const eraLine = this.add.text(cx, 520, `از عصر ${this.from.name}`, {
      fontFamily: FONT_FAMILY, fontSize: '40px', fontStyle: '900', color: '#b9c3e6', rtl: true,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: eraLine, alpha: 1, duration: 500 });

    const year = gradientText(this.add.text(cx, 700, yearLabel(this.from.yearNum), {
      fontFamily: FONT_FAMILY, fontSize: '96px', fontStyle: '900', rtl: true, stroke: '#1a0e04', strokeThickness: 10,
      padding: { top: 20, bottom: 20, left: 20, right: 20 },
    }).setOrigin(0.5), ['#fffbe0', '#ffe07a', '#e8a030']);

    // Roll the years: an ease-in-out counter, a tick for every visible change of the leading digits.
    const k = { t: 0 };
    let lastShown = '';
    this.tweens.add({
      targets: k, t: 1, duration: COUNT_MS, delay: 500, ease: 'Cubic.easeInOut',
      onUpdate: () => {
        const y = Math.round(this.from.yearNum + (this.to.yearNum - this.from.yearNum) * k.t);
        const label = yearLabel(y === 0 ? 1 : y);
        if (label === lastShown) return;
        lastShown = label;
        year.setText(label);
        if (Math.random() < 0.35) services.audio.play('tick');
      },
      onComplete: () => {
        year.setText(this.to.year);
        services.audio.play('drum');
        services.haptics.play('heavy');
        this.cameras.main.shake(260, 0.006);
        sand.setFrequency(1000 / services.settings.count(18));
        this.tweens.add({ targets: year, scale: { from: 1.25, to: 1 }, duration: 420, ease: 'Back.easeOut' });
        this.tweens.add({ targets: eraLine, alpha: 0, duration: 300 });
        this.reveal();
      },
    });

    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      if (this.done) return;
      // Tap to hurry the counter along.
      this.tweens.timeScale = 3;
    });
  }

  private reveal(): void {
    this.tweens.timeScale = 1;
    const cx = DESIGN_W / 2;
    const to = this.to;
    const name = gradientText(this.add.text(cx, 930, `عصر ${to.name}`, {
      fontFamily: CALLIGRAPHY_FONT, fontSize: '130px', rtl: true, stroke: '#2a1204', strokeThickness: 10,
      padding: { top: 40, bottom: 60, left: 30, right: 30 },
    }).setOrigin(0.5).setAlpha(0).setScale(0.7), ['#fff4e0', '#ffd88a', '#d89a50']);
    const rule = this.add.image(cx, 1060, dividerTex(this, 620)).setScale(0, 1);
    const lines = [
      { text: to.place, size: 44, color: '#fff0c8', y: 1130 },
      { text: `«${to.arrival}»`, size: 34, color: '#f6e7c8', y: 1210 },
      { text: `دشمن تازه: ${to.bossName}`, size: 38, color: '#ff9a7a', y: 1310 },
      { text: `سلاح تو: ${to.weapon}`, size: 34, color: '#b9e0ff', y: 1370 },
      { text: to.rule, size: 30, color: '#ffe8b0', y: 1440 },
    ].map((l, i) => {
      const t = this.add.text(cx, l.y + 20, l.text, {
        fontFamily: FONT_FAMILY, fontSize: `${l.size}px`, fontStyle: '900', color: l.color, rtl: true, stroke: '#0a0610', strokeThickness: 6,
      }).setOrigin(0.5).setAlpha(0);
      if (t.width > DESIGN_W - 100) t.setScale((DESIGN_W - 100) / t.width);
      this.tweens.add({ targets: t, alpha: 1, y: l.y, duration: 420, delay: 500 + i * 220, ease: 'Cubic.easeOut' });
      return t;
    });
    void lines;
    this.tweens.add({ targets: name, alpha: 1, scale: 1, duration: 700, ease: 'Back.easeOut' });
    this.tweens.add({ targets: rule, scaleX: 1, duration: 600, delay: 250, ease: 'Cubic.easeOut' });
    services.audio.play('horn');

    const btn = new Button(this, cx, 1640, 560, 150, 'به میدان!', () => this.go(), 'gold').setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: btn, alpha: 1, scale: 1, duration: 500, delay: 1700, ease: 'Back.easeOut' });
    this.tweens.add({ targets: btn, scale: 1.05, duration: 700, yoyo: true, repeat: -1, delay: 2300, ease: 'Sine.easeInOut' });
  }

  private go(): void {
    if (this.done) return;
    this.done = true;
    services.audio.play('battle');
    this.cameras.main.fadeOut(420, 10, 6, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      void this.art.then(() => this.scene.start('Game', { title: false }));
    });
  }
}
