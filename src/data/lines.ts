/**
 * Words for the end of a run: the Hero Card's epic line and the teammates' chat reactions.
 * Each entry says when it fits (`when`); the picker takes a random one of those that fit, the
 * most specific group first. All Persian.
 */
import type { RunStats } from '../systems/score';

export interface Line {
  text: string;
  when: (s: RunStats) => boolean;
}

/** The Hero Card's epic line (first matching group wins, then a random line of it). */
export const EPIC_LINES: readonly (readonly Line[])[] = [
  // Flawless
  [
    { text: 'کمانش چون آرش، دلش چون رستم', when: (s) => s.won && s.stars === 3 },
    { text: 'تیرش از کوه گذشت و نامش بر درفش نشست', when: (s) => s.won && s.stars === 3 },
  ],
  // Sharp eye / long combo
  [
    { text: 'چشمش طلایی‌ترین لحظه را می‌شناسد', when: (s) => s.goldenPct >= 0.5 },
    { text: 'تیر پشت تیر، چون باران بهار', when: (s) => s.bestCombo >= 15 },
  ],
  // Saved by a friend
  [
    { text: 'افتاد، اما لشکر برش خیزاند', when: (s) => s.won && s.rescued },
  ],
  // Victory
  [
    { text: 'دیو سپید از سایه‌اش می‌هراسد', when: (s) => s.won },
  ],
  // Defeat, but never humiliating
  [
    { text: 'امروز خم شد؛ فردا کمان می‌کشد', when: (s) => !s.won && s.reachedBoss },
    { text: 'پهلوان با زخم بزرگ می‌شود', when: (s) => !s.won },
  ],
];

export interface Reaction {
  text: string;
  when: (s: RunStats) => boolean;
}

/** Teammates' chat reactions after a run (the Result screen's surprise). */
export const REACTIONS: readonly Reaction[] = [
  { text: 'دمت گرم پهلوان! 🔥', when: (s) => s.won },
  { text: 'دیدی گفتم با هم می‌زنیمش؟ ⚔️', when: (s) => s.won },
  { text: 'این پیاپی رو کی یادت داد؟! 😮', when: (s) => s.bestCombo >= 10 },
  { text: 'اون ضربه‌های طلایی… چشمت طلاست ✨', when: (s) => s.goldenPct >= 0.4 },
  { text: 'خوب شد رسیدم، نفسم بند اومد 😅', when: (s) => s.rescued },
  { text: 'زنجیره رو برات روشن نگه می‌دارم 🕯️', when: (s) => !s.won },
  { text: 'دیو هنوز زخمیه، دوباره بریم! 💪', when: (s) => !s.won },
  { text: 'سهمت رو دیدم، ایول 👏', when: (s) => s.groupDamage > 0 },
];

/** The whole group's cheer for a flawless run. */
export const PERFECT_CHEER = '👑 پهلوانِ لشکر! 👑';
