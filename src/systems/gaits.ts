import type { EnemyType } from '../data/entities';

/**
 * Gaits — how an enemy travels down the arena, layered on top of its type's own behaviour (the
 * imp's taunts, the shield's raise, the slinger's stop-and-throw…). Each spawn draws one, so the
 * same wave never plays the same way twice. All pure maths, so it is unit-tested.
 *
 * - march:    straight down (the type's own motion only).
 * - zigzag:   sharp diagonal switchbacks (a triangle wave).
 * - serpent:  a wide, slow S-curve across the floor.
 * - dash:     creeps, freezes, then bursts forward — hard to lead.
 * - strafe:   runs diagonally and bounces off the side walls (ricochet-friendly targets).
 * - hop:      short leaps with pauses between them.
 * - flank:    swings out to a side wall, then comes down along it.
 * - spiral:   loops while descending (never climbs back past its own start).
 * - hesitant: advances, stops, steps back a little, advances again.
 */
export type GaitId = 'march' | 'zigzag' | 'serpent' | 'dash' | 'strafe' | 'hop' | 'flank' | 'spiral' | 'hesitant';

export const GAIT_NAMES: Record<GaitId, string> = {
  march: 'رژه', zigzag: 'زیگزاگ', serpent: 'مارپیچ', dash: 'یورش', strafe: 'کمانه‌رو',
  hop: 'جهش', flank: 'دورزن', spiral: 'گردباد', hesitant: 'دودل',
};

/** Which gaits suit which enemy (weights). Heavy shields can't hop; flyers love curves. */
const POOL: Record<EnemyType, readonly (readonly [GaitId, number])[]> = {
  imp: [['march', 2], ['zigzag', 2], ['serpent', 1], ['dash', 2], ['strafe', 1], ['hop', 2], ['flank', 1], ['hesitant', 1]],
  shield: [['march', 3], ['strafe', 1], ['flank', 2], ['hesitant', 2], ['serpent', 1]],
  flyer: [['march', 1], ['zigzag', 2], ['serpent', 2], ['dash', 1], ['spiral', 2]],
  slinger: [['march', 2], ['zigzag', 2], ['strafe', 2], ['dash', 1], ['flank', 1]],
  bomber: [['march', 3], ['serpent', 2], ['dash', 1], ['hesitant', 1]],
  wraith: [['march', 1], ['serpent', 2], ['spiral', 2], ['hesitant', 1]],
};

/**
 * Draws a gait for a new enemy. `variety` (0..1) is the chance of anything but a straight march:
 * low in the first wave (learn the enemy first), rising wave by wave.
 */
export function pickGait(type: EnemyType, variety: number, rand: () => number = Math.random): GaitId {
  if (rand() >= variety) return 'march';
  const pool = POOL[type].filter(([g]) => g !== 'march');
  const total = pool.reduce((n, [, w]) => n + w, 0);
  let r = rand() * total;
  for (const [g, w] of pool) {
    r -= w;
    if (r < 0) return g;
  }
  return pool[pool.length - 1][0];
}

export interface GaitState {
  id: GaitId;
  t: number;
  /** Per-enemy phase so a crowd with the same gait does not move in lockstep. */
  seed: number;
  /** Lateral direction for strafe / flank (±1). */
  dir: number;
}

export function newGait(id: GaitId, x: number, left: number, right: number, rand: () => number = Math.random): GaitState {
  const mid = (left + right) / 2;
  // Flank heads for the nearer wall; strafe starts toward the far side (a longer first run).
  const dir = id === 'flank' ? (x < mid ? -1 : 1) : id === 'strafe' ? (x < mid ? 1 : -1) : rand() < 0.5 ? -1 : 1;
  return { id, t: 0, seed: rand() * 10, dir };
}

export interface GaitOut {
  /** Multiplier on the type's forward (downward) speed; may be negative (a step back). */
  forward: number;
  /** Extra sideways velocity in px/s. */
  side: number;
}

const TAU = Math.PI * 2;

/** Advances a gait by `dt` ms for an enemy at `x` between the walls, writing into `out`. */
export function stepGait(g: GaitState, dt: number, x: number, left: number, right: number, out: GaitOut): GaitOut {
  g.t += dt;
  const s = g.t / 1000 + g.seed;
  out.forward = 1;
  out.side = 0;
  switch (g.id) {
    case 'march':
      break;
    case 'zigzag': {
      // Triangle wave: constant speed, sharp turns every 0.9 s.
      const p = (s / 0.9) % 2;
      out.side = (p < 1 ? 1 : -1) * 150;
      out.forward = 0.9;
      break;
    }
    case 'serpent':
      out.side = Math.sin(s * TAU / 3.2) * 170;
      out.forward = 0.85;
      break;
    case 'dash': {
      // 1.6 s cycle: creep, a held breath, then a burst at 3×.
      const p = (s % 1.6) / 1.6;
      out.forward = p < 0.45 ? 0.35 : p < 0.6 ? 0 : 2.9;
      break;
    }
    case 'strafe':
      if (x < left + 70) g.dir = 1;
      else if (x > right - 70) g.dir = -1;
      out.side = g.dir * 200;
      out.forward = 0.75;
      break;
    case 'hop': {
      // 0.8 s cycle: a quick leap forward, then a pause to land.
      const p = (s % 0.8) / 0.8;
      out.forward = p < 0.35 ? 2.6 : 0.1;
      out.side = p < 0.35 ? Math.sin(s * 3.1) * 90 : 0;
      break;
    }
    case 'flank': {
      // Out to the wall first, then straight down along it.
      const edge = g.dir < 0 ? left + 90 : right - 90;
      const far = g.dir < 0 ? x > edge : x < edge;
      out.side = far ? g.dir * 230 : 0;
      out.forward = far ? 0.45 : 1.15;
      break;
    }
    case 'spiral': {
      // Circles of radius ~70 px while the descent carries it down (net forward stays ≥ 0.2).
      const a = s * TAU / 1.8;
      out.side = Math.cos(a) * 240;
      out.forward = 0.75 + Math.sin(a) * 0.55;
      break;
    }
    case 'hesitant': {
      // 2.4 s cycle: walk, stop, a small step back, walk on.
      const p = (s % 2.4) / 2.4;
      out.forward = p < 0.55 ? 1.2 : p < 0.72 ? 0 : p < 0.85 ? -0.45 : 1;
      break;
    }
  }
  return out;
}
