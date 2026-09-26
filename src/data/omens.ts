import type { ScheduledSpawn } from './waves';

/**
 * فال لشکر — the Legion's Omen.
 *
 * One omen is drawn each day, shared by every player (seeded by the UTC date), so the whole
 * Telegram group fights the same day: «امروز فال لشکر چیست؟» — a small daily ritual and a
 * reason to compare runs. Omens only bend the run (score, pacing, flavour), never break it:
 * every modifier is a modest multiplier or a weight, and the core balance stays intact.
 */
export interface OmenMods {
  /** Score multiplier at the end of the run. */
  scoreMul?: number;
  /** Enemy walk-speed multiplier. */
  enemySpeedMul?: number;
  /** Burn damage & flame size multiplier (fire arrows, braziers, bomber blasts). */
  fireMul?: number;
  /** Extra flyer spawns: a weight >1 duplicates flyer entries (capped). */
  flyerWeight?: number;
  /** Power-orb gains multiplier. */
  powerGainMul?: number;
  /** The group's chain starts at this tier. */
  chainStart?: number;
  /** Lateral arrow drift, deg/s (a wind across the arena). */
  arrowDriftDegPerSec?: number;
  /** Golden releases needed for the flame bow. */
  flameBowStreak?: number;
  /** The Homa is guaranteed this run. */
  homaGuaranteed?: boolean;
  /** Enemies never stop to taunt, bang or scratch — faster, tighter runs. */
  quietEnemies?: boolean;
}

export interface OmenDef {
  id: string;
  /** Persian name, shown on the title chip, the run toast, Result and the Hero Card. */
  name: string;
  /** One line of flavour + the effect, for toasts and cards. */
  line: string;
  /** A colour grade multiplied over the arena for the whole run. */
  grade: { top: string; mid: string; bottom: string; alpha: number };
  mods: OmenMods;
}

export const OMENS: readonly OmenDef[] = [
  {
    id: 'desert-wind',
    name: 'باد کویر',
    line: 'تیرها در باد می‌لرزند — امتیاز بیشتر',
    grade: { top: '#e8c890', mid: '#d8a86a', bottom: '#a88a5a', alpha: 0.16 },
    mods: { arrowDriftDegPerSec: 6, scoreMul: 1.25 },
  },
  {
    id: 'tulip-night',
    name: 'شب لاله',
    line: 'دیوان پرنده بیش از همیشه‌اند — امتیاز بیشتر',
    grade: { top: '#4a3a7a', mid: '#6a4a8a', bottom: '#2a1a4a', alpha: 0.22 },
    mods: { flyerWeight: 2, scoreMul: 1.15 },
  },
  {
    id: 'fire-blood',
    name: 'خون آتش',
    line: 'شعله‌ها بلندتر می‌کشند — سوختن، سوزاننده‌تر',
    grade: { top: '#e88a4a', mid: '#c86a3a', bottom: '#7a3a2a', alpha: 0.18 },
    mods: { fireMul: 1.5 },
  },
  {
    id: 'silent-divs',
    name: 'دیوان خاموش',
    line: 'دشمن خاموش، ولی تیزتر — نیروی پهلوانی بیشتر',
    grade: { top: '#b8b8c8', mid: '#9898a8', bottom: '#68687a', alpha: 0.16 },
    mods: { enemySpeedMul: 1.15, quietEnemies: true, powerGainMul: 1.3 },
  },
  {
    id: 'blue-moon',
    name: 'ماه آبی',
    line: 'زنجیرهٔ درفش از آغاز شعله‌ور است',
    grade: { top: '#4a7a9a', mid: '#3a6a8a', bottom: '#2a4a6a', alpha: 0.2 },
    mods: { chainStart: 1, enemySpeedMul: 0.95 },
  },
  {
    id: 'simorgh-sky',
    name: 'بازگشت سیمرغ',
    line: 'سایهٔ هما بر کل روزه — کمان آذرین زودتر می‌گیرد',
    grade: { top: '#4ac8b8', mid: '#3aa89a', bottom: '#2a7a72', alpha: 0.18 },
    mods: { homaGuaranteed: true, flameBowStreak: 4 },
  },
];

/** Days since the Unix epoch (UTC) — one integer per day. */
export function daySeed(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000);
}

/**
 * The day's omen: the same for everyone. `override` (a debug `?omen=<id>`) wins when it names
 * a real omen; an empty string means "no omen" (plain run).
 */
export function pickOmen(date: Date, override?: string | null): OmenDef | null {
  if (override === '') return null;
  if (override) {
    const found = OMENS.find((o) => o.id === override);
    if (found) return found;
  }
  return OMENS[daySeed(date) % OMENS.length];
}

/** Extra flyers a flyer-weighted omen adds to a wave (pure; used by WaveSystem via a filter). */
export function applyOmenToWave(queue: ScheduledSpawn[], omen: OmenDef | null): ScheduledSpawn[] {
  const w = omen?.mods.flyerWeight ?? 1;
  if (w <= 1) return queue;
  const flyers = queue.filter((s) => s.type === 'flyer');
  const extra = Math.min(3, Math.floor(flyers.length * (w - 1)));
  if (extra <= 0) return queue;
  const out = queue.slice();
  for (let i = 0; i < extra; i++) {
    const src = flyers[i % flyers.length];
    out.push({ ...src, at: src.at + 400 + i * 350, x: Math.random() });
  }
  return out;
}
