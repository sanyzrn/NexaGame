import { APP } from '../config/app';

/**
 * Why someone opened the game: a friend's challenge («رکوردم را بزن») or a group invite. Carried in
 * Telegram's start parameter (A–Z a–z 0–9 _ -, at most 64 chars), so names travel base64url-encoded.
 */
export type StartParam =
  | { kind: 'challenge'; score: number; name: string }
  | { kind: 'invite'; from: string }
  | null;

const MAX_NAME = 14;
/** Telegram's limit for a start parameter; a longer one is dropped by the client. */
const MAX_PARAM = 64;
/** The sender's name when a link carries none we can read. */
export const UNKNOWN_INVITER = 'یک هم‌رزم';

function b64url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s: string): string {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Builds the parameter, shortening the name until the whole thing fits Telegram's 64 chars. */
function fitParam(name: string, build: (name: string) => string): string {
  let n = name.slice(0, MAX_NAME);
  let out = build(n);
  while (out.length > MAX_PARAM && n.length > 1) {
    n = n.slice(0, -1);
    out = build(n);
  }
  return out;
}

export function encodeStartParam(p: NonNullable<StartParam>): string {
  if (p.kind === 'challenge') {
    const score = Math.max(0, Math.round(p.score));
    return fitParam(p.name, (n) => `c_${score}_${b64url(n)}`);
  }
  return fitParam(p.from, (n) => `i_${b64url(n)}`);
}

/**
 * Never throws: a malformed parameter is simply ignored. The kind is split off first and the rest
 * is handed to the decoder whole — base64url itself contains `-` and `_`, so the name must never be
 * split on those (that is what used to drop or mangle inviter names).
 */
export function parseStartParam(raw: string | null | undefined): StartParam {
  if (!raw) return null;
  try {
    const head = raw.indexOf('_');
    if (head <= 0) return null;
    const kind = raw.slice(0, head);
    const rest = raw.slice(head + 1);
    if (kind === 'c') {
      const sep = rest.indexOf('_');
      if (sep <= 0) return null;
      const score = Number(rest.slice(0, sep));
      if (!Number.isFinite(score) || score <= 0) return null;
      const name = unb64url(rest.slice(sep + 1)).trim().slice(0, MAX_NAME);
      return { kind: 'challenge', score, name: name || UNKNOWN_INVITER };
    }
    if (kind === 'i' && rest) {
      const from = unb64url(rest).trim().slice(0, MAX_NAME);
      return { kind: 'invite', from: from || UNKNOWN_INVITER };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * The t.me Mini App deep link for `param`, or null when this build has no bot settings. With a
 * short name it is https://t.me/<bot>/<app>?startapp=…, otherwise https://t.me/<bot>?startapp=…
 * (the bot's Main Mini App). Either way Telegram opens the game itself, not a browser page.
 */
export function telegramLink(param: string | null): string | null {
  const bot = APP.botUsername;
  if (!bot) return null;
  const q = param ? `?startapp=${encodeURIComponent(param)}` : '';
  return APP.appName ? `https://t.me/${bot}/${APP.appName}${q}` : `https://t.me/${bot}${q}`;
}

/** The page's own URL with the start parameter: the mode for builds without bot settings. */
export function webLink(param: string | null, pageUrl: string = location.href): string {
  const q = param ? `?startapp=${encodeURIComponent(param)}` : '';
  return pageUrl.split('#')[0].split('?')[0] + q;
}

/** A link that opens the game with `param`: a Telegram deep link when the bot is configured. */
export function appLink(param: string | null, pageUrl: string = location.href): string {
  return telegramLink(param) ?? webLink(param, pageUrl);
}

/** The start parameter this session was opened with (Telegram, or ?startapp= in a browser). */
export function readStartParam(tgParam: string | null): StartParam {
  if (tgParam) return parseStartParam(tgParam);
  try {
    const q = new URLSearchParams(location.search);
    return parseStartParam(q.get('startapp') ?? q.get('tgWebAppStartParam'));
  } catch {
    return null;
  }
}
