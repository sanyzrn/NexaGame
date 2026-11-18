import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
import {
  inviteStatusError,
  createInvite,
  createTeam,
  loadTeam,
  previewInvite,
  redeemInvite,
  TeamError,
} from './teams.ts';

// Telegram Mini App identity is authenticated here, never in the browser. Team membership rides
// on the same verified identity: the client sends its initData with every call, so nothing it can
// forge (a player id, a team id) is ever trusted.
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const BASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
// The game's own origins only (production by default; add the tunnel/preview URL for testing).
const DEFAULT_ORIGIN = 'https://game.realmetaverse.ir';
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get('ALLOWED_ORIGINS') ?? DEFAULT_ORIGIN)
    .split(',')
    .map((value) => value.trim().replace(/\/+$/, ''))
    .filter(Boolean),
);
let secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
try { secret = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default || secret; } catch { /* fall back to legacy */ }
const ready = () => Boolean(BOT_TOKEN && BASE_URL && secret);
const db = ready() ? createClient(BASE_URL, secret, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const enc = new TextEncoder();
const MAX_AGE = 3600; // An initData payload expires after 1 hour; reopen the Mini App.

/** Team endpoints. Sign-in is the call with no action. */
const ACTIONS = new Set(['team.create', 'team.invite', 'team.invite_info', 'team.join', 'team.state']);

function headers(origin: string | null) {
  const h: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'content-type, apikey, authorization, x-client-info';
    h['Access-Control-Max-Age'] = '600';
  }
  return h;
}
function respond(origin: string | null, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: headers(origin) });
}
async function mac(key: Uint8Array, text: string) {
  const cryptoKey = await crypto.subtle.importKey('raw', key as unknown as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(text)));
}
function constantTimeHexEqual(actual: string, digest: Uint8Array) {
  if (!/^[0-9a-fA-F]{64}$/.test(actual)) return false;
  let difference = 0;
  for (let i = 0; i < 32; i++) difference |= Number.parseInt(actual.slice(i * 2, i * 2 + 2), 16) ^ digest[i];
  return difference === 0;
}
async function verifyInitData(raw: string, token: string, now: number) {
  if (!raw || raw.length > 12000) throw Error('INVALID_INIT_DATA');
  const params = new URLSearchParams(raw);
  const seen = new Set<string>();
  const pairs: string[] = [];
  let hash = '';
  for (const [key, value] of params) {
    if (seen.has(key) || !/^[a-z][a-z0-9_]*$/.test(key)) throw Error('INVALID_INIT_DATA');
    seen.add(key);
    if (key === 'hash') hash = value;
    else pairs.push(`${key}=${value}`); // Bot-token HMAC excludes hash only.
  }
  if (!hash || !seen.has('user') || !seen.has('auth_date') || seen.size > 32) throw Error('INVALID_INIT_DATA');
  const dateText = params.get('auth_date') ?? '';
  if (!/^\d{10}$/.test(dateText)) throw Error('INVALID_INIT_DATA');
  const date = Number(dateText);
  if (date > now + 60 || now - date > MAX_AGE) throw Error('EXPIRED_INIT_DATA');
  pairs.sort();
  const signingKey = await mac(enc.encode('WebAppData'), token);
  const expected = await mac(signingKey, pairs.join('\n'));
  if (!constantTimeHexEqual(hash, expected)) throw Error('INVALID_INIT_DATA');
  let user: Record<string, unknown>;
  try { user = JSON.parse(params.get('user') ?? ''); } catch { throw Error('INVALID_INIT_DATA'); }
  if (!user || !Number.isSafeInteger(user.id) || Number(user.id) <= 0 || user.is_bot === true) throw Error('INVALID_INIT_DATA');
  return {
    telegram_id: Number(user.id),
    first_name: typeof user.first_name === 'string' ? user.first_name.trim().slice(0, 128) || 'بازیکن' : 'بازیکن',
    username: typeof user.username === 'string' && user.username.trim() ? user.username.trim().slice(0, 64) : null,
  };
}
async function selftest() {
  const token = '123456:TEST_TOKEN_NOT_A_SECRET';
  const now = Math.floor(Date.now() / 1000);
  const pairs = [`auth_date=${now}`, 'user={"id":42,"first_name":"Test"}'];
  const key = await mac(enc.encode('WebAppData'), token);
  const digest = await mac(key, pairs.join('\n'));
  const hash = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
  const raw = `auth_date=${now}&user=${encodeURIComponent('{"id":42,"first_name":"Test"}')}&hash=${hash}`;
  const verified = (await verifyInitData(raw, token, now)).telegram_id === 42;
  let tamperRejected = false, expiryRejected = false, duplicateRejected = false;
  try { await verifyInitData(raw.replace('%22Test%22', '%22Admin%22'), token, now); } catch { tamperRejected = true; }
  try { await verifyInitData(raw, token, now + MAX_AGE + 1); } catch { expiryRejected = true; }
  try { await verifyInitData(raw + '&user=%7B%7D', token, now); } catch { duplicateRejected = true; }
  return { verified, tamperRejected, expiryRejected, duplicateRejected };
}

/** The roster plus the caller's player record, the shape every team response uses. */
function playerView(player: { telegram_id: number; first_name: string; username: string | null }, joinedAt?: string) {
  return { id: String(player.telegram_id), firstName: player.first_name, username: player.username, joinedAt };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const url = new URL(req.url);
  if (req.method === 'GET' && url.searchParams.has('health')) return respond(origin, 200, { version: '1.1', configured: ready(), teams: ready() });
  if (req.method === 'GET' && url.searchParams.has('selftest')) {
    try { const checks = await selftest(); return respond(origin, Object.values(checks).every(Boolean) ? 200 : 500, checks); }
    catch { return respond(origin, 500, { error: 'SELFTEST_FAILED' }); }
  }
  if (origin && !ALLOWED_ORIGINS.has(origin)) return respond(origin, 403, { error: 'ORIGIN_NOT_ALLOWED' });
  if (req.method === 'OPTIONS') return origin ? new Response(null, { status: 204, headers: headers(origin) }) : respond(origin, 403, { error: 'ORIGIN_NOT_ALLOWED' });
  if (req.method !== 'POST') return respond(origin, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (!ready() || !db) return respond(origin, 503, { error: 'NOT_CONFIGURED' });
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return respond(origin, 415, { error: 'JSON_REQUIRED' });
  if (Number(req.headers.get('content-length') ?? 0) > 16000) return respond(origin, 413, { error: 'TOO_LARGE' });
  let input: unknown;
  try { const body = await req.text(); if (body.length > 16000) throw Error(); input = JSON.parse(body); }
  catch { return respond(origin, 400, { error: 'BAD_REQUEST' }); }
  if (!input || typeof input !== 'object' || typeof (input as { initData?: unknown }).initData !== 'string') return respond(origin, 400, { error: 'BAD_REQUEST' });
  const action = (input as { action?: unknown }).action;
  if (action !== undefined && (typeof action !== 'string' || !ACTIONS.has(action))) return respond(origin, 400, { error: 'UNKNOWN_ACTION' });
  let player;
  try { player = await verifyInitData((input as { initData: string }).initData, BOT_TOKEN, Math.floor(Date.now() / 1000)); }
  catch (err) { return respond(origin, 401, { error: String(err) === 'Error: EXPIRED_INIT_DATA' ? 'EXPIRED_INIT_DATA' : 'INVALID_INIT_DATA' }); }
  const { data, error } = await db.from('game_players').upsert({ ...player, last_seen_at: new Date().toISOString() }, { onConflict: 'telegram_id' }).select('telegram_id,first_name,username,created_at').single();
  if (error || !data) { console.error('GAME_PLAYER_SAVE', error?.code ?? 'NO_DATA'); return respond(origin, 500, { error: 'SAVE_FAILED' }); }
  const joinedAt = String(data.created_at);

  // No action: Telegram sign-in. Returns who you are and the team you are already in.
  if (!action) {
    try {
      return respond(origin, 200, { ok: true, player: playerView(player, joinedAt), team: await loadTeam(db, player.telegram_id) });
    } catch (err) {
      console.error('TEAM_STATE', err instanceof TeamError ? err.code : 'UNKNOWN');
      return respond(origin, 200, { ok: true, player: playerView(player, joinedAt), team: null });
    }
  }

  const body = input as { name?: unknown; code?: unknown };
  try {
    switch (action) {
      case 'team.create': {
        const team = await createTeam(db, player, body.name);
        return respond(origin, 200, { ok: true, player: playerView(player, joinedAt), team });
      }
      case 'team.invite': {
        const invite = await createInvite(db, player);
        return respond(origin, 200, { ok: true, code: invite.code, expiresAt: invite.expiresAt, team: await loadTeam(db, player.telegram_id) });
      }
      case 'team.invite_info': {
        const info = await previewInvite(db, body.code, player.telegram_id);
        return respond(origin, 200, { ok: true, invite: info });
      }
      case 'team.join': {
        const result = await redeemInvite(db, player, body.code);
        if (result.status !== 'joined' && result.status !== 'already_joined' && result.status !== 'already_member') {
          return respond(origin, 409, { ok: false, error: inviteStatusError(result.status) });
        }
        return respond(origin, 200, { ok: true, status: result.status, player: playerView(player, joinedAt), team: result.team });
      }
      case 'team.state':
      default:
        return respond(origin, 200, { ok: true, player: playerView(player, joinedAt), team: await loadTeam(db, player.telegram_id) });
    }
  } catch (err) {
    if (err instanceof TeamError) {
      console.error('TEAM_ACTION', action, err.code);
      return respond(origin, err.status, { ok: false, error: err.code });
    }
    console.error('TEAM_ACTION', action, 'UNKNOWN');
    return respond(origin, 500, { ok: false, error: 'STORE_FAILED' });
  }
});
