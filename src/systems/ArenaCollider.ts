import { rayRect, type AABB, type RayHit } from '../utils/geom';

export type SurfaceKind = 'wall' | 'pillar' | 'top' | 'out';

export interface StaticHit extends RayHit {
  kind: SurfaceKind;
  /** Arrows ricochet off this surface (if they have bounces left). */
  bounces: boolean;
}

export interface ColliderWalls {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Distance an arrow is pushed off a surface after bouncing, so it never re-hits it. */
export const BOUNCE_EPSILON = 0.5;

/**
 * Static arena geometry: side walls (bounce), top wall (absorbs), bottom (removes) and pillar rects (bounce).
 * The aim preview and real arrows both use `castStatic`/`tracePath`, so the dotted line is exactly the flight path.
 */
export class ArenaCollider {
  readonly pillars: AABB[];
  private readonly tmp: RayHit = { t: 0, nx: 0, ny: 0 };
  private readonly traceHit: StaticHit = { t: 0, nx: 0, ny: 0, kind: 'wall', bounces: false };
  private best = 0;
  private found = false;

  readonly walls: ColliderWalls;

  constructor(walls: ColliderWalls, pillars: AABB[]) {
    this.walls = { ...walls };
    this.pillars = pillars;
  }

  /** Moves the absorbing top line (raised during the boss fight so arrows can reach him). */
  setTop(y: number): void {
    this.walls.top = y;
  }

  /** Earliest static surface hit along the ray within maxT. */
  castStatic(ox: number, oy: number, dx: number, dy: number, maxT: number, out: StaticHit): boolean {
    const w = this.walls;
    this.best = maxT;
    this.found = false;

    if (dx < 0) this.take(out, (w.left - ox) / dx, 1, 0, 'wall', true);
    else if (dx > 0) this.take(out, (w.right - ox) / dx, -1, 0, 'wall', true);
    if (dy < 0) this.take(out, (w.top - oy) / dy, 0, 1, 'top', false);
    else if (dy > 0) this.take(out, (w.bottom - oy) / dy, 0, -1, 'out', false);

    for (const p of this.pillars) {
      if (rayRect(ox, oy, dx, dy, this.best, p, this.tmp)) this.take(out, this.tmp.t, this.tmp.nx, this.tmp.ny, 'pillar', true);
    }
    return this.found;
  }

  private take(out: StaticHit, t: number, nx: number, ny: number, kind: SurfaceKind, bounces: boolean): void {
    if (t < 0 || t > this.best) return;
    this.best = t;
    this.found = true;
    out.t = t; out.nx = nx; out.ny = ny; out.kind = kind; out.bounces = bounces;
  }

  /**
   * Traces a path from (ox, oy) along (dx, dy) through up to `maxBounces` ricochets.
   * Writes polyline points [x0, y0, x1, y1, …] into `points` and returns the number of bounces.
   * `afterBounceLength` limits how far the path continues after the last allowed bounce.
   */
  tracePath(
    ox: number, oy: number, dx: number, dy: number,
    maxBounces: number, maxLength: number, afterBounceLength: number,
    points: number[],
  ): number {
    points.length = 0;
    points.push(ox, oy);
    const hit = this.traceHit;
    let remaining = maxLength;
    let bounces = 0;
    for (;;) {
      const limit = bounces >= maxBounces && bounces > 0 ? Math.min(remaining, afterBounceLength) : remaining;
      if (!this.castStatic(ox, oy, dx, dy, limit, hit)) {
        points.push(ox + dx * limit, oy + dy * limit);
        return bounces;
      }
      ox += dx * hit.t;
      oy += dy * hit.t;
      points.push(ox, oy);
      remaining -= hit.t;
      if (!hit.bounces || bounces >= maxBounces || remaining <= 0) return bounces;
      const dot = dx * hit.nx + dy * hit.ny;
      dx -= 2 * dot * hit.nx;
      dy -= 2 * dot * hit.ny;
      ox += hit.nx * BOUNCE_EPSILON;
      oy += hit.ny * BOUNCE_EPSILON;
      bounces++;
    }
  }
}
