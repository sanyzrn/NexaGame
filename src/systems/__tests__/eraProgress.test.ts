import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERAS } from '../../data/eras';

const saved = new Map<string, string>();
const location = { search: '' };

beforeEach(() => {
  saved.clear();
  location.search = '';
  vi.resetModules();
  vi.stubGlobal('window', {
    location,
    localStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    },
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('era progression', () => {
  it('unlocks every era in order as the previous boss falls', async () => {
    const progress = await import('../eraProgress');
    expect(ERAS).toHaveLength(17);
    expect(progress.canSelectEra(1)).toBe(false);
    for (let i = 0; i < ERAS.length; i++) {
      expect(progress.selectEra(i)).toBe(true);
      expect(progress.currentEra().id).toBe(ERAS[i].id);
      expect(progress.completeEra(progress.currentEra())?.id).toBe(ERAS[i + 1]?.id);
    }
  });

  it('lets the tester visit any era and restores their campaign selection on exit', async () => {
    const progress = await import('../eraProgress');
    progress.completeEra(progress.currentEra());
    expect(progress.selectEra(1)).toBe(true);
    const campaign = [...saved];
    progress.setEraTestMode(true);
    expect(progress.currentIndex()).toBe(1);
    for (let i = ERAS.length - 1; i >= 0; i--) {
      expect(progress.selectEra(i)).toBe(true);
      expect(progress.currentIndex()).toBe(i);
      expect(progress.completeEra(progress.currentEra())).toBeNull();
    }
    expect(progress.selectEra(ERAS.length)).toBe(false);
    expect([...saved]).toEqual(campaign);
    progress.setEraTestMode(false);
    expect(progress.currentIndex()).toBe(1);
    expect(progress.unlockedIndex()).toBe(1);
  });

  it('accepts a web link into an exact era and leaves it when the tester exits', async () => {
    location.search = '?god=1&era=sasanian';
    const progress = await import('../eraProgress');
    expect(progress.isEraTestMode()).toBe(true);
    expect(progress.currentEra().id).toBe('sasanian');
    progress.setEraTestMode(false);
    expect(progress.currentIndex()).toBe(0);
  });
});
