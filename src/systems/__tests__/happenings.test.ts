import { describe, expect, it } from 'vitest';
import { MANIFEST_BY_KEY, MOOD_BGS } from '../../assets/manifest';
import { ERA_EVENTS, pickEraEvent } from '../../data/eraEvents';
import { ERAS } from '../../data/eras';
import { MOOD_BG_KEYS, MOODS, pickMood } from '../../data/moods';
import { WEATHERS, pickWeather, weatherStrength } from '../../data/weather';
import { DIRECTOR, newDirector, planWave } from '../director';

describe('era events', () => {
  it('give every era at least three historical headlines', () => {
    for (const era of ERAS) expect(ERA_EVENTS[era.id]?.length ?? 0, era.id).toBeGreaterThanOrEqual(3);
  });

  it('never repeat a headline within a run', () => {
    const shown = new Set<string>();
    for (let i = 0; i < ERA_EVENTS.achaemenid.length; i++) {
      const ev = pickEraEvent('achaemenid', Math.random, shown)!;
      expect(shown.has(ev.title)).toBe(false);
      shown.add(ev.title);
    }
    expect(pickEraEvent('achaemenid', Math.random, shown)).toBeNull();
  });
});

describe('weather', () => {
  it('never rolls the same weather twice in a row', () => {
    for (const w of WEATHERS) {
      for (let i = 0; i < 30; i++) expect(pickWeather(Math.random, w.id).id).not.toBe(w.id);
    }
  });

  it('fades in, holds and fades out', () => {
    expect(weatherStrength(0, 10000)).toBe(0);
    expect(weatherStrength(750, 10000)).toBeCloseTo(0.5);
    expect(weatherStrength(5000, 10000)).toBe(1);
    expect(weatherStrength(9000, 10000)).toBeCloseTo(0.5);
    expect(weatherStrength(10000, 10000)).toBe(0);
  });
});

describe('moods', () => {
  it('have painted backgrounds registered in the manifest (lazy, optional)', () => {
    expect([...MOOD_BG_KEYS].sort()).toEqual([...MOOD_BGS].sort());
    for (const key of MOOD_BG_KEYS) {
      const def = MANIFEST_BY_KEY.get(key);
      expect(def?.optional).toBe(true);
      expect(def?.lazy).toBe(true);
      expect(MANIFEST_BY_KEY.get(`e2_${key}`)?.optional).toBe(true);
    }
  });

  it('can be forced and are otherwise weighted draws', () => {
    expect(pickMood(Math.random, 'night').id).toBe('night');
    expect(pickMood(() => 0).id).toBe(MOODS[0].id);
  });
});

describe('surprise director', () => {
  it('keeps the first wave clean', () => {
    const d = newDirector();
    for (let i = 0; i < 20; i++) expect(planWave(d, 0, () => 0)).toEqual({ weatherAt: -1, eventAt: -1 });
  });

  it('caps surprises per run and never runs weather two waves in a row', () => {
    const d = newDirector();
    let weathers = 0;
    let events = 0;
    let last = -9;
    for (let wave = 1; wave < 12; wave++) {
      const p = planWave(d, wave, () => 0);
      if (p.weatherAt >= 0) {
        expect(wave - last).toBeGreaterThan(1);
        last = wave;
        weathers++;
      }
      if (p.eventAt >= 0) events++;
      if (p.weatherAt >= 0 && p.eventAt >= 0) expect(Math.abs(p.eventAt - p.weatherAt)).toBeGreaterThanOrEqual(3000);
    }
    expect(weathers).toBe(DIRECTOR.maxWeathers);
    expect(events).toBe(DIRECTOR.maxEvents);
  });
});
