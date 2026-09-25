import Phaser from 'phaser';
import { Art } from '../assets/Art';
import { MANIFEST_BY_KEY, type PackFile } from '../assets/manifest';
import { CALLIGRAPHY_FONT, FONT_FAMILY } from '../config/display';
import { services } from '../services';
import { faNum, faPercent } from '../utils/fa';
import { groupBannerTex, starPath } from './kit';

export interface HeroCardData {
  heroName: string;
  epicLine: string;
  stars: number;
  score: number;
  bestCombo: number;
  goldenPct: number;
  groupName: string;
  /** The player's share of the group's fight, 0..1. */
  groupShare: number;
  /** Member avatar texture keys (the group row). */
  avatars: string[];
  /** Flawless run: the card gets the red seal. */
  perfect: boolean;
}

const W = 1080;
const H = 1920;
/** The parchment inside card_bg's frame. */
const INNER = { x: 115, y: 407, w: 850, h: 1360 };
const INK = '#3a1a08';
const CRIMSON = '#6a1410';

/** Loads a lazy manifest image (card_bg) the first time it's needed; resolves when it's drawable. */
export function ensureLazy(scene: Phaser.Scene, key: string): Promise<void> {
  if (Art.has(key)) return Promise.resolve();
  const pack = scene.registry.get('pack') as PackFile | undefined;
  const img = pack?.images.find((i) => i.key === key);
  const def = MANIFEST_BY_KEY.get(key);
  return new Promise((resolve) => {
    if (!img || !def) {
      resolve();
      return;
    }
    const url = `assets/${services.caps.webp ? img.webp : img.fallback}?v=${pack!.version}`;
    scene.load.image(key, url);
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (scene.textures.exists(key)) Art.register(key, { texture: key }, true);
      resolve();
    });
    scene.load.start();
  });
}

function source(scene: Phaser.Scene, key: string): CanvasImageSource | null {
  if (!scene.textures.exists(key)) return null;
  return scene.textures.get(key).getSourceImage() as CanvasImageSource;
}

/** Draws a manifest pose (atlas frame or image, trimmed or not) with its anchor at (x, y). */
function drawPose(ctx: CanvasRenderingContext2D, scene: Phaser.Scene, key: string, x: number, y: number, scale: number): void {
  const ref = Art.ref(key);
  const frame = scene.textures.getFrame(ref.texture, ref.frame);
  if (!frame) return;
  const src = frame.source.image as CanvasImageSource;
  const a = Art.anchor(key);
  const rw = frame.realWidth;
  const rh = frame.realHeight;
  const sss = (frame as unknown as { data?: { spriteSourceSize?: { x: number; y: number } } }).data?.spriteSourceSize ?? { x: 0, y: 0 };
  const ox = x - rw * a.ox * scale;
  const oy = y - rh * a.oy * scale;
  ctx.save();
  if (a.flip) {
    ctx.translate(x * 2, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(src, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
    ox + (frame.trimmed ? sss.x : 0) * scale, oy + (frame.trimmed ? sss.y : 0) * scale, frame.cutWidth * scale, frame.cutHeight * scale);
  ctx.restore();
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, fill: string | CanvasGradient, stroke?: string, lw = 0): void {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  if (stroke && lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(s, x, y);
}

function divider(ctx: CanvasRenderingContext2D, y: number, w: number): void {
  const g = ctx.createLinearGradient(540 - w / 2, 0, 540 + w / 2, 0);
  g.addColorStop(0, 'rgba(154,100,24,0)');
  g.addColorStop(0.5, 'rgba(154,100,24,0.85)');
  g.addColorStop(1, 'rgba(154,100,24,0)');
  ctx.fillStyle = g;
  ctx.fillRect(540 - w / 2, y - 1.5, w, 3);
  ctx.save();
  ctx.translate(540, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#c08a24';
  ctx.fillRect(-9, -9, 18, 18);
  ctx.fillStyle = '#3cc4b4';
  ctx.fillRect(-5, -5, 10, 10);
  ctx.restore();
}

function goldFill(ctx: CanvasRenderingContext2D, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#fff0b8');
  g.addColorStop(0.4, '#f3c65a');
  g.addColorStop(0.75, '#b87818');
  g.addColorStop(1, '#f3c65a');
  return g;
}

/**
 * The Hero Card, 1080×1920 on card_bg: the hero's name and epic line, the hero standing in a gold
 * halo beside the group's banner, the stars, three stat medallions, the group row, and a red seal
 * for a flawless run. Drawn with Canvas 2D (all text live, RTL) so it exports straight to PNG.
 */
export async function renderHeroCard(scene: Phaser.Scene, d: HeroCardData): Promise<HTMLCanvasElement> {
  await ensureLazy(scene, 'card_bg');
  if (document.fonts) {
    await Promise.race([
      Promise.all([
        document.fonts.load(`900 90px Vazirmatn`, d.heroName),
        document.fonts.load(`700 50px Nastaliq`, d.epicLine),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]).catch(() => undefined);
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const bg = source(scene, Art.has('card_bg') ? Art.ref('card_bg').texture : 'card_bg');
  if (bg) ctx.drawImage(bg, 0, 0, W, H);
  else {
    ctx.fillStyle = '#1a2450';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f4e4bc';
    ctx.fillRect(INNER.x, INNER.y, INNER.w, INNER.h);
  }

  // Header
  text(ctx, 'درفش · نبرد پهلوانان', 540, 492, `900 30px ${FONT_FAMILY}`, '#8a5a1a');
  const nameFill = ctx.createLinearGradient(0, 530, 0, 630);
  nameFill.addColorStop(0, '#9a2418');
  nameFill.addColorStop(1, '#4a0a06');
  let size = 104;
  ctx.font = `900 ${size}px ${FONT_FAMILY}`;
  while (ctx.measureText(d.heroName).width > INNER.w - 120 && size > 56) ctx.font = `900 ${(size -= 6)}px ${FONT_FAMILY}`;
  text(ctx, d.heroName, 540, 582, `900 ${size}px ${FONT_FAMILY}`, nameFill, '#f3c65a', 5);
  text(ctx, d.epicLine, 540, 680, `700 50px ${CALLIGRAPHY_FONT}`, CRIMSON);
  divider(ctx, 750, 560);

  // The hero in a gold halo, the group's banner planted beside him.
  const halo = ctx.createRadialGradient(540, 1010, 30, 540, 1010, 330);
  halo.addColorStop(0, 'rgba(255,214,110,0.75)');
  halo.addColorStop(0.55, 'rgba(255,200,90,0.25)');
  halo.addColorStop(1, 'rgba(255,200,90,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(INNER.x, 700, INNER.w, 620);
  // sun rays behind
  ctx.save();
  ctx.translate(540, 1010);
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.fillStyle = i % 2 ? 'rgba(214,150,40,0.10)' : 'rgba(214,150,40,0.18)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-22, -330);
    ctx.lineTo(22, -330);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  const banner = source(scene, groupBannerTex(scene));
  if (banner) ctx.drawImage(banner, 740, 820, 112 * 2.3, 160 * 2.3);
  ctx.fillStyle = 'rgba(60,30,8,0.3)';
  ctx.beginPath();
  ctx.ellipse(540, 1236, 150, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  drawPose(ctx, scene, Art.has('hero_full') ? 'hero_full' : 'hero_idle', 540, 1240, 1.12);

  // Stars
  for (let i = 0; i < 3; i++) {
    const x = 540 + (i - 1) * 150;
    const y = 1330 + (i === 1 ? -14 : 0);
    const on = i < d.stars;
    ctx.save();
    if (on) {
      ctx.shadowColor = 'rgba(120,60,0,0.5)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 5;
    }
    starPath(ctx, x, y, 62);
    ctx.fillStyle = on ? goldFill(ctx, y - 62, y + 62) : 'rgba(120,90,50,0.25)';
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 4;
    ctx.strokeStyle = on ? '#8a5010' : 'rgba(120,90,50,0.5)';
    ctx.stroke();
  }

  // Stat medallions (right to left)
  const stats: [string, string][] = [
    ['امتیاز', faNum(d.score)],
    ['بهترین پیاپی', faNum(d.bestCombo)],
    ['دقت طلایی', faPercent(d.goldenPct, 0)],
  ];
  stats.forEach(([label, value], i) => {
    const x = 540 + (1 - i) * 270;
    const y = 1490;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    const g = ctx.createLinearGradient(0, y - 80, 0, y + 80);
    g.addColorStop(0, '#27386e');
    g.addColorStop(1, '#101834');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x - 118, y - 80, 236, 160, 28);
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#e0b04a';
    ctx.stroke();
    text(ctx, value, x, y - 16, `900 ${value.length > 7 ? 44 : 56}px ${FONT_FAMILY}`, goldFill(ctx, y - 50, y + 20));
    text(ctx, label, x, y + 46, `900 26px ${FONT_FAMILY}`, '#f6e7c8');
  });

  // The group
  text(ctx, `از «${d.groupName}»`, 540, 1592, `900 36px ${FONT_FAMILY}`, INK);
  text(ctx, `سهم از نبرد لشکر: ${faPercent(d.groupShare, 0)}`, 540, 1634, `900 30px ${FONT_FAMILY}`, '#8a3a10');
  const n = Math.min(7, d.avatars.length);
  for (let i = 0; i < n; i++) {
    const img = source(scene, d.avatars[i]);
    if (!img) continue;
    const x = 540 + (i - (n - 1) / 2) * 62;
    ctx.drawImage(img, x - 26, 1652, 52, 52);
  }

  // Flawless: a red wax seal, pressed a little crooked.
  if (d.perfect) {
    ctx.save();
    ctx.translate(862, 520);
    ctx.rotate(-0.22);
    ctx.shadowColor = 'rgba(60,0,0,0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    for (let i = 0; i < 28; i++) {
      const r = i % 2 ? 70 : 78;
      const a = (i / 28) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    const w = ctx.createRadialGradient(-20, -20, 5, 0, 0, 80);
    w.addColorStop(0, '#e0483a');
    w.addColorStop(1, '#7a0e0a');
    ctx.fillStyle = w;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(862, 520);
    ctx.rotate(-0.22);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,210,180,0.6)';
    ctx.beginPath();
    ctx.arc(0, 0, 54, 0, Math.PI * 2);
    ctx.stroke();
    text(ctx, 'بی‌نقص', 0, 2, `900 34px ${FONT_FAMILY}`, '#ffe8d8');
    ctx.restore();
  }
  return canvas;
}
