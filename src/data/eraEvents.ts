/**
 * رویدادهای تاریخی — random mid-run events headlined by a real political moment of the era being
 * fought in («فرمان کوروش»، «قیام مزدک»، «فرمان مشروطه»…). Each headline carries one gameplay
 * effect, so history literally changes the battle. They are historical and non-partisan: the game
 * travels through every Telegram group, so the modern eras use shared national moments.
 *
 * Effects:
 * - decree:        a wave of gold sweeps the field — every enemy on it dissolves.
 * - treasury:      coins and power pour in (score + power meter).
 * - blessing:      one heart back (or score if full).
 * - reinforcements:allies' arrows — three triple-shots.
 * - uprising:      a sudden band of enemies bursts in (more score for the brave).
 * - truce:         a truce — every enemy slows to a crawl for a while.
 * - ambush:        an ambush — enemies surge forward faster for a while.
 */
export type EraEventEffect = 'decree' | 'treasury' | 'blessing' | 'reinforcements' | 'uprising' | 'truce' | 'ambush';

export interface EraEventDef {
  /** The headline. */
  title: string;
  /** The year (Persian digits) shown in the kicker. */
  year: string;
  /** What it does in the fight, in one line. */
  line: string;
  effect: EraEventEffect;
}

export const EFFECT_COLOR: Record<EraEventEffect, number> = {
  decree: 0xffd24a, treasury: 0xffc040, blessing: 0x5ff0a0, reinforcements: 0x6ab0ff,
  uprising: 0xff6a4a, truce: 0x9ad8ff, ambush: 0xd23a2e,
};

const e = (title: string, year: string, line: string, effect: EraEventEffect): EraEventDef => ({ title, year, line, effect });

/** By era id (see data/eras.ts). */
export const ERA_EVENTS: Readonly<Record<string, readonly EraEventDef[]>> = {
  achaemenid: [
    e('فرمان کوروش', '۵۳۹ پ.م', 'آزادی! موج زرین همهٔ دیوها را می‌برد', 'decree'),
    e('جادهٔ شاهی و چاپارها', '۵۱۵ پ.م', 'پیک‌ها سه‌تیر رساندند', 'reinforcements'),
    e('شورش ساتراپ‌ها', '۳۶۶ پ.م', 'دسته‌ای دیو ناگهان یورش آوردند!', 'uprising'),
    e('نوروز در تخت جمشید', '۵۱۸ پ.م', 'هدایای ملل: سکه و نیرو', 'treasury'),
  ],
  parthian: [
    e('نبرد حران و سورنا', '۵۳ پ.م', 'تیرهای پارتی به یاری آمد: سه‌تیر', 'reinforcements'),
    e('جادهٔ ابریشم', '۱۳۰ پ.م', 'کاروان ابریشم رسید: سکه و نیرو', 'treasury'),
    e('شورش شاهزادگان', '۱۰ میلادی', 'دیوها از هر سو ریختند!', 'uprising'),
    e('پیمان صلح با روم', '۲۰ پ.م', 'آتش‌بس! دیوها آرام می‌گیرند', 'truce'),
  ],
  sasanian: [
    e('قیام مزدک', '۴۹۴ میلادی', 'شورش! دیوها یورش آوردند', 'uprising'),
    e('دادگری انوشیروان', '۵۳۱ میلادی', 'دادگری: یک جان بازگشت', 'blessing'),
    e('اسارت والرین', '۲۶۰ میلادی', 'پیروزی شاپور: موج زرین', 'decree'),
    e('دانشگاه جندی‌شاپور', '۵۵۵ میلادی', 'پزشکان جندی‌شاپور: یک جان', 'blessing'),
  ],
  samanid: [
    e('رودکی و زبان پارسی', '۹۲۰ میلادی', 'شعر پارسی جان می‌بخشد', 'blessing'),
    e('بازار سمرقند', '۹۰۰ میلادی', 'سکه‌های سامانی: سکه و نیرو', 'treasury'),
    e('شورش بخارا', '۹۴۳ میلادی', 'آشوب در بخارا!', 'uprising'),
  ],
  ghaznavid: [
    e('فردوسی و صلهٔ شاهنامه', '۱۰۱۰ میلادی', 'صلهٔ سلطان: سکه و نیرو', 'treasury'),
    e('لشکرکشی به هند', '۱۰۲۵ میلادی', 'لشکر رسید: سه‌تیر', 'reinforcements'),
    e('فیل‌های جنگی', '۱۰۰۰ میلادی', 'کمین! دیوها تندتر شدند', 'ambush'),
  ],
  seljuk: [
    e('نظامیه‌های خواجه نظام‌الملک', '۱۰۶۵ میلادی', 'دانش جان می‌بخشد', 'blessing'),
    e('قلعهٔ الموت', '۱۰۹۰ میلادی', 'کمین فدائیان! دیوها تندتر شدند', 'ambush'),
    e('نبرد ملازگرد', '۱۰۷۱ میلادی', 'پیروزی بزرگ: موج زرین', 'decree'),
  ],
  khwarazmian: [
    e('ماجرای اترار', '۱۲۱۸ میلادی', 'کمین! دیوها یورش آوردند', 'ambush'),
    e('جلال‌الدین و رود سند', '۱۲۲۱ میلادی', 'دلاوری جلال‌الدین: سه‌تیر', 'reinforcements'),
    e('یورش مغول', '۱۲۱۹ میلادی', 'سیل دیوها از شمال!', 'uprising'),
  ],
  ilkhanate: [
    e('رصدخانهٔ مراغه', '۱۲۵۹ میلادی', 'ستاره‌ها راه را نشان دادند: یک جان', 'blessing'),
    e('اصلاحات غازان خان', '۱۲۹۵ میلادی', 'خزانه پر شد: سکه و نیرو', 'treasury'),
    e('جامع‌التواریخ رشیدالدین', '۱۳۰۷ میلادی', 'تاریخ به یاری آمد: موج زرین', 'decree'),
  ],
  timurid: [
    e('گوهرشاد و مسجد گوهرشاد', '۱۴۱۸ میلادی', 'آرامش در هرات: آتش‌بس', 'truce'),
    e('مکتب نگارگری هرات', '۱۴۸۰ میلادی', 'هنر بهزاد: سکه و نیرو', 'treasury'),
    e('قیام سربداران', '۱۳۳۷ میلادی', 'سربداران برخاستند!', 'uprising'),
  ],
  safavid: [
    e('پایتختی اصفهان', '۱۵۹۸ میلادی', 'اصفهان نصف جهان: سکه و نیرو', 'treasury'),
    e('نبرد چالدران', '۱۵۱۴ میلادی', 'کمین! دیوها تندتر شدند', 'ambush'),
    e('بازپس‌گیری هرمز', '۱۶۲۲ میلادی', 'پیروزی شاه عباس: سه‌تیر', 'reinforcements'),
  ],
  afsharid: [
    e('فتح دهلی', '۱۷۳۹ میلادی', 'غنیمت نادری: سکه و نیرو', 'treasury'),
    e('تاج‌گذاری در دشت مغان', '۱۷۳۶ میلادی', 'فرمان نادر: موج زرین', 'decree'),
    e('شورش ایلات', '۱۷۴۵ میلادی', 'ایلات شوریدند!', 'uprising'),
  ],
  zand: [
    e('وکیل‌الرعایا', '۱۷۶۵ میلادی', 'دادگری کریم‌خان: یک جان', 'blessing'),
    e('بازار وکیل', '۱۷۶۶ میلادی', 'رونق شیراز: سکه و نیرو', 'treasury'),
    e('جنگ جانشینی', '۱۷۷۹ میلادی', 'آشوب پس از کریم‌خان!', 'uprising'),
  ],
  qajar: [
    e('امیرکبیر و دارالفنون', '۱۸۵۱ میلادی', 'دانش نو: یک جان', 'blessing'),
    e('جنبش تنباکو', '۱۸۹۱ میلادی', 'تحریم فراگیر: دیوها از کار افتادند', 'truce'),
    e('عهدنامهٔ ترکمانچای', '۱۸۲۸ میلادی', 'روز تلخ: دیوها تندتر شدند', 'ambush'),
  ],
  constitutional: [
    e('فرمان مشروطه', '۱۹۰۶ میلادی', 'عدالتخانه برپا شد: موج زرین', 'decree'),
    e('ستارخان در تبریز', '۱۹۰۸ میلادی', 'سردار ملی به یاری آمد: سه‌تیر', 'reinforcements'),
    e('به توپ بستن مجلس', '۱۹۰۸ میلادی', 'کمین! دیوها یورش آوردند', 'ambush'),
  ],
  pahlavi: [
    e('راه‌آهن سراسری', '۱۳۱۷ خورشیدی', 'قطار سه‌تیر آورد', 'reinforcements'),
    e('ملی شدن صنعت نفت', '۱۳۲۹ خورشیدی', 'ثروت ملی: سکه و نیرو', 'treasury'),
    e('تأسیس دانشگاه تهران', '۱۳۱۳ خورشیدی', 'دانش جان می‌بخشد', 'blessing'),
  ],
  contemporary: [
    e('صعود به جام جهانی', '۱۳۷۶ خورشیدی', 'شادی ملی: یک جان', 'blessing'),
    e('نوروز و سفرهٔ هفت‌سین', '۱۴۰۵ خورشیدی', 'عیدی: سکه و نیرو', 'treasury'),
    e('قهرمانی کشتی جهان', '۱۴۰۲ خورشیدی', 'پهلوانان روی تشک: سه‌تیر', 'reinforcements'),
  ],
  future: [
    e('نخستین شهر ایرانی در مریخ', '۱۴۸۰ خورشیدی', 'فناوری نو: موج زرین', 'decree'),
    e('قطعی بزرگ شبکه', '۱۴۹۰ خورشیدی', 'تاریکی! دیوها تندتر شدند', 'ambush'),
    e('آشتی بزرگ', '۱۵۰۰ خورشیدی', 'آتش‌بس جهانی', 'truce'),
  ],
};

/** A random event of the era (never the same headline twice in a run: pass the ones shown). */
export function pickEraEvent(eraId: string, rand: () => number, shown: ReadonlySet<string>): EraEventDef | null {
  const pool = (ERA_EVENTS[eraId] ?? []).filter((ev) => !shown.has(ev.title));
  if (!pool.length) return null;
  return pool[Math.floor(rand() * pool.length) % pool.length];
}
