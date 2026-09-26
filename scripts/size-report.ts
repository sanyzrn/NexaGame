/**
 * Reports the exact loading budget of the production build: every file the first paint needs,
 * everything fetched later (lazy), and the totals — on the wire (gzip, what a host serves) and
 * on disk. Run after `npm run build`.
 *
 *   npm run size
 *
 * First paint = index.html + the JS/CSS bundle + the two Vazirmatn weights + the Telegram SDK +
 * pack.json + every atlas/background that is not lazy. Lazy = the boss atlas (fetched while the
 * title is up), card_bg (first Hero Card) and the Nastaliq calligraphy font (after boot).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { LAZY_ATLAS_GROUPS, MANIFEST_BY_KEY, type PackFile } from '../src/assets/manifest.ts';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist');
const KB = 1024;

interface Row {
  file: string;
  bytes: number;
  gzip: number;
  initial: boolean;
}

function rowsFor(files: string[], initial: boolean, out: Row[]): void {
  for (const f of files) {
    const p = join(DIST, f);
    if (!existsSync(p)) continue;
    const bytes = statSync(p).size;
    const gzip = gzipSync(readFileSync(p)).length;
    out.push({ file: f, bytes, gzip, initial });
  }
}

function list(dir: string): string[] {
  const p = join(DIST, dir);
  return existsSync(p) ? readdirSync(p).map((f) => `${dir}/${f}`) : [];
}

function main(): void {
  if (!existsSync(DIST)) {
    console.error('[size] dist/ not found — run `npm run build` first.');
    process.exit(1);
  }
  const pack = JSON.parse(readFileSync(join(DIST, 'assets', 'pack.json'), 'utf8')) as PackFile;
  const isLazyAtlas = (name: string) => {
    const a = pack.atlases.find((x) => x.name === name);
    return !!a?.frames.some((f) => {
      const g = MANIFEST_BY_KEY.get(f)?.atlas;
      return g !== undefined && g !== null && (LAZY_ATLAS_GROUPS as readonly string[]).includes(g);
    });
  };

  const rows: Row[] = [];
  rowsFor(['index.html'], true, rows);
  rowsFor(list('bundle'), true, rows);
  rowsFor(list('vendor'), true, rows);
  rowsFor(list('fonts').filter((f) => f.startsWith('fonts/Vazirmatn')), true, rows);
  rowsFor(list('fonts').filter((f) => f.startsWith('fonts/Noto')), false, rows);
  rowsFor(['assets/pack.json'], true, rows);
  for (const a of pack.atlases) {
    const lazy = isLazyAtlas(a.name);
    // WebP is what almost every client takes; the PNG only travels on WebP-less devices.
    rowsFor([`assets/${a.webp}`, `assets/${a.json}`], !lazy, rows);
    rowsFor([`assets/${a.png}`], false, rows);
  }
  for (const img of pack.images) {
    const lazy = MANIFEST_BY_KEY.get(img.key)?.lazy === true;
    rowsFor([`assets/${img.webp}`], !lazy, rows);
    rowsFor([`assets/${img.fallback}`], false, rows);
  }
  rowsFor(['_headers'], false, rows);

  const fmt = (n: number) => (n / KB).toFixed(0).padStart(5);
  console.log(`  ${'file'.padEnd(34)}${'raw'.padStart(6)}  ${'gzip'.padStart(6)}  phase`);
  console.log('  ' + '-'.repeat(60));
  for (const r of rows.sort((a, b) => Number(b.initial) - Number(a.initial) || b.gzip - a.gzip)) {
    console.log(`  ${r.file.padEnd(34)}${fmt(r.bytes)}  ${fmt(r.gzip)}  ${r.initial ? 'first paint' : 'lazy / fallback'}`);
  }
  const sum = (pick: (r: Row) => boolean, key: 'bytes' | 'gzip') =>
    rows.filter(pick).reduce((n, r) => n + r[key], 0);

  // The no-WebP path swaps each WebP atlas/background for its PNG/JPG twin (same keys, .webp→other).
  const fallbackFor = (r: Row): Row | undefined =>
    rows.find((o) => r.file.endsWith('.webp') && (o.file === r.file.replace('.webp', '.png') || o.file === r.file.replace('.webp', '.jpg')));
  const firstPaint = sum((r) => r.initial, 'gzip');
  let fallbackFirst = firstPaint;
  for (const r of rows.filter((x) => x.initial)) {
    const alt = fallbackFor(r);
    if (alt) fallbackFirst += alt.gzip - r.gzip;
  }
  const lazyWebp = sum((r) =>
    !r.initial
    && !r.file.endsWith('.png') && !r.file.endsWith('.jpg')
    && (r.file.includes('boss-') || r.file.includes('card_bg') || r.file.includes('Noto')), 'gzip');

  console.log('  ' + '-'.repeat(60));
  console.log(`  FIRST PAINT  WebP path  (on the wire): ${(firstPaint / KB).toFixed(0)} KB   raw ${(sum((r) => r.initial, 'bytes') / KB).toFixed(0)} KB`);
  console.log(`  FIRST PAINT  no-WebP    (on the wire): ${(fallbackFirst / KB).toFixed(0)} KB   (PNG/JPG twins of the same files)`);
  console.log(`  LAZY         boss art + card_bg + Nastaliq (WebP): ${(lazyWebp / KB).toFixed(0)} KB`);
}

main();
