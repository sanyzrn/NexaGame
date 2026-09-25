import type Phaser from 'phaser';

/**
 * UI art drawn in code with Canvas 2D (gradients, bevels, ornaments), cached as textures by key.
 * One visual language for every panel, button, ribbon, toggle and banner: deep lapis enamel,
 * gold rims, turquoise gems and a faint girih star pattern.
 */

type Ctx = CanvasRenderingContext2D;

export const UI = {
  gold: '#f3c65a',
  goldLight: '#fff0b8',
  goldDark: '#9a6418',
  lapisTop: '#27386e',
  lapisBottom: '#101834',
  turquoise: '#3cc4b4',
  parchment: '#f6e7c8',
  ink: '#2a1a0e',
  red: '#b3261e',
  redDark: '#6e1210',
  shadow: 'rgba(0,0,0,0.45)',
} as const;


export type ButtonVariant = 'gold' | 'lapis' | 'red';

/** Padding around panel/button art for the drop shadow; images are drawn centred, so it's invisible. */
const PAD = 28;

function make(scene: Phaser.Scene, key: string, w: number, h: number, paint: (ctx: Ctx) => void): string {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();
  ctx.lineJoin = 'round';
  paint(ctx);
  tex.refresh();
  return key;
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function goldStroke(ctx: Ctx, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, UI.goldLight);
  g.addColorStop(0.35, UI.gold);
  g.addColorStop(0.7, UI.goldDark);
  g.addColorStop(1, UI.gold);
  return g;
}

function gem(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = goldStroke(ctx, -r, r);
  ctx.fillRect(-r, -r, r * 2, r * 2);
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.7);
  g.addColorStop(0, '#b8fff4');
  g.addColorStop(1, UI.turquoise);
  ctx.fillStyle = g;
  ctx.fillRect(-r * 0.55, -r * 0.55, r * 1.1, r * 1.1);
  ctx.restore();
}

/** Faint eight-point star lattice, clipped to the current path. */
function girih(ctx: Ctx, w: number, h: number, alpha: number): void {
  const s = 64;
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = `rgba(255,214,130,${alpha})`;
  ctx.lineWidth = 2;
  for (let y = -s; y < h + s; y += s) {
    for (let x = -s; x < w + s; x += s) {
      const cx = x + ((y / s) % 2 ? s / 2 : 0);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const r = i % 2 ? s * 0.2 : s * 0.36;
        const a = (i / 16) * Math.PI * 2;
        ctx.lineTo(cx + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Lapis enamel panel with a double gold rim, corner gems and a girih pattern. */
export function panelTex(scene: Phaser.Scene, w: number, h: number): string {
  return make(scene, `ui_panel_${w}x${h}`, w + PAD * 2, h + PAD * 2, (ctx) => {
    ctx.translate(PAD, PAD);
    const r = 40;
    // shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    rr(ctx, 0, 0, w, h, r);
    ctx.fillStyle = UI.lapisBottom;
    ctx.fill();
    ctx.restore();
    // body
    const body = ctx.createLinearGradient(0, 0, 0, h);
    body.addColorStop(0, UI.lapisTop);
    body.addColorStop(1, UI.lapisBottom);
    rr(ctx, 0, 0, w, h, r);
    ctx.fillStyle = body;
    ctx.fill();
    const glow = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, h * 0.7);
    glow.addColorStop(0, 'rgba(120,160,255,0.22)');
    glow.addColorStop(1, 'rgba(120,160,255,0)');
    ctx.fillStyle = glow;
    rr(ctx, 0, 0, w, h, r);
    ctx.fill();
    rr(ctx, 14, 14, w - 28, h - 28, r - 12);
    girih(ctx, w, h, 0.07);
    // rims
    rr(ctx, 3, 3, w - 6, h - 6, r - 2);
    ctx.lineWidth = 7;
    ctx.strokeStyle = goldStroke(ctx, 0, h);
    ctx.stroke();
    rr(ctx, 16, 16, w - 32, h - 32, r - 14);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,220,140,0.55)';
    ctx.stroke();
    for (const [x, y] of [[20, 20], [w - 20, 20], [20, h - 20], [w - 20, h - 20]]) gem(ctx, x, y, 11);
  });
}

/** Swallow-tailed ribbon for panel titles. */
export function ribbonTex(scene: Phaser.Scene, w: number, h: number, variant: 'red' | 'gold' = 'red'): string {
  return make(scene, `ui_ribbon_${variant}_${w}x${h}`, w + PAD * 2, h + PAD * 2, (ctx) => {
    ctx.translate(PAD, PAD);
    const tail = h * 0.55;
    const fold = h * 0.22;
    const top = variant === 'red' ? '#d23a2e' : '#ffd976';
    const bottom = variant === 'red' ? UI.redDark : '#b87a1e';
    const back = variant === 'red' ? '#5a0e0c' : '#8a5a12';
    // tails (behind)
    ctx.fillStyle = back;
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? tail : w - tail;
      const xe = s < 0 ? 0 : w;
      ctx.beginPath();
      ctx.moveTo(x0, fold);
      ctx.lineTo(xe, fold);
      ctx.lineTo(xe + s * -tail * 0.45, fold + (h - fold) / 2);
      ctx.lineTo(xe, h);
      ctx.lineTo(x0, h);
      ctx.closePath();
      ctx.fill();
    }
    // main band
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    const g = ctx.createLinearGradient(0, 0, 0, h - fold);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(tail * 0.7, 0, w - tail * 1.4, h - fold);
    ctx.restore();
    ctx.strokeStyle = goldStroke(ctx, 0, h);
    ctx.lineWidth = 4;
    ctx.strokeRect(tail * 0.7 + 2, 2, w - tail * 1.4 - 4, h - fold - 4);
    ctx.strokeStyle = 'rgba(255,240,190,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(tail * 0.7 + 10, 10, w - tail * 1.4 - 20, h - fold - 20);
    gem(ctx, w / 2, 2, 9);
  });
}

/** Bevelled pill button. `pressed` bakes a darker, flatter variant. */
export function buttonTex(scene: Phaser.Scene, w: number, h: number, variant: ButtonVariant, pressed = false): string {
  return make(scene, `ui_btn_${variant}_${w}x${h}${pressed ? '_p' : ''}`, w + PAD * 2, h + PAD * 2, (ctx) => {
    ctx.translate(PAD, PAD);
    const r = h / 2;
    const fills: Record<ButtonVariant, [string, string, string]> = {
      gold: ['#ffe79a', '#f0b43c', '#b4721a'],
      lapis: ['#3a55a0', '#22346c', '#141e44'],
      red: ['#ff7a5c', '#c8342a', '#7a1410'],
    };
    const [c0, c1, c2] = fills[variant];
    if (!pressed) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 8;
      rr(ctx, 0, 0, w, h, r);
      ctx.fillStyle = c2;
      ctx.fill();
      ctx.restore();
    }
    // base "thickness"
    rr(ctx, 0, 6, w, h - 6, r);
    ctx.fillStyle = c2;
    ctx.fill();
    // face
    const faceH = h - (pressed ? 4 : 10);
    const fy = pressed ? 4 : 0;
    const g = ctx.createLinearGradient(0, fy, 0, fy + faceH);
    g.addColorStop(0, pressed ? c1 : c0);
    g.addColorStop(0.55, c1);
    g.addColorStop(1, c2);
    rr(ctx, 0, fy, w, faceH, r);
    ctx.fillStyle = g;
    ctx.fill();
    // gloss
    rr(ctx, r * 0.35, fy + 5, w - r * 0.7, faceH * 0.42, faceH * 0.21);
    const gloss = ctx.createLinearGradient(0, fy, 0, fy + faceH * 0.45);
    gloss.addColorStop(0, `rgba(255,255,255,${pressed ? 0.12 : 0.38})`);
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fill();
    // rim
    rr(ctx, 2, fy + 2, w - 4, faceH - 4, r - 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = variant === 'gold' ? 'rgba(120,70,10,0.9)' : goldStroke(ctx, fy, fy + faceH);
    ctx.stroke();
  });
}

/** Toggle switch track (on / off) and knob. */
export function toggleTex(scene: Phaser.Scene): { on: string; off: string; knob: string } {
  const w = 132;
  const h = 64;
  const track = (on: boolean) => make(scene, `ui_toggle_${on ? 'on' : 'off'}`, w + 8, h + 8, (ctx) => {
    ctx.translate(4, 4);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, on ? '#1f8f84' : '#0c1128');
    g.addColorStop(1, on ? '#3cc4b4' : '#1c2446');
    rr(ctx, 0, 0, w, h, h / 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = goldStroke(ctx, 0, h);
    ctx.stroke();
    ctx.save();
    rr(ctx, 4, 4, w - 8, h - 8, h / 2 - 4);
    ctx.clip();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 6;
    rr(ctx, 1, -2, w - 2, h, h / 2);
    ctx.stroke();
    ctx.restore();
  });
  const knob = make(scene, 'ui_toggle_knob', 64, 64, (ctx) => {
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    const g = ctx.createRadialGradient(24, 22, 2, 32, 32, 26);
    g.addColorStop(0, '#fff6d0');
    g.addColorStop(0.5, UI.gold);
    g.addColorStop(1, UI.goldDark);
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  });
  return { on: track(true), off: track(false), knob };
}

/** Wide announcement banner: dark band with gold edge lines fading out at both ends. */
export function bannerTex(scene: Phaser.Scene, w: number, h: number, variant: 'gold' | 'red'): string {
  return make(scene, `ui_banner_${variant}_${w}x${h}`, w, h, (ctx) => {
    const fade = (a: number) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.18, `rgba(0,0,0,${a})`);
      g.addColorStop(0.82, `rgba(0,0,0,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      return g;
    };
    const band = variant === 'red' ? [110, 16, 12] : [16, 24, 56];
    const body = ctx.createLinearGradient(0, 0, w, 0);
    body.addColorStop(0, `rgba(${band},0)`);
    body.addColorStop(0.16, `rgba(${band},0.88)`);
    body.addColorStop(0.84, `rgba(${band},0.88)`);
    body.addColorStop(1, `rgba(${band},0)`);
    ctx.fillStyle = body;
    ctx.fillRect(0, 12, w, h - 24);
    // gold lines, alpha-faded at the ends via destination-in
    ctx.fillStyle = UI.gold;
    ctx.fillRect(0, 8, w, 4);
    ctx.fillRect(0, h - 12, w, 4);
    ctx.fillStyle = 'rgba(255,240,190,0.6)';
    ctx.fillRect(0, 18, w, 2);
    ctx.fillRect(0, h - 20, w, 2);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = fade(1);
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    gem(ctx, w / 2, 10, 10);
    gem(ctx, w / 2, h - 10, 10);
  });
}

/** Soft white bar used as a light sweep across banners (ADD blend). */
export function shineTex(scene: Phaser.Scene): string {
  return make(scene, 'ui_shine', 96, 8, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 96, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 96, 8);
  });
}

/** Aged parchment strip with shaded rolled ends. */
export function parchmentTex(scene: Phaser.Scene, w: number, h: number): string {
  return make(scene, `ui_parchment_${w}x${h}`, w + 60, h + 40, (ctx) => {
    ctx.translate(30, 20);
    let seed = 7;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    ctx.save();
    ctx.shadowColor = 'rgba(40,20,0,0.45)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#ecd6a6';
    ctx.fillRect(10, 4, w - 20, h - 8);
    ctx.restore();
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.55);
    g.addColorStop(0, '#fbf0d6');
    g.addColorStop(1, '#dcbf86');
    ctx.fillStyle = g;
    ctx.fillRect(10, 4, w - 20, h - 8);
    // stains and fibres
    for (let i = 0; i < 26; i++) {
      const x = 20 + rnd() * (w - 40);
      const y = 8 + rnd() * (h - 16);
      const r = 6 + rnd() * 22;
      const s = ctx.createRadialGradient(x, y, 0, x, y, r);
      s.addColorStop(0, 'rgba(150,100,40,0.12)');
      s.addColorStop(1, 'rgba(150,100,40,0)');
      ctx.fillStyle = s;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.strokeStyle = 'rgba(120,80,30,0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      const x = 20 + rnd() * (w - 40);
      const y = 8 + rnd() * (h - 16);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 8 + rnd() * 20, y + (rnd() - 0.5) * 3);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(120,80,30,0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 12, w - 44, h - 24);
    // rolled ends
    for (const x of [0, w - 22]) {
      const r = ctx.createLinearGradient(x, 0, x + 22, 0);
      r.addColorStop(0, '#a8844a');
      r.addColorStop(0.45, '#f4e2b8');
      r.addColorStop(1, '#9a763e');
      ctx.fillStyle = r;
      rr(ctx, x, -6, 22, h + 12, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,60,20,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

/** Glossy health-bar fill (colour gradient + highlight), cropped to show the value. */
export function barFillTex(scene: Phaser.Scene, w: number, h: number, top: string, bottom: string): string {
  return make(scene, `ui_barfill_${top}_${w}x${h}`, w, h, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    rr(ctx, 0, 0, w, h, h / 2);
    ctx.fillStyle = g;
    ctx.fill();
    rr(ctx, 4, 2, w - 8, h * 0.38, h * 0.2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
  });
}

/** Full-screen dim with a darker vignette. */
export function dimTex(scene: Phaser.Scene): string {
  return make(scene, 'ui_dim', 108, 192, (ctx) => {
    const g = ctx.createRadialGradient(54, 96, 20, 54, 96, 130);
    g.addColorStop(0, 'rgba(6,8,20,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 108, 192);
  });
}

/** Vertical gradient fill for a Text (gold by default), plus a soft drop shadow. */
export function gradientText<T extends Phaser.GameObjects.Text>(t: T, stops: readonly string[] = [UI.goldLight, UI.gold, '#c98a24']): T {
  const g = t.context.createLinearGradient(0, 0, 0, t.height);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  t.setFill(g);
  t.setShadow(0, 5, 'rgba(0,0,0,0.55)', 8, true, true);
  return t;
}

// ---------------------------------------------------------------- team HUD & ornaments

/** The group's درفش (standard) for the group bar: a gilded pole, a crimson swallow-tailed flag with a sun disc. */
export function groupBannerTex(scene: Phaser.Scene): string {
  return make(scene, 'ui_group_banner', 112, 160, (ctx) => {
    // pole + finial
    ctx.fillStyle = goldStroke(ctx, 0, 160);
    ctx.fillRect(14, 16, 7, 140);
    gem(ctx, 17.5, 12, 8);
    // flag, hanging from the pole's top
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.moveTo(21, 22);
    ctx.bezierCurveTo(50, 16, 78, 28, 104, 22);
    ctx.lineTo(104, 112);
    ctx.lineTo(80, 96);
    ctx.lineTo(60, 124);
    ctx.lineTo(42, 100);
    ctx.bezierCurveTo(34, 104, 27, 108, 21, 112);
    ctx.closePath();
    const g = ctx.createLinearGradient(21, 20, 104, 120);
    g.addColorStop(0, '#e8483a');
    g.addColorStop(0.6, '#a8201a');
    g.addColorStop(1, '#5a0c0a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = goldStroke(ctx, 20, 124);
    ctx.stroke();
    // sun disc with rays
    const cx = 62;
    const cy = 62;
    ctx.fillStyle = goldStroke(ctx, cy - 22, cy + 22);
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const r = i % 2 ? 13 : 22;
      const a = (i / 24) * Math.PI * 2;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    const d = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 11);
    d.addColorStop(0, '#fffbe0');
    d.addColorStop(1, '#f0a830');
    ctx.fillStyle = d;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** A white flame glyph (tinted per chain tier): an S-curved tongue, brightest at the base. */
export function flameIconTex(scene: Phaser.Scene): string {
  return make(scene, 'ui_flame_icon', 96, 128, (ctx) => {
    ctx.translate(48, 124);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-40, -4, -46, -40, -26, -66);
    ctx.bezierCurveTo(-18, -50, -10, -48, -8, -56);
    ctx.bezierCurveTo(-14, -80, 2, -104, 10, -120);
    ctx.bezierCurveTo(12, -96, 40, -80, 40, -46);
    ctx.bezierCurveTo(40, -18, 24, 0, 0, 0);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -120, 0, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.fill();
  });
}

/** Full-screen dim with a soft spotlight hole at (hx, hy) (0..1 of the screen), cached per spot. */
export function spotDimTex(scene: Phaser.Scene, hx: number, hy: number): string {
  const key = `ui_spotdim_${Math.round(hx * 100)}_${Math.round(hy * 100)}`;
  return make(scene, key, 108, 192, (ctx) => {
    const g = ctx.createRadialGradient(hx * 108, hy * 192, 8, hx * 108, hy * 192, 120);
    g.addColorStop(0, 'rgba(10,8,20,0)');
    g.addColorStop(0.28, 'rgba(10,8,20,0.35)');
    g.addColorStop(1, 'rgba(4,2,10,0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 108, 192);
  });
}

/**
 * Shamseh: a gilded sun medallion (sixteen petals around a lapis centre with a turquoise star),
 * crowning panels. Drawn once per radius.
 */
export function shamsehTex(scene: Phaser.Scene, r: number): string {
  const s = r * 2 + 24;
  return make(scene, `ui_shamseh_${r}`, s, s, (ctx) => {
    ctx.translate(s / 2, s / 2);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    const n = 16;
    const ri = r * 0.62;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 0.5) / n) * Math.PI * 2;
      const a2 = ((i + 1) / n) * Math.PI * 2;
      if (i === 0) ctx.moveTo(Math.cos(a0) * ri, Math.sin(a0) * ri);
      ctx.quadraticCurveTo(Math.cos(a1) * r * 1.12, Math.sin(a1) * r * 1.12, Math.cos(a2) * ri, Math.sin(a2) * ri);
    }
    ctx.closePath();
    ctx.fillStyle = goldStroke(ctx, -r, r);
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(90,50,8,0.8)';
    ctx.stroke();
    const lap = ctx.createRadialGradient(0, -r * 0.2, 2, 0, 0, r * 0.62);
    lap.addColorStop(0, UI.lapisTop);
    lap.addColorStop(1, UI.lapisBottom);
    ctx.fillStyle = lap;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = UI.gold;
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const rs = i % 2 ? r * 0.2 : r * 0.44;
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * rs, Math.sin(a) * rs);
    }
    ctx.closePath();
    const st = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.44);
    st.addColorStop(0, '#d8fff8');
    st.addColorStop(1, UI.turquoise);
    ctx.fillStyle = st;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = goldStroke(ctx, -r * 0.4, r * 0.4);
    ctx.stroke();
    gem(ctx, 0, 0, r * 0.1);
  });
}

/**
 * Lachak: a quarter-medallion of gold arabesque for a panel's inner corner (drawn for the top-left
 * corner; flip it for the others).
 */
export function lachakTex(scene: Phaser.Scene, size: number): string {
  return make(scene, `ui_lachak_${size}`, size, size, (ctx) => {
    const s = size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(s * 0.92, 0);
    ctx.bezierCurveTo(s * 0.8, s * 0.2, s * 0.62, s * 0.2, s * 0.55, s * 0.32);
    ctx.bezierCurveTo(s * 0.42, s * 0.42, s * 0.42, s * 0.42, s * 0.32, s * 0.55);
    ctx.bezierCurveTo(s * 0.2, s * 0.62, s * 0.2, s * 0.8, 0, s * 0.92);
    ctx.closePath();
    const f = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
    f.addColorStop(0, 'rgba(60,196,180,0.55)');
    f.addColorStop(1, 'rgba(39,56,110,0.2)');
    ctx.fillStyle = f;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = goldStroke(ctx, 0, s);
    ctx.stroke();
    // eslimi curls
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,220,140,0.85)';
    const curls: [number, number, number][] = [[s * 0.42, s * 0.14, Math.PI], [s * 0.14, s * 0.42, Math.PI * 1.5]];
    for (const [x, y, a0] of curls) {
      ctx.beginPath();
      ctx.arc(x, y, s * 0.1, a0, a0 + Math.PI * 1.5);
      ctx.stroke();
    }
    gem(ctx, s * 0.2, s * 0.2, s * 0.07);
  });
}

// ---------------------------------------------------------------- screens (M5)

/** The tutorial's ghost finger: a soft white index finger pointing up, with a little of the hand. */
export function ghostFingerTex(scene: Phaser.Scene): string {
  return make(scene, 'ui_ghost_finger', 140, 220, (ctx) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    // index finger
    rr(ctx, 52, 14, 38, 120, 19);
    ctx.fill();
    // folded fingers and palm
    rr(ctx, 30, 108, 92, 96, 34);
    ctx.fill();
    // thumb
    ctx.beginPath();
    ctx.ellipse(34, 130, 16, 34, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(60,40,20,0.35)';
    ctx.lineWidth = 3;
    rr(ctx, 52, 14, 38, 120, 19);
    ctx.stroke();
    // knuckle creases and nail
    ctx.beginPath();
    ctx.moveTo(62, 112);
    ctx.lineTo(80, 112);
    ctx.moveTo(90, 132);
    ctx.lineTo(112, 132);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,220,200,0.6)';
    rr(ctx, 60, 20, 22, 26, 10);
    ctx.fill();
  });
}

/** Round speaker button face, on (sound waves) or off (a cross). */
export function speakerTex(scene: Phaser.Scene, on: boolean): string {
  return make(scene, `ui_speaker_${on ? 'on' : 'off'}`, 120, 120, (ctx) => {
    const c = 60;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    const g = ctx.createLinearGradient(0, 10, 0, 110);
    g.addColorStop(0, UI.lapisTop);
    g.addColorStop(1, UI.lapisBottom);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c, c, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 5;
    ctx.strokeStyle = goldStroke(ctx, 10, 110);
    ctx.stroke();
    ctx.fillStyle = UI.goldLight;
    ctx.beginPath();
    ctx.moveTo(36, 50);
    ctx.lineTo(50, 50);
    ctx.lineTo(66, 36);
    ctx.lineTo(66, 84);
    ctx.lineTo(50, 70);
    ctx.lineTo(36, 70);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = UI.goldLight;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    if (on) {
      for (const r of [12, 22]) {
        ctx.beginPath();
        ctx.arc(68, 60, r, -0.8, 0.8);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = '#ff7a5c';
      ctx.beginPath();
      ctx.moveTo(76, 48);
      ctx.lineTo(92, 72);
      ctx.moveTo(92, 48);
      ctx.lineTo(76, 72);
      ctx.stroke();
    }
  });
}

/** Path of a five-point star centred at (cx, cy). */
export function starPath(ctx: Ctx, cx: number, cy: number, r: number, inner = 0.46): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr2 = i % 2 ? r * inner : r;
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    ctx.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2);
  }
  ctx.closePath();
}

/** A result star: gold and bevelled (`full`), or an empty carved socket. */
export function starTex(scene: Phaser.Scene, full: boolean): string {
  return make(scene, `ui_star_${full ? 'full' : 'empty'}`, 180, 180, (ctx) => {
    const c = 90;
    if (full) {
      ctx.save();
      ctx.shadowColor = 'rgba(80,40,0,0.6)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 6;
      starPath(ctx, c, c + 4, 78);
      ctx.fillStyle = goldStroke(ctx, 10, 170);
      ctx.fill();
      ctx.restore();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#8a5010';
      ctx.stroke();
      starPath(ctx, c, c + 6, 48);
      const g = ctx.createLinearGradient(0, 40, 0, 140);
      g.addColorStop(0, '#fffbe0');
      g.addColorStop(1, '#f0b030');
      ctx.fillStyle = g;
      ctx.fill();
      gem(ctx, c, c + 6, 10);
    } else {
      starPath(ctx, c, c + 4, 78);
      ctx.fillStyle = 'rgba(7,11,28,0.7)';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(243,198,90,0.45)';
      ctx.stroke();
    }
  });
}

/** Vertical three-stop gradient (the title's dusk grade, the result's backdrops). */
export function vGradientTex(scene: Phaser.Scene, key: string, top: string, mid: string, bottom: string): string {
  return make(scene, key, 4, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, top);
    g.addColorStop(0.45, mid);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
  });
}

/** Soft god-rays fanning from the centre (victory light), for ADD blending and slow rotation. */
export function raysTex(scene: Phaser.Scene): string {
  return make(scene, 'ui_rays', 512, 512, (ctx) => {
    const c = 256;
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const w = 0.09 + 0.05 * ((i * 7) % 3);
      const g = ctx.createRadialGradient(c, c, 0, c, c, 256);
      g.addColorStop(0, 'rgba(255,240,200,0.55)');
      g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, 256, a - w, a + w);
      ctx.closePath();
      ctx.fill();
    }
  });
}

/** A Telegram-like chat bubble (tail on the right, RTL), sized per call. */
export function bubbleTex(scene: Phaser.Scene, w: number, h: number): string {
  return make(scene, `ui_bubble_${w}x${h}`, w + 30, h + 16, (ctx) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#fbf3df';
    rr(ctx, 4, 4, w, h, 26);
    ctx.fill();
    // tail
    ctx.beginPath();
    ctx.moveTo(w - 14, h - 22);
    ctx.quadraticCurveTo(w + 6, h + 2, w + 22, h + 6);
    ctx.quadraticCurveTo(w - 4, h + 4, w - 30, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

/** A gold eslimi divider: a line fading at both ends, twin curls and a gem at the centre. */
export function dividerTex(scene: Phaser.Scene, w: number): string {
  return make(scene, `ui_divider_${w}`, w, 40, (ctx) => {
    const y = 20;
    ctx.lineCap = 'round';
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(243,198,90,0)');
    g.addColorStop(0.2, 'rgba(243,198,90,0.8)');
    g.addColorStop(0.8, 'rgba(243,198,90,0.8)');
    g.addColorStop(1, 'rgba(243,198,90,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(w / 2 - 60, y);
    ctx.moveTo(w / 2 + 60, y);
    ctx.lineTo(w - 10, y);
    ctx.stroke();
    ctx.strokeStyle = UI.gold;
    ctx.lineWidth = 2.5;
    for (const side of [-1, 1]) {
      // an S-curl on each side of the gem
      const x = w / 2 + side * 34;
      ctx.beginPath();
      ctx.arc(x, y - 6, 7, Math.PI / 2, Math.PI / 2 + Math.PI * 1.4 * side, side < 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + side * 14, y + 6, 7, -Math.PI / 2, -Math.PI / 2 - Math.PI * 1.4 * side, side > 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + side * 14 + side * 7, y);
      ctx.lineTo(w / 2 + side * 60, y);
      ctx.stroke();
    }
    gem(ctx, w / 2, y, 10);
  });
}
