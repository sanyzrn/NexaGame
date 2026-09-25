/**
 * Code-drawn stand-ins for missing art. Each one has the manifest key, size and anchor,
 * so the real PNG drops in with no code change. They only need to be readable, not pretty.
 */
import Phaser from 'phaser';
import { ARENA } from '../data/arena';
import { BOSS } from '../data/entities';
import { MANIFEST_BY_KEY, type AssetDef } from './manifest';

type Ctx = CanvasRenderingContext2D;

export function createPlaceholder(scene: Phaser.Scene, def: AssetDef, labels = false): void {
  const tex = scene.textures.createCanvas(def.key, def.w, def.h);
  if (tex) paint(tex, def, labels);
}

/** Repaints every placeholder with or without its name label (labels show only with the debug overlay). */
export function setPlaceholderLabels(scene: Phaser.Scene, keys: readonly string[], on: boolean): void {
  for (const key of keys) {
    const def = MANIFEST_BY_KEY.get(key);
    const tex = scene.textures.get(key);
    if (def && tex instanceof Phaser.Textures.CanvasTexture) paint(tex, def, on);
  }
}

function paint(tex: Phaser.Textures.CanvasTexture, def: AssetDef, labels: boolean): void {
  const ctx = tex.getContext();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, def.w, def.h);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const pose = def.ph.pose ?? '';
  switch (def.ph.kind) {
    case 'bg': paintArena(ctx, def.w, def.h, labels); break;
    case 'card': paintCard(ctx, def.w, def.h); break;
    case 'hero': paintHero(ctx, pose); break;
    case 'imp': paintImp(ctx, pose); break;
    case 'shield': paintShield(ctx, pose); break;
    case 'flyer': paintFlyer(ctx, pose); break;
    case 'boss': paintBoss(ctx, pose); break;
    case 'pillar': paintPillar(ctx); break;
    case 'arrow': paintArrow(ctx); break;
    case 'brazier': paintBrazier(ctx); break;
    case 'banner': paintBanner(ctx); break;
    case 'pot': paintPot(ctx); break;
    case 'bossbar': paintBossBar(ctx); break;
    case 'heart': paintHeart(ctx, def.w, pose === 'full'); break;
    case 'btnPause': paintPauseButton(ctx, def.w); break;
    case 'toast': paintToast(ctx, def.w, def.h); break;
    case 'comboBadge': paintComboBadge(ctx, def.w); break;
  }
  if (labels && ['hero', 'imp', 'shield', 'flyer', 'boss', 'pillar'].includes(def.ph.kind)) label(ctx, def);
  tex.refresh();
}

// ---------------------------------------------------------------- helpers

function label(ctx: Ctx, def: AssetDef): void {
  ctx.save();
  ctx.font = `${Math.max(14, Math.round(def.w / 22))}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const tw = ctx.measureText(def.key).width + 12;
  const fh = Math.max(14, Math.round(def.w / 22)) + 6;
  ctx.fillRect(def.w / 2 - tw / 2, def.h - fh - 2, tw, fh);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(def.key, def.w / 2, def.h - 4);
  ctx.restore();
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke?: string, lw = 4): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function poly(ctx: Ctx, pts: number[], fill: string, stroke?: string, lw = 4): void {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string, lw: number): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string, lw = 4): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function horns(ctx: Ctx, cx: number, y: number, spread: number, size: number): void {
  const c = '#eadbb8';
  poly(ctx, [cx - spread, y, cx - spread - size * 0.6, y - size, cx - spread + size * 0.35, y - size * 0.15], c, '#6b5a3a', 3);
  poly(ctx, [cx + spread, y, cx + spread + size * 0.6, y - size, cx + spread - size * 0.35, y - size * 0.15], c, '#6b5a3a', 3);
}

function mace(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.fillStyle = '#3d3d44';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    poly(ctx, [x + Math.cos(a - 0.3) * r, y + Math.sin(a - 0.3) * r, x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5, x + Math.cos(a + 0.3) * r, y + Math.sin(a + 0.3) * r], '#3d3d44');
  }
  ellipse(ctx, x, y, r, r, '#56565f', '#222', 3);
}

function eyes(ctx: Ctx, x: number, y: number, gap: number, r: number, hit: boolean, color = '#ffd23a'): void {
  for (const ex of [x - gap, x + gap]) {
    if (hit) {
      line(ctx, ex - r, y - r, ex + r, y + r, '#222', 4);
      line(ctx, ex + r, y - r, ex - r, y + r, '#222', 4);
    } else {
      ellipse(ctx, ex, y, r, r * 0.8, color, '#2a0a0a', 2);
      ellipse(ctx, ex, y, r * 0.35, r * 0.35, '#1a0505');
    }
  }
}

// ---------------------------------------------------------------- arena

function paintArena(ctx: Ctx, w: number, h: number, labels: boolean): void {
  const { left, right, top } = ARENA.walls;
  const rand = rng(7);

  // Sky / ruins behind the top wall
  const sky = ctx.createLinearGradient(0, 0, 0, top);
  sky.addColorStop(0, '#f0cf98');
  sky.addColorStop(1, '#b8946a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, top);
  for (let i = 0; i < 7; i++) {
    const x = 60 + i * 160 + rand() * 40;
    const ch = 180 + rand() * 140;
    ctx.fillStyle = 'rgba(120,90,60,0.35)';
    ctx.fillRect(x, top - 130 - ch, 46, ch);
  }

  // Floor
  ctx.fillStyle = '#d9c59a';
  ctx.fillRect(0, top, w, h - top);
  const tile = 90;
  for (let y = top; y < h; y += tile) {
    for (let x = left; x < right; x += tile) {
      const s = 200 + Math.floor(rand() * 26);
      ctx.fillStyle = `rgb(${s + 17},${s},${s - 40})`;
      ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
    }
  }
  // Turquoise inlays
  for (const [x, y] of [[540, 700], [300, 1000], [780, 1080], [540, 1300], [260, 1560], [820, 1600]]) {
    poly(ctx, [x, y - 34, x + 34, y, x, y + 34, x - 34, y], '#3aa39a', '#1f6d67', 3);
    poly(ctx, [x, y - 14, x + 14, y, x, y + 14, x - 14, y], '#9fe0d6');
  }

  // Side stone edges
  for (const [x0, x1] of [[0, left], [right, w]]) {
    ctx.fillStyle = '#b39f78';
    ctx.fillRect(x0, top, x1 - x0, h - top);
    for (let y = top; y < h; y += 70) {
      const off = ((y / 70) % 2) * 35;
      for (let x = x0 - off; x < x1; x += 70) {
        ctx.fillStyle = `rgba(0,0,0,${0.05 + rand() * 0.1})`;
        ctx.fillRect(Math.max(x0, x + 3), y + 3, Math.min(64, x1 - Math.max(x0, x + 3)), 64);
      }
    }
    // cypress trees
    for (let y = top + 160; y < h - 100; y += 330) {
      const cx = (x0 + x1) / 2 + (rand() - 0.5) * 30;
      ellipse(ctx, cx, y, 26, 90, '#3f6a3a', '#27452a', 3);
    }
  }
  line(ctx, left, top, left, h, 'rgba(60,40,20,0.35)', 6);
  line(ctx, right, top, right, h, 'rgba(60,40,20,0.35)', 6);

  // Top wall
  const wallTop = top - 150;
  ctx.fillStyle = '#cdb88e';
  ctx.fillRect(0, wallTop, w, 150);
  for (let y = wallTop; y < top; y += 50) {
    const off = ((y - wallTop) / 50) % 2 ? 45 : 0;
    for (let x = -off; x < w; x += 90) {
      ctx.strokeStyle = 'rgba(90,70,40,0.45)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, 90, 50);
    }
  }
  for (const x of [220, 860]) rrect(ctx, x - 80, wallTop + 20, 160, 110, 8, '#bfa87c', '#8a7550', 4);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, top - 6, w, 14);

  // Mosaic platform
  const p = ARENA.platform;
  ellipse(ctx, p.x, p.y, p.r + 18, p.r * 0.62 + 12, '#b18a3a', '#6e5320', 6);
  ellipse(ctx, p.x, p.y, p.r, p.r * 0.62, '#2f8f8a', '#e2c16a', 8);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(1, 0.62);
  for (let i = 0; i < 16; i++) {
    ctx.rotate(Math.PI / 8);
    poly(ctx, [0, -40, 20, -p.r * 0.55, 0, -p.r * 0.92, -20, -p.r * 0.55], i % 2 ? '#7fd1c4' : '#e2c16a');
  }
  ctx.restore();
  ellipse(ctx, p.x, p.y, 60, 38, '#e2c16a', '#6e5320', 4);

  // Vignette
  const v = ctx.createRadialGradient(w / 2, h * 0.55, h * 0.3, w / 2, h * 0.55, h * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(30,15,5,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);

  if (labels) {
    ctx.font = '28px monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.textAlign = 'center';
    ctx.fillText('bg_arena_01 (placeholder)', w / 2, top + 40);
  }
}

function paintCard(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2b1c3d');
  g.addColorStop(1, '#120c08');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const sun = ctx.createRadialGradient(w / 2, 520, 20, w / 2, 520, 420);
  sun.addColorStop(0, 'rgba(255,205,90,0.55)');
  sun.addColorStop(1, 'rgba(255,205,90,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d9aa45';
  ctx.lineWidth = 12;
  ctx.strokeRect(40, 40, w - 80, h - 80);
  ctx.lineWidth = 3;
  ctx.strokeRect(64, 64, w - 128, h - 128);
}

// ---------------------------------------------------------------- characters

function paintHero(ctx: Ctx, pose: string): void {
  const cx = 256;
  const feet = 461;
  ellipse(ctx, cx, feet, 80, 20, 'rgba(0,0,0,0.3)');
  ctx.save();
  if (pose === 'hurt') {
    ctx.translate(cx, feet);
    ctx.rotate(-0.12);
    ctx.translate(-cx, -feet);
  }
  const tunic = pose === 'hurt' ? '#b8453a' : '#2f5fb8';
  const skin = '#d9a37a';
  // cape
  poly(ctx, [cx - 58, 300, cx + 58, 300, cx + 86, 452, cx + 40, 438, cx, 456, cx - 40, 438, cx - 86, 452], '#a8261f', '#5e120e', 3);
  // legs
  rrect(ctx, cx - 32, 398, 24, 60, 8, '#5b3a22');
  rrect(ctx, cx + 8, 398, 24, 60, 8, '#5b3a22');
  // torso
  rrect(ctx, cx - 52, 285, 104, 125, 26, tunic, '#162c5a', 4);
  ctx.fillStyle = '#e0b040';
  ctx.fillRect(cx - 52, 380, 104, 12);
  // quiver
  rrect(ctx, cx - 70, 270, 26, 90, 8, '#7a4a1f', '#3e240c', 3);

  const bow = (x0: number, y0: number, x1: number, y1: number, cxp: number, cyp: number, sx: number, sy: number) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cxp, cyp, x1, y1);
    ctx.strokeStyle = '#7a4a1f';
    ctx.lineWidth = 13;
    ctx.stroke();
    ctx.strokeStyle = '#e0b040';
    ctx.lineWidth = 4;
    ctx.stroke();
    line(ctx, x0, y0, sx, sy, '#f4ecd8', 3);
    line(ctx, x1, y1, sx, sy, '#f4ecd8', 3);
  };

  if (pose === 'draw' || pose === 'full') {
    const pull = pose === 'full' ? 205 : 165;
    const bend = pose === 'full' ? 0 : 25;
    const half = pose === 'full' ? 108 : 122;
    line(ctx, cx - 40, 298, cx - 22, 118, skin, 18);
    line(ctx, cx + 40, 298, cx + 10, pull, skin, 18);
    bow(cx - half, 122, cx + half, 122, cx, bend, cx, pull);
    // nocked arrow
    line(ctx, cx, pull, cx, 42, '#8a5a2b', 6);
    poly(ctx, [cx - 11, 50, cx, 22, cx + 11, 50], '#e6b843');
  } else {
    line(ctx, cx - 46, 300, cx - 72, 396, skin, 18);
    line(ctx, cx + 46, 300, cx + 80, 392, skin, 18);
    bow(cx + 92, 250, cx + 92, 452, cx + 150, 351, cx + 92, 351);
  }
  // head (seen from behind) + helmet + plume
  ellipse(ctx, cx, 262, 38, 38, '#3a2616');
  ctx.beginPath();
  ctx.arc(cx, 262, 38, Math.PI, 0);
  ctx.fillStyle = '#d9a83a';
  ctx.fill();
  poly(ctx, [cx - 6, 230, cx + 6, 230, cx + 30, 196, cx + 4, 214], '#2fb5a8', '#15665f', 3);
  ctx.restore();
}

function paintImp(ctx: Ctx, pose: string): void {
  const hit = pose === 'hit';
  const cx = 128;
  ellipse(ctx, cx, 230, 50, 12, 'rgba(0,0,0,0.3)');
  const step = pose === 'walk2' ? -1 : 1;
  line(ctx, cx - 20, 190, cx - 26 - step * 6, 226, '#4a1f55', 14);
  line(ctx, cx + 20, 190, cx + 26 - step * 6, 226, '#4a1f55', 14);
  const body = hit ? '#d4b0de' : '#7b3a8c';
  line(ctx, cx - 40, 150, cx - 66, 172 - step * 10, body, 13);
  line(ctx, cx + 40, 150, cx + 66, 172 + step * 10, body, 13);
  mace(ctx, cx - 72, 182 - step * 10, 15);
  mace(ctx, cx + 72, 182 + step * 10, 15);
  ellipse(ctx, cx, 150, 48, 54, body, '#3a1542', 4);
  ellipse(ctx, cx, 168, 28, 26, hit ? '#efe0f2' : '#9a58a8');
  horns(ctx, cx, 106, 26, 42);
  eyes(ctx, cx, 132, 16, 9, hit);
  poly(ctx, [cx - 16, 150, cx - 8, 160, cx, 150, cx + 8, 160, cx + 16, 150], '#fff', '#3a1542', 2);
}

function paintShield(ctx: Ctx, pose: string): void {
  const hit = pose === 'hit';
  const cx = 192;
  ellipse(ctx, cx, 346, 90, 20, 'rgba(0,0,0,0.3)');
  const step = pose === 'walk2' ? -1 : 1;
  line(ctx, cx - 34, 290, cx - 40 - step * 8, 340, '#3f1a48', 22);
  line(ctx, cx + 34, 290, cx + 40 - step * 8, 340, '#3f1a48', 22);
  const body = hit ? '#d0a8da' : '#6d2f7a';
  line(ctx, cx - 70, 200, cx - 118, 250, body, 20);
  mace(ctx, cx - 126, 262, 22);
  ellipse(ctx, cx, 215, 86, 98, body, '#2e1036', 5);
  ellipse(ctx, cx - 72, 160, 36, 28, '#8a6a3a', '#3d2a12', 4);
  ellipse(ctx, cx + 72, 160, 36, 28, '#8a6a3a', '#3d2a12', 4);
  horns(ctx, cx, 120, 36, 58);
  eyes(ctx, cx, 150, 22, 11, hit, '#ff5a3a');
  // Shield covers the front (towards the hero)
  ellipse(ctx, cx + 22, 262, 92, 92, hit ? '#f0d8a0' : '#b8863a', '#5a3a12', 8);
  ellipse(ctx, cx + 22, 262, 64, 64, 'rgba(0,0,0,0)', '#e0b050', 5);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    poly(ctx, [cx + 22 + Math.cos(a) * 52, 262 + Math.sin(a) * 52, cx + 22 + Math.cos(a + 0.2) * 18, 262 + Math.sin(a + 0.2) * 18, cx + 22 + Math.cos(a - 0.2) * 18, 262 + Math.sin(a - 0.2) * 18], '#e0b050');
  }
  ellipse(ctx, cx + 22, 262, 16, 16, '#7a5220');
}

function paintFlyer(ctx: Ctx, pose: string): void {
  const hit = pose === 'hit';
  const cx = 160;
  const cy = 160;
  const tipY = pose === 'down' ? 250 : 60;
  const wing = hit ? '#b890c4' : '#5a2466';
  poly(ctx, [cx - 30, cy - 10, cx - 150, tipY, cx - 110, cy + 10, cx - 70, cy + 30], wing, '#2a0c30', 4);
  poly(ctx, [cx + 30, cy - 10, cx + 150, tipY, cx + 110, cy + 10, cx + 70, cy + 30], wing, '#2a0c30', 4);
  line(ctx, cx - 20, cy + 40, cx - 34, cy + 80, '#4a1f55', 10);
  line(ctx, cx + 20, cy + 40, cx + 34, cy + 80, '#4a1f55', 10);
  mace(ctx, cx - 40, cy + 94, 13);
  mace(ctx, cx + 40, cy + 94, 13);
  ellipse(ctx, cx, cy, 46, 48, hit ? '#e0c4ea' : '#7b3a8c', '#3a1542', 4);
  horns(ctx, cx, cy - 36, 22, 36);
  eyes(ctx, cx, cy - 10, 15, 9, hit);
}

function paintBoss(ctx: Ctx, pose: string): void {
  const cx = 512;
  const roar = pose === 'roar';
  const stunned = pose === 'stunned';
  ctx.save();
  if (stunned) {
    ctx.translate(cx, 614);
    ctx.rotate(0.08);
    ctx.translate(-cx, -614);
  }
  const skin = '#ddd8cf';
  const arm = (sx: number, sy: number, hx: number, hy: number) => {
    line(ctx, sx, sy, hx, hy, skin, 120);
    line(ctx, sx, sy, hx, hy, '#b9b2a6', 4);
    ellipse(ctx, hx, hy, 92, 64, skin, '#8e877b', 5);
    for (let i = -2; i <= 2; i++) line(ctx, hx + i * 30, hy + 20, hx + i * 34, hy + 62, '#8e877b', 5);
  };
  if (roar) {
    arm(300, 470, 170, 300);
    arm(724, 470, 854, 300);
  } else {
    arm(300, 470, 260, 870);
    arm(724, 470, 764, 870);
  }
  // mane + torso
  ellipse(ctx, cx, 300, 170, 170, '#2a1d1a');
  rrect(ctx, 260, 400, 504, 420, 120, skin, '#8e877b', 6);
  ellipse(ctx, 300, 460, 112, 96, '#8a6a3a', '#3d2a12', 6);
  ellipse(ctx, 724, 460, 112, 96, '#8a6a3a', '#3d2a12', 6);
  line(ctx, 330, 420, 694, 640, '#6b4a22', 22);
  line(ctx, 694, 420, 330, 640, '#6b4a22', 22);
  // weak point (same spot as the real art, so the gem glow lines up)
  const ay = MANIFEST_BY_KEY.get('boss_idle')!.oy * 1024;
  const zone = BOSS.zones.boss_idle;
  const gx = cx + zone.gem.x;
  const gy = ay + zone.gem.y;
  ellipse(ctx, gx, gy, 62, 62, '#e0b050', '#5a3a12', 6);
  ellipse(ctx, gx, gy, 42, 42, '#e0302a', '#6a0a08', 4);
  ellipse(ctx, gx - 12, gy - 12, 12, 10, '#ffb0a0');
  // head
  horns(ctx, cx, 230, 90, 150);
  ellipse(ctx, cx, 300, 118, 124, skin, '#8e877b', 6);
  poly(ctx, [cx - 90, 360, cx + 90, 360, cx + 50, 470, cx, 490, cx - 50, 470], '#2a1d1a');
  if (stunned) {
    for (const ex of [cx - 46, cx + 46]) {
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 6; a += 0.3) ctx.lineTo(ex + Math.cos(a) * a * 1.4, 290 + Math.sin(a) * a * 1.4);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      poly(ctx, starPts(cx + Math.cos(a) * 170, 150 + Math.sin(a) * 40, 22, 9, 5), '#ffd23a', '#7a5a10', 2);
    }
  } else {
    const [e0, e1] = zone.eyes;
    eyes(ctx, cx + (e0.x + e1.x) / 2, ay + e0.y, (e1.x - e0.x) / 2, 17, false, '#ff3a2a');
    line(ctx, cx - 80, 250, cx - 16, 272, '#2a1d1a', 12);
    line(ctx, cx + 80, 250, cx + 16, 272, '#2a1d1a', 12);
  }
  if (roar) {
    ellipse(ctx, cx, 385, 58, 46, '#5a0f0c', '#2a0505', 4);
    poly(ctx, [cx - 40, 350, cx - 30, 372, cx - 20, 350, cx - 10, 372, cx, 350, cx + 10, 372, cx + 20, 350, cx + 30, 372, cx + 40, 350], '#fff');
  } else {
    line(ctx, cx - 36, 380, cx + 36, 380, '#5a0f0c', 8);
  }
  ctx.restore();
}

function starPts(x: number, y: number, ro: number, ri: number, n: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  return pts;
}

// ---------------------------------------------------------------- props

function paintPillar(ctx: Ctx): void {
  ellipse(ctx, 128, 604, 120, 24, 'rgba(0,0,0,0.3)');
  rrect(ctx, 28, 540, 200, 66, 6, '#cbb892', '#8a7550', 4);
  rrect(ctx, 44, 518, 168, 28, 4, '#d6c49c', '#8a7550', 3);
  const g = ctx.createLinearGradient(58, 0, 198, 0);
  g.addColorStop(0, '#b9a67f');
  g.addColorStop(0.45, '#eee2c4');
  g.addColorStop(1, '#c4b28a');
  ctx.fillStyle = g;
  ctx.fillRect(58, 110, 140, 410);
  for (let x = 78; x < 198; x += 20) line(ctx, x, 114, x, 516, 'rgba(120,100,70,0.35)', 3);
  ctx.fillStyle = '#2f9a92';
  ctx.fillRect(58, 250, 140, 38);
  for (let x = 72; x < 198; x += 28) poly(ctx, [x, 256, x + 9, 269, x, 282, x - 9, 269], '#bff0e8');
  rrect(ctx, 36, 72, 184, 44, 6, '#d6c49c', '#8a7550', 4);
  poly(ctx, [44, 74, 60, 40, 96, 52, 120, 26, 160, 44, 190, 30, 212, 74], '#cbb892', '#8a7550', 4);
}

function paintArrow(ctx: Ctx): void {
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(24, 29, 182, 6);
  poly(ctx, [200, 18, 238, 32, 200, 46], '#e6b843', '#7a5a10', 2);
  poly(ctx, [24, 32, 70, 32, 56, 12, 20, 14], '#c0392b');
  poly(ctx, [24, 32, 70, 32, 56, 52, 20, 50], '#f2e6d0');
}

function paintBrazier(ctx: Ctx): void {
  line(ctx, 90, 150, 70, 228, '#4a3218', 10);
  line(ctx, 166, 150, 186, 228, '#4a3218', 10);
  line(ctx, 128, 160, 128, 230, '#4a3218', 10);
  ctx.beginPath();
  ctx.ellipse(128, 140, 86, 48, 0, 0, Math.PI);
  ctx.fillStyle = '#9a6a2a';
  ctx.fill();
  ellipse(ctx, 128, 140, 86, 18, '#3a220e', '#d1a04a', 6);
  ellipse(ctx, 128, 96, 44, 60, '#ff8a1c');
  ellipse(ctx, 128, 108, 28, 40, '#ffd23a');
}

function paintBanner(ctx: Ctx): void {
  rrect(ctx, 18, 12, 220, 18, 8, '#d9aa45', '#6e5320', 3);
  poly(ctx, [40, 30, 216, 30, 216, 440, 186, 474, 160, 440, 128, 482, 96, 440, 70, 474, 40, 440], '#b3261e', '#5e120e', 4);
  ctx.strokeStyle = '#e0b040';
  ctx.lineWidth = 5;
  ctx.strokeRect(56, 46, 144, 370);
  ellipse(ctx, 128, 190, 56, 56, 'rgba(0,0,0,0)', '#e0b040', 6);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    line(ctx, 128 + Math.cos(a) * 64, 190 + Math.sin(a) * 64, 128 + Math.cos(a) * 80, 190 + Math.sin(a) * 80, '#e0b040', 5);
  }
  ellipse(ctx, 128, 190, 30, 30, '#e0b040');
}

function paintPot(ctx: Ctx): void {
  ellipse(ctx, 96, 172, 56, 12, 'rgba(0,0,0,0.3)');
  rrect(ctx, 70, 34, 52, 36, 6, '#a0552a', '#5a2a10', 3);
  ellipse(ctx, 96, 118, 62, 54, '#b5652f', '#5a2a10', 4);
  ellipse(ctx, 96, 34, 32, 8, '#7a3a18', '#5a2a10', 3);
  ctx.fillStyle = '#2f8f8a';
  ctx.fillRect(40, 108, 112, 16);
  for (let x = 48; x < 150; x += 16) poly(ctx, [x, 110, x + 6, 116, x, 122, x - 6, 116], '#e2c16a');
}

// ---------------------------------------------------------------- UI

function paintBossBar(ctx: Ctx): void {
  // Drawn for a 1024x160 strip, centred in the 1024x342 box (the real art's 3:1 frame).
  ctx.translate(0, 91);
  rrect(ctx, 24, 44, 976, 96, 30, '#1b2340', '#d9aa45', 8);
  rrect(ctx, 76, 76, 872, 34, 12, '#0b0f1c', '#6e5320', 3);
  for (const x of [44, 980]) {
    ellipse(ctx, x, 92, 40, 40, '#d9aa45', '#6e5320', 5);
    ellipse(ctx, x, 92, 20, 20, '#1b2340');
  }
  rrect(ctx, 352, 4, 320, 56, 16, '#1b2340', '#d9aa45', 5);
}

function paintHeart(ctx: Ctx, size: number, full: boolean): void {
  const s = size / 128;
  ctx.save();
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(64, 112);
  ctx.bezierCurveTo(12, 78, 8, 42, 24, 26);
  ctx.bezierCurveTo(40, 10, 60, 18, 64, 36);
  ctx.bezierCurveTo(68, 18, 88, 10, 104, 26);
  ctx.bezierCurveTo(120, 42, 116, 78, 64, 112);
  ctx.closePath();
  ctx.fillStyle = full ? '#e0312b' : '#3a2a2a';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = full ? '#5a0f0c' : '#1a1010';
  ctx.stroke();
  if (full) ellipse(ctx, 40, 40, 12, 8, 'rgba(255,255,255,0.6)');
  ctx.restore();
}

function paintPauseButton(ctx: Ctx, size: number): void {
  const c = size / 2;
  ellipse(ctx, c, c, c - 8, c - 8, '#1b2340', '#d9aa45', 9);
  ellipse(ctx, c, c, c - 22, c - 22, 'rgba(0,0,0,0)', '#6e5320', 3);
  rrect(ctx, c - 26, c - 30, 18, 60, 5, '#f4e6c4');
  rrect(ctx, c + 8, c - 30, 18, 60, 5, '#f4e6c4');
}

function paintToast(ctx: Ctx, w: number, h: number): void {
  rrect(ctx, 8, 8, w - 16, h - 16, 36, 'rgba(20,16,12,0.9)', '#d9aa45', 5);
}

function paintComboBadge(ctx: Ctx, size: number): void {
  const c = size / 2;
  poly(ctx, starPts(c, c, c - 6, c * 0.62, 12), '#f08a1c', '#7a3a08', 5);
  ellipse(ctx, c, c, c * 0.6, c * 0.6, '#ffcc4a', '#7a3a08', 5);
}
