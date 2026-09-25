import Phaser from 'phaser';
import { Art } from '../assets/Art';
import { BALANCE } from '../config/balance';
import { CALLIGRAPHY_FONT, DESIGN_H, DESIGN_W, FONT_FAMILY } from '../config/display';
import { FEEL } from '../config/feel';
import { services } from '../services';
import { Button, Toggle } from '../ui/Button';
import { UI, bannerTex, barFillTex, dimTex, gradientText, panelTex, ribbonTex, shineTex } from '../ui/kit';
import { faDigits } from '../utils/fa';

const HEART_SCALE = 0.55;
/** Boss bar: the frame art at this width, between the hearts and the pause button. */
const BAR_W = 600;
const BAR_Y = 64;
/** Inner bar of ui_bossbar_frame, in frame-box px relative to its centre (1024 box). */
const BAR_INNER = { x: -372, w: 745, y: 22, h: 38 };
const PLATE_Y = -53;
const BADGE_SCALE = 0.62;
const TOAST_Y = 420;

export interface RunSummary {
  wave: number;
  kills: number;
  bestCombo: number;
}

export interface VictorySummary {
  kills: number;
  bestCombo: number;
  damage: number;
  team: string;
}

const TIPS = [
  'سپردار را از روبه‌رو نمی‌شود زد؛ تیر را به دیوار یا ستون بزن تا از پهلو بخورد.',
  'وقتی کمان طلایی می‌درخشد رها کن: ضربهٔ کاری از دو دیو می‌گذرد.',
  'دیوی که به خط پایین برسد می‌پرد؛ آخرین فرصت همان لحظه است.',
  'پرنده‌ها زیگزاگ می‌روند؛ کمی جلوترِ مسیرشان را نشانه بگیر.',
];

/**
 * HUD layer that runs on top of Game: hearts, combo badge, wave banners, pause button + pause
 * menu (resume, sound, light effects, restart) and the defeat panel. All panel art comes from
 * the code-drawn UI kit. Keeps running while Game is paused.
 */
export class HudScene extends Phaser.Scene {
  private menu!: Phaser.GameObjects.Container;
  private menuDim!: Phaser.GameObjects.Image;
  private menuOpen = false;
  private hearts: Phaser.GameObjects.Image[] = [];
  private heartFull: boolean[] = [];
  private shards!: Phaser.GameObjects.Particles.ParticleEmitter;
  private badge!: Phaser.GameObjects.Container;
  private badgeText!: Phaser.GameObjects.Text;
  private combo = 0;
  private toast!: Phaser.GameObjects.Container;
  private toastBg!: Phaser.GameObjects.Image;
  private toastTitle!: Phaser.GameObjects.Text;
  private toastSub!: Phaser.GameObjects.Text;
  private toastShine!: Phaser.GameObjects.Image;
  private defeat: Phaser.GameObjects.Container | null = null;
  private bar: Phaser.GameObjects.Container | null = null;
  private barFill!: Phaser.GameObjects.Image;
  private barTrail!: Phaser.GameObjects.Image;
  private barArmor!: Phaser.GameObjects.Image;
  private barPct = 1;
  private barShown = 1;
  private barTrailPct = 1;
  private barTrailWait = 0;
  private barFlash = 0;
  private barArmorOn = false;
  private offTg: (() => void)[] = [];

  constructor() {
    super('Hud');
  }

  create(): void {
    const pause = Art.image(this, DESIGN_W - 84, 84, 'ui_btn_pause').setScale(0.6).setInteractive({ useHandCursor: true });
    pause.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => pause.setScale(0.54));
    pause.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => pause.setScale(0.6));
    pause.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      pause.setScale(0.6);
      services.audio.play('ui');
      this.openMenu();
    });

    this.hearts = [];
    this.heartFull = [];
    for (let i = 0; i < BALANCE.hero.hearts; i++) {
      this.hearts.push(Art.image(this, 52 + i * 70, 76, 'ui_heart_full').setScale(HEART_SCALE));
      this.heartFull.push(true);
    }
    this.shards = this.add.particles(0, 0, 'fx_spark', {
      emitting: false, lifespan: { min: 380, max: 650 }, speed: { min: 160, max: 420 }, gravityY: 1100,
      scale: { start: 1.2, end: 0 }, tint: [0xe0312b, 0xff7a6a, 0xffffff], maxParticles: 40,
    }).setDepth(10);

    this.buildBadge();
    this.buildToast();
    this.defeat = null;
    this.bar = null;
    this.menuOpen = false;
    this.buildMenu();

    const onHidden = () => this.openMenu();
    this.game.events.on(Phaser.Core.Events.HIDDEN, onHidden);
    this.offTg.push(services.telegram.on('deactivated', onHidden));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, onHidden);
      this.offTg.forEach((off) => off());
      this.offTg = [];
    });
  }

  /** Lets the Game scene ignore touches that land on HUD buttons. */
  isPointerOverUi(pointer: Phaser.Input.Pointer): boolean {
    if (!this.sys.isActive() || !this.menu) return false;
    return this.menuOpen || this.defeat !== null || this.input.hitTestPointer(pointer).length > 0;
  }

  // ---------------------------------------------------------------- combo

  /** Combo counter: appears at ×2, punches on every hit, breaks when the streak ends. */
  setCombo(n: number): void {
    const prev = this.combo;
    this.combo = n;
    const b = this.badge;
    if (n >= 2) {
      this.badgeText.setText(`×${faDigits(String(n))}`);
      this.tweens.killTweensOf(b);
      b.setVisible(true).setAlpha(1).setAngle(0).setY(640);
      if (prev < 2) {
        b.setScale(0);
        this.tweens.add({ targets: b, scale: 1, duration: 320, ease: 'Back.easeOut' });
      } else {
        b.setScale(1.3);
        this.tweens.add({ targets: b, scale: 1, duration: 260, ease: 'Back.easeOut' });
        this.tweens.add({ targets: b, angle: { from: n % 2 ? -8 : 8, to: 0 }, duration: 300, ease: 'Sine.easeOut' });
      }
    } else if (prev >= 2) {
      this.tweens.killTweensOf(b);
      this.tweens.add({ targets: b, angle: 18, y: 700, alpha: 0, scale: 0.8, duration: 420, ease: 'Cubic.easeIn', onComplete: () => b.setVisible(false) });
    }
  }

  // ---------------------------------------------------------------- banners

  /** Announcement banner across the arena top (waves, the boss waking). */
  showToast(title: string, sub = '', variant: 'gold' | 'red' = 'gold'): void {
    const t = this.toast;
    this.toastBg.setTexture(bannerTex(this, 900, 170, variant));
    this.toastTitle.setText(title);
    gradientText(this.toastTitle, variant === 'red' ? ['#fff0d8', '#ff8a6a', '#d23a2e'] : undefined);
    this.toastSub.setText(sub).setVisible(sub !== '');
    this.toastTitle.setY(sub ? -18 : 0);
    this.tweens.killTweensOf([t, this.toastShine]);
    t.setVisible(true).setAlpha(0).setY(TOAST_Y).setScale(0.6, 1);
    this.toastShine.setX(-520).setAlpha(0);
    this.tweens.chain({
      targets: t,
      tweens: [
        { alpha: 1, scaleX: 1, duration: 300, ease: 'Back.easeOut' },
        { alpha: 0, y: TOAST_Y - 24, duration: 360, delay: 1600, ease: 'Cubic.easeIn' },
      ],
      onComplete: () => t.setVisible(false),
    });
    this.tweens.add({ targets: this.toastShine, x: 520, alpha: { from: 0.7, to: 0 }, duration: 700, delay: 260, ease: 'Sine.easeInOut' });
  }

  // ---------------------------------------------------------------- hearts

  /** Shows `n` full hearts; `animate` plays the loss animation on the heart that just emptied. */
  setHearts(n: number, animate = true): void {
    this.hearts.forEach((h, i) => {
      const full = i < n;
      if (animate && this.heartFull[i] && !full) this.breakHeart(h);
      else Art.setPose(h, full ? 'ui_heart_full' : 'ui_heart_empty');
      this.heartFull[i] = full;
    });
  }

  private breakHeart(h: Phaser.GameObjects.Image): void {
    this.tweens.killTweensOf(h);
    h.setScale(HEART_SCALE).setTintFill(0xffffff);
    this.tweens.add({
      targets: h, scale: HEART_SCALE * 1.45, duration: 110, ease: 'Quad.easeOut', yoyo: true,
      onYoyo: () => {
        h.clearTint();
        Art.setPose(h, 'ui_heart_empty');
        this.shards.explode(services.settings.count(14), h.x, h.y);
      },
    });
    this.tweens.add({ targets: h, angle: { from: -14, to: 0 }, duration: 380, ease: 'Elastic.easeOut' });
  }

  // ---------------------------------------------------------------- defeat

  showDefeat(run: RunSummary): void {
    if (this.defeat) return;
    const cx = DESIGN_W / 2;
    const cy = DESIGN_H / 2;
    const dim = this.add.image(0, 0, dimTex(this)).setOrigin(0).setDisplaySize(DESIGN_W, DESIGN_H).setTint(0xffb0a0).setInteractive();
    const W = 760;
    const H = 820;
    const parts: Phaser.GameObjects.GameObject[] = [this.add.image(0, 0, panelTex(this, W, H))];
    parts.push(this.add.image(0, -H / 2 + 8, ribbonTex(this, 520, 130, 'red')));
    parts.push(gradientText(this.add.text(0, -H / 2 - 4, 'شکست', {
      fontFamily: FONT_FAMILY, fontSize: '72px', fontStyle: '900', rtl: true,
    }).setOrigin(0.5), ['#fff4e0', '#ffd0a0', '#f0a060']));
    parts.push(this.add.text(0, -H / 2 + 130, 'دیوها از سد تو گذشتند…', {
      fontFamily: FONT_FAMILY, fontSize: '36px', color: '#c9d2f0', rtl: true,
    }).setOrigin(0.5));

    const stats: [string, number][] = [['موج', run.wave], ['دیو کشته', run.kills], ['بهترین پیاپی', run.bestCombo]];
    stats.forEach(([label, value], i) => {
      const x = (1 - i) * 226; // right to left
      const y = -H / 2 + 300;
      const card = this.add.graphics();
      card.fillStyle(0x070b1c, 0.75).fillRoundedRect(x - 100, y - 95, 200, 190, 26);
      card.lineStyle(3, 0xf3c65a, 0.7).strokeRoundedRect(x - 100, y - 95, 200, 190, 26);
      parts.push(card);
      parts.push(gradientText(this.add.text(x, y - 18, faDigits(String(value)), {
        fontFamily: FONT_FAMILY, fontSize: '76px', fontStyle: '900',
      }).setOrigin(0.5)));
      parts.push(this.add.text(x, y + 56, label, {
        fontFamily: FONT_FAMILY, fontSize: '30px', color: UI.parchment, rtl: true,
      }).setOrigin(0.5));
    });

    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    parts.push(this.add.text(0, 110, `نکته: ${tip}`, {
      fontFamily: FONT_FAMILY, fontSize: '32px', color: '#f3dca0', rtl: true, align: 'center',
      wordWrap: { width: W - 140, useAdvancedWrap: true },
    }).setOrigin(0.5));
    parts.push(new Button(this, 0, H / 2 - 130, 520, 132, 'دوباره', () => this.scene.start('Game'), 'gold'));

    const panel = this.add.container(cx, cy, parts).setScale(0.8).setAlpha(0);
    const c = this.add.container(0, 0, [dim, panel]).setDepth(90);
    dim.setAlpha(0);
    this.tweens.add({ targets: dim, alpha: 1, duration: 400 });
    this.tweens.add({ targets: panel, alpha: 1, scale: 1, duration: 420, delay: 120, ease: 'Back.easeOut' });
    this.defeat = c;
  }

  // ---------------------------------------------------------------- boss bar

  /** The boss's health bar slides in with his name. */
  showBossBar(name: string): void {
    if (this.bar) return;
    const k = BAR_W / 1024;
    const frame = Art.image(this, 0, 0, 'ui_bossbar_frame').setScale(k);
    const iw = BAR_INNER.w * k;
    const ih = BAR_INNER.h * k;
    const ix = BAR_INNER.x * k;
    const iy = BAR_INNER.y * k;
    this.barTrail = this.add.image(ix, iy, barFillTex(this, Math.round(iw), Math.round(ih), '#fff8e8', '#f0d8b0')).setOrigin(0, 0.5);
    this.barFill = this.add.image(ix, iy, barFillTex(this, Math.round(iw), Math.round(ih), '#ff6a4a', '#9a1410')).setOrigin(0, 0.5);
    this.barArmor = this.add.image(ix, iy, barFillTex(this, Math.round(iw), Math.round(ih), '#ffe9a0', '#c08a2a')).setOrigin(0, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    // Threshold marks: the barrier (50%) and the team finisher (10%).
    const marks = this.add.graphics();
    for (const [pct, col] of [[0.5, 0xe8b04a], [0.1, 0xfff0b0]] as const) {
      const x = ix + iw * pct;
      marks.fillStyle(col, 1).fillPoints([{ x, y: iy - ih / 2 - 5 }, { x: x + 5, y: iy }, { x, y: iy + ih / 2 + 5 }, { x: x - 5, y: iy }], true);
    }
    const label = gradientText(this.add.text(0, PLATE_Y * k, name, {
      fontFamily: FONT_FAMILY, fontSize: '26px', fontStyle: '900', rtl: true, stroke: '#1a0e04', strokeThickness: 4,
    }).setOrigin(0.5));
    this.bar = this.add.container(DESIGN_W / 2, -140, [frame, this.barTrail, this.barFill, this.barArmor, marks, label]).setDepth(15);
    this.barPct = this.barShown = this.barTrailPct = 1;
    this.layoutBar();
    this.tweens.add({ targets: this.bar, y: BAR_Y, duration: 650, ease: 'Back.easeOut' });
  }

  setBossHp(pct: number): void {
    if (pct < this.barPct) {
      this.barTrailWait = FEEL.enemy.hpBar.trailDelayMs;
      this.barFlash = 1;
    }
    this.barPct = Math.max(0, pct);
  }

  /** Bronze sheen while the barrier is up. */
  setBossArmor(on: boolean): void {
    this.barArmorOn = on;
  }

  hideBossBar(): void {
    if (!this.bar) return;
    const b = this.bar;
    this.tweens.add({ targets: b, y: -140, alpha: 0, duration: 500, ease: 'Back.easeIn', onComplete: () => b.destroy() });
    this.bar = null;
  }

  update(_time: number, delta: number): void {
    if (!this.bar) return;
    const dt = Math.min(delta, 50);
    const B = FEEL.enemy.hpBar;
    this.barShown += (this.barPct - this.barShown) * Math.min(1, dt / B.drainMs);
    if (this.barTrailWait > 0) this.barTrailWait -= dt;
    else this.barTrailPct += (this.barShown - this.barTrailPct) * Math.min(1, dt / (B.trailDrainMs * 1.5));
    this.barFlash = Math.max(0, this.barFlash - dt / 150);
    const armor = this.barArmor.alpha + ((this.barArmorOn ? 0.55 + 0.25 * Math.sin(_time / 200) : 0) - this.barArmor.alpha) * Math.min(1, dt / 150);
    this.barArmor.setAlpha(armor);
    this.layoutBar();
    if (this.barFlash > 0.5) this.barFill.setTintFill(0xffffff);
    else this.barFill.clearTint();
  }

  private layoutBar(): void {
    const crop = (img: Phaser.GameObjects.Image, pct: number) => img.setCrop(0, 0, Math.max(0, img.width * pct), img.height);
    crop(this.barFill, this.barShown);
    crop(this.barTrail, this.barTrailPct);
    crop(this.barArmor, this.barShown);
  }

  // ---------------------------------------------------------------- big titles & victory

  /** A big calligraphic title across the middle of the screen (fades by itself). */
  bigTitle(text: string, holdMs = 1600): void {
    const t = gradientText(this.add.text(DESIGN_W / 2, DESIGN_H * 0.36, text, {
      fontFamily: CALLIGRAPHY_FONT, fontSize: '130px', rtl: true, stroke: '#3a1a04', strokeThickness: 7,
      padding: { top: 50, bottom: 70, left: 30, right: 30 },
    }).setOrigin(0.5).setDepth(70).setAlpha(0).setScale(0.6), ['#ffffff', '#ffe27a', '#d08a20']);
    if (FEEL.shaderFx && this.game.renderer.type === Phaser.WEBGL && !services.settings.reducedEffects) t.preFX?.addGlow(0xffd060, 5, 0, false, 0.1, 14);
    this.tweens.chain({
      targets: t,
      tweens: [
        { alpha: 1, scale: 1, duration: 700, ease: 'Back.easeOut' },
        { scale: 1.04, duration: holdMs, ease: 'Sine.easeInOut' },
        { alpha: 0, y: t.y - 40, duration: 500, ease: 'Cubic.easeIn' },
      ],
      onComplete: () => t.destroy(),
    });
  }

  /** Placeholder victory panel (the Result screen arrives in M5). */
  showVictory(run: VictorySummary): void {
    if (this.defeat) return;
    const cx = DESIGN_W / 2;
    const cy = DESIGN_H / 2;
    const dim = this.add.image(0, 0, dimTex(this)).setOrigin(0).setDisplaySize(DESIGN_W, DESIGN_H).setTint(0xfff0c0).setInteractive();
    const W = 760;
    const H = 860;
    const parts: Phaser.GameObjects.GameObject[] = [this.add.image(0, 0, panelTex(this, W, H))];
    parts.push(this.add.image(0, -H / 2 + 8, ribbonTex(this, 560, 130, 'gold')));
    parts.push(gradientText(this.add.text(0, -H / 2 - 4, 'پیروزی', {
      fontFamily: FONT_FAMILY, fontSize: '72px', fontStyle: '900', rtl: true,
    }).setOrigin(0.5), ['#5a2a04', '#3a1a02', '#2a1002']));
    parts.push(this.add.text(0, -H / 2 + 130, `دیو سپید به دست ${run.team} افتاد!`, {
      fontFamily: FONT_FAMILY, fontSize: '34px', color: '#f3dca0', rtl: true,
    }).setOrigin(0.5));
    const stats: [string, number][] = [['آسیب به دیو', run.damage], ['دیو کشته', run.kills], ['بهترین پیاپی', run.bestCombo]];
    stats.forEach(([label, value], i) => {
      const x = (1 - i) * 226; // right to left
      const y = -H / 2 + 300;
      const card = this.add.graphics();
      card.fillStyle(0x070b1c, 0.75).fillRoundedRect(x - 100, y - 95, 200, 190, 26);
      card.lineStyle(3, 0xf3c65a, 0.7).strokeRoundedRect(x - 100, y - 95, 200, 190, 26);
      parts.push(card);
      parts.push(gradientText(this.add.text(x, y - 18, faDigits(value.toLocaleString('en-US')), {
        fontFamily: FONT_FAMILY, fontSize: value >= 10000 ? '52px' : '72px', fontStyle: '900',
      }).setOrigin(0.5)));
      parts.push(this.add.text(x, y + 56, label, { fontFamily: FONT_FAMILY, fontSize: '28px', color: UI.parchment, rtl: true }).setOrigin(0.5));
    });
    parts.push(this.add.text(0, 110, 'صفحهٔ نتیجه و کارت پهلوان به‌زودی…', {
      fontFamily: FONT_FAMILY, fontSize: '30px', color: '#b9c3e6', rtl: true,
    }).setOrigin(0.5));
    parts.push(new Button(this, 0, H / 2 - 130, 520, 132, 'نبرد دوباره', () => this.scene.start('Game'), 'gold'));
    const panel = this.add.container(cx, cy, parts).setScale(0.8).setAlpha(0);
    const c = this.add.container(0, 0, [dim, panel]).setDepth(90);
    dim.setAlpha(0);
    this.tweens.add({ targets: dim, alpha: 0.9, duration: 500 });
    this.tweens.add({ targets: panel, alpha: 1, scale: 1, duration: 520, delay: 150, ease: 'Back.easeOut' });
    this.defeat = c;
  }

  // ---------------------------------------------------------------- building

  private buildBadge(): void {
    // The art scale is on the children, so the container's scale can pop around 1.
    const img = Art.image(this, 0, 0, 'ui_combo_badge').setScale(BADGE_SCALE);
    this.badgeText = this.add.text(0, 2, '×۰', {
      fontFamily: FONT_FAMILY, fontSize: '62px', fontStyle: '900', stroke: '#fff3c4', strokeThickness: 7,
    }).setOrigin(0.5);
    gradientText(this.badgeText, ['#e8402c', '#a8160e', '#5a0806']);
    this.badge = this.add.container(118, 640, [img, this.badgeText]).setVisible(false);
    this.combo = 0;
  }

  private buildToast(): void {
    this.toastBg = this.add.image(0, 0, bannerTex(this, 900, 170, 'gold'));
    this.toastTitle = this.add.text(0, 0, '', {
      fontFamily: FONT_FAMILY, fontSize: '64px', fontStyle: '900', rtl: true, stroke: '#1a0e04', strokeThickness: 6,
    }).setOrigin(0.5);
    this.toastSub = this.add.text(0, 40, '', {
      fontFamily: FONT_FAMILY, fontSize: '30px', color: UI.parchment, rtl: true,
    }).setOrigin(0.5);
    this.toastShine = this.add.image(0, 0, shineTex(this)).setDisplaySize(160, 150).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.toast = this.add.container(DESIGN_W / 2, TOAST_Y, [this.toastBg, this.toastShine, this.toastTitle, this.toastSub])
      .setVisible(false).setDepth(20);
  }

  private buildMenu(): void {
    const cx = DESIGN_W / 2;
    const cy = DESIGN_H / 2;
    const W = 720;
    const H = 860;
    this.menuDim = this.add.image(0, 0, dimTex(this)).setOrigin(0).setDisplaySize(DESIGN_W, DESIGN_H).setInteractive().setDepth(99).setVisible(false);

    const title = gradientText(this.add.text(0, -H / 2 - 4, 'مکث', {
      fontFamily: FONT_FAMILY, fontSize: '70px', fontStyle: '900', rtl: true,
    }).setOrigin(0.5), ['#fff4e0', '#ffe2a8', '#f0b460']);
    const divider = (y: number) => {
      const g = this.add.graphics();
      g.lineStyle(2, 0xf3c65a, 0.45).lineBetween(-260, y, 260, y);
      g.fillStyle(0xf3c65a, 0.9).fillPoints([{ x: 0, y: y - 8 }, { x: 8, y }, { x: 0, y: y + 8 }, { x: -8, y }], true);
      return g;
    };
    const resume = new Button(this, 0, -H / 2 + 190, 540, 136, 'ادامه', () => this.closeMenu(), 'gold');
    const sound = new Toggle(this, 0, -40, 560, 'صدا', !services.audio.muted, (on) => services.audio.setMuted(!on));
    const light = new Toggle(this, 0, 90, 560, 'جلوه‌های سبک', services.settings.reducedEffects,
      (on) => services.settings.setReducedEffects(on), 'برای گوشی‌های ضعیف‌تر');
    const restart = new Button(this, 0, H / 2 - 130, 540, 120, 'شروع دوباره', () => this.scene.start('Game'), 'lapis');

    this.menu = this.add.container(cx, cy, [
      this.add.image(0, 0, panelTex(this, W, H)),
      this.add.image(0, -H / 2 + 8, ribbonTex(this, 440, 124, 'red')),
      title, resume, divider(-150), sound, light, divider(200), restart,
    ]).setDepth(100).setVisible(false);
  }

  private openMenu(): void {
    if (this.menuOpen || this.defeat) return;
    this.menuOpen = true;
    this.scene.pause('Game');
    services.audio.stopDraw();
    services.audio.stopHum();
    this.tweens.killTweensOf([this.menu, this.menuDim]);
    this.menuDim.setVisible(true).setAlpha(0);
    this.menu.setVisible(true).setAlpha(0).setScale(0.85);
    this.tweens.add({ targets: this.menuDim, alpha: 1, duration: 220 });
    this.tweens.add({ targets: this.menu, alpha: 1, scale: 1, duration: 320, ease: 'Back.easeOut' });
  }

  private closeMenu(): void {
    if (!this.menuOpen) return;
    this.tweens.killTweensOf([this.menu, this.menuDim]);
    this.tweens.add({ targets: this.menuDim, alpha: 0, duration: 180 });
    this.tweens.add({
      targets: this.menu, alpha: 0, scale: 0.9, duration: 180, ease: 'Cubic.easeIn',
      onComplete: () => {
        this.menu.setVisible(false);
        this.menuDim.setVisible(false);
        this.menuOpen = false;
        this.scene.resume('Game');
      },
    });
  }
}
