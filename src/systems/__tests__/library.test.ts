import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { ARENA } from '../../data/arena';
import { ERAS } from '../../data/eras';
import { FINISHERS } from '../../data/finishers';
import { LIBRARY_LAMP_COUNT, SAMANID_DECOR } from '../../data/lamps';
import { BossBrain } from '../bossBrain';
import { LampBank, LIBRARY, SnuffClock, WardWindow, lampOnRay } from '../libraryRules';

describe('LampBank', () => {
  it('starts with every lamp lit and snuffs/relights one at a time', () => {
    const bank = new LampBank(3);
    expect(bank.litCount).toBe(3);
    expect(bank.snuff(1)).toBe(true);
    expect(bank.litCount).toBe(2);
    expect(bank.isLit(1)).toBe(false);
    expect(bank.darkLeft(1)).toBe(LIBRARY.relightMs);
    // Snuffing a dark lamp does nothing.
    expect(bank.snuff(1)).toBe(false);
    expect(bank.relight(1)).toBe(true);
    expect(bank.litCount).toBe(3);
    expect(bank.relight(1)).toBe(false);
  });

  it('relights a snuffed lamp by its embers after the relight window', () => {
    const bank = new LampBank(3, 1000);
    bank.snuff(0);
    expect(bank.tick(400)).toEqual([]);
    expect(bank.darkLeft(0)).toBe(600);
    expect(bank.tick(700)).toEqual([0]);
    expect(bank.isLit(0)).toBe(true);
    expect(bank.litCount).toBe(3);
  });

  it('only ever picks a lit lamp to snuff', () => {
    const bank = new LampBank(3);
    bank.snuff(0);
    bank.snuff(2);
    const picked = bank.nextLit(() => 0);
    expect(picked).toBe(1);
    bank.snuff(1);
    expect(bank.nextLit(() => 0)).toBe(-1);
  });
});

describe('WardWindow', () => {
  it('opens, runs down and closes; opening again extends it', () => {
    const win = new WardWindow(1000);
    expect(win.isOpen).toBe(false);
    win.open();
    expect(win.isOpen).toBe(true);
    expect(win.progress).toBe(1);
    win.tick(600);
    win.open(400); // never shortens
    expect(win.leftMs).toBe(400);
    win.tick(399);
    expect(win.isOpen).toBe(true);
    win.tick(1);
    expect(win.isOpen).toBe(false);
    expect(win.progress).toBe(0);
  });
});

describe('SnuffClock', () => {
  it('does not breathe while he is down, and keeps a cadence while he is up', () => {
    const clock = new SnuffClock({ firstMs: 1000, everyMs: [2000, 2000] }, () => 0);
    expect(clock.tick(5000, false)).toBe(false);
    expect(clock.tick(999, true)).toBe(false);
    expect(clock.tick(1, true)).toBe(true);
    expect(clock.tick(1999, true)).toBe(false);
    expect(clock.tick(1, true)).toBe(true);
    clock.reset();
    expect(clock.nextMs).toBe(1000);
  });
});

describe('lampOnRay', () => {
  const lamp = { x: 540, y: 860, r: 108 };

  it('finds the lamp the shot would cross, and ignores the ones behind it', () => {
    expect(lampOnRay(540, 1650, 0, -1, [lamp])).toBe(0);
    expect(lampOnRay(540, 1650, 1, 0, [lamp])).toBe(-1);
    // A shot aimed at a lamp further down the line reports the first lamp it crosses.
    const near = { x: 700, y: 900, r: 108 };
    const d = { x: 700 - 300, y: 900 - 1650 };
    const len = Math.hypot(d.x, d.y);
    expect(lampOnRay(300, 1650, d.x / len, d.y / len, [lamp, near])).toBe(1);
  });
});

describe('Samanid era', () => {
  const era = ERAS.find((e) => e.id === 'samanid');

  it('is a full era with its own boss, rule and four waves', () => {
    expect(era).toBeDefined();
    expect(era!.bossName).toBe('دیو کتاب‌سوز');
    expect(era!.place).toBe('کتابخانهٔ بخارا');
    expect(era!.rule).toContain('آتش');
    expect(era!.waves.length).toBe(4);
    // It is not the shared wave list the placeholders use.
    expect(era!.waves).not.toBe(ERAS[0].waves);
    const types = new Set(era!.waves.flatMap((w) => w.spawns.map((s) => s.type)));
    expect(types.size).toBeGreaterThanOrEqual(5);
    expect(era!.waves.some((w) => w.spawns.some((s) => s.armored))).toBe(true);
    expect(era!.waves.every((w) => w.spawns.length > 0)).toBe(true);
  });

  it('has three lamps, all inside the arena, one on the Div’s line', () => {
    const lamps = SAMANID_DECOR.filter((d) => d.lamp);
    expect(lamps.length).toBe(3);
    expect(LIBRARY_LAMP_COUNT).toBe(3);
    for (const l of lamps) {
      expect(l.key).toBe('brazier');
      expect(l.x).toBeGreaterThan(100);
      expect(l.x).toBeLessThan(980);
      // Between the Div's chest and the hero's bow: on the field, in the line of fire.
      expect(l.y).toBeGreaterThan(ARENA.boss.fight.y);
      expect(l.y).toBeLessThan(1500);
    }
    expect(lamps.some((l) => l.x === ARENA.boss.x)).toBe(true);
  });
});

describe('armoured from the start', () => {
  it('starts behind the barrier and only a critical/gem hit gets through', () => {
    const brain = new BossBrain({ ...BALANCE.boss, startsArmored: true }, FINISHERS.arash);
    brain.startIntro();
    brain.introDone();
    expect(brain.state).toBe('armor');
    expect(brain.armored).toBe(true);
    expect(brain.hit({ damage: 100, crit: false, gem: true }).blocked).toBe(true);
    const exposed = brain.hit({ damage: 100, crit: true, gem: true });
    expect(exposed.blocked).toBe(false);
    expect(brain.state).toBe('stunned');
  });

  it('still walks out of the intro unarmoured in every other era', () => {
    const brain = new BossBrain({ ...BALANCE.boss, startsArmored: false }, FINISHERS.arash);
    brain.startIntro();
    brain.introDone();
    expect(brain.state).toBe('phase1');
  });
});
