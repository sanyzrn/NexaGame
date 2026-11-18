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

const SASANIAN_WAVES: readonly WaveDef[] = [
  { spawns: [
    { at: 0, type: 'shield', armored: true, x: 0.5 },
    { at: 3800, type: 'imp', count: 3, every: 1300, x: [0.22, 0.78, 0.46] },
    { at: 8200, type: 'flyer', x: 0.72 },
  ] },
  { spawns: [
    { at: 0, type: 'slinger', count: 2, every: 1700, x: [0.19, 0.81] },
    { at: 2600, type: 'shield', armored: true, x: 0.53 },
    { at: 4500, type: 'flyer', count: 3, every: 1050, x: [0.75, 0.25, 0.5] },
  ] },
  { spawns: [
    { at: 0, type: 'shield', armored: true, count: 2, every: 3800, x: [0.28, 0.72] },
    { at: 2000, type: 'bomber', count: 2, every: 4200, x: [0.67, 0.33] },
    { at: 7700, type: 'slinger', x: 0.5 },
    { at: 9500, type: 'wraith', x: 0.76 },
  ] },
  { spawns: [
    { at: 0, type: 'wraith', count: 2, every: 1900, x: [0.27, 0.73] },
    { at: 1700, type: 'shield', armored: true, count: 2, every: 4400, x: [0.63, 0.35] },
    { at: 3600, type: 'slinger', count: 2, every: 4800, x: [0.16, 0.84] },
    { at: 7000, type: 'bomber', x: 0.5 },
    { at: 9200, type: 'flyer', count: 3, every: 950, x: [0.2, 0.78, 0.45] },
  ] },
];

/**
 * Samanid waves — the library's shelves, its lamps and the things feeding on them. Four distinct
 * waves (the Div rises after four): moths at the reading lamps, shield-bearing scribes in the
 * gallery, candle-bombers between the shelves, then everything the fire woke at once.
 */
const SAMANID_WAVES: readonly WaveDef[] = [
  // 1 — moth-flight around the lamps: read the room, don't stand still.
  { spawns: [
    { at: 0, type: 'flyer', count: 2, every: 900, x: [0.3, 0.7] },
    { at: 3200, type: 'imp', count: 3, every: 700, x: [0.2, 0.5, 0.8] },
    { at: 7200, type: 'flyer', count: 2, every: 1100, x: [0.14, 0.86] },
    { at: 9800, type: 'imp', count: 2, every: 650, x: [0.4, 0.6] },
  ] },
  // 2 — the scribes: shields in front, slingers reading from the gallery.
  { spawns: [
    { at: 0, type: 'shield', armored: true, count: 2, every: 2600, x: [0.33, 0.67] },
    { at: 2600, type: 'slinger', count: 2, every: 1700, x: [0.17, 0.83] },
    { at: 7600, type: 'imp', count: 4, every: 700, x: [0.24, 0.42, 0.58, 0.76] },
  ] },
  // 3 — candle-demons and burnt pages: bombers between the shelves, wraiths through the stacks.
  { spawns: [
    { at: 0, type: 'bomber', count: 2, every: 3400, x: [0.27, 0.73] },
    { at: 2500, type: 'wraith', count: 2, every: 2800, x: [0.41, 0.59] },
    { at: 5400, type: 'flyer', count: 3, every: 950, x: [0.2, 0.8, 0.5] },
    { at: 9000, type: 'slinger', x: 0.5 },
  ] },
  // 4 — the shelves catch fire: everything at once, tightest spawns of the era.
  { spawns: [
    { at: 0, type: 'imp', count: 5, every: 700, x: [0.2, 0.35, 0.5, 0.65, 0.8] },
    { at: 2400, type: 'shield', armored: true, x: 0.5 },
    { at: 4300, type: 'bomber', count: 2, every: 3800, x: [0.22, 0.78] },
    { at: 6800, type: 'wraith', count: 2, every: 3000, x: [0.34, 0.66] },
    { at: 9000, type: 'flyer', count: 3, every: 900, x: [0.18, 0.5, 0.82] },
    { at: 11800, type: 'slinger', count: 2, every: 2100, x: [0.2, 0.8] },
  ] },
];

const sharedEra = (skin: string, id: string, name: string, year: string, yearNum: number, place: string, bossName: string, weapon: string, arrival: string, testTint: number): EraDef => ({
  id, name, year, yearNum, place, bossName, weapon, arrival,
  rule: 'نبرد آزمایشی با موج‌های مشترک',
  skin, testTint, grade: null, mods: {}, hpScale: 1, bossHpScale: 1, waves: WAVES, playable: true,
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
  {
    id: 'sasanian',
    name: 'ساسانی',
    year: '۲۲۴ میلادی',
    yearNum: 224,
    place: 'ایوان مدائن',
    bossName: 'ضحاک ماردوش',
    weapon: 'کمان سنگین',
    rule: 'زره درخشان را با تیر طلایی بشکن',
    arrival: 'چهار سده گذشت… دو مار در ایوان بیدار شدند',
    skin: 'e3',
    testTint: 0x7a4ab0,
    grade: { top: '#d4b997', mid: '#9d739a', bottom: '#4c386e', alpha: 0.17 },
    mods: { scoreMul: 1.25 },
    hpScale: 1.12,
    bossHpScale: 1.25,
    waves: SASANIAN_WAVES,
    playable: true,
  },
  {
    id: 'samanid',
    name: 'سامانی',
    year: '۸۱۹ میلادی',
    yearNum: 819,
    place: 'کتابخانهٔ بخارا',
    bossName: 'دیو کتاب‌سوز',
    weapon: 'کمان خراسانی',
    rule: 'تیر از شعلهٔ چراغ آتش می‌گیرد؛ تیر آتشین قلب دیو را می‌گشاید',
    arrival: 'شش سده گذشت… زبان پارسی دوباره زنده شد',
    skin: 'e4',
    testTint: 0x3a8a6a,
    grade: { top: '#f4dca8', mid: '#9a7a52', bottom: '#2a1a12', alpha: 0.2 },
    mods: { scoreMul: 1.3 },
    hpScale: 1.22,
    bossHpScale: 1.3,
    waves: SAMANID_WAVES,
    playable: true,
  },
  sharedEra('e5', 'ghaznavid', 'غزنوی', '۹۷۷ میلادی', 977, 'کاخ غزنین', 'فیل‌دیو جنگی', 'کمان فیل‌سوار', 'فردوسی شاهنامه را می‌سراید…', 0x8a6a3a),
  sharedEra('e6', 'seljuk', 'سلجوقی', '۱۰۳۷ میلادی', 1037, 'کاروانسرای کویر', 'غول بیابان', 'تیر نفتی', 'کاروان‌ها در خطرند', 0xc8a040),
  sharedEra('e7', 'khwarazmian', 'خوارزمشاهی', '۱۰۷۷ میلادی', 1077, 'دروازهٔ گرگانج', 'دیو یخ‌زده', 'کمان استپ', 'باد سرد از شمال می‌وزد', 0x6aa0c8),
  sharedEra('e8', 'ilkhanate', 'ایلخانی', '۱۲۵۶ میلادی', 1256, 'رصدخانهٔ مراغه', 'دیو ستاره‌خوار', 'کمان رصدگر', 'خواجه نصیر ستاره‌ها را می‌شمارد…', 0x4a4aa0),
  sharedEra('e9', 'timurid', 'تیموری', '۱۳۷۰ میلادی', 1370, 'باغ‌های هرات', 'دیو مینیاتور', 'کمان زرنگار', 'هرات شهر نگارگران است', 0x2a7ab0),
  sharedEra('e10', 'safavid', 'صفوی', '۱۵۰۱ میلادی', 1501, 'میدان نقش جهان', 'اکوان دیو', 'کمان مرکب', 'شهر کاشی و فیروزه', 0x2aa0b0),
  sharedEra('e11', 'afsharid', 'افشاری', '۱۷۳۶ میلادی', 1736, 'دژ کلات', 'دیو کوه‌پیکر', 'کمان نادری', 'نادر از کوه‌های خراسان برخاست', 0xa04a3a),
  sharedEra('e12', 'zand', 'زندیه', '۱۷۵۱ میلادی', 1751, 'ارگ کریم‌خان، شیراز', 'دیو نارنج‌خوار', 'کمان وکیل', 'شیراز، شهر شعر و نارنج', 0xd08a2a),
  sharedEra('e13', 'qajar', 'قاجار', '۱۷۸۹ میلادی', 1789, 'تهران قدیم', 'دیو ساعت‌ساز', 'کمان پولادی', 'چرخ‌دنده‌ها می‌چرخند', 0xa05a3a),
  sharedEra('e14', 'constitutional', 'مشروطه', '۱۹۰۶ میلادی', 1906, 'کوچه‌های تبریز', 'دیو چاپخانه', 'کمان تفنگ‌دار', 'چاپخانه‌ها بیدار شدند', 0x7a6a5a),
  sharedEra('e15', 'pahlavi', 'پهلوی', '۱۳۰۴ خورشیدی', 1925, 'خیابان لاله‌زار', 'دیو گرامافون', 'کمان کلاسیک', 'چراغ‌های لاله‌زار روشن شد', 0xb08a4a),
  sharedEra('e16', 'contemporary', 'معاصر', '۱۴۰۵ خورشیدی', 2026, 'پشت‌بام‌های شهر', 'دیو آهنین', 'کمان کامپوزیت', 'امروز… دیوها در شهر بیدار شدند', 0x3a6ad0),
  sharedEra('e17', 'future', 'آینده', '۱۵۰۰ خورشیدی', 2121, 'شهر نئون', 'دیو بی‌نام', 'کمان نور', 'فردا… آخرین درفش', 0xd040c0),
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
