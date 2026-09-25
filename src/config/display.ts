/** Design space. All positions in data files are in these units. */
export const DESIGN_W = 1080;
export const DESIGN_H = 1920;

export const COLORS = {
  letterbox: 0x1a120c,
  letterboxCss: '#1a120c',
  gold: 0xffc94a,
  goldCss: '#ffc94a',
  goldDeep: 0xe89a1c,
  white: 0xffffff,
  parchmentCss: '#f6e7c8',
  inkCss: '#2a1a0e',
  hpRed: 0xd8342c,
  hpBack: 0x2a1512,
  hpGhost: 0xfff1d0,
  navy: 0x16264a,
  teal: 0x2f8f8a,
} as const;

export const FONT_FAMILY = 'Vazirmatn, Tahoma, sans-serif';
/** Nastaliq calligraphy for the big story moments (falls back to Vazirmatn until it has loaded). */
export const CALLIGRAPHY_FONT = 'Nastaliq, Vazirmatn, Tahoma, serif';

/**
 * Render order. Everything standing on the floor (hero, enemies, pillars, props) is depth-sorted by
 * its ground y: `DEPTH.world + y * WORLD_Y_SCALE` (lower on screen = drawn on top), see `worldDepth`.
 */
export const DEPTH = {
  bg: 0,
  /** The White Div, behind the top wall… */
  boss: 10,
  /** …and the slices of the background that hide his lower body. */
  bossOccluder: 20,
  floorGlow: 40,
  shadows: 50,
  floorFx: 60,
  world: 100,
  hpBars: 2900,
  /** Colour grade, light shafts and dust motes sit over the world but under arrows, effects and UI. */
  grade: 3000,
  shafts: 3010,
  motes: 3020,
  arrows: 3500,
  fx: 4000,
  aim: 4500,
  numbers: 5000,
  flash: 5500,
  debug: 9000,
} as const;

const WORLD_Y_SCALE = 1;

/** Depth for an object standing on the floor at ground y. */
export function worldDepth(groundY: number): number {
  return DEPTH.world + groundY * WORLD_Y_SCALE;
}
