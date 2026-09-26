import Phaser from 'phaser';
import { DESIGN_H, DESIGN_W, FONT_FAMILY } from '../config/display';
import { services } from '../services';
import { downloadPng, shareTicket } from '../services/Share';
import { Button } from '../ui/Button';
import { renderHeroCard, type HeroCardData } from '../ui/HeroCard';
import { dimTex, parchmentTex, shamsehTex, shineTex } from '../ui/kit';

const CARD_Y = 800;
const CARD_SCALE = 0.64;
const FILE_NAME = 'darafsh-hero-card.png';

/**
 * The Hero Card viewer, over the Result screen. The card is rendered (Canvas 2D, 1080×1920), flips
 * in with a gold flash and a light sweep, then is mirrored by a real <img> laid exactly over it,
 * so inside Telegram it can be long-pressed and saved like any photo. «اشتراک» goes through
 * GameService.prepareShare (the Telegram share sheet with text + link today; a prepared message
 * with the image once a backend exists); «ذخیره» downloads the PNG in normal browsers.
 */
export class CardScene extends Phaser.Scene {
  private dom: HTMLImageElement | null = null;
  private card: Phaser.GameObjects.Image | null = null;
  private texKey = '';
  private dataUrl = '';
  private closing = false;
  private offResize: (() => void) | null = null;
  private note: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Card');
  }

  create(data: { card: HeroCardData; damage: number }): void {
    this.closing = false;
    this.dom = null;
    this.card = null;
    this.dataUrl = '';
    this.note = null;
    const dim = this.add.image(0, 0, dimTex(this)).setOrigin(0).setDisplaySize(DESIGN_W, DESIGN_H).setInteractive().setAlpha(0);
    this.tweens.add({ targets: dim, alpha: 1, duration: 260 });

    // While the card is being drawn: a turning medallion.
    const wait = this.add.container(DESIGN_W / 2, CARD_Y, [
      this.add.image(0, 0, shamsehTex(this, 70)),
      this.add.text(0, 120, 'در حال نگاشتن کارت…', { fontFamily: FONT_FAMILY, fontSize: '34px', fontStyle: '900', color: '#f3dca0', rtl: true }).setOrigin(0.5),
    ]);
    this.tweens.add({ targets: wait.list[0], angle: 360, duration: 2400, repeat: -1 });

    const inTg = services.telegram.isTelegram;
    const share = new Button(this, DESIGN_W / 2, 1560, 560, 124, 'اشتراک کارت', () => void this.share(data), 'gold');
    const save = new Button(this, DESIGN_W / 2 + 205, 1730, 390, 104, inTg ? 'ذخیره' : 'دانلود تصویر', () => this.save(), 'lapis');
    const back = new Button(this, DESIGN_W / 2 - 205, 1730, 390, 104, 'بازگشت', () => this.close(), 'red');
    [share, save, back].forEach((b, i) => {
      b.setAlpha(0).setY(b.y + 60);
      this.tweens.add({ targets: b, alpha: 1, y: b.y - 60, duration: 380, delay: 200 + i * 80, ease: 'Back.easeOut' });
    });

    const offBack = services.telegram.backButton(() => this.close());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offBack();
      this.cleanup();
    });
    renderHeroCard(this, data.card).then((canvas) => {
      if (this.closing || !this.sys.isActive()) return;
      this.dataUrl = canvas.toDataURL('image/png');
      this.texKey = `herocard_${Date.now()}`;
      this.textures.addCanvas(this.texKey, canvas);
      wait.destroy();
      this.reveal();
    }).catch((err) => {
      console.warn('[card] render failed', err);
      wait.destroy();
      this.say('کشیدن کارت ممکن نشد');
    });
  }

  private reveal(): void {
    const card = this.add.image(DESIGN_W / 2, CARD_Y, this.texKey).setScale(0, CARD_SCALE * 1.1).setAngle(-4);
    this.card = card;
    services.audio.play('whoosh');
    // Flip in, settle, a gold flash on the face, then light sweeps across it.
    this.tweens.add({ targets: card, scaleX: CARD_SCALE, scaleY: CARD_SCALE, angle: 0, duration: 520, ease: 'Back.easeOut', onComplete: () => {
      services.audio.play('stamp', 1);
      services.haptics.play('medium');
      const flash = this.add.image(card.x, card.y, this.texKey).setScale(CARD_SCALE).setTintFill(0xfff0c0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
      this.tweens.add({ targets: flash, alpha: 0, duration: 420, onComplete: () => flash.destroy() });
      const w = card.displayWidth;
      const h = card.displayHeight;
      const maskShape = this.make.graphics({}, false).fillRect(card.x - w / 2, card.y - h / 2, w, h);
      const shine = this.add.image(card.x - w, card.y, shineTex(this)).setDisplaySize(220, h * 1.4).setAngle(18)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7).setMask(maskShape.createGeometryMask());
      this.tweens.add({ targets: shine, x: card.x + w, duration: 900, delay: 150, ease: 'Sine.easeInOut', onComplete: () => shine.destroy() });
      this.time.delayedCall(1100, () => this.mountDom());
    } });
  }

  /** A real <img> over the card, so the webview's long-press "save image" works. */
  private mountDom(): void {
    if (this.closing || !this.card || this.dom) return;
    const img = document.createElement('img');
    img.src = this.dataUrl;
    img.alt = 'کارت افتخار';
    img.draggable = false;
    Object.assign(img.style, {
      position: 'fixed', zIndex: '5', pointerEvents: 'auto', userSelect: 'auto', webkitUserSelect: 'auto',
      webkitTouchCallout: 'default', borderRadius: '4px',
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(img);
    this.dom = img;
    this.placeDom();
    const onResize = () => this.placeDom();
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.offResize = () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
    if (services.telegram.isTelegram) this.say('برای ذخیره، کارت را لمس کن و نگه دار');
  }

  private placeDom(): void {
    const img = this.dom;
    const card = this.card;
    if (!img || !card) return;
    const b = this.scale.canvasBounds;
    const k = b.width / DESIGN_W;
    const w = card.displayWidth * k;
    const h = card.displayHeight * k;
    img.style.left = `${b.left + (card.x * k - w / 2)}px`;
    img.style.top = `${b.top + (card.y * k - h / 2)}px`;
    img.style.width = `${w}px`;
    img.style.height = `${h}px`;
  }

  private async share(data: { card: HeroCardData; damage: number }): Promise<void> {
    if (!this.dataUrl) return;
    const ticket = await services.game.prepareShare({
      heroName: data.card.heroName, groupName: data.card.groupName, damage: data.damage, score: data.card.score, moment: data.card.moment, cardDataUrl: this.dataUrl,
    });
    const out = await shareTicket(ticket, { dataUrl: this.dataUrl, name: FILE_NAME });
    if (out === 'copied') this.say('متن و لینک کپی شد');
    else if (out === 'failed') this.say('اشتراک‌گذاری ممکن نشد؛ تصویر را ذخیره کن');
  }

  private save(): void {
    if (!this.dataUrl) return;
    if (services.telegram.isTelegram) {
      // Telegram's webview ignores downloads: the long-press on the card is the way.
      this.say('کارت را لمس کن و نگه دار، سپس «ذخیره» را بزن');
      if (this.card) this.tweens.add({ targets: this.card, scale: { from: CARD_SCALE * 1.03, to: CARD_SCALE }, duration: 300, ease: 'Back.easeOut' });
      return;
    }
    downloadPng(this.dataUrl, FILE_NAME);
    this.say('تصویر کارت ذخیره شد');
  }

  private close(): void {
    if (this.closing) return;
    this.closing = true;
    this.removeDom();
    const targets = this.children.list.filter((o) => 'alpha' in o);
    if (this.card) this.tweens.add({ targets: this.card, scale: CARD_SCALE * 0.6, angle: 6, duration: 260, ease: 'Cubic.easeIn' });
    this.tweens.add({ targets, alpha: 0, duration: 260, onComplete: () => this.scene.stop() });
  }

  private say(text: string): void {
    this.note?.destroy();
    const t = this.add.text(0, 0, text, { fontFamily: FONT_FAMILY, fontSize: '28px', fontStyle: '900', color: '#3a1a08', rtl: true }).setOrigin(0.5);
    const c = this.add.container(DESIGN_W / 2, 1450, [this.add.image(0, 0, parchmentTex(this, Math.max(420, Math.round(t.width) + 80), 80)), t]).setAlpha(0).setDepth(20);
    this.note = c;
    this.tweens.add({ targets: c, alpha: 1, duration: 220 });
    this.tweens.add({ targets: c, alpha: 0, duration: 400, delay: 2600, onComplete: () => c.destroy() });
  }

  private removeDom(): void {
    this.offResize?.();
    this.offResize = null;
    this.dom?.remove();
    this.dom = null;
  }

  private cleanup(): void {
    this.removeDom();
    if (this.texKey && this.textures.exists(this.texKey)) this.textures.remove(this.texKey);
    this.texKey = '';
  }
}
