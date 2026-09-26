/**
 * Asset manifest — the single source of truth for every art file the game knows about.
 *
 * - `scripts/pack-assets.ts` reads this to pack /assets-src into atlases / WebP.
 * - The Preload scene reads it to load what exists and generate a placeholder
 *   (same key, size and anchor) for everything that is missing.
 *
 * Keep this file free of imports and non-erasable TS syntax: it is also imported by Node scripts.
 */

/** Atlas a file is packed into. `null` = standalone image (large, opaque backgrounds). */
export type AtlasGroup = 'hero' | 'boss' | 'enemies' | 'propsui'
  | 'era2' | 'era3' | 'era4' | 'era5' | 'era6' | 'era7' | 'era8';

/** How the placeholder painter should draw this asset while the real PNG is missing. */
export type PlaceholderKind =
  | 'bg' | 'card'
  | 'hero' | 'imp' | 'shield' | 'flyer' | 'boss'
  | 'slinger' | 'bomber' | 'wraith' | 'rock' | 'boulder'
  | 'pillar' | 'arrow' | 'brazier' | 'banner' | 'pot'
  | 'bossbar' | 'heart' | 'btnPause' | 'toast' | 'comboBadge';

export interface AssetDef {
  key: string;
  /** Source size in pixels. */
  w: number;
  h: number;
  /** Anchor (origin), 0..1 of the source size. */
  ox: number;
  oy: number;
  atlas: AtlasGroup | null;
  alpha: boolean;
  /** Not needed for the first screen; loaded later (e.g. the share card background). */
  lazy?: boolean;
  ph: { kind: PlaceholderKind; pose?: string };
  /** An era skin of this base key: while its PNG is missing, a recoloured copy of the base is shown. */
  skinOf?: string;
}

const char = (key: string, size: number, atlas: AtlasGroup, kind: PlaceholderKind, pose: string, ox = 0.5, oy = 0.9): AssetDef =>
  ({ key, w: size, h: size, ox, oy, atlas, alpha: true, ph: { kind, pose } });

const ui = (key: string, w: number, h: number, kind: PlaceholderKind, pose?: string): AssetDef =>
  ({ key, w, h, ox: 0.5, oy: 0.5, atlas: 'propsui', alpha: true, ph: { kind, pose } });

const BASE: readonly AssetDef[] = [
  // Background
  { key: 'bg_arena_01', w: 1080, h: 1920, ox: 0, oy: 0, atlas: null, alpha: false, ph: { kind: 'bg' } },

  // Hero (512)
  char('hero_idle', 512, 'hero', 'hero', 'idle'),
  char('hero_draw', 512, 'hero', 'hero', 'draw'),
  char('hero_full', 512, 'hero', 'hero', 'full'),
  char('hero_hurt', 512, 'hero', 'hero', 'hurt'),

  // Imp (256)
  char('imp_walk_1', 256, 'enemies', 'imp', 'walk1'),
  char('imp_walk_2', 256, 'enemies', 'imp', 'walk2'),
  char('imp_hit', 256, 'enemies', 'imp', 'hit'),

  // Shield-bearer (384)
  char('shield_walk_1', 384, 'enemies', 'shield', 'walk1'),
  char('shield_walk_2', 384, 'enemies', 'shield', 'walk2'),
  char('shield_hit', 384, 'enemies', 'shield', 'hit'),

  // Flyer (320) — anchored at the body centre, it has no feet on the ground
  char('flyer_up', 320, 'enemies', 'flyer', 'up', 0.5, 0.5),
  char('flyer_down', 320, 'enemies', 'flyer', 'down', 0.5, 0.5),
  char('flyer_hit', 320, 'enemies', 'flyer', 'hit', 0.5, 0.5),

  // Slinger (سنگ‌انداز, 256)
  char('slinger_walk_1', 256, 'enemies', 'slinger', 'walk1'),
  char('slinger_walk_2', 256, 'enemies', 'slinger', 'walk2'),
  char('slinger_throw', 256, 'enemies', 'slinger', 'throw'),
  char('slinger_hit', 256, 'enemies', 'slinger', 'hit'),

  // Bomber (نفتی‌دار, 320)
  char('bomber_walk_1', 320, 'enemies', 'bomber', 'walk1'),
  char('bomber_walk_2', 320, 'enemies', 'bomber', 'walk2'),
  char('bomber_hit', 320, 'enemies', 'bomber', 'hit'),

  // Wraith (شبح, 320)
  char('wraith_walk_1', 320, 'enemies', 'wraith', 'walk1'),
  char('wraith_walk_2', 320, 'enemies', 'wraith', 'walk2'),
  char('wraith_hit', 320, 'enemies', 'wraith', 'hit'),

  // Hazard projectiles
  char('rock', 96, 'enemies', 'rock', 'idle', 0.5, 0.5),
  char('boulder', 256, 'enemies', 'boulder', 'idle', 0.5, 0.5),

  // Boss (1024) — anchored at the knuckles, which rest on the top wall
  char('boss_idle', 1024, 'boss', 'boss', 'idle', 0.5, 0.86),
  char('boss_roar', 1024, 'boss', 'boss', 'roar', 0.5, 0.86),
  char('boss_stunned', 1024, 'boss', 'boss', 'stunned', 0.5, 0.86),

  // Props
  { key: 'pillar_01', w: 256, h: 640, ox: 0.5, oy: 0.95, atlas: 'propsui', alpha: true, ph: { kind: 'pillar' } },
  { key: 'arrow', w: 256, h: 64, ox: 0.88, oy: 0.5, atlas: 'propsui', alpha: true, ph: { kind: 'arrow' } },
  { key: 'brazier', w: 256, h: 256, ox: 0.5, oy: 0.9, atlas: 'propsui', alpha: true, ph: { kind: 'brazier' } },
  { key: 'banner', w: 256, h: 512, ox: 0.5, oy: 0.05, atlas: 'propsui', alpha: true, ph: { kind: 'banner' } },
  { key: 'pot', w: 192, h: 192, ox: 0.5, oy: 0.9, atlas: 'propsui', alpha: true, ph: { kind: 'pot' } },

  // UI
  ui('ui_bossbar_frame', 1024, 342, 'bossbar'),
  ui('ui_heart_full', 128, 128, 'heart', 'full'),
  ui('ui_heart_empty', 128, 128, 'heart', 'empty'),
  ui('ui_btn_pause', 160, 160, 'btnPause'),
  ui('ui_toast_frame', 640, 160, 'toast'),
  ui('ui_combo_badge', 256, 256, 'comboBadge'),

  // Share card
  { key: 'card_bg', w: 1080, h: 1920, ox: 0, oy: 0, atlas: null, alpha: false, lazy: true, ph: { kind: 'card' } },
];

/**
 * Keys an era may re-skin. An era with skin prefix `e2` looks for `assets-src/e2_<key>.png`
 * (same size and anchor as the base); gameplay code keeps using the base key.
 */
export const SKINNABLE_KEYS: readonly string[] = [
  'bg_arena_01',
  'hero_idle', 'hero_draw', 'hero_full', 'hero_hurt',
  'imp_walk_1', 'imp_walk_2', 'imp_hit',
  'shield_walk_1', 'shield_walk_2', 'shield_hit',
  'flyer_up', 'flyer_down', 'flyer_hit',
  'slinger_walk_1', 'slinger_walk_2', 'slinger_throw', 'slinger_hit',
  'bomber_walk_1', 'bomber_walk_2', 'bomber_hit',
  'wraith_walk_1', 'wraith_walk_2', 'wraith_hit',
  'rock', 'boulder',
  'boss_idle', 'boss_roar', 'boss_stunned',
  'pillar_01', 'banner', 'brazier', 'pot', 'arrow',
];

/** Era skin prefixes that have assets (each packs into its own atlas group). */
export const ERA_SKINS: readonly { prefix: string; atlas: AtlasGroup }[] = [
  { prefix: 'e2', atlas: 'era2' },
  { prefix: 'e3', atlas: 'era3' },
  { prefix: 'e4', atlas: 'era4' },
  { prefix: 'e5', atlas: 'era5' },
  { prefix: 'e6', atlas: 'era6' },
  { prefix: 'e7', atlas: 'era7' },
  { prefix: 'e8', atlas: 'era8' },
];

const BASE_BY_KEY = new Map(BASE.map((d) => [d.key, d]));

export const MANIFEST: readonly AssetDef[] = [
  ...BASE,
  ...ERA_SKINS.flatMap(({ prefix, atlas }) => SKINNABLE_KEYS.map((key): AssetDef => {
    const b = BASE_BY_KEY.get(key)!;
    return { ...b, key: `${prefix}_${key}`, atlas: b.atlas === null ? null : atlas, skinOf: key };
  })),
];

export const MANIFEST_BY_KEY: ReadonlyMap<string, AssetDef> = new Map(MANIFEST.map((d) => [d.key, d]));

/**
 * Atlas groups that are NOT needed for the first paint: the Preload scene skips them and they are
 * fetched in the background (the boss art while the title screen is up) or on first use. If the
 * fetch fails, the runtime placeholder keeps working, so the game never blocks on them.
 */
export const LAZY_ATLAS_GROUPS: readonly AtlasGroup[] = [
  'boss',
  // Era skins: only the era being played is fetched (Preload loads the current era at boot).
  'era2', 'era3', 'era4', 'era5', 'era6', 'era7', 'era8',
];

/** Shape of public/assets/pack.json, written by the packer and read by Preload. */
export interface PackFile {
  version: string;
  atlases: { name: string; webp: string; png: string; json: string; frames: string[] }[];
  images: { key: string; webp: string; fallback: string }[];
}
