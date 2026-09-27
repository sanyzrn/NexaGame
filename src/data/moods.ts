import type { OmenMods } from './omens';

/**
 * حال‌وهوای میدان — the arena's time of day and season, drawn once per run so the same arena never
 * looks the same twice. Each mood has a runtime look (a colour grade, darkness, ambient particles,
 * brighter braziers at night) that works with no new art, and an optional painted background
 * (`bg`, e.g. `assets-src/bg_arena_night.png`, per era `e2_bg_arena_night.png`) that replaces the
 * arena when it exists. See docs/ERA_ASSETS.md for the prompts.
 */
export type MoodId = 'day' | 'dawn' | 'sunset' | 'night' | 'winter' | 'autumn' | 'overcast';
export type Ambience = 'none' | 'fireflies' | 'stars' | 'snow' | 'leaves' | 'mist';

export interface MoodDef {
  id: MoodId;
  name: string;
  line: string;
  weight: number;
  /** Multiplied over the arena; null keeps the art as painted. */
  grade: { top: string; mid: string; bottom: string; alpha: number } | null;
  /** Extra darkness over the world (0..1). */
  darkness: number;
  ambience: Ambience;
  /** A light wash over everything (SCREEN blend): the cold white of snow, the pink of dawn. */
  wash: { color: number; alpha: number } | null;
  /** How much colour drains from the world (0..1): grey skies, snow, night. */
  desat: number;
  /** Braziers and fire glow multiplier (night makes them the only light). */
  fireGlow: number;
  /** Optional painted background key (base key; eras use their prefix). */
  bg: string | null;
  mods: OmenMods;
}

export const MOODS: readonly MoodDef[] = [
  { id: 'day', name: 'نیمروز', line: 'آفتاب بر میدان می‌تابد', weight: 3, grade: null, wash: null, desat: 0, darkness: 0, ambience: 'none', fireGlow: 1, bg: null, mods: {} },
  { id: 'dawn', name: 'سپیده‌دم', line: 'نخستین نور بر سنگ‌ها', weight: 2,
    grade: { top: '#f0a8c0', mid: '#c8a0c8', bottom: '#7a80c0', alpha: 0.42 }, wash: { color: 0xffd8e8, alpha: 0.12 }, desat: 0.1, darkness: 0.06, ambience: 'mist', fireGlow: 1.2, bg: 'bg_arena_dawn', mods: {} },
  { id: 'sunset', name: 'غروب', line: 'آسمان سرخ است؛ دیوها بی‌تاب‌اند', weight: 2,
    grade: { top: '#ff8a4a', mid: '#d0603a', bottom: '#3a2a5a', alpha: 0.52 }, wash: { color: 0xff9a4a, alpha: 0.08 }, desat: 0, darkness: 0.14, ambience: 'none', fireGlow: 1.4, bg: 'bg_arena_sunset', mods: { enemySpeedMul: 1.05, scoreMul: 1.05 } },
  { id: 'night', name: 'شب', line: 'فقط آتشدان‌ها روشن‌اند — امتیاز بیشتر', weight: 2,
    grade: { top: '#1a2a5a', mid: '#2a3a6a', bottom: '#0a1030', alpha: 0.55 }, wash: null, desat: 0.25, darkness: 0.32, ambience: 'fireflies', fireGlow: 2.2, bg: 'bg_arena_night', mods: { scoreMul: 1.15 } },
  { id: 'winter', name: 'زمستان', line: 'برف نشسته؛ دیوها در سرما کندترند', weight: 1.5,
    grade: { top: '#c8d8ff', mid: '#a8b8e0', bottom: '#7a88b0', alpha: 0.45 }, wash: { color: 0xe8f2ff, alpha: 0.24 }, desat: 0.5, darkness: 0, ambience: 'snow', fireGlow: 1.3, bg: 'bg_arena_winter', mods: { enemySpeedMul: 0.92 } },
  { id: 'autumn', name: 'پاییز', line: 'برگ‌ها در باد؛ تیرها کمی می‌لغزند', weight: 1.5,
    grade: { top: '#f0a040', mid: '#c86a2a', bottom: '#6a3a1a', alpha: 0.4 }, wash: { color: 0xffb060, alpha: 0.06 }, desat: 0.1, darkness: 0.06, ambience: 'leaves', fireGlow: 1.1, bg: 'bg_arena_autumn', mods: { arrowDriftDegPerSec: 1.5, scoreMul: 1.05 } },
  { id: 'overcast', name: 'ابری', line: 'آسمان گرفته؛ بوی باران می‌آید', weight: 1.5,
    grade: { top: '#9aa0b0', mid: '#8a8e9a', bottom: '#5a5e6a', alpha: 0.4 }, wash: { color: 0xc8ccd6, alpha: 0.08 }, desat: 0.5, darkness: 0.12, ambience: 'none', fireGlow: 1.2, bg: 'bg_arena_overcast', mods: {} },
];

export const MOOD_BY_ID: ReadonlyMap<MoodId, MoodDef> = new Map(MOODS.map((m) => [m.id, m]));

/** Background art keys of all moods (optional, lazily loaded). */
export const MOOD_BG_KEYS: readonly string[] = MOODS.flatMap((m) => (m.bg ? [m.bg] : []));

/** A weighted draw; `?mood=<id>` in the URL overrides (testing). */
export function pickMood(rand: () => number = Math.random, forced?: string | null): MoodDef {
  const f = forced ? MOOD_BY_ID.get(forced as MoodId) : undefined;
  if (f) return f;
  const total = MOODS.reduce((n, m) => n + m.weight, 0);
  let r = rand() * total;
  for (const m of MOODS) {
    r -= m.weight;
    if (r < 0) return m;
  }
  return MOODS[0];
}
