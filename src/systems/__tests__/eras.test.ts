import { describe, expect, it } from 'vitest';
import { ERA_COUNT, ERA_SKINS, MANIFEST_BY_KEY, SKINNABLE_KEYS } from '../../assets/manifest';
import { DIFFICULTIES } from '../../data/difficulty';
import { BALANCE } from '../../config/balance';
import { ERAS, combineMods } from '../../data/eras';

describe('eras', () => {
  it('have unique ids and years that move forward in time', () => {
    expect(new Set(ERAS.map((e) => e.id)).size).toBe(ERAS.length);
    for (let i = 1; i < ERAS.length; i++) expect(ERAS[i].yearNum).toBeGreaterThan(ERAS[i - 1].yearNum);
  });

  it('start with the first era playable and without a skin', () => {
    expect(ERAS[0].playable).toBe(true);
    expect(ERAS[0].skin).toBeNull();
  });

  it('give every playable era enough waves before the boss', () => {
    for (const e of ERAS.filter((x) => x.playable)) expect(e.waves.length).toBeGreaterThanOrEqual(BALANCE.boss.afterWave);
  });

  it('only use skin prefixes that the manifest knows, with every skinnable key registered', () => {
    for (const e of ERAS) {
      if (e.skin === null) continue;
      expect(ERA_SKINS.some((s) => s.prefix === e.skin)).toBe(true);
      for (const key of SKINNABLE_KEYS) {
        const def = MANIFEST_BY_KEY.get(`${e.skin}_${key}`);
        const base = MANIFEST_BY_KEY.get(key);
        expect(def?.skinOf).toBe(key);
        expect([def?.w, def?.h, def?.ox, def?.oy]).toEqual([base?.w, base?.h, base?.ox, base?.oy]);
      }
    }
  });
});

describe('era timeline', () => {
  it('has at least 16 eras including Pahlavi and the contemporary era', () => {
    expect(ERAS.length).toBeGreaterThanOrEqual(16);
    expect(ERAS.length).toBe(ERA_COUNT);
    expect(ERAS.some((e) => e.id === 'pahlavi')).toBe(true);
    expect(ERAS.some((e) => e.id === 'contemporary')).toBe(true);
  });

  it('gives era N the skin prefix eN', () => {
    ERAS.forEach((e, i) => expect(e.skin).toBe(i === 0 ? null : `e${i + 1}`));
  });
});

describe('difficulty', () => {
  it('ramps up in order, with normal at the base tuning', () => {
    const normal = DIFFICULTIES.find((d) => d.id === 'normal')!;
    expect([normal.enemyHpMul, normal.enemySpeedMul, normal.bossHpMul, normal.scoreMul, normal.hearts]).toEqual([1, 1, 1, 1, 3]);
    for (let i = 1; i < DIFFICULTIES.length; i++) {
      expect(DIFFICULTIES[i].enemyHpMul).toBeGreaterThan(DIFFICULTIES[i - 1].enemyHpMul);
      expect(DIFFICULTIES[i].scoreMul).toBeGreaterThan(DIFFICULTIES[i - 1].scoreMul);
      expect(DIFFICULTIES[i].hearts).toBeLessThanOrEqual(DIFFICULTIES[i - 1].hearts);
    }
  });
});

describe('combineMods', () => {
  it('multiplies multipliers, adds drift, keeps flags', () => {
    const m = combineMods({ enemySpeedMul: 1.2, arrowDriftDegPerSec: 3, scoreMul: 1.2 }, { enemySpeedMul: 1.5, arrowDriftDegPerSec: 6, homaGuaranteed: true });
    expect(m.enemySpeedMul).toBeCloseTo(1.8);
    expect(m.arrowDriftDegPerSec).toBe(9);
    expect(m.scoreMul).toBeCloseTo(1.2);
    expect(m.homaGuaranteed).toBe(true);
  });

  it('returns the era rule alone when there is no omen', () => {
    expect(combineMods({ fireMul: 2 }, undefined)).toEqual({ fireMul: 2 });
  });
});
