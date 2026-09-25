import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { FINISHERS } from '../../data/finishers';
import { BossBrain } from '../bossBrain';

const fin = FINISHERS.arash;
const cfg = BALANCE.boss;

function fighting(): BossBrain {
  const b = new BossBrain(cfg, fin);
  b.startIntro();
  b.introDone();
  return b;
}

describe('BossBrain', () => {
  it('goes hidden → intro → phase1 and ignores arrows until then', () => {
    const b = new BossBrain(cfg, fin);
    expect(b.hit({ damage: 100, crit: false, gem: false }).blocked).toBe(true);
    b.startIntro();
    expect(b.state).toBe('intro');
    b.introDone();
    expect(b.state).toBe('phase1');
    expect(b.hit({ damage: 100, crit: false, gem: false }).damage).toBe(100);
  });

  it('gem hits deal the gem multiplier', () => {
    const b = fighting();
    expect(b.hit({ damage: 100, crit: false, gem: true }).damage).toBe(100 * cfg.gemMultiplier);
  });

  it('forms the barrier at the armor threshold; then only golden arrows hurt', () => {
    const b = fighting();
    b.hit({ damage: cfg.hp * (1 - cfg.armorAtPct), crit: false, gem: false });
    expect(b.state).toBe('armor');
    expect(b.events).toContain('armor');
    expect(b.hit({ damage: 100, crit: false, gem: false })).toEqual({ damage: 0, blocked: true });
    expect(b.hit({ damage: 100, crit: true, gem: false }).damage).toBe(100);
  });

  it('a golden gem hit while armored stuns; stun multiplies damage, then he recovers', () => {
    const b = fighting();
    b.hit({ damage: cfg.hp * (1 - cfg.armorAtPct), crit: false, gem: false });
    b.hit({ damage: 10, crit: true, gem: true });
    expect(b.state).toBe('stunned');
    expect(b.hit({ damage: 100, crit: false, gem: false }).damage).toBe(100 * cfg.stunDamageMultiplier);
    b.tick(cfg.stunMs + 1);
    expect(b.state).toBe('armor');
    expect(b.events).toContain('recover');
  });

  it('can never die to normal damage: stops at the finisher threshold', () => {
    const b = fighting();
    b.hit({ damage: cfg.hp * 10, crit: false, gem: false });
    expect(b.state).toBe('finisher');
    expect(b.hp).toBe(Math.round(cfg.hp * fin.triggerPct));
    expect(b.hit({ damage: 1000, crit: true, gem: true }).blocked).toBe(true);
  });

  it('full finisher kills; an early one leaves him at earlyHpPct and offers it again', () => {
    const b = fighting();
    b.hit({ damage: cfg.hp * 10, crit: false, gem: false });
    b.finisherResult(false);
    expect(b.state).toBe('armor');
    expect(b.hp).toBe(Math.round(cfg.hp * fin.earlyHpPct));
    // can't be finished by normal damage in the meantime
    b.hit({ damage: 99999, crit: true, gem: false });
    expect(b.hp).toBe(1);
    expect(b.state).toBe('armor');
    b.tick(fin.retryMs + 1);
    expect(b.state).toBe('finisher');
    b.finisherResult(true);
    expect(b.state).toBe('dead');
    expect(b.hp).toBe(0);
  });

  it('summons on a timer while fighting, not while stunned', () => {
    const b = fighting();
    b.tick(cfg.summon.firstMs + 1);
    expect(b.events.filter((e) => e === 'summon').length).toBe(1);
    b.events.length = 0;
    b.hit({ damage: cfg.hp * (1 - cfg.armorAtPct), crit: false, gem: false });
    b.hit({ damage: 10, crit: true, gem: true });
    b.tick(cfg.summon.armorEveryMs - 10);
    expect(b.events).not.toContain('summon');
  });

  it('flags low hp once', () => {
    const b = fighting();
    b.hit({ damage: cfg.hp * (1 - cfg.lowHpPct) + 1, crit: true, gem: false });
    b.hit({ damage: 1, crit: true, gem: false });
    expect(b.events.filter((e) => e === 'lowHp').length).toBe(1);
  });
});
