import { describe, expect, it } from 'vitest';
import { ERA_SKINS, MANIFEST_BY_KEY, SKINNABLE_KEYS } from '../../assets/manifest';
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
