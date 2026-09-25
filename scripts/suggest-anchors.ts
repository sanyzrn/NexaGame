/**
 * Suggests per-pose anchors for real art, to paste into `ART_ANCHORS` in src/data/entities.ts.
 *
 *   npm run anchors             print suggestions
 *   npm run anchors -- --sheet  also write .cache/anchors.png (every pose with its anchor cross)
 *
 * Each source is fitted into its manifest box exactly like the packer does (contain, centred), then
 * measured from its alpha. Only characters are measured (the other anchors are layout choices):
 * - feet-anchored poses (manifest oy ≥ 0.85): y = the lowest opaque row; x = the centre of mass of
 *   the torso band, so walk frames with alternating feet don't jump sideways;
 * - centre-anchored poses (flyers): the centre of mass of the torso band, vertically the box centre.
 * It also prints the opaque box relative to the suggested anchor (box px), to help size hitboxes.
 * These are starting points: check them with the debug overlay and nudge by hand.
 */
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp, { type OverlayOptions } from 'sharp';
import { MANIFEST_BY_KEY, type AssetDef } from '../src/assets/manifest.ts';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SRC = join(ROOT, 'assets-src');
const ALPHA_MIN = 128;
/** Torso band, as fractions of the opaque height from the top. */
const TORSO = [0.3, 0.7] as const;
const CHARACTERS = new Set(['hero', 'imp', 'shield', 'flyer']);

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

interface Measured { def: AssetDef; png: Buffer; ax: number; ay: number; line: string }

async function measure(def: AssetDef, path: string): Promise<Measured | null> {
  const img = sharp(path).ensureAlpha().resize(def.w, def.h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
  const { data, info } = await img.clone().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const opaque = (x: number, y: number) => data[(y * w + x) * 4 + 3] >= ALPHA_MIN;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!opaque(x, y)) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;

  const bandTop = Math.round(y0 + (y1 - y0) * TORSO[0]);
  const bandBottom = Math.round(y0 + (y1 - y0) * TORSO[1]);
  let sum = 0;
  let n = 0;
  for (let y = bandTop; y <= bandBottom; y++) {
    for (let x = x0; x <= x1; x++) if (opaque(x, y)) { sum += x; n++; }
  }
  const ax = n ? sum / n : (x0 + x1) / 2;
  const ay = def.oy >= 0.85 ? y1 : h / 2;
  const rel = `opaque x ${Math.round(x0 - ax)}..${Math.round(x1 - ax)}, y ${Math.round(y0 - ay)}..${Math.round(y1 - ay)}`;
  const line = `  ${def.key}: { ox: ${r3(ax / w)}, oy: ${r3(ay / h)} }, // ${rel} (box px, rel. anchor)`;
  return { def, png: await img.png().toBuffer(), ax, ay, line };
}

async function writeSheet(list: Measured[]): Promise<string> {
  const cell = 300;
  const cols = 5;
  const rows = Math.ceil(list.length / cols);
  const comps: OverlayOptions[] = [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    const s = Math.min((cell - 20) / m.def.w, (cell - 40) / m.def.h);
    const left = (i % cols) * cell + 10;
    const top = Math.floor(i / cols) * cell + 10;
    comps.push({ input: await sharp(m.png).resize(Math.round(m.def.w * s), Math.round(m.def.h * s)).toBuffer(), left, top });
    const cx = left + m.ax * s;
    const cy = top + m.ay * s;
    const svg = `<svg width="${cols * cell}" height="${rows * cell}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${cx - 30}" y1="${cy}" x2="${cx + 30}" y2="${cy}" stroke="#00ffff" stroke-width="2"/>
      <line x1="${cx}" y1="${cy - 300}" x2="${cx}" y2="${cy + 10}" stroke="#00ffff" stroke-width="1"/>
      <text x="${left}" y="${top + cell - 16}" font-size="16" fill="#fff">${m.def.key}</text></svg>`;
    comps.push({ input: Buffer.from(svg), left: 0, top: 0 });
  }
  mkdirSync(join(ROOT, '.cache'), { recursive: true });
  const out = join(ROOT, '.cache', 'anchors.png');
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: '#3a2a3a' } }).composite(comps).png().toFile(out);
  return out;
}

async function main(): Promise<void> {
  const list: Measured[] = [];
  for (const path of walk(SRC).sort()) {
    if (extname(path).toLowerCase() !== '.png') continue;
    const def = MANIFEST_BY_KEY.get(basename(path, extname(path)));
    if (!def || !CHARACTERS.has(def.ph.kind)) continue;
    const m = await measure(def, path);
    if (m) list.push(m);
  }
  console.log('Suggested ART_ANCHORS (src/data/entities.ts):\n');
  console.log(list.map((m) => m.line).join('\n'));
  if (process.argv.includes('--sheet')) console.log(`\nwrote ${await writeSheet(list)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
