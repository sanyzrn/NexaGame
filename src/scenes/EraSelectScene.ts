import Phaser from 'phaser';
import { CALLIGRAPHY_FONT, DESIGN_H, DESIGN_W, FONT_FAMILY } from '../config/display';
import { ERAS, type EraDef } from '../data/eras';
import { services } from '../services';
import { currentIndex, isUnlocked, unlockedIndex } from '../systems/eraProgress';
import { dividerTex, gradientText, shamsehTex, vGradientTex } from '../ui/kit';
import { faNum } from '../utils/fa';

const COLS = 2;
const CARD_W = 480;
const CARD_H = 330;
const GAP_X = 36;
const GAP_Y = 34;
const TOP = 400;
const BOTTOM_PAD = 90;

type CardState = 'current' | 'open' | 'locked' | 'soon';

/**
 * سفر در زمان — the era picker: a scrolling two-column wall of cards, one per era, from the
 * Achaemenids to the future. Open eras glow in their own colour (the chosen one wears a gold
 * ring); eras not yet reached show a lock and how they open; eras still being built are grey
 * «به‌زودی» cards — a promise of the whole journey. Drag to scroll, tap a card to travel there.
 *
 * Opened over the Title; `onPick(index)` switches the era (the Title rebuilds the arena).
 */
export class EraSelectScene extends Phaser.Scene {
  private list!: Phaser.GameObjects.Container;
  private minY = 0;
  private maxY = 0;
  private dragFrom: { py: number; y: number; moved: boolean } | null = null;
  private vel = 0;
  private lastPy = 0;
  private onPick: (index: number) => void = () => undefined;
  private onClose: () => void = () => undefined;
  private closing = false;
  private note: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Eras');
  }

  create(data: { onPick: (index: number) => void; onClose: () => void }): void {
    this.onPick = data.onPick;
    this.onClose = data.onClose;
    this.closing = false;
    this.dragFrom = null;
    this.vel = 0;
    this.note = null;
    const cx = DESIGN_W / 2;
    const ins = services.safeArea.designInsets(this.scale.canvasBounds, DESIGN_W, DESIGN_H);
    const top = Math.round(ins.top);

    this.add.image(0, 0, vGradientTex(this, 'ui_grad_eras', '#070b1f', '#101a3c', '#1a1008')).setOrigin(0).setDisplaySize(DESIGN_W, DESIGN_H);
    this.add.image(cx, 250, 'fx_glow').setTint(0xffb040).setBlendMode(Phaser.BlendModes.ADD).setScale(12, 4).setAlpha(0.18);

    // Cards (behind the header, masked to the scroll viewport).
    this.list = this.add.container(0, 0);
    ERAS.forEach((era, i) => this.list.add(this.card(era, i)));
    const rows = Math.ceil(ERAS.length / COLS);
    const contentH = rows * CARD_H + (rows - 1) * GAP_Y;
    const viewTop = TOP + top - 30;
    const viewH = DESIGN_H - viewTop;
    const maskShape = this.make.graphics({}, false).fillStyle(0xffffff).fillRect(0, viewTop, DESIGN_W, viewH);
    this.list.setMask(maskShape.createGeometryMask());
    // The list's y: `top` shows the first row under the header; minY shows the last row.
    this.maxY = top;
    this.minY = Math.min(top, DESIGN_H - (TOP + contentH + BOTTOM_PAD));
    // Start with the chosen era in view.
    const row = Math.floor(currentIndex() / COLS);
    this.list.y = Phaser.Math.Clamp(top - Math.max(0, row - 1) * (CARD_H + GAP_Y), this.minY, this.maxY);

    // Header.
    const title = gradientText(this.add.text(cx, 150 + top, 'سفر در زمان', {
      fontFamily: CALLIGRAPHY_FONT, fontSize: '104px', rtl: true, stroke: '#2a1204', strokeThickness: 8,
      padding: { top: 30, bottom: 50, left: 20, right: 20 },
    }).setOrigin(0.5), ['#fff4e0', '#ffd88a', '#d89a50']);
    const open = Math.min(unlockedIndex() + 1, ERAS.filter((e) => e.playable).length);
    this.add.image(cx, 250 + top, dividerTex(this, 640));
    this.add.text(cx, 300 + top, `${faNum(ERAS.length)} عصر، از هخامنشیان تا آینده · باز شده: ${faNum(open)}`, {
      fontFamily: FONT_FAMILY, fontSize: '30px', fontStyle: '900', color: '#b9c3e6', rtl: true,
    }).setOrigin(0.5);
    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 400 });

    // Close (✕), top-left like the sound button on the Title.
    const close = this.add.circle(90, 90 + top, 48, 0x101834, 0.9).setStrokeStyle(4, 0xf3c65a).setInteractive({ useHandCursor: true });
    this.add.text(90, 86 + top, '✕', { fontFamily: FONT_FAMILY, fontSize: '48px', fontStyle: '900', color: '#ffd24a' }).setOrigin(0.5);
    close.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.close());
    this.input.keyboard?.on('keydown-ESC', () => this.close());

    this.cameras.main.fadeIn(220, 6, 8, 20);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (p.y < viewTop) return;
      this.dragFrom = { py: p.y, y: this.list.y, moved: false };
      this.lastPy = p.y;
      this.vel = 0;
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      const d = this.dragFrom;
      if (!d || !p.isDown) return;
      if (Math.abs(p.y - d.py) > 14) d.moved = true;
      if (!d.moved) return;
      this.vel = p.y - this.lastPy;
      this.lastPy = p.y;
      this.list.y = Phaser.Math.Clamp(d.y + (p.y - d.py), this.minY - 60, this.maxY + 60);
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
      const d = this.dragFrom;
      this.dragFrom = null;
      if (!d || d.moved) return;
      const i = this.cardAt(p.x, p.y - this.list.y);
      if (i >= 0) this.tap(i);
    });
  }

  update(_t: number, delta: number): void {
    if (this.dragFrom?.moved) return;
    // Glide after a flick, then settle back inside the bounds.
    if (Math.abs(this.vel) > 0.2) {
      this.list.y += this.vel;
      this.vel *= Math.pow(0.9, delta / 16);
    }
    const target = Phaser.Math.Clamp(this.list.y, this.minY, this.maxY);
    if (target !== this.list.y) {
      this.list.y += (target - this.list.y) * Math.min(1, delta / 90);
      this.vel = 0;
    }
  }

  private state(i: number): CardState {
    const e = ERAS[i];
    if (!e.playable) return 'soon';
    if (i === currentIndex()) return 'current';
    return isUnlocked(i) ? 'open' : 'locked';
  }

  private pos(i: number): { x: number; y: number } {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    // RTL: the first card of a row is on the right.
    const x = DESIGN_W / 2 + (col === 0 ? 1 : -1) * (CARD_W + GAP_X) / 2;
    return { x, y: TOP + row * (CARD_H + GAP_Y) + CARD_H / 2 };
  }

  private cardAt(x: number, localY: number): number {
    for (let i = 0; i < ERAS.length; i++) {
      const p = this.pos(i);
      if (Math.abs(x - p.x) <= CARD_W / 2 && Math.abs(localY - p.y) <= CARD_H / 2) return i;
    }
    return -1;
  }

  private card(era: EraDef, i: number): Phaser.GameObjects.Container {
    const st = this.state(i);
    const lit = st === 'current' || st === 'open';
    const { x, y } = this.pos(i);
    const w = CARD_W;
    const h = CARD_H;
    const tint = lit ? era.testTint === 0xffffff ? 0xd89a50 : era.testTint : 0x5a5e6a;
    const g = this.add.graphics();
    // Body: dark lacquer with the era's colour band on top.
    g.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2 + 6, -h / 2 + 10, w, h, 28);
    g.fillStyle(lit ? 0x141c3c : 0x1c1e26, 0.96).fillRoundedRect(-w / 2, -h / 2, w, h, 28);
    g.fillStyle(tint, lit ? 0.9 : 0.55).fillRoundedRect(-w / 2, -h / 2, w, 92, { tl: 28, tr: 28, bl: 0, br: 0 });
    g.lineStyle(st === 'current' ? 7 : 4, st === 'current' ? 0xffd24a : lit ? 0xc9a24a : 0x4a4e58, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 28);

    const medal = this.add.image(w / 2 - 70, -h / 2 + 46, shamsehTex(this, 40)).setScale(0.95);
    if (!lit) medal.setTint(0x8a8e98);
    const num = this.add.text(w / 2 - 70, -h / 2 + 44, faNum(i + 1), {
      fontFamily: FONT_FAMILY, fontSize: '40px', fontStyle: '900', color: lit ? '#fffbe8' : '#d8dce4',
      stroke: lit ? '#3a1a04' : '#20222a', strokeThickness: 8,
    }).setOrigin(0.5);
    const name = this.add.text(w / 2 - 132, -h / 2 + 46, era.name, {
      fontFamily: FONT_FAMILY, fontSize: '46px', fontStyle: '900', color: lit ? '#fffbe8' : '#c8ccd6', rtl: true,
      stroke: lit ? '#2a1204' : '#101116', strokeThickness: 6,
    }).setOrigin(1, 0.5);
    const muted = lit ? '#e8dcc0' : '#8a8e98';
    const line = (ty: number, text: string, size: number, color = muted) => {
      const t = this.add.text(w / 2 - 34, ty, text, { fontFamily: FONT_FAMILY, fontSize: `${size}px`, fontStyle: '700', color, rtl: true }).setOrigin(1, 0.5);
      if (t.width > w - 68) t.setScale((w - 68) / t.width);
      return t;
    };
    const year = line(-h / 2 + 124, era.year, 30, lit ? '#ffd88a' : '#9aa0ac');
    const place = line(-h / 2 + 168, era.place, 28);
    const boss = line(-h / 2 + 210, `غول: ${era.bossName}`, 26, lit ? '#ff9a7a' : '#8a8e98');

    const badgeText = st === 'current' ? '✓ عصر انتخاب‌شده'
      : st === 'open' ? 'سفر به این عصر ←'
      : st === 'locked' ? `🔒 با شکست ${ERAS[i - 1]?.bossName ?? ''}`
      : 'به‌زودی…';
    const badgeColor = st === 'current' ? 0xffd24a : st === 'open' ? 0x3fae6a : 0x3a3d46;
    const bg = this.add.graphics();
    const bw = w - 60;
    bg.fillStyle(badgeColor, st === 'soon' || st === 'locked' ? 0.9 : 0.95).fillRoundedRect(-bw / 2, h / 2 - 76, bw, 54, 27);
    const badge = this.add.text(0, h / 2 - 49, badgeText, {
      fontFamily: FONT_FAMILY, fontSize: '28px', fontStyle: '900', rtl: true,
      color: st === 'current' ? '#3a1a04' : st === 'open' ? '#ffffff' : '#a8acb6',
    }).setOrigin(0.5);
    if (badge.width > bw - 30) badge.setScale((bw - 30) / badge.width);

    const c = this.add.container(x, y, [g, medal, num, name, year, place, boss, bg, badge]);
    c.setAlpha(0).setScale(0.92);
    this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 320, delay: 60 + Math.min(i, 8) * 45, ease: 'Back.easeOut' });
    if (st === 'current') this.tweens.add({ targets: medal, angle: 360, duration: 12000, repeat: -1 });
    return c;
  }

  private tap(i: number): void {
    if (this.closing) return;
    const st = this.state(i);
    const c = this.list.getAt(i) as Phaser.GameObjects.Container;
    if (st === 'current') {
      services.audio.play('ui');
      this.close();
      return;
    }
    if (st === 'open') {
      services.audio.play('whoosh');
      services.haptics.play('medium');
      this.tweens.add({ targets: c, scale: 1.06, duration: 140, yoyo: true });
      this.closing = true;
      this.time.delayedCall(200, () => {
        this.scene.stop();
        this.onPick(i);
      });
      return;
    }
    services.audio.play('clang');
    services.haptics.play('light');
    this.tweens.add({ targets: c, x: c.x + 14, duration: 50, yoyo: true, repeat: 3 });
    this.say(st === 'locked'
      ? `اول ${ERAS[i - 1]?.bossName ?? ''} را در عصر ${ERAS[i - 1]?.name ?? ''} شکست بده`
      : `عصر ${ERAS[i].name} در حال ساخت است — به‌زودی!`);
  }

  private say(text: string): void {
    this.note?.destroy();
    const t = this.add.text(0, 0, text, { fontFamily: FONT_FAMILY, fontSize: '30px', fontStyle: '900', color: '#fff0c8', rtl: true }).setOrigin(0.5);
    if (t.width > DESIGN_W - 140) t.setScale((DESIGN_W - 140) / t.width);
    const w = Math.min(DESIGN_W - 80, t.displayWidth + 80);
    const bg = this.add.graphics().fillStyle(0x101834, 0.95).fillRoundedRect(-w / 2, -44, w, 88, 44).lineStyle(4, 0xf3c65a).strokeRoundedRect(-w / 2, -44, w, 88, 44);
    const c = this.add.container(DESIGN_W / 2, DESIGN_H - 120, [bg, t]).setAlpha(0);
    this.note = c;
    this.tweens.add({ targets: c, alpha: 1, y: c.y - 20, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, duration: 400, delay: 2200, onComplete: () => c.destroy() });
  }

  private close(): void {
    if (this.closing) return;
    this.closing = true;
    services.audio.play('ui');
    this.cameras.main.fadeOut(180, 6, 8, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop();
      this.onClose();
    });
  }
}
