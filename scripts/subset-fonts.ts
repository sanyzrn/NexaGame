/**
 * Subsets the fonts in /fonts-src to just the characters the game can ever show, writing the
 * (much smaller) WOFF2 files to /public/fonts. Same file names, so nothing else changes.
 *
 *   npm run fonts
 *
 * The character set is whole ranges (every Persian letter, both digit sets, the punctuation we
 * use), NOT the strings currently in the code — so new Persian text never renders tofu.
 * HarfBuzz subsetting keeps every layout feature and performs glyph closure (GSUB), which the
 * Nastaliq calligraphy font's contextual shaping needs. Hinting is dropped: useless for canvas
 * text at game sizes and a third of the bytes.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Ranges of code points the game's text can contain (inclusive). */
const RANGES: readonly (readonly [number, number])[] = [
  [0x0020, 0x007e], // ASCII: latin letters & digits (debug, names, version strings)
  [0x00a0, 0x00bf], // Latin-1 punctuation, incl. « »
  [0x0600, 0x06ff], // the Arabic block: all Persian letters, ۰–۹, ، ؛ ؟ ٪ ٫ ٬
  [0x200c, 0x200f], // ZWNJ / ZWJ / LRM / RLM (Persian orthography needs ZWNJ)
  [0x2010, 0x2027], // dashes, ‘ ’ “ ” …
];

const TEXT = [...new Set(RANGES.flatMap(([a, b]) => {
  const out: string[] = [];
  for (let c = a; c <= b; c++) out.push(String.fromCodePoint(c));
  return out;
}))].join('');

const FILES = ['Vazirmatn-Regular.woff2', 'Vazirmatn-Black.woff2', 'NotoNastaliqUrdu-Bold.woff2'] as const;

async function main(): Promise<void> {
  let before = 0;
  let after = 0;
  for (const file of FILES) {
    const src = readFileSync(join(ROOT, 'fonts-src', file));
    const out = await subsetFont(src, TEXT, { targetFormat: 'woff2', noHinting: true });
    writeFileSync(join(ROOT, 'public', 'fonts', file), out);
    before += src.length;
    after += out.length;
    console.log(`[fonts] ${file}: ${(src.length / 1024).toFixed(0)} KB → ${(out.length / 1024).toFixed(0)} KB (${TEXT.length} chars kept)`);
  }
  console.log(`[fonts] total: ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB`);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
