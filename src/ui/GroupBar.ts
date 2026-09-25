import Phaser from 'phaser';
import { Art } from '../assets/Art';
import { FONT_FAMILY } from '../config/display';
import { FEEL } from '../config/feel';
import { faNum, faPercent } from '../utils/fa';
import { barFillTex, gradientText, groupBannerTex } from './kit';

/** Inner bar of ui_bossbar_frame, in frame-box px relative to its centre (1024 box). */
export const BAR_INNER = { x: -372, w: 745, y: 22, h: 38 };
/** The name plate above the bar (frame-box px). */
export const PLATE_Y = -53;

const FLOATERS = 3;

/**
 * The group Div bar: the whole group's shared foe, always at the top. Ornate frame (ui_bossbar_frame),
 * the group's banner beside it, the Div's life in Persian percent, and the player's running share
 * under it. Teammates' blows land as chunks (white trail that drains after a beat, a "−N" floater,
 * the banner flutters); the player's gold stream lands as a gold flare at the fill's edge.
 */
export class GroupBar {
  readonly root: Phaser.GameObjects.Container;
  private readonly fill: Phaser.GameObjects.Image;
  private readonly trail: Phaser.GameObjects.Image;
  private readonly flareImg: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly pctText: Phaser.GameObjects.Text;
  private readonly share: Phaser.GameObjects.Text;
  private readonly banner: Phaser.GameObjects.Image;
  private readonly floaters: Phaser.GameObjects.Text[] = [];
  private readonly ix: number;
  private readonly iy: number;
  private readonly iw: number;
  private target = 1;
  private shown = 1;
  private trailPct = 1;
  private trailWait = 0;
  private flash = 0;
  private flare = 0;
  private flutter = 0;
  private t = 0;
  private lastLabel = '';
  private shareTotal = 0;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number, name: string) {
    const G = FEEL.groupBar;
    const k = G.width / 1024;
    const frame = Art.image(scene, 0, 0, 'ui_bossbar_frame').setScale(k);
    this.iw = BAR_INNER.w * k;
    const ih = BAR_INNER.h * k;
    this.ix = BAR_INNER.x * k;
    this.iy = BAR_INNER.y * k;
    const w = Math.round(this.iw);
    const h = Math.round(ih);
    this.trail = scene.add.image(this.ix, this.iy, barFillTex(scene, w, h, '#fff8e8', '#f0d8b0')).setOrigin(0, 0.5);
    this.fill = scene.add.image(this.ix, this.iy, barFillTex(scene, w, h, '#c85ad8', '#4a1068')).setOrigin(0, 0.5);
    this.flareImg = scene.add.image(this.ix, this.iy, 'fx_glow').setTint(0xffd24a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    const label = (this.label = gradientText(scene.add.text(0, PLATE_Y * k, name, {
      fontFamily: FONT_FAMILY, fontSize: '24px', fontStyle: '900', rtl: true, stroke: '#1a0e04', strokeThickness: 4,
    }).setOrigin(0.5)));
    this.pctText = scene.add.text(0, this.iy, '', {
      fontFamily: FONT_FAMILY, fontSize: '22px', fontStyle: '900', color: '#ffffff', stroke: '#1a0820', strokeThickness: 5,
    }).setOrigin(0.5);
    this.share = scene.add.text(this.iw * 0.28, 78, '', {
      fontFamily: FONT_FAMILY, fontSize: '22px', fontStyle: '900', color: '#ffe39a', rtl: true, stroke: '#2a1402', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0);
    // The banner stands at the bar's right end (RTL start), leaning on the lion.
    this.banner = scene.add.image(G.width / 2 + 52, -6, groupBannerTex(scene)).setOrigin(0.15, 0.1).setScale(0.62);
    const parts: Phaser.GameObjects.GameObject[] = [frame, this.trail, this.fill, this.flareImg, label, this.pctText, this.share, this.banner];
    for (let i = 0; i < FLOATERS; i++) {
      const f = scene.add.text(0, 0, '', {
        fontFamily: FONT_FAMILY, fontSize: '28px', fontStyle: '900', color: '#ffffff', stroke: '#1a0820', strokeThickness: 6,
      }).setOrigin(0.5).setVisible(false);
      this.floaters.push(f);
      parts.push(f);
    }
    this.root = scene.add.container(x, y, parts);
    this.layout();
  }

  /** The group's name on the plate. */
  setName(name: string): void {
    this.label.setText(name);
    gradientText(this.label);
  }

  /** Sets the value the bar moves to. `chunk` = a teammate's blow (the white trail lingers first). */
  setPct(pct: number, chunk: boolean): void {
    const p = Phaser.Math.Clamp(pct, 0, 1);
    if (p < this.target) {
      if (chunk) {
        this.trailWait = FEEL.groupBar.trailDelayMs;
        this.flash = 1;
      } else if (this.trailWait <= 0) {
        this.trailPct = Math.min(this.trailPct, this.shown);
      }
    }
    this.target = p;
  }

  /** Jumps to a value without animation (session start). */
  snap(pct: number): void {
    this.target = this.shown = this.trailPct = Phaser.Math.Clamp(pct, 0, 1);
    this.layout();
  }

  /** The fill's leading edge in scene px. */
  edge(out: { x: number; y: number }): void {
    out.x = this.root.x + this.ix + this.iw * this.shown;
    out.y = this.root.y + this.iy;
  }

  /** The player's gold landed: a gold flare at the edge, and their share ticks up. */
  playerLanded(groupDamage: number): void {
    this.flare = 1;
    if (groupDamage <= 0) return;
    this.shareTotal += groupDamage;
    this.share.setText(`سهم تو: ${faNum(this.shareTotal)}`).setAlpha(1);
    this.scene.tweens.killTweensOf(this.share);
    this.scene.tweens.add({ targets: this.share, scale: { from: 1.18, to: 1 }, duration: 220, ease: 'Back.easeOut' });
  }

  /** A teammate's blow landed: "−N" rises from the edge in their colour, the banner flutters. */
  teamLanded(amount: number, color: number): void {
    this.flutter = 1;
    const f = this.floaters.find((q) => !q.visible) ?? this.floaters[0];
    const x = this.ix + this.iw * this.shown;
    this.scene.tweens.killTweensOf(f);
    f.setText(`−${faNum(amount)}`).setColor(`#${color.toString(16).padStart(6, '0')}`).setPosition(x, this.iy + 34)
      .setVisible(true).setAlpha(1).setScale(0.5);
    this.scene.tweens.add({ targets: f, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: f, y: this.iy + 84, alpha: 0, duration: 900, delay: 500, ease: 'Cubic.easeIn',
      onComplete: () => f.setVisible(false),
    });
  }

  update(ms: number): void {
    const G = FEEL.groupBar;
    this.t += ms;
    this.shown += (this.target - this.shown) * Math.min(1, ms / G.drainMs);
    if (this.trailWait > 0) this.trailWait -= ms;
    else this.trailPct += (this.shown - this.trailPct) * Math.min(1, ms / G.trailDrainMs);
    if (this.trailPct < this.shown) this.trailPct = this.shown;
    this.flash = Math.max(0, this.flash - ms / 160);
    this.flare = Math.max(0, this.flare - ms / G.edgeFlareMs);
    this.flutter = Math.max(0, this.flutter - ms / 700);
    this.layout();
    if (this.flash > 0.5) this.fill.setTintFill(0xffffff);
    else this.fill.clearTint();
    this.flareImg.setAlpha(this.flare).setScale(0.6 + this.flare * 0.9);
    const sway = G.bannerSwayDeg * Math.sin((this.t / G.bannerSwayMs) * Math.PI * 2);
    const flap = this.flutter * 9 * Math.sin(this.t / 45);
    this.banner.setAngle(sway + flap).setScale(0.62 * (1 + this.flutter * 0.12));
  }

  private layout(): void {
    this.fill.setCrop(0, 0, Math.max(0, this.fill.width * this.shown), this.fill.height);
    this.trail.setCrop(0, 0, Math.max(0, this.trail.width * this.trailPct), this.trail.height);
    this.flareImg.setX(this.ix + this.iw * this.shown);
    const label = faPercent(this.shown);
    if (label !== this.lastLabel) {
      this.lastLabel = label;
      this.pctText.setText(label);
    }
  }
}
