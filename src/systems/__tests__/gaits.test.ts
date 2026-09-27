import { describe, expect, it } from 'vitest';
import { newGait, pickGait, stepGait, type GaitId, type GaitOut } from '../gaits';

const LEFT = 125;
const RIGHT = 955;
const ALL: GaitId[] = ['march', 'zigzag', 'serpent', 'dash', 'strafe', 'hop', 'flank', 'spiral', 'hesitant'];

/** Walks an enemy for `ms` and returns how far down (in "forward-speed seconds") and where it ended. */
function simulate(id: GaitId, ms: number, x0 = 540) {
  const g = newGait(id, x0, LEFT, RIGHT, () => 0.3);
  const out: GaitOut = { forward: 1, side: 0 };
  let x = x0;
  let down = 0;
  for (let t = 0; t < ms; t += 16) {
    stepGait(g, 16, x, LEFT, RIGHT, out);
    down += out.forward * 0.016;
    x = Math.min(RIGHT - 40, Math.max(LEFT + 40, x + out.side * 0.016));
  }
  return { down, x };
}

describe('gaits', () => {
  it('always make net progress toward the hero', () => {
    for (const id of ALL) expect(simulate(id, 10000).down, id).toBeGreaterThan(2);
  });

  it('march is a plain straight walk', () => {
    const r = simulate('march', 5000);
    expect(r.x).toBe(540);
    expect(r.down).toBeCloseTo(5, 0);
  });

  it('strafe bounces between the walls instead of sticking to one', () => {
    const g = newGait('strafe', LEFT + 50, LEFT, RIGHT);
    const out: GaitOut = { forward: 1, side: 0 };
    expect(stepGait(g, 16, LEFT + 50, LEFT, RIGHT, out).side).toBeGreaterThan(0);
    expect(stepGait(g, 16, RIGHT - 50, LEFT, RIGHT, out).side).toBeLessThan(0);
  });

  it('flank heads for the nearer wall first', () => {
    expect(simulate('flank', 1500, 300).x).toBeLessThan(300);
    expect(simulate('flank', 1500, 800).x).toBeGreaterThan(800);
  });

  it('pickGait marches when variety is 0 and never marches when variety is 1', () => {
    expect(pickGait('imp', 0, () => 0.5)).toBe('march');
    for (let i = 0; i < 50; i++) expect(pickGait('shield', 1)).not.toBe('march');
  });

  it('heavy shield-bearers never hop', () => {
    for (let i = 0; i < 200; i++) expect(pickGait('shield', 1)).not.toBe('hop');
  });
});
