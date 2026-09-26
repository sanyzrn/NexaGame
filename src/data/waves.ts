import type { EnemyType } from './entities';

/**
 * Waves for "The First Trial", act II. Edit freely: each group spawns `count` enemies of one type,
 * starting `at` ms into the wave, one every `every` ms. `x` is where they appear across the floor
 * (0 = left wall, 1 = right wall): one value, a list used in turn, or omitted for random.
 * `elite` (0..1) is the chance each enemy spawns as a gold-trimmed elite.
 * A wave ends when everything in it has spawned and died (or reached the hero).
 */
export interface SpawnGroup {
  at: number;
  type: EnemyType;
  count?: number;
  every?: number;
  x?: number | readonly number[];
  /** Chance each enemy of this group is an elite (hp×, gold trim, guaranteed drop). */
  elite?: number;
}

export interface WaveDef {
  spawns: readonly SpawnGroup[];
}

export const WAVES: readonly WaveDef[] = [
  // 1 — imps to warm the bow, one flyer to lift the eyes
  { spawns: [
    { at: 0, type: 'imp', count: 3, every: 1700, x: [0.5, 0.25, 0.75] },
    { at: 6500, type: 'imp', count: 2, every: 1200 },
    { at: 9000, type: 'flyer', x: 0.4 },
  ] },
  // 2 — the slinger: first rock to shoot out of the sky
  { spawns: [
    { at: 0, type: 'imp', count: 4, every: 1400 },
    { at: 3000, type: 'slinger', x: 0.28 },
    { at: 7000, type: 'flyer', count: 2, every: 1500, x: [0.3, 0.7] },
    { at: 10500, type: 'slinger', x: 0.72 },
  ] },
  // 3 — shields to ricochet around, bombers to detonate in a crowd
  { spawns: [
    { at: 0, type: 'shield', x: 0.5 },
    { at: 1800, type: 'imp', count: 4, every: 1100 },
    { at: 5000, type: 'bomber', x: 0.3 },
    { at: 9000, type: 'bomber', x: 0.7 },
    { at: 11500, type: 'flyer', count: 2, every: 1500 },
  ] },
  // 4 — everything at once, a wraith slipping between worlds, an elite vanguard
  { spawns: [
    { at: 0, type: 'imp', count: 6, every: 800 },
    { at: 2000, type: 'wraith', x: 0.6 },
    { at: 4000, type: 'slinger', x: 0.25 },
    { at: 6000, type: 'shield', count: 2, every: 3200, x: [0.3, 0.75], elite: 0.5 },
    { at: 9000, type: 'bomber', x: 0.45 },
    { at: 11000, type: 'flyer', count: 3, every: 1000 },
    { at: 13500, type: 'wraith', x: 0.35 },
    { at: 15000, type: 'slinger', x: 0.75 },
  ] },
];

export interface ScheduledSpawn {
  at: number;
  type: EnemyType;
  /** 0..1 across the floor. */
  x: number;
  /** Spawn as an elite. */
  elite?: boolean;
}

/** Flattens a wave into spawns sorted by time. Pure: `rand` supplies the random x positions. */
export function scheduleWave(wave: WaveDef, rand: () => number): ScheduledSpawn[] {
  const out: ScheduledSpawn[] = [];
  for (const g of wave.spawns) {
    const count = g.count ?? 1;
    for (let i = 0; i < count; i++) {
      const x = g.x === undefined ? rand() : typeof g.x === 'number' ? g.x : g.x[i % g.x.length];
      const elite = g.elite !== undefined && rand() < g.elite;
      out.push({ at: g.at + i * (g.every ?? 0), type: g.type, x: Math.min(1, Math.max(0, x)), elite });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}
