/**
 * Packs /assets-src PNGs into shippable files under /public/assets.
 *
 *   npm run assets              pack (skips work when sources are unchanged)
 *   npm run assets -- --force   repack everything
 *
 * - Characters, props and UI → texture atlases (max 2048², trimmed) as WebP with alpha + PNG fallback.
 * - Backgrounds (manifest `atlas: null`) → standalone WebP q80 + JPG fallback.
 * - Every source is normalised to the manifest size so anchors and hitboxes stay valid.
 * - Writes public/assets/pack.json: the list of what actually exists. Everything else gets a placeholder at runtime.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { packAsync } from 'free-tex-packer-core';
import { MANIFEST, MANIFEST_BY_KEY, type AssetDef, type AtlasGroup, type PackFile } from '../src/assets/manifest.ts';

/** Bump when packing options change, to invalidate the cache. */
const PACKER_VERSION = 2;
const ATLAS_MAX = 2048;
const ATLAS_WEBP = { quality: 88, alphaQuality: 90, effort: 5 } as const;
const BG_WEBP = { quality: 80, effort: 5 } as const;
const BG_JPG = { quality: 82, mozjpeg: true } as const;

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

export interface PackOptions {
  srcDir?: string;
  outDir?: string;
  force?: boolean;
  log?: (msg: string) => void;
}

interface Source { def: AssetDef; path: string }

export async function packAssets(opts: PackOptions = {}): Promise<PackFile> {
  const srcDir = opts.srcDir ?? join(ROOT, 'assets-src');
  const outDir = opts.outDir ?? join(ROOT, 'public', 'assets');
  const log = opts.log ?? ((m: string) => console.log(m));

  const sources = collectSources(srcDir, log);
  const version = hashInputs(sources);
  const packPath = join(outDir, 'pack.json');

  if (!opts.force && existsSync(packPath)) {
    try {
      const prev = JSON.parse(readFileSync(packPath, 'utf8')) as PackFile;
      if (prev.version === version) {
        log(`[assets] up to date (${sources.length}/${MANIFEST.length} real assets)`);
        return prev;
      }
    } catch { /* corrupt pack.json → repack */ }
  }

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const pack: PackFile = { version, atlases: [], images: [] };

  // Standalone images
  for (const { def, path } of sources.filter((s) => s.def.atlas === null)) {
    const base = sharp(path).resize(def.w, def.h, { fit: 'cover' });
    const webp = `${def.key}.webp`;
    const fallback = `${def.key}.jpg`;
    await base.clone().webp(BG_WEBP).toFile(join(outDir, webp));
    await base.clone().flatten({ background: '#000000' }).jpeg(BG_JPG).toFile(join(outDir, fallback));
    pack.images.push({ key: def.key, webp, fallback });
  }

  // Atlases
  const groups = new Map<AtlasGroup, Source[]>();
  for (const s of sources) {
    if (s.def.atlas === null) continue;
    const list = groups.get(s.def.atlas) ?? [];
    list.push(s);
    groups.set(s.def.atlas, list);
  }
  for (const [group, list] of groups) {
    pack.atlases.push(...(await packAtlas(group, list, outDir)));
  }

  writeFileSync(packPath, JSON.stringify(pack, null, 2));
  report(pack, sources, outDir, log);
  return pack;
}

function collectSources(srcDir: string, log: (m: string) => void): Source[] {
  const found = new Map<string, string>();
  for (const path of walk(srcDir)) {
    if (extname(path).toLowerCase() !== '.png') continue;
    const key = basename(path, extname(path));
    if (!MANIFEST_BY_KEY.has(key)) {
      log(`[assets] ⚠ unknown file ignored (not in manifest): ${relative(srcDir, path)}`);
      continue;
    }
    if (found.has(key)) {
      log(`[assets] ⚠ duplicate "${key}" — using ${relative(srcDir, found.get(key)!)}, ignoring ${relative(srcDir, path)}`);
      continue;
    }
    found.set(key, path);
  }
  return [...found].map(([key, path]) => ({ def: MANIFEST_BY_KEY.get(key)!, path }));
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function hashInputs(sources: Source[]): string {
  const h = createHash('sha1');
  h.update(`v${PACKER_VERSION}`);
  h.update(JSON.stringify(MANIFEST));
  for (const s of [...sources].sort((a, b) => a.def.key.localeCompare(b.def.key))) {
    h.update(s.def.key);
    h.update(readFileSync(s.path));
  }
  return h.digest('hex').slice(0, 12);
}

async function packAtlas(group: AtlasGroup, list: Source[], outDir: string): Promise<PackFile['atlases']> {
  const images = await Promise.all(list.map(async ({ def, path }) => {
    const meta = await sharp(path).metadata();
    if (meta.width !== def.w || meta.height !== def.h) {
      console.warn(`[assets] ⚠ ${def.key}: source is ${meta.width}x${meta.height}, manifest expects ${def.w}x${def.h} — resizing (contain)`);
    }
    const contents = await sharp(path)
      .ensureAlpha()
      .resize(def.w, def.h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    return { path: `${def.key}.png`, contents };
  }));

  const files = await packAsync(images, {
    textureName: group,
    width: ATLAS_MAX,
    height: ATLAS_MAX,
    fixedSize: false,
    powerOfTwo: false,
    padding: 2,
    extrude: 1,
    allowRotation: false,
    allowTrim: true,
    trimMode: 'trim',
    detectIdentical: true,
    removeFileExtension: true,
    prependFolderName: false,
    exporter: 'JsonHash',
    packer: 'MaxRectsBin',
  } as never);

  const byName = new Map<string, { json?: Buffer; png?: Buffer }>();
  for (const f of files) {
    const name = basename(f.name, extname(f.name));
    const entry = byName.get(name) ?? {};
    if (f.name.endsWith('.json')) entry.json = f.buffer;
    else entry.png = f.buffer;
    byName.set(name, entry);
  }

  const out: PackFile['atlases'] = [];
  for (const [name, { json, png }] of byName) {
    if (!json || !png) continue;
    const data = JSON.parse(json.toString('utf8')) as { frames: Record<string, { pivot?: { x: number; y: number } }>; meta: { image: string } };
    // Frame pivots carry the manifest anchor (Phaser applies them as the origin).
    for (const [key, frame] of Object.entries(data.frames)) {
      const def = MANIFEST_BY_KEY.get(key);
      if (def) frame.pivot = { x: def.ox, y: def.oy };
    }
    data.meta.image = `${name}.webp`;
    const entry = { name, webp: `${name}.webp`, png: `${name}.png`, json: `${name}.json`, frames: Object.keys(data.frames) };
    writeFileSync(join(outDir, entry.json), JSON.stringify(data));
    await sharp(png).webp(ATLAS_WEBP).toFile(join(outDir, entry.webp));
    await sharp(png).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(join(outDir, entry.png));
    out.push(entry);
  }
  return out;
}

function report(pack: PackFile, sources: Source[], outDir: string, log: (m: string) => void): void {
  const kb = (f: string) => (statSync(join(outDir, f)).size / 1024).toFixed(0) + ' KB';
  for (const a of pack.atlases) log(`[assets] atlas ${a.name}: ${a.frames.length} frames, webp ${kb(a.webp)}, png ${kb(a.png)}`);
  for (const i of pack.images) log(`[assets] image ${i.key}: webp ${kb(i.webp)}, jpg ${kb(i.fallback)}`);
  const have = new Set(sources.map((s) => s.def.key));
  const missing = MANIFEST.filter((d) => !have.has(d.key)).map((d) => d.key);
  log(`[assets] packed ${have.size}/${MANIFEST.length} assets` + (missing.length ? `; ${missing.length} will use placeholders` : ''));
}

// CLI
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name: string) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  packAssets({ srcDir: arg('src'), outDir: arg('out'), force: process.argv.includes('--force') })
    .catch((err) => { console.error(err); process.exit(1); });
}
