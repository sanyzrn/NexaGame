/**
 * لحظهٔ برتر — the run's best moment, tracked live and told back on the Result screen, the
 * Hero Card and the share text, so every run has a story worth sending.
 */
export type MomentKind =
  | 'ricochets'   // a kill after a bounce
  | 'doubleKills'  // one arrow, two enemies
  | 'intercepts'   // a rock or boulder shot out of the air
  | 'fireKills'    // an enemy burned down
  | 'bombChains'   // a bomber's blast killed another enemy
  | 'crushes';     // a boulder crushed an enemy

export interface MomentLog {
  ricochets: number;
  doubleKills: number;
  intercepts: number;
  fireKills: number;
  bombChains: number;
  crushes: number;
  boulders: number;
  goldenStreakBest: number;
}

export interface MomentLine {
  when: (m: MomentLog) => boolean;
  text: string;
}

/** First matching line wins; order is "how screenshot-worthy was it". */
const LINES: readonly MomentLine[] = [
  { when: (m) => m.crushes > 0, text: 'دیو سپید زیر سنگ خودش ماند!' },
  { when: (m) => m.bombChains >= 2, text: 'آتشِ نفتی، زنجیرهٔ دیوان را گرفت!' },
  { when: (m) => m.bombChains === 1, text: 'نفتی‌دار، رفقانش را به آتش کشید!' },
  { when: (m) => m.intercepts >= 3, text: 'تیرهایش حتی سنگ‌ها را می‌گیرد!' },
  { when: (m) => m.intercepts >= 1, text: 'سنگ را در هوا نشانه گرفت!' },
  { when: (m) => m.doubleKills >= 2, text: 'یک تیر، دو دیو — و باز هم!' },
  { when: (m) => m.doubleKills === 1, text: 'یک تیر، دو دیو!' },
  { when: (m) => m.ricochets >= 3, text: 'استادِ کمانه' },
  { when: (m) => m.fireKills >= 4, text: 'کمانش شعله می‌باراند' },
  { when: (m) => m.goldenStreakBest >= 5, text: 'پنج تیر طلاییِ پیاپی' },
  { when: (m) => m.ricochets >= 1, text: 'کمانه‌ای ماهرانه' },
];

export class Moments {
  readonly log: MomentLog = {
    ricochets: 0, doubleKills: 0, intercepts: 0, fireKills: 0,
    bombChains: 0, crushes: 0, boulders: 0, goldenStreakBest: 0,
  };

  count(kind: MomentKind): void {
    this.log[kind]++;
  }

  /** Golden-release streak bookkeeping (a higher streak replaces the lower). */
  streak(n: number): void {
    if (n > this.log.goldenStreakBest) this.log.goldenStreakBest = n;
  }

  /** The line this run will be remembered by (null for an uneventful one). */
  bestMoment(): string | null {
    for (const l of LINES) if (l.when(this.log)) return l.text;
    return null;
  }
}
