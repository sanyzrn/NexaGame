import { describe, expect, it } from 'vitest';
import { PerfBudget, type AutoReduceConfig } from '../Perf';

const cfg = (over: Partial<AutoReduceConfig> = {}): AutoReduceConfig => ({
  enabled: true,
  minFps: 45,
  sustainMs: 3000,
  sampleMs: 500,
  ...over,
});

describe('PerfBudget (auto light effects)', () => {
  it('fires after the frame rate stays under the floor for the sustain window', () => {
    const b = new PerfBudget(cfg());
    let fired = false;
    for (let i = 0; i < 6; i++) fired = b.sample(30, 500) || fired; // 3s of 30 fps
    expect(fired).toBe(true);
    expect(b.isFired).toBe(true);
  });

  it('does not fire while the frame rate is fine', () => {
    const b = new PerfBudget(cfg());
    let fired = false;
    for (let i = 0; i < 30; i++) fired = b.sample(60, 500) || fired;
    expect(fired).toBe(false);
  });

  it('resets the window when the frame rate recovers mid-dip', () => {
    const b = new PerfBudget(cfg());
    let fired = false;
    for (let i = 0; i < 4; i++) fired = b.sample(30, 500) || fired; // 2s low
    fired = b.sample(60, 500) || fired; // recovery clears the window
    for (let i = 0; i < 4; i++) fired = b.sample(30, 500) || fired; // 2s low again
    expect(fired).toBe(false); // never 3s continuous
  });

  it('fires only once', () => {
    const b = new PerfBudget(cfg());
    const hits: boolean[] = [];
    for (let i = 0; i < 12; i++) hits.push(b.sample(20, 500));
    expect(hits.filter(Boolean)).toHaveLength(1);
  });

  it('never fires after the player has set the effects themselves', () => {
    const b = new PerfBudget(cfg());
    b.manualSet();
    let fired = false;
    for (let i = 0; i < 10; i++) fired = b.sample(10, 500) || fired;
    expect(fired).toBe(false);
  });

  it('respects the enabled flag', () => {
    const b = new PerfBudget(cfg({ enabled: false }));
    let fired = false;
    for (let i = 0; i < 10; i++) fired = b.sample(10, 500) || fired;
    expect(fired).toBe(false);
  });

  it('a dip that straddles the boundary with mixed samples still needs 3s of low time', () => {
    const b = new PerfBudget(cfg());
    let fired = false;
    // Alternate low/high: the low-time accumulates only on low samples (1.5s total).
    for (let i = 0; i < 12; i++) fired = b.sample(i % 2 === 0 ? 30 : 60, 500) || fired;
    expect(fired).toBe(false);
  });
});
