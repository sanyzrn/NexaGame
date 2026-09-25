import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { MOCK_GROUP, MOCK_PACING } from '../../config/team';
import { Chain } from '../../services/chain';
import { MockGroupSession, type MockGroupState } from '../../services/MockGroupSession';
import { faMultiplier, faNum, faPercent } from '../../utils/fa';

const C = BALANCE.chain;

/** Deterministic PRNG so the scripted opening and odds are reproducible. */
function lcg(seed = 1): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function state(): MockGroupState {
  return {
    name: MOCK_GROUP.name,
    bossName: MOCK_GROUP.bossName,
    hp: MOCK_GROUP.bossHp,
    hpMax: MOCK_GROUP.bossHpMax,
    members: MOCK_GROUP.members.map((m) => ({ ...m })),
    chain: new Chain(),
    recent: [],
  };
}

describe('chain', () => {
  it('rises a tier per raise, capped, and refills', () => {
    const c = new Chain();
    expect(c.multiplier).toBe(1);
    expect(c.raise()).toBe(true);
    expect(c.multiplier).toBe(C.multipliers[1]);
    expect(c.progress).toBe(1);
    c.raise();
    c.raise();
    expect(c.tier).toBe(3);
    c.tick(1000);
    expect(c.raise()).toBe(false);
    expect(c.tier).toBe(3);
    expect(c.progress).toBe(1);
  });

  it('player hits add time, capped at full', () => {
    const c = new Chain();
    c.extend(false);
    expect(c.tier).toBe(0);
    c.raise();
    c.tick(5000);
    c.extend(false);
    expect(c.leftMs).toBe(C.durationMs[1] - 5000 + C.hitExtendMs);
    c.extend(true);
    c.extend(true);
    c.extend(true);
    c.extend(true);
    expect(c.leftMs).toBe(C.durationMs[1]);
  });

  it('burns out one tier at a time, half-full, then goes out', () => {
    const c = new Chain();
    c.raise();
    c.raise();
    expect(c.tick(C.durationMs[2] + 1)).toBe(true);
    expect(c.tier).toBe(1);
    expect(c.leftMs).toBeCloseTo(C.durationMs[1] * C.dropRefill);
    c.tick(C.durationMs[1]);
    expect(c.tier).toBe(0);
    expect(c.progress).toBe(0);
    expect(c.tick(1000)).toBe(false);
  });
});

describe('mock group session', () => {
  it('opens with a join, a hit and the chain being lit', () => {
    const s = new MockGroupSession(state(), lcg(3));
    const kinds: string[] = [];
    for (let i = 0; i < 3; i++) {
      s.tick(20000);
      const a = s.next();
      expect(a).not.toBeNull();
      kinds.push(a!.kind);
    }
    expect(kinds).toEqual(['join', 'damage', 'chain']);
    expect(s.chain.tier).toBe(1);
  });

  it('commits effects only when the UI takes an activity', () => {
    const st = state();
    const s = new MockGroupSession(st, lcg(5));
    s.tick(MOCK_PACING.firstMs + 1);
    expect(s.pending).toBe(1);
    const before = st.members.filter((m) => m.active).length;
    const a = s.next()!;
    expect(a.kind).toBe('join');
    expect(st.members.filter((m) => m.active).length).toBe(before + 1);
    s.tick(20000);
    const hpBefore = st.hp;
    expect(st.hp).toBe(hpBefore);
    const hit = s.next()!;
    expect(hit.kind).toBe('damage');
    if (hit.kind === 'damage') expect(st.hp).toBe(hpBefore - hit.amount);
    expect(s.recent[0]).toBe(hit);
  });

  it('never queues more than the inbox holds', () => {
    const s = new MockGroupSession(state(), lcg(7));
    for (let i = 0; i < 50; i++) s.tick(20000);
    expect(s.pending).toBe(MOCK_PACING.inboxMax);
  });

  it('applies the chain multiplier to the player and keeps it burning', () => {
    const st = state();
    const s = new MockGroupSession(st, lcg(9));
    expect(s.addPlayerDamage(100, false)).toBe(100);
    st.chain.raise();
    st.chain.raise();
    st.chain.tick(4000);
    const left = st.chain.leftMs;
    expect(s.addPlayerDamage(100, true)).toBe(150);
    expect(st.chain.leftMs).toBe(left + C.critExtendMs);
    expect(st.hp).toBe(MOCK_GROUP.bossHp - 250);
  });

  it('teammates never take the Div below the demo floor', () => {
    const st = state();
    st.hp = Math.round(st.hpMax * MOCK_PACING.hpFloorPct) + 50;
    const s = new MockGroupSession(st, lcg(11));
    for (let i = 0; i < 40; i++) {
      s.tick(20000);
      s.next();
    }
    expect(st.hp).toBeGreaterThanOrEqual(Math.round(st.hpMax * MOCK_PACING.hpFloorPct));
  });

  it('a Simorghi healer answers the call for help', () => {
    const s = new MockGroupSession(state(), lcg(13));
    const m = s.requestRescue();
    expect(m?.school).toBe('simorghi');
    expect(s.recent[0].kind).toBe('rescue');
  });

  it('stops after close', () => {
    const s = new MockGroupSession(state(), lcg(15));
    s.close();
    s.tick(60000);
    expect(s.pending).toBe(0);
    expect(s.next()).toBeNull();
  });
});

describe('persian numbers', () => {
  it('formats separators, percents and multipliers', () => {
    expect(faNum(12400)).toBe('۱۲٬۴۰۰');
    expect(faPercent(0.638)).toBe('۶۳٫۸٪');
    expect(faMultiplier(1.5)).toBe('×۱٫۵');
    expect(faMultiplier(2)).toBe('×۲');
  });
});
