import type { InvitePreviewStatus, TeamErrorCode } from './TeamApi';

/**
 * One message per state, so invalid, expired and repeated invites never look alike. Kept out of
 * the scenes so the wording is in one place (and can be checked without Phaser).
 */
export const INVITE_STATUS_TEXT: Record<InvitePreviewStatus, string> = {
  valid: '',
  invalid: 'این لینک دعوت معتبر نیست',
  expired: 'این دعوت منقضی شده؛ از هم‌رزمت یک دعوت تازه بخواه',
  used: 'این دعوت قبلاً استفاده شده',
  already_joined: 'قبلاً با همین دعوت به لشکر پیوستی',
  already_member: 'تو همین حالا هم‌رزم این لشکری',
  other_team: 'تو در یک لشکر دیگر هستی؛ هر بازیکن فقط در یک لشکر جا می‌گیرد',
  full: 'لشکر پر است؛ ظرفیت هر لشکر ده هم‌رزم است',
  unauthenticated: 'برای پیوستن به لشکر، بازی را از تلگرام باز کن',
  unreachable: 'ارتباط با سرور برقرار نشد؛ کمی بعد دوباره تلاش کن',
};

/** The short note under a usable invite. */
export const INVITE_CONFIRM_HINT = 'با پیوستن، اسمت در فهرست هم‌رزمان این لشکر می‌آید';

/** Why a team action failed, in the player's words. */
export const TEAM_ERROR_TEXT: Record<TeamErrorCode, string> = {
  NOT_CONFIGURED: 'سرور لشکر در این نسخه تنظیم نشده است',
  NOT_IN_TELEGRAM: 'برای لشکر واقعی، بازی را از تلگرام باز کن',
  SIGN_IN_FAILED: 'ورود به تلگرام انجام نشد؛ بازی را دوباره باز کن',
  NETWORK: 'ارتباط با سرور برقرار نشد؛ دوباره تلاش کن',
  EXPIRED_INIT_DATA: 'نشست تلگرام منقضی شده؛ بازی را دوباره باز کن',
  INVALID_INIT_DATA: 'شناسهٔ تلگرام تأیید نشد؛ بازی را دوباره باز کن',
  ALREADY_IN_TEAM: 'تو در یک لشکر هستی؛ هر بازیکن فقط یک لشکر دارد',
  NO_TEAM: 'اول یک لشکر بساز',
  INVITE_INVALID: 'این لینک دعوت معتبر نیست',
  INVITE_EXPIRED: 'این دعوت منقضی شده؛ دعوت تازه بگیر',
  INVITE_USED: 'این دعوت قبلاً استفاده شده',
  TEAM_FULL: 'لشکر پر است؛ ظرفیت هر لشکر ده هم‌رزم است',
  STORE_FAILED: 'ذخیرهٔ لشکر انجام نشد؛ کمی بعد دوباره تلاش کن',
  UNKNOWN: 'مشکلی پیش آمد؛ دوباره تلاش کن',
};

export function teamErrorText(code: string | undefined): string {
  return (code && TEAM_ERROR_TEXT[code as TeamErrorCode]) || TEAM_ERROR_TEXT.UNKNOWN;
}
