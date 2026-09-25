/** Allocation-free ray tests. Directions are unit vectors; `t` is distance along the ray. */

export interface RayHit {
  t: number;
  nx: number;
  ny: number;
}

export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Ray vs axis-aligned rectangle (slab method). Writes the entry hit into `out`.
 * Returns false when there is no hit within [0, maxT] or the origin is already inside.
 */
export function rayRect(ox: number, oy: number, dx: number, dy: number, maxT: number, r: AABB, out: RayHit): boolean {
  let tEnter = -Infinity;
  let tExit = Infinity;
  let nx = 0;
  let ny = 0;

  if (dx !== 0) {
    const t1 = (r.x - ox) / dx;
    const t2 = (r.x + r.w - ox) / dx;
    const tn = Math.min(t1, t2);
    const tf = Math.max(t1, t2);
    if (tn > tEnter) { tEnter = tn; nx = dx > 0 ? -1 : 1; ny = 0; }
    tExit = Math.min(tExit, tf);
  } else if (ox < r.x || ox > r.x + r.w) {
    return false;
  }

  if (dy !== 0) {
    const t1 = (r.y - oy) / dy;
    const t2 = (r.y + r.h - oy) / dy;
    const tn = Math.min(t1, t2);
    const tf = Math.max(t1, t2);
    if (tn > tEnter) { tEnter = tn; nx = 0; ny = dy > 0 ? -1 : 1; }
    tExit = Math.min(tExit, tf);
  } else if (oy < r.y || oy > r.y + r.h) {
    return false;
  }

  if (tEnter > tExit || tEnter < 0 || tEnter > maxT) return false;
  out.t = tEnter;
  out.nx = nx;
  out.ny = ny;
  return true;
}

/** Ray vs circle. Returns the entry distance, or -1. Ignores circles that contain the origin. */
export function rayCircle(ox: number, oy: number, dx: number, dy: number, maxT: number, cx: number, cy: number, r: number): number {
  const fx = ox - cx;
  const fy = oy - cy;
  const c = fx * fx + fy * fy - r * r;
  if (c <= 0) return -1;
  const b = fx * dx + fy * dy;
  if (b > 0) return -1;
  const disc = b * b - c;
  if (disc < 0) return -1;
  const t = -b - Math.sqrt(disc);
  return t >= 0 && t <= maxT ? t : -1;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
