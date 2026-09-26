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

describe('BossBrain — boulder barrage (سنگ‌باران)', () => {
  it('crossing a scripted hp threshold fires one boulder event, exactly once', () => {
    const b = fighting();
    b.hit({ damage: Math.ceil(cfg.hp * (1 - cfg.boulders.at[0])) + 1, crit: false, gem: false });
    expect(b.events.filter((e) => e === 'boulder').length).toBe(1);
    b.events.length = 0;
    // More damage in the same neighbourhood: the threshold never fires twice.
    b.hit({ damage: 50, crit: false, gem: false });
    expect(b.events).not.toContain('boulder');
  });

  it('throws repeating boulders while armoured, on the armour cadence', () => {
    const b = fighting();
    b.hit({ damage: cfg.hp * (1 - cfg.armorAtPct), crit: false, gem: false });
    b.events.length = 0;
    b.tick(cfg.boulders.armorEveryMs + 1);
    expect(b.events).toContain('boulder');
  });

  it('ash fury (خشم خاکستری) throws boulders on the faster cadence', () => {
    const b = fighting();
    // Take him below lowHpPct in one blow (still above the finisher floor).
    b.hit({ damage: Math.ceil(cfg.hp * (1 - cfg.lowHpPct)) , crit: true, gem: false });
    expect(b.fury).toBe(true);
    b.events.length = 0;
    b.tick(cfg.boulders.furyEveryMs + 1);
    expect(b.events).toContain('boulder');
  });

  it('never boulders while stunned', () => {
    const b = fighting();
    b.hit({ damage: cfg.hp * (1 - cfg.armorAtPct), crit: false, gem: false });
    b.hit({ damage: 10, crit: true, gem: true });
    b.events.length = 0;
    b.tick(cfg.stunMs + 1);
    // The stun consumed the tick; no boulder was scheduled during it.
    expect(b.events).not.toContain('boulder');
    expect(b.events).toContain('recover');
  });

  it('fury tightens the summon cadence', () => {
    const b = fighting();
    b.hit({ damage: Math.ceil(cfg.hp * (1 - cfg.lowHpPct)), crit: true, gem: false });
    expect(b.fury).toBe(true);
    expect(b.state).toBe('armor');
    b.events.length = 0;
    // Burn past the construction-time timer so the reset cadence is in charge.
    b.tick(cfg.summon.firstMs + 1);
    expect(b.events).toContain('summon');
    b.events.length = 0;
    const every = cfg.summon.armorEveryMs * cfg.fury.summonEveryMul;
    // A hair short of the fury cadence: nothing yet…
    b.tick(every - 10);
    expect(b.events).not.toContain('summon');
    // …then right on it.
    b.tick(11);
    expect(b.events).toContain('summon');
  });
});
