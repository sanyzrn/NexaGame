import { BALANCE } from '../config/balance';
import { EPIC_LINES, REACTIONS } from '../data/lines';

/** Everything the end-of-run screens need to know about a run (pure data). */
export interface RunStats {
  won: boolean;
  kills: number;
  shots: number;
  goldenShots: number;
  bestCombo: number;
  /** Raw damage the player dealt (enemies + the Div). */
  damageDealt: number;
  /** What reached the group Div (chain applied). */
  groupDamage: number;
  heartsLost: number;
  heartsLeft: number;
  rescued: boolean;
  reachedBoss: boolean;
  /** Filled in by `finalize`. */
  goldenPct: number;
  score: number;
  stars: number;
}

type Raw = Omit<RunStats, 'goldenPct' | 'score' | 'stars'>;

/** Golden-window accuracy: golden releases over all arrows fired. */
export function goldenPct(s: Pick<RunStats, 'shots' | 'goldenShots'>): number {
  return s.shots > 0 ? s.goldenShots / s.shots : 0;
}

export function scoreFor(s: Raw): number {
  const W = BALANCE.score;
  return Math.round(
    s.damageDealt * W.damage + s.kills * W.kill + s.bestCombo * W.bestCombo + s.goldenShots * W.golden +
    (s.won ? W.victory + s.heartsLeft * W.heartLeft : 0),
  );
}

export function starsFor(s: Raw & { goldenPct: number }): number {
  const S = BALANCE.stars;
  if (!s.won) return s.reachedBoss ? 2 : 1;
  let n = 1;
  const sharp = s.goldenPct >= S.goldenPct || s.bestCombo >= S.bestCombo;
  if (sharp) n++;
  if (sharp && !s.rescued && s.heartsLost <= S.maxHeartsLost) n++;
  return n;
}

export function finalize(raw: Raw): RunStats {
  const pct = goldenPct(raw);
  const withPct = { ...raw, goldenPct: pct };
  return { ...withPct, score: scoreFor(raw), stars: starsFor(withPct) };
}

/** The Hero Card's line: the most specific group that fits, a random line of it. */
export function epicLineFor(s: RunStats, rnd: () => number = Math.random): string {
  for (const group of EPIC_LINES) {
    const fit = group.filter((l) => l.when(s));
    if (fit.length) return fit[Math.floor(rnd() * fit.length)].text;
  }
  return EPIC_LINES[EPIC_LINES.length - 1][0].text;
}

/** Up to `n` distinct reactions that fit the run, in random order. */
export function reactionsFor(s: RunStats, n: number, rnd: () => number = Math.random): string[] {
  const fit = REACTIONS.filter((r) => r.when(s)).map((r) => r.text);
  for (let i = fit.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [fit[i], fit[j]] = [fit[j], fit[i]];
  }
  return fit.slice(0, n);
}

/** Flawless: a three-star victory without losing a heart. */
export function isPerfect(s: RunStats): boolean {
  return s.won && s.stars === 3 && s.heartsLost === 0;
}
