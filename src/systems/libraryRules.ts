import { rayCircle } from '../utils/geom';

/**
 * The Library of Bukhara (Samanid era): lamp fire and the Book-Burning Div's ink heart.
 *
 * The loop: an arrow that crosses a lamp's flame catches fire; a fire arrow that reaches the Div
 * burns the charred parchment off his ink heart for a few seconds, and only then can arrows reach
 * it. He snuffs lamps on a cadence, so the player either shoots through another lamp (a different
 * angle) or sends a fire arrow into a dark lamp to relight it.
 *
 * Everything here is pure — no Phaser — so the rule can be tuned and tested in one place.
 */
export const LIBRARY = {
  /** How long the ink heart stays open after a fire arrow hits him. */
  exposeMs: 3600,
  /** A snuffed lamp's embers relight it after this long (never a dead end). */
  relightMs: 9000,
  /** The Div's first cold breath, and the wait between later ones. */
  snuffFirstMs: 7000,
  snuffEveryMs: [9500, 13500] as const,
} as const;

/** A lamp's flame centre and the radius an arrow must cross to catch fire. */
export interface LampSpot {
  x: number;
  y: number;
  r: number;
}

export interface SnuffCadence {
  firstMs: number;
  everyMs: readonly [number, number];
}

/**
 * Which lamps are still burning. A dark lamp is not gone: its embers relight it after `relightMs`,
 * and a fire arrow relights it early.
 */
export class LampBank {
  private readonly darkMs: number[];

  constructor(readonly count: number, private readonly relightMs: number = LIBRARY.relightMs) {
    this.darkMs = new Array<number>(count).fill(0);
  }

  get litCount(): number {
    return this.darkMs.reduce((n, ms) => n + (ms <= 0 ? 1 : 0), 0);
  }

  isLit(index: number): boolean {
    return (this.darkMs[index] ?? 0) <= 0;
  }

  /** Milliseconds until a dark lamp's embers bring it back (0 while lit). */
  darkLeft(index: number): number {
    return Math.max(0, this.darkMs[index] ?? 0);
  }

  /** Puts a lit lamp out. False if the index is unknown or it was already dark. */
  snuff(index: number): boolean {
    if (index < 0 || index >= this.count || !this.isLit(index)) return false;
    this.darkMs[index] = this.relightMs;
    return true;
  }

  /** Lights a dark lamp. False if it was already lit. */
  relight(index: number): boolean {
    if (index < 0 || index >= this.count || this.isLit(index)) return false;
    this.darkMs[index] = 0;
    return true;
  }

  /** Embers: dark lamps come back on their own. Returns the indices that relit. */
  tick(dt: number): number[] {
    const back: number[] = [];
    for (let i = 0; i < this.count; i++) {
      if (this.darkMs[i] <= 0) continue;
      this.darkMs[i] -= dt;
      if (this.darkMs[i] <= 0) {
        this.darkMs[i] = 0;
        back.push(i);
      }
    }
    return back;
  }

  /** A lit lamp to snuff, or -1 when all are out. `pick` keeps the choice testable. */
  nextLit(pick: (n: number) => number = Math.random): number {
    const lit: number[] = [];
    for (let i = 0; i < this.count; i++) if (this.isLit(i)) lit.push(i);
    if (!lit.length) return -1;
    const k = Math.min(lit.length - 1, Math.max(0, Math.floor(pick(lit.length))));
    return lit[k];
  }
}

/** How long the ink heart stays open. Opening again extends the window, never shortens it. */
export class WardWindow {
  private left = 0;

  constructor(private readonly ms: number = LIBRARY.exposeMs) {}

  open(ms: number = this.ms): void {
    this.left = Math.max(this.left, ms);
  }

  tick(dt: number): void {
    if (this.left > 0) this.left = Math.max(0, this.left - dt);
  }

  get isOpen(): boolean {
    return this.left > 0;
  }

  get leftMs(): number {
    return this.left;
  }

  /** 1 → just opened, 0 → closed (for the weak point's glow). */
  get progress(): number {
    return this.ms > 0 ? this.left / this.ms : 0;
  }
}

/** The Div's cold breath: counts down only while he is up and armoured. */
export class SnuffClock {
  private left: number;

  constructor(
    private readonly cadence: SnuffCadence = { firstMs: LIBRARY.snuffFirstMs, everyMs: LIBRARY.snuffEveryMs },
    private readonly rand: () => number = Math.random,
  ) {
    this.left = cadence.firstMs;
  }

  reset(): void {
    this.left = this.cadence.firstMs;
  }

  /** True on the frame a breath is due (then the next one is scheduled). */
  tick(dt: number, armed: boolean): boolean {
    if (!armed) return false;
    this.left -= dt;
    if (this.left > 0) return false;
    const [lo, hi] = this.cadence.everyMs;
    this.left = lo + this.rand() * (hi - lo);
    return true;
  }

  get nextMs(): number {
    return Math.max(0, this.left);
  }
}

/**
 * The lamp an arrow/aim line would cross first, or -1. Uses the same geometry as the arrow's fire
 * zones, so the flare the player sees is exactly the shot that would catch fire.
 */
export function lampOnRay(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  spots: readonly LampSpot[],
  maxDist = 2400,
  pad = 16,
): number {
  let best = -1;
  let bestT = Infinity;
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    const t = rayCircle(ox, oy, dx, dy, maxDist, s.x, s.y, s.r + pad);
    if (t >= 0 && t < bestT) {
      bestT = t;
      best = i;
    }
  }
  return best;
}
