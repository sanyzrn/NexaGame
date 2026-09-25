import type Phaser from 'phaser';
import { FEEL } from '../config/feel';

/** Small textures for code-generated effects: glows, sparks, dashes, shadows, flames, smoke, light. */
export function createFxTextures(scene: Phaser.Scene): void {
  canvas(scene, 'fx_glow', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });

  canvas(scene, 'fx_spark', 24, 24, (ctx) => {
    const g = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 24, 24);
  });

  canvas(scene, 'fx_dash', 28, 12, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(1, 1, 26, 10, 5);
    ctx.fill();
  });

  canvas(scene, 'fx_star', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? 7 : 32;
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  });

  canvas(scene, 'fx_ring', 128, 128, (ctx) => {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Soft floor shadow (tinted and scaled per object).
  canvas(scene, 'fx_shadow', 128, 64, (ctx) => {
    ctx.save();
    ctx.scale(1, 0.5);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    ctx.restore();
  });

  // Flame tongue: stacked soft blobs, wide and bright at the base, thin at the tip.
  canvas(scene, 'fx_flame', 64, 128, (ctx) => {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const y = 108 - t * 92;
      const r = 26 * (1 - t) + 5;
      const g = ctx.createRadialGradient(32, y, 0, 32, y, r);
      g.addColorStop(0, `rgba(255,255,255,${0.32 * (1 - t * 0.6)})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 128);
    }
  });

  // Light shaft: soft band, bright at the top, fading along its length.
  canvas(scene, 'fx_shaft', 64, 256, (ctx) => {
    const img = ctx.createImageData(64, 256);
    for (let y = 0; y < 256; y++) {
      const v = y / 255;
      const along = Math.min(1, v * 8) * Math.pow(1 - v, 1.3);
      for (let x = 0; x < 64; x++) {
        const u = (x - 31.5) / 16;
        const i = (y * 64 + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(255 * along * Math.exp(-u * u));
      }
    }
    ctx.putImageData(img, 0, 0);
  });

  // Smoke puff: a few overlapping soft blobs (seeded, so it's the same every run).
  canvas(scene, 'fx_smoke', 64, 64, (ctx) => {
    let s = 17;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 7; i++) {
      const x = 32 + (rnd() - 0.5) * 22;
      const y = 32 + (rnd() - 0.5) * 22;
      const r = 12 + rnd() * 10;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    }
  });

  createGradeTextures(scene);
  createBossFightTextures(scene);
}

/** Barrier plates, feathers, the Simorgh's shadow, stone debris and a light beam. */
function createBossFightTextures(scene: Phaser.Scene): void {
  // One plate of the barrier's hexagonal ward: bronze band carved with cuneiform-like wedges.
  canvas(scene, 'fx_rune_plate', 160, 40, (ctx) => {
    const g = ctx.createLinearGradient(0, 4, 0, 36);
    g.addColorStop(0, '#fff0b0');
    g.addColorStop(0.4, '#e8b04a');
    g.addColorStop(1, '#8a5a18');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(4, 6, 152, 28, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,245,210,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(70,35,5,0.85)';
    let x = 18;
    let seed = 3;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    while (x < 144) {
      // a wedge (triangle head + tail), sometimes stacked
      const v = rnd() < 0.5;
      ctx.beginPath();
      if (v) {
        ctx.moveTo(x - 5, 12); ctx.lineTo(x + 5, 12); ctx.lineTo(x, 19); ctx.closePath(); ctx.fill();
        ctx.fillRect(x - 1, 18, 2, 10);
      } else {
        ctx.moveTo(x - 6, 15); ctx.lineTo(x - 6, 25); ctx.lineTo(x + 1, 20); ctx.closePath(); ctx.fill();
        ctx.fillRect(x, 19, 8, 2);
      }
      x += 11 + rnd() * 6;
    }
  });

  // A feather: quill with soft vanes, turquoise to gold.
  canvas(scene, 'fx_feather', 48, 128, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#fff3c0');
    g.addColorStop(0.45, '#5fe0cc');
    g.addColorStop(1, '#2a7a8a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(24, 4);
    ctx.bezierCurveTo(46, 30, 44, 80, 26, 118);
    ctx.lineTo(22, 118);
    ctx.bezierCurveTo(4, 80, 2, 30, 24, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    for (let y = 14; y < 110; y += 7) {
      ctx.beginPath();
      ctx.moveTo(24, y + 6);
      ctx.lineTo(40 - (y / 110) * 8, y);
      ctx.moveTo(24, y + 6);
      ctx.lineTo(8 + (y / 110) * 8, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#fff8e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, 6);
    ctx.lineTo(24, 126);
    ctx.stroke();
  });

  // The Simorgh's shadow from above: great wings, long flowing tail.
  canvas(scene, 'fx_simorgh', 512, 320, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    // body
    ctx.ellipse(256, 150, 26, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    // head and beak
    ctx.beginPath();
    ctx.ellipse(256, 82, 16, 20, 0, 0, Math.PI * 2);
    ctx.moveTo(250, 64); ctx.lineTo(256, 40); ctx.lineTo(262, 64);
    ctx.fill();
    // wings: scalloped trailing edges
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(256, 120);
      ctx.bezierCurveTo(256 + sx * 90, 60, 256 + sx * 190, 50, 256 + sx * 250, 90);
      for (let i = 0; i < 7; i++) {
        const t = i / 6;
        const x = 256 + sx * (250 - t * 210);
        const y = 90 + t * 70 + (i % 2 ? 26 : 0);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(256, 170);
      ctx.closePath();
      ctx.fill();
    }
    // tail plumes
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(256 + i * 6, 200);
      ctx.bezierCurveTo(256 + i * 30, 250, 256 + i * 44, 280, 256 + i * 50, 312);
      ctx.bezierCurveTo(256 + i * 30, 290, 256 + i * 16, 250, 256 + i * 4, 200);
      ctx.fill();
    }
  });

  // Stone chip (debris).
  canvas(scene, 'fx_stone', 16, 14, (ctx) => {
    ctx.fillStyle = '#c9b48c';
    ctx.beginPath();
    ctx.moveTo(2, 4); ctx.lineTo(9, 1); ctx.lineTo(15, 6); ctx.lineTo(12, 13); ctx.lineTo(4, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(80,60,30,0.5)';
    ctx.fillRect(4, 8, 8, 3);
  });

  // Vertical light beam (the finisher arrow's trail), bright core fading to the sides.
  canvas(scene, 'fx_beam', 64, 8, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(0.65, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 8);
  });
}

/**
 * Golden-hour grade, drawn full-screen from tiny textures (they are smooth, so upscaling is free):
 * - fx_grade_mul (MULTIPLY): sun-side top → far-side bottom falloff, times the vignette;
 * - fx_grade_add (ADD): warm bloom from the sun corner.
 */
function createGradeTextures(scene: Phaser.Scene): void {
  const L = FEEL.light;
  const W = 135;
  const H = 240;
  const sunLeft = L.sunSide === 'left';

  canvas(scene, 'fx_grade_mul', W, H, (ctx) => {
    const st = rgb(L.grade.sunTop);
    const ft = rgb(L.grade.farTop);
    const sb = rgb(L.grade.sunBottom);
    const fb = rgb(L.grade.farBottom);
    const vc = rgb(L.vignette.color);
    const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      const v = y / (H - 1);
      for (let x = 0; x < W; x++) {
        const u = sunLeft ? x / (W - 1) : 1 - x / (W - 1);
        // distance from the centre, in screen-height units, for an elliptical vignette
        const dx = ((x / (W - 1)) - 0.5) * (W / H) * 1.25;
        const dy = v - 0.5;
        const d = Math.sqrt(dx * dx + dy * dy) * 2;
        const vig = smooth(L.vignette.inner, L.vignette.outer, d) * L.vignette.alpha;
        const i = (y * W + x) * 4;
        for (let c = 0; c < 3; c++) {
          const top = st[c] + (ft[c] - st[c]) * u;
          const bottom = sb[c] + (fb[c] - sb[c]) * u;
          const base = top + (bottom - top) * v;
          const vigC = 255 + (vc[c] - 255) * vig;
          img.data[i + c] = Math.round((base * vigC) / 255);
        }
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });

  canvas(scene, 'fx_grade_add', W, H, (ctx) => {
    const [r, g, b] = rgb(L.warm.color);
    const cx = sunLeft ? 0 : W;
    const grad = ctx.createRadialGradient(cx, 0, 0, cx, 0, H * L.warm.radius);
    grad.addColorStop(0, `rgba(${r},${g},${b},${L.warm.alpha})`);
    grad.addColorStop(0.45, `rgba(${r},${g},${b},${L.warm.alpha * 0.35})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  });
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function canvas(scene: Phaser.Scene, key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  paint(tex.getContext());
  tex.refresh();
}
