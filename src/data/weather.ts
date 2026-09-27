/**
 * آب‌وهوا — weather that rolls in mid-run, lasts a little while and rolls out again. It always
 * changes how the fight plays for those seconds, never just how it looks:
 *
 * - rain:      streaking rain; fire is weak (fire arrows and braziers burn less).
 * - storm:     a black squall — the field vanishes, lightning reveals it in flashes; wind bends arrows.
 * - sandstorm: a wall of dust from the side — near-zero visibility, strong wind.
 * - snow:      heavy snowfall; every enemy is slowed while it lasts.
 * - fog:       thick drifting mist; enemies fade in and out of sight.
 * - thunder:   a dry lightning storm — bolts strike random enemies (free damage, loud and bright).
 */
export type WeatherId = 'rain' | 'storm' | 'sandstorm' | 'snow' | 'fog' | 'thunder';

export interface WeatherDef {
  id: WeatherId;
  name: string;
  line: string;
  /** How long it lasts (ms), including the fade in and out. */
  ms: number;
  weight: number;
  /** 0..1 how much of the field it hides at its peak. */
  hide: number;
  /** Overlay colour of the hiding veil. */
  veil: number;
  /** Headline accent colour (readable on the dark banner). */
  accent: number;
  /** Lateral arrow drift while it lasts (deg/s). */
  driftDegPerSec: number;
  /** Fire strength multiplier while it lasts. */
  fireMul: number;
  /** Enemy walk-time multiplier while it lasts (<1 slows). */
  enemyTimeMul: number;
  /** Lightning: a flash every so often (ms range), 0 = none. */
  lightningMs: readonly [number, number] | null;
  /** Lightning bolts strike an enemy (damage), not only flash. */
  strikes: boolean;
}

export const WEATHERS: readonly WeatherDef[] = [
  { id: 'rain', name: 'باران', line: 'باران گرفت! آتش کم‌جان شد', ms: 16000, weight: 3, hide: 0.15, veil: 0x2a3448, accent: 0x8ab4ff,
    driftDegPerSec: 0, fireMul: 0.45, enemyTimeMul: 1, lightningMs: null, strikes: false },
  { id: 'storm', name: 'توفان', line: 'توفان! هیچ‌جا دیده نمی‌شود — به خط نشانه اعتماد کن', ms: 11000, weight: 1.5, hide: 0.86, veil: 0x0a0e1a, accent: 0x9ab0ff,
    driftDegPerSec: 5, fireMul: 0.3, enemyTimeMul: 1, lightningMs: [900, 2200], strikes: false },
  { id: 'sandstorm', name: 'توفان شن', line: 'توفان شن! چشم‌ها را تنگ کن', ms: 11000, weight: 1.5, hide: 0.8, veil: 0x8a6a3a, accent: 0xe8b860,
    driftDegPerSec: 8, fireMul: 0.8, enemyTimeMul: 0.9, lightningMs: null, strikes: false },
  { id: 'snow', name: 'برف', line: 'برف سنگین! دیوها یخ زده‌اند', ms: 15000, weight: 2, hide: 0.25, veil: 0xdce8ff, accent: 0xdce8ff,
    driftDegPerSec: 1, fireMul: 0.8, enemyTimeMul: 0.6, lightningMs: null, strikes: false },
  { id: 'fog', name: 'مه', line: 'مه غلیظ! دیوها در مه گم می‌شوند', ms: 14000, weight: 2, hide: 0.5, veil: 0xc8ccd6, accent: 0xc8d0dc,
    driftDegPerSec: 0, fireMul: 1, enemyTimeMul: 1, lightningMs: null, strikes: false },
  { id: 'thunder', name: 'رعد و برق', line: 'آسمان به یاری آمد! صاعقه بر دیوها', ms: 12000, weight: 1.2, hide: 0.3, veil: 0x1a1a3a, accent: 0xffe07a,
    driftDegPerSec: 0, fireMul: 1, enemyTimeMul: 1, lightningMs: [1200, 2400], strikes: true },
];

export const WEATHER_BY_ID: ReadonlyMap<WeatherId, WeatherDef> = new Map(WEATHERS.map((w) => [w.id, w]));

/** Weighted draw, never the same as `last` twice in a row. `?weather=<id>` forces one (testing). */
export function pickWeather(rand: () => number, last: WeatherId | null, forced?: string | null): WeatherDef {
  const f = forced ? WEATHER_BY_ID.get(forced as WeatherId) : undefined;
  if (f) return f;
  const pool = WEATHERS.filter((w) => w.id !== last);
  const total = pool.reduce((n, w) => n + w.weight, 0);
  let r = rand() * total;
  for (const w of pool) {
    r -= w.weight;
    if (r < 0) return w;
  }
  return pool[0];
}

/** How much the veil covers at time t into a weather of length ms (fade 1.5 s in, 2 s out). */
export function weatherStrength(t: number, ms: number): number {
  if (t <= 0 || t >= ms) return 0;
  return Math.min(1, t / 1500, (ms - t) / 2000);
}
