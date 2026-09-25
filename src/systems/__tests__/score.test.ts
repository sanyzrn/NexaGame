import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { EPIC_LINES, PERFECT_CHEER } from '../../data/lines';
import { epicLineFor, finalize, goldenPct, isPerfect, reactionsFor, scoreFor, type RunStats } from '../score';

type Raw = Parameters<typeof finalize>[0];

const base: Raw = {
  won: true,
  kills: 20,
  shots: 40,
  goldenShots: 10,
  bestCombo: 6,
  damageDealt: 6000,
  groupDamage: 7200,
  heartsLost: 1,
  heartsLeft: 2,
  rescued: false,
  reachedBoss: true,
};

const run = (over: Partial<Raw> = {}): RunStats => finalize({ ...base, ...over });

describe('score', () => {
  it('adds up the run by the balance weights', () => {
    const W = BALANCE.score;
    expect(scoreFor(base)).toBe(6000 * W.damage + 20 * W.kill + 6 * W.bestCombo + 10 * W.golden + W.victory + 2 * W.heartLeft);
    expect(scoreFor({ ...base, won: false })).toBe(6000 * W.damage + 20 * W.kill + 6 * W.bestCombo + 10 * W.golden);
  });

  it('golden accuracy is golden releases over arrows fired', () => {
    expect(goldenPct({ shots: 40, goldenShots: 10 })).toBe(0.25);
    expect(goldenPct({ shots: 0, goldenShots: 0 })).toBe(0);
  });
});

describe('stars', () => {
  it('a plain victory is one star', () => {
    expect(run().stars).toBe(1);
  });

  it('a sharp eye earns the second, a clean fight the third', () => {
    expect(run({ goldenShots: 20 }).stars).toBe(3);
    expect(run({ bestCombo: 12 }).stars).toBe(3);
    expect(run({ goldenShots: 20, heartsLost: 2 }).stars).toBe(2);
    expect(run({ goldenShots: 20, rescued: true }).stars).toBe(2);
  });

  it('a defeat always keeps at least one star, two if it reached the Div', () => {
    expect(run({ won: false, reachedBoss: false, goldenShots: 30 }).stars).toBe(1);
    expect(run({ won: false }).stars).toBe(2);
  });

  it('perfect means three stars without losing a heart', () => {
    expect(isPerfect(run({ goldenShots: 20, heartsLost: 0 }))).toBe(true);
    expect(isPerfect(run({ goldenShots: 20, heartsLost: 1 }))).toBe(false);
  });
});

describe('lines', () => {
  it('has 6 to 8 epic lines, all Persian', () => {
    const all = EPIC_LINES.flat();
    expect(all.length).toBeGreaterThanOrEqual(6);
    expect(all.length).toBeLessThanOrEqual(8);
    for (const l of all) expect(l.text).toMatch(/[؀-ۿ]/);
  });

  it('picks the most specific line that fits', () => {
    expect(epicLineFor(run({ goldenShots: 20, heartsLost: 0 }), () => 0)).toBe('کمانش چون آرش، دلش چون رستم');
    expect(epicLineFor(run({ won: false, reachedBoss: false, goldenShots: 2 }), () => 0)).toBe('پهلوان با زخم بزرگ می‌شود');
  });

  it('reactions fit the run and never repeat', () => {
    const lost = reactionsFor(run({ won: false, groupDamage: 0, goldenShots: 2 }), 5, () => 0.3);
    expect(lost.length).toBeGreaterThan(0);
    expect(new Set(lost).size).toBe(lost.length);
    expect(lost).not.toContain('دمت گرم پهلوان! 🔥');
    expect(PERFECT_CHEER).toContain('👑');
  });
});
