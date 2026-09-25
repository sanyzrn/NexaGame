import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { FINISHERS } from '../../data/finishers';
import { encodeStartParam, parseStartParam } from '../../services/links';
import { BossBrain } from '../bossBrain';
import { PowerMeter } from '../powerMeter';

const G = BALANCE.power.gain;

describe('power meter', () => {
  it('fills mostly from golden hits (about three per power)', () => {
    const m = new PowerMeter();
    m.add('golden');
    m.add('golden');
    expect(m.full).toBe(false);
    m.add('golden');
    m.add('kill');
    expect(m.value).toBeCloseTo(Math.min(1, G.golden * 3 + G.kill));
    m.add('golden');
    expect(m.full).toBe(true);
  });

  it('adds for combo milestones only', () => {
    const m = new PowerMeter();
    expect(m.combo(BALANCE.power.comboEvery - 1)).toBe(0);
    expect(m.combo(BALANCE.power.comboEvery)).toBeCloseTo(G.comboStep);
  });

  it('spends only when full, and never overfills', () => {
    const m = new PowerMeter();
    expect(m.spend()).toBe(false);
    m.fill();
    expect(m.add('golden')).toBe(0);
    expect(m.spend()).toBe(true);
    expect(m.value).toBe(0);
  });
});

describe('start parameters', () => {
  it('round-trips a challenge with a Persian name within Telegram limits', () => {
    const p = encodeStartParam({ kind: 'challenge', score: 12400, name: 'سارا' });
    expect(p).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(parseStartParam(p)).toEqual({ kind: 'challenge', score: 12400, name: 'سارا' });
  });

  it('round-trips an invite and truncates long names', () => {
    const long = 'پهلوان‌بزرگ‌دشت‌های‌خراسان';
    const p = encodeStartParam({ kind: 'invite', from: long });
    expect(p.length).toBeLessThanOrEqual(64);
    const back = parseStartParam(p);
    expect(back?.kind).toBe('invite');
  });

  it('ignores anything malformed', () => {
    expect(parseStartParam('')).toBeNull();
    expect(parseStartParam('x_1_2')).toBeNull();
    expect(parseStartParam('c_abc_zz')).toBeNull();
    expect(parseStartParam('c_-5_YQ')).toBeNull();
    expect(parseStartParam('i_%%%')).toBeNull();
  });
});

describe('the Rostami quake on the Div', () => {
  const fin = FINISHERS.arash;
  it('shatters the barrier (a stun) only while he is armoured', () => {
    const b = new BossBrain(BALANCE.boss, fin);
    b.startIntro();
    b.introDone();
    expect(b.quake()).toBe(false);
    b.hit({ damage: b.maxHp * 0.6, crit: false, gem: false });
    expect(b.state).toBe('armor');
    b.events.length = 0;
    expect(b.quake()).toBe(true);
    expect(b.state).toBe('stunned');
    expect(b.events).toContain('stun');
  });
});
