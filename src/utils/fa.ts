const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Replaces Latin digits with Persian digits. */
export function faDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => FA_DIGITS[d.charCodeAt(0) - 48]);
}

/** Integer with thousands separators in Persian digits: 2450 → «۲,۴۵۰». */
export function faNum(n: number): string {
  return faDigits(Math.round(n).toLocaleString('en-US'));
}
