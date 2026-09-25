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

export function encodeStartParam(p: NonNullable<StartParam>): string {
  if (p.kind === 'challenge') return `c_${Math.max(0, Math.round(p.score))}_${b64url(p.name.slice(0, MAX_NAME))}`;
  return `i_${b64url(p.from.slice(0, MAX_NAME))}`;
}

/** Never throws: a malformed parameter is simply ignored. */
export function parseStartParam(raw: string | null | undefined): StartParam {
  if (!raw) return null;
  try {
    const [kind, a, b] = raw.split('_');
    if (kind === 'c' && a && b !== undefined) {
      const score = Number(a);
      if (!Number.isFinite(score) || score <= 0) return null;
      return { kind: 'challenge', score, name: unb64url(b).slice(0, MAX_NAME) || 'هم‌رزم' };
    }
    if (kind === 'i' && a) return { kind: 'invite', from: unb64url(a).slice(0, MAX_NAME) };
  } catch {
    /* ignore */
  }
  return null;
}

/** A link that opens the game with `param`: a Telegram deep link when the bot is configured. */
export function appLink(param: string | null, pageUrl = location.href): string {
  const q = param ? `?startapp=${encodeURIComponent(param)}` : '';
  if (APP.botUsername) {
    return APP.appName ? `https://t.me/${APP.botUsername}/${APP.appName}${q}` : `https://t.me/${APP.botUsername}${q}`;
  }
  return pageUrl.split('#')[0].split('?')[0] + q;
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
