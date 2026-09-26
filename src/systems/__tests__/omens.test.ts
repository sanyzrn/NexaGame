import { describe, expect, it } from 'vitest';
import { OMENS, applyOmenToWave, daySeed, pickOmen } from '../../data/omens';
import type { ScheduledSpawn } from '../../data/waves';
import { Moments } from '../../data/moments';

describe('omens (فال لشکر)', () => {
  it('the same day draws the same omen for everyone', () => {
    const a = pickOmen(new Date('2026-09-26T10:00:00Z'));
    const b = pickOmen(new Date('2026-09-26T22:00:00Z'));
    expect(a).toBe(b);
  });

  it('the seed advances one day at a time (UTC days)', () => {
    expect(daySeed(new Date('2026-09-26T00:00:00Z'))).toBe(daySeed(new Date('2026-09-26T23:59:59Z')));
    expect(daySeed(new Date('2026-09-27T00:00:00Z'))).toBe(daySeed(new Date('2026-09-26T00:00:00Z')) + 1);
  });

  it('cycles through the whole roster without repeating before the end', () => {
    const first = pickOmen(new Date('2026-01-01T00:00:00Z'))!;
    const seen = new Set([first.id]);
    for (let d = 1; d < OMENS.length; d++) {
      const o = pickOmen(new Date(Date.UTC(2026, 0, 1 + d)))!;
      expect(seen.has(o.id)).toBe(false);
      seen.add(o.id);
    }
    // And the next day wraps around to the first.
    expect(pickOmen(new Date(Date.UTC(2026, 0, 1 + OMENS.length)))!.id).toBe(first.id);
  });

  it('?omen=<id> overrides the day; ?omen= (empty) turns it off; a bad id falls back to the day', () => {
    expect(pickOmen(new Date(), 'desert-wind')!.id).toBe('desert-wind');
    expect(pickOmen(new Date(), '')).toBeNull();
    expect(pickOmen(new Date(), 'no-such-omen')).toBe(pickOmen(new Date()));
  });

  it('every omen grades and names itself (the title, run toast and card need both)', () => {
    for (const o of OMENS) {
      expect(o.name.length).toBeGreaterThan(0);
      expect(o.line.length).toBeGreaterThan(0);
      expect(o.grade.top).toMatch(/^#/);
      expect(o.grade.alpha).toBeGreaterThan(0);
    }
  });

  it('night-of-tulips adds extra flyers, capped at three; other omens add none', () => {
    const flyers: ScheduledSpawn[] = [
      { at: 0, type: 'flyer', x: 0.5 },
      { at: 1000, type: 'flyer', x: 0.3 },
    ];
    const base: ScheduledSpawn[] = [...flyers, { at: 500, type: 'imp', x: 0.5 }];
    const tulip = OMENS.find((o) => o.id === 'tulip-night')!;
    const out = applyOmenToWave(base, tulip);
    expect(out.filter((s) => s.type === 'flyer').length).toBe(4); // 2 + min(3, floor(2*1)) = 4? weight 2 → extra = min(3, floor(2*(2-1))) = 2 → 4
    expect(out.length).toBe(base.length + 2);
    // The original entries are untouched (extra copies are appended).
    expect(out.slice(0, base.length)).toEqual(base);
    // No flyers in the wave: nothing is added.
    const imps: ScheduledSpawn[] = [{ at: 0, type: 'imp', x: 0.5 }];
    expect(applyOmenToWave(imps, tulip)).toEqual(imps);
    // A no-flyer-weight omen changes nothing.
    expect(applyOmenToWave(base, OMENS[0])).toEqual(base);
  });
});

describe('moments (لحظهٔ برتر)', () => {
  it('an uneventful run has no best moment', () => {
    const m = new Moments();
    expect(m.bestMoment()).toBeNull();
  });

  it('counts and reports in priority order: crush > bomb chain > intercept > double kill > ricochet', () => {
    const m = new Moments();
    m.count('ricochets');
    m.count('doubleKills');
    m.count('intercepts');
    m.count('bombChains');
    expect(m.bestMoment()).toContain('نفتی');
    m.count('crushes');
    expect(m.bestMoment()).toContain('زیر سنگ');
  });

  it('a golden streak only counts at its best', () => {
    const m = new Moments();
    m.streak(3);
    m.streak(2); // a later, shorter run does not lower the bar
    m.streak(5);
    expect(m.log.goldenStreakBest).toBe(5);
    expect(m.bestMoment()).toContain('پنج تیر طلایی');
  });

  it('ricochet lines escalate by count', () => {
    const m = new Moments();
    m.count('ricochets');
    expect(m.bestMoment()).toBe('کمانه‌ای ماهرانه');
    m.count('ricochets');
    m.count('ricochets');
    expect(m.bestMoment()).toBe('استادِ کمانه');
  });
});
