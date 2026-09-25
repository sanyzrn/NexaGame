import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { ENEMIES } from '../../data/entities';
import { WAVES, scheduleWave, type WaveDef } from '../../data/waves';
import { Settings } from '../../services/Settings';

describe('scheduleWave', () => {
  const wave: WaveDef = {
    spawns: [
      { at: 1000, type: 'imp', count: 3, every: 500, x: [0.1, 0.9] },
      { at: 0, type: 'shield', x: 0.5 },
      { at: 1200, type: 'flyer', count: 2, every: 100 },
    ],
  };

  it('expands groups into single spawns sorted by time', () => {
    const s = scheduleWave(wave, () => 0.25);
    expect(s.map((e) => e.at)).toEqual([0, 1000, 1200, 1300, 1500, 2000]);
    expect(s.map((e) => e.type)).toEqual(['shield', 'imp', 'flyer', 'flyer', 'imp', 'imp']);
  });

  it('uses fixed x, cycles x lists, and draws random x when omitted', () => {
    const s = scheduleWave(wave, () => 0.25);
    expect(s.filter((e) => e.type === 'imp').map((e) => e.x)).toEqual([0.1, 0.9, 0.1]);
    expect(s.find((e) => e.type === 'shield')!.x).toBe(0.5);
    expect(s.filter((e) => e.type === 'flyer').every((e) => e.x === 0.25)).toBe(true);
  });

  it('clamps x into 0..1', () => {
    const s = scheduleWave({ spawns: [{ at: 0, type: 'imp', x: 1.4 }] }, () => 0);
    expect(s[0].x).toBe(1);
  });
});

describe('wave data', () => {
  it('only uses known enemy types with balance entries', () => {
    for (const w of WAVES) {
      for (const g of w.spawns) {
        expect(ENEMIES[g.type]).toBeDefined();
        expect(BALANCE.enemies[g.type].hp).toBeGreaterThan(0);
        expect(g.at).toBeGreaterThanOrEqual(0);
        expect(g.count ?? 1).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('every wave spawns something', () => {
    for (const w of WAVES) expect(scheduleWave(w, Math.random).length).toBeGreaterThan(0);
  });
});

describe('reduced effects', () => {
  it('halves particle counts but keeps at least one', () => {
    const s = new Settings();
    s.setReducedEffects(false);
    expect(s.count(12)).toBe(12);
    s.setReducedEffects(true);
    expect(s.count(12)).toBe(6);
    expect(s.count(1)).toBe(1);
    expect(s.count(0)).toBe(0);
  });
});
