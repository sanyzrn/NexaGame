import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { ENEMIES } from '../../data/entities';
import { WAVES, scheduleWave } from '../../data/waves';

/** Deterministic RNG for tests. */
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe('waves — the ascension roster', () => {
  it('every wave only uses known enemy types with positive hp', () => {
    for (const w of WAVES) {
      for (const g of w.spawns) {
        expect(Object.keys(ENEMIES)).toContain(g.type);
        expect(BALANCE.enemies[g.type].hp).toBeGreaterThan(0);
      }
    }
  });

  it('the level runs exactly the waves before the boss rises', () => {
    expect(Math.min(WAVES.length, BALANCE.boss.afterWave)).toBe(4);
  });

  it('each new archetype appears somewhere before the boss', () => {
    const flat = WAVES.slice(0, BALANCE.boss.afterWave).flatMap((w) => w.spawns.map((g) => g.type));
    for (const t of ['slinger', 'bomber', 'wraith'] as const) expect(flat).toContain(t);
  });

  it('elite chance marks spawns as elite (deterministic through the rng)', () => {
    const g = { at: 0, type: 'shield' as const, count: 3, every: 100, x: 0.5, elite: 0.5 };
    const all = scheduleWave({ spawns: [g] }, seq(0.9, 0.9, 0.9));
    expect(all.every((s) => s.elite !== true)).toBe(true);
    const some = scheduleWave({ spawns: [g] }, seq(0.1, 0.9, 0.1));
    expect(some.map((s) => !!s.elite)).toEqual([true, false, true]);
    // No elite field on the group: never elite.
    const none = scheduleWave({ spawns: [{ at: 0, type: 'imp' as const, count: 2, every: 50, x: 0.5 }] }, seq(0.01, 0.01));
    expect(none.every((s) => !s.elite)).toBe(true);
  });

  it('the bomber is slow and fat; the wraith is quick; the slinger stops and shoots', () => {
    const E = BALANCE.enemies;
    expect(E.bomber.speed).toBeLessThan(E.imp.speed);
    expect(E.wraith.speed).toBeGreaterThan(E.imp.speed);
    // The slinger holds its ground well above the attack line, and lobs a destructible stone.
    expect(E.slinger.stopY[1]).toBeLessThan(1440);
    expect(E.slinger.stopY[0]).toBeGreaterThan(0);
    expect(E.slinger.rock.flightMs).toBeGreaterThan(0);
    expect(E.slinger.rock.hp).toBe(1);
    // A bomber's fuse is a beat long — enough to plan around — and fire shortens it.
    expect(E.bomber.fuseMs).toBeGreaterThan(E.bomber.fireFuseMs);
  });
});
