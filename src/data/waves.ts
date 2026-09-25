import type { EnemyType } from './entities';

/**
 * Waves for "The First Trial". Edit freely: each group spawns `count` enemies of one type,
 * starting `at` ms into the wave, one every `every` ms. `x` is where they appear across the floor
 * (0 = left wall, 1 = right wall): one value, a list used in turn, or omitted for random.
 * A wave ends when everything in it has spawned and died (or reached the hero).
 */
export interface SpawnGroup {
  at: number;
  type: EnemyType;
  count?: number;
  every?: number;
  x?: number | readonly number[];
}

export interface WaveDef {
  spawns: readonly SpawnGroup[];
}

export const WAVES: readonly WaveDef[] = [
  // 1 — a few imps to learn on
  { spawns: [
    { at: 0, type: 'imp', count: 3, every: 1700, x: [0.5, 0.25, 0.75] },
    { at: 6500, type: 'imp', count: 2, every: 1200 },
  ] },
  // 2 — the first flyers
  { spawns: [
    { at: 0, type: 'imp', count: 4, every: 1400 },
    { at: 2500, type: 'flyer', count: 1, x: 0.3 },
    { at: 7000, type: 'flyer', count: 1, x: 0.7 },
  ] },
  // 3 — a shield-bearer: ricochet around the shield
  { spawns: [
    { at: 0, type: 'shield', x: 0.5 },
    { at: 1800, type: 'imp', count: 4, every: 1100 },
    { at: 5500, type: 'flyer', count: 2, every: 1500 },
  ] },
  // 4 — two shields and a swarm
  { spawns: [
    { at: 0, type: 'shield', count: 2, every: 2500, x: [0.3, 0.7] },
    { at: 2000, type: 'imp', count: 6, every: 900 },
    { at: 4500, type: 'flyer', count: 3, every: 1400 },
  ] },
  // 5 — everything
  { spawns: [
    { at: 0, type: 'imp', count: 8, every: 750 },
    { at: 3000, type: 'shield', count: 2, every: 3000, x: [0.25, 0.75] },
    { at: 5000, type: 'flyer', count: 4, every: 1000 },
    { at: 9500, type: 'shield', x: 0.5 },
  ] },
];

export interface ScheduledSpawn {
  at: number;
  type: EnemyType;
  /** 0..1 across the floor. */
  x: number;
}

/** Flattens a wave into spawns sorted by time. Pure: `rand` supplies the random x positions. */
export function scheduleWave(wave: WaveDef, rand: () => number): ScheduledSpawn[] {
  const out: ScheduledSpawn[] = [];
  for (const g of wave.spawns) {
    const count = g.count ?? 1;
    for (let i = 0; i < count; i++) {
      const x = g.x === undefined ? rand() : typeof g.x === 'number' ? g.x : g.x[i % g.x.length];
      out.push({ at: g.at + i * (g.every ?? 0), type: g.type, x: Math.min(1, Math.max(0, x)) });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}
