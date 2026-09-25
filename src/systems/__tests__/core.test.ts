import { describe, expect, it } from 'vitest';
import { rayCircle, rayRect, type RayHit } from '../../utils/geom';
import { ArenaCollider, type StaticHit } from '../ArenaCollider';
import { chargeAt, clampAim, shotFor } from '../charge';
import { BALANCE } from '../../config/balance';

const hit = (): RayHit => ({ t: 0, nx: 0, ny: 0 });
const shit = (): StaticHit => ({ t: 0, nx: 0, ny: 0, kind: 'wall', bounces: false });

describe('geom', () => {
  it('ray hits rect from below with a downward-facing normal', () => {
    const h = hit();
    expect(rayRect(50, 200, 0, -1, 1000, { x: 0, y: 0, w: 100, h: 100 }, h)).toBe(true);
    expect(h.t).toBeCloseTo(100);
    expect(h.ny).toBe(1);
  });

  it('ray hits rect side with a horizontal normal', () => {
    const h = hit();
    expect(rayRect(-50, 50, 1, 0, 1000, { x: 0, y: 0, w: 100, h: 100 }, h)).toBe(true);
    expect(h.t).toBeCloseTo(50);
    expect(h.nx).toBe(-1);
  });

  it('ray misses rect / respects maxT', () => {
    const h = hit();
    expect(rayRect(200, 200, 0, -1, 1000, { x: 0, y: 0, w: 100, h: 100 }, h)).toBe(false);
    expect(rayRect(50, 200, 0, -1, 50, { x: 0, y: 0, w: 100, h: 100 }, h)).toBe(false);
  });

  it('ray vs circle', () => {
    expect(rayCircle(0, 100, 0, -1, 1000, 0, 0, 10)).toBeCloseTo(90);
    expect(rayCircle(50, 100, 0, -1, 1000, 0, 0, 10)).toBe(-1);
    expect(rayCircle(0, -100, 0, -1, 1000, 0, 0, 10)).toBe(-1);
  });
});

describe('ArenaCollider', () => {
  const c = new ArenaCollider({ left: 100, right: 900, top: 500, bottom: 1900 }, [{ x: 400, y: 900, w: 100, h: 200 }]);

  it('side walls bounce, top absorbs', () => {
    const h = shit();
    expect(c.castStatic(500, 1500, -1, 0, 5000, h)).toBe(true);
    expect(h.kind).toBe('wall');
    expect(h.t).toBeCloseTo(400);
    expect(h.bounces).toBe(true);
    expect(c.castStatic(700, 1500, 0, -1, 5000, h)).toBe(true);
    expect(h.kind).toBe('top');
    expect(h.bounces).toBe(false);
  });

  it('pillar is hit before the top wall', () => {
    const h = shit();
    expect(c.castStatic(450, 1500, 0, -1, 5000, h)).toBe(true);
    expect(h.kind).toBe('pillar');
    expect(h.t).toBeCloseTo(400);
  });

  it('tracePath reflects off a wall and stops after the allowed bounces', () => {
    const pts: number[] = [];
    const s = Math.SQRT1_2;
    const bounces = c.tracePath(500, 1500, -s, -s, 1, 5000, 5000, pts);
    expect(bounces).toBe(1);
    // origin, wall hit, final hit
    expect(pts.length).toBe(6);
    expect(pts[2]).toBeCloseTo(100);
    expect(pts[4]).toBeGreaterThan(100); // moving right after the bounce
  });

  it('tracePath limits the length after the last bounce', () => {
    const pts: number[] = [];
    const s = Math.SQRT1_2;
    c.tracePath(500, 1800, -s, -s, 1, 5000, 100, pts);
    const dx = pts[4] - pts[2];
    const dy = pts[5] - pts[3];
    expect(Math.hypot(dx, dy)).toBeCloseTo(100, 0);
  });
});

describe('charge', () => {
  const bow = BALANCE.bow;
  const cycle = bow.goldenMs + bow.goldenGapMs;

  it('rises linearly to full over chargeMs', () => {
    expect(chargeAt(0).charge).toBe(0);
    expect(chargeAt(bow.chargeMs / 2).charge).toBeCloseTo(0.5);
    expect(chargeAt(bow.chargeMs - 1).phase).toBe('charging');
  });

  it('pulses gold at full charge, forever, without decaying', () => {
    expect(chargeAt(bow.chargeMs).phase).toBe('golden');
    expect(chargeAt(bow.chargeMs + bow.goldenMs - 1).phase).toBe('golden');
    expect(chargeAt(bow.chargeMs + bow.goldenMs + 1).phase).toBe('full');
    expect(chargeAt(bow.chargeMs + cycle).phase).toBe('golden');
    expect(chargeAt(bow.chargeMs + cycle * 20 + bow.goldenMs + 5).phase).toBe('full');
    expect(chargeAt(bow.chargeMs + cycle * 20 + 5).charge).toBe(1);
  });

  it('only golden releases are critical, and they hit much harder', () => {
    const golden = shotFor(chargeAt(bow.chargeMs + 10));
    const full = shotFor(chargeAt(bow.chargeMs + bow.goldenMs + 10));
    const early = shotFor(chargeAt(100));
    expect(golden.crit).toBe(true);
    expect(golden.pierce).toBe(BALANCE.arrow.critPierce);
    expect(full.crit).toBe(false);
    expect(golden.damage).toBeGreaterThan(full.damage * 2);
    expect(full.damage).toBeGreaterThan(early.damage);
  });
});

describe('clampAim', () => {
  const up = -Math.PI / 2;
  const min = (BALANCE.bow.minAimAngleDeg * Math.PI) / 180;

  it('keeps upward angles', () => {
    expect(clampAim(up)).toBe(up);
    expect(clampAim(-Math.PI / 4)).toBe(-Math.PI / 4);
  });

  it('holds the minimum elevation on each side, including when pointing down', () => {
    expect(clampAim(0)).toBeCloseTo(-min);
    expect(clampAim(Math.PI / 3)).toBeCloseTo(-min);
    expect(clampAim(Math.PI)).toBeCloseTo(-Math.PI + min);
    expect(clampAim(Math.PI * 0.75)).toBeCloseTo(-Math.PI + min);
  });
});
