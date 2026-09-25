const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Replaces Latin digits with Persian digits. */
export function faDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => FA_DIGITS[d.charCodeAt(0) - 48]);
}

/** Integer with Persian thousands separators in Persian digits: 2450 → «۲٬۴۵۰». */
export function faNum(n: number): string {
  return faDigits(Math.round(n).toLocaleString('en-US')).replace(/,/g, '٬');
}

/** Number with a fixed count of decimals and the Persian decimal separator: 1.5 → «۱٫۵». */
export function faDecimal(n: number, decimals = 1): string {
  return faDigits(n.toFixed(decimals)).replace('.', '٫');
}

/** Percentage of a 0..1 value: 0.638 → «۶۳٫۸٪». */
export function faPercent(pct: number, decimals = 1): string {
  return `${faDecimal(Math.max(0, pct) * 100, decimals)}٪`;
}

/** Chain multiplier label: 1.2 → «×۱٫۲», 2 → «×۲». */
export function faMultiplier(m: number): string {
  return `×${Number.isInteger(m) ? faDigits(String(m)) : faDecimal(m)}`;
}
