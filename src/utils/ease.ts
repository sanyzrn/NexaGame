/** Easing curves for hand-driven animation (t in 0..1) and a damped spring for follow-through. */

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

export function easeInOutSine(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
}

export function easeOutCubic(t: number): number {
  const u = 1 - clamp01(t);
  return 1 - u * u * u;
}

export function easeInCubic(t: number): number {
  const u = clamp01(t);
  return u * u * u;
}

export function easeInExpo(t: number): number {
  const u = clamp01(t);
  return u === 0 ? 0 : Math.pow(2, 10 * u - 10);
}

export function easeOutExpo(t: number): number {
  const u = clamp01(t);
  return u === 1 ? 1 : 1 - Math.pow(2, -10 * u);
}

/** Overshoots past 1 and settles; `s` ≈ 1.7 is the classic back ease. */
export function easeOutBack(t: number, s = 1.70158): number {
  const u = clamp01(t) - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
}

export function easeInBack(t: number, s = 1.70158): number {
  const u = clamp01(t);
  return (s + 1) * u * u * u - s * u * u;
}

export function easeOutElastic(t: number): number {
  const u = clamp01(t);
  if (u === 0 || u === 1) return u;
  return Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
}

/** 0 → 1 → 0 bump over t in 0..1. */
export function bump(t: number): number {
  return Math.sin(Math.PI * clamp01(t));
}

/**
 * Damped spring pulled toward 0: kick it (set `x` or add to `v`) and it overshoots and settles.
 * Frame-rate independent (sub-stepped).
 */
export class Spring {
  x = 0;
  v = 0;
  constructor(public hz: number, public damping: number) {}

  update(dtMs: number): number {
    const w = 2 * Math.PI * this.hz;
    let left = dtMs / 1000;
    while (left > 0) {
      const h = Math.min(left, 1 / 120);
      this.v += (-w * w * this.x - 2 * this.damping * w * this.v) * h;
      this.x += this.v * h;
      left -= h;
    }
    return this.x;
  }
}
