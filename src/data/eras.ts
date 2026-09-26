import type { OmenMods } from './omens';
import { WAVES, type WaveDef } from './waves';

/**
 * سفر در زمان — the eras. The Derafsh passes from hand to hand down the centuries, and in every age
 * the divs come back wearing that age's face. Each victory over an era's boss opens the next era.
 *
 * An era is pure data: its skin prefix (art lives at `assets-src/<skin>_<key>.png`, see
 * docs/ERA_ASSETS.md), its waves, a difficulty scale, one signature rule (the omen modifiers,
 * applied for the whole era) and its names. Eras with `playable: false` show on the title's
 * timeline as «به‌زودی» — a promise of what is coming.
 */
export interface EraDef {
  id: string;
  /** Persian era name, e.g. «هخامنشی». */
  name: string;
  /** Year label in Persian, shown on the timeline and the time-jump counter. */
  year: string;
  /** The year as a number (negative = BCE), for the time-jump counter. */
  yearNum: number;
  /** Where the arena is. */
  place: string;
  /** The boss's name on its health bar and the result screen. */
  bossName: string;
  /** The hero's weapon in this era (flavour until weapons differ). */
  weapon: string;
  /** The era's signature rule, in one line (shown at the start of a run). */
  rule: string;
  /** Said by the time-jump cinematic when arriving in this era. */
  arrival: string;
  /** Art skin prefix, or null for the first era's own art. */
  skin: string | null;
  /** While the era's art is missing, the base art is recoloured toward this colour (test art). */
  testTint: number;
  /** A colour grade over the whole run (like an omen's). */
  grade: { top: string; mid: string; bottom: string; alpha: number } | null;
  /** The era's rule, as omen-style modifiers (combined with the day's omen). */
  mods: OmenMods;
  /** Enemy hp multiplier. */
  hpScale: number;
  /** Boss hp multiplier. */
  bossHpScale: number;
  waves: readonly WaveDef[];
  playable: boolean;
}

/** Parthian waves: fast mounted skirmishers, slinger lines like horse archers, a steppe wind. */
const PARTHIAN_WAVES: readonly WaveDef[] = [
  // 1 — the riders arrive: quick pairs of imps from the flanks, flyers circling like hawks
  { spawns: [
    { at: 0, type: 'imp', count: 2, every: 500, x: [0.15, 0.85] },
    { at: 3200, type: 'imp', count: 2, every: 500, x: [0.3, 0.7] },
    { at: 6000, type: 'flyer', count: 2, every: 900, x: [0.25, 0.75] },
    { at: 9500, type: 'imp', count: 3, every: 450, x: [0.2, 0.5, 0.8] },
  ] },
  // 2 — the line of slingers: shoot the stones down, then the throwers
  { spawns: [
    { at: 0, type: 'slinger', count: 3, every: 700, x: [0.2, 0.5, 0.8] },
    { at: 4000, type: 'imp', count: 4, every: 700 },
    { at: 8000, type: 'flyer', count: 2, every: 1200 },
    { at: 11000, type: 'slinger', count: 2, every: 900, x: [0.3, 0.7] },
  ] },
  // 3 — the siege train: shields in front, bombers behind them (hit the cauldron, not the shield)
  { spawns: [
    { at: 0, type: 'shield', count: 2, every: 1600, x: [0.35, 0.65] },
    { at: 2500, type: 'bomber', x: 0.5 },
    { at: 5000, type: 'imp', count: 5, every: 600 },
    { at: 8500, type: 'bomber', count: 2, every: 1800, x: [0.25, 0.75] },
    { at: 12000, type: 'flyer', count: 3, every: 800 },
  ] },
  // 4 — the Parthian shot: everything wheels in at once, wraiths in the dust
  { spawns: [
    { at: 0, type: 'imp', count: 6, every: 550, elite: 0.2 },
    { at: 2500, type: 'wraith', count: 2, every: 2500, x: [0.3, 0.7] },
    { at: 4500, type: 'slinger', count: 2, every: 800, x: [0.2, 0.8] },
    { at: 7000, type: 'shield', x: 0.5, elite: 0.6 },
    { at: 9000, type: 'bomber', x: 0.4 },
    { at: 11000, type: 'flyer', count: 4, every: 700 },
    { at: 14000, type: 'slinger', x: 0.6 },
  ] },
];

const soon = (skin: string, id: string, name: string, year: string, yearNum: number, place: string, bossName: string, weapon: string, rule: string, arrival: string, testTint: number): EraDef => ({
  id, name, year, yearNum, place, bossName, weapon, rule, arrival,
  skin, testTint, grade: null, mods: {}, hpScale: 1, bossHpScale: 1, waves: WAVES, playable: false,
});

export const ERAS: readonly EraDef[] = [
  {
    id: 'achaemenid',
    name: 'هخامنشی',
    year: '۵۵۰ پیش از میلاد',
    yearNum: -550,
    place: 'دروازهٔ تخت جمشید',
    bossName: 'دیو سپید',
    weapon: 'کمان پارسی',
    rule: 'نخستین آزمون: کمانه کن، طلایی رها کن',
    arrival: 'آغاز داستان',
    skin: null,
    testTint: 0xffffff,
    grade: null,
    mods: {},
    hpScale: 1,
    bossHpScale: 1,
    waves: WAVES,
    playable: true,
  },
  {
    id: 'parthian',
    name: 'اشکانی',
    year: '۲۴۷ پیش از میلاد',
    yearNum: -247,
    place: 'دشت‌های پارت',
    bossName: 'اژدهای دشت',
    weapon: 'کمان سوارکار',
    rule: 'باد دشت: تیرها کمی می‌لغزند و سواران تندترند',
    arrival: 'سیصد سال گذشت… دیوها با گرد اسبان برگشتند',
    skin: 'e2',
    testTint: 0xd0703a,
    grade: { top: '#f0c890', mid: '#d89a60', bottom: '#8a5a3a', alpha: 0.2 },
    mods: { arrowDriftDegPerSec: 3, enemySpeedMul: 1.12, scoreMul: 1.2 },
    hpScale: 1.2,
    bossHpScale: 1.25,
    waves: PARTHIAN_WAVES,
    playable: true,
  },
  soon('e3', 'sasanian', 'ساسانی', '۲۲۴ میلادی', 224, 'ایوان مدائن', 'ضحاک ماردوش', 'کمان سنگین', 'زره‌پوشان: فقط تیر طلایی زره را می‌شکند', 'چهار سده گذشت… زره‌ها سنگین‌تر شدند', 0x7a4ab0),
  soon('e4', 'seljuk', 'سلجوقی', '۱۰۳۷ میلادی', 1037, 'کاروانسرای کویر', 'غول بیابان', 'تیر نفتی', 'طوفان شن: میدان تاریک و روشن می‌شود', 'هشت سده گذشت… کاروان‌ها در خطرند', 0xc8a040),
  soon('e5', 'safavid', 'صفوی', '۱۵۰۱ میلادی', 1501, 'میدان نقش جهان', 'اکوان دیو', 'کمان مرکب', 'کاشی‌های جادویی: تیر از نقش‌ها کمانه می‌کند', 'پنج سده گذشت… شهر کاشی و فیروزه', 0x2aa0b0),
  soon('e6', 'qajar', 'قاجار', '۱۷۸۹ میلادی', 1789, 'تهران قدیم', 'دیو ساعت‌ساز', 'کمان پولادی', 'دیوهای کوکی: هر چند ثانیه زمان می‌ایستد', 'سه سده گذشت… چرخ‌دنده‌ها می‌چرخند', 0xa05a3a),
  soon('e7', 'modern', 'امروز', '۱۴۰۵ خورشیدی', 2026, 'پشت‌بام‌های شهر', 'دیو آهنین', 'کمان کامپوزیت', 'پهپاددیوها: هدف‌های بالای سر', 'امروز… دیوها در شهر بیدار شدند', 0x3a6ad0),
  soon('e8', 'future', 'فردا', '۱۵۰۰ خورشیدی', 2121, 'شهر نئون', 'دیو بی‌نام', 'کمان نور', 'جاذبهٔ شکسته: تیرها خم می‌شوند', 'فردا… آخرین درفش', 0xd040c0),
];

export const ERA_BY_ID: ReadonlyMap<string, EraDef> = new Map(ERAS.map((e) => [e.id, e]));

/** Era-rule and omen modifiers together: multipliers multiply, drift adds, the rest take the stronger. */
export function combineMods(a: OmenMods, b: OmenMods | undefined): OmenMods {
  if (!b) return { ...a };
  const mul = (x?: number, y?: number) => (x === undefined && y === undefined ? undefined : (x ?? 1) * (y ?? 1));
  const add = (x?: number, y?: number) => (x === undefined && y === undefined ? undefined : (x ?? 0) + (y ?? 0));
  return {
    ...a,
    ...b,
    scoreMul: mul(a.scoreMul, b.scoreMul),
    enemySpeedMul: mul(a.enemySpeedMul, b.enemySpeedMul),
    fireMul: mul(a.fireMul, b.fireMul),
    powerGainMul: mul(a.powerGainMul, b.powerGainMul),
    flyerWeight: mul(a.flyerWeight, b.flyerWeight),
    arrowDriftDegPerSec: add(a.arrowDriftDegPerSec, b.arrowDriftDegPerSec),
    chainStart: Math.max(a.chainStart ?? 0, b.chainStart ?? 0) || undefined,
    homaGuaranteed: a.homaGuaranteed || b.homaGuaranteed || undefined,
    quietEnemies: a.quietEnemies || b.quietEnemies || undefined,
  };
}
