import { createClient } from 'npm:@supabase/supabase-js@2.57.0';

// Telegram Mini App identity is authenticated here, never in the browser.
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const BASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ORIGIN = 'https://game.realmetaverse.ir';
let secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
try { secret = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default || secret; } catch { /* fall back to legacy */ }
const ready = () => Boolean(BOT_TOKEN && BASE_URL && secret);
const db = ready() ? createClient(BASE_URL, secret, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const enc = new TextEncoder();
const MAX_AGE = 3600; // An initData payload expires after 1 hour; reopen the Mini App.

function headers(origin: string | null) {
  const h: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' };
  if (origin === ORIGIN) {
    h['Access-Control-Allow-Origin'] = ORIGIN;
    h['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'content-type';
    h['Access-Control-Max-Age'] = '600';
  }
  return h;
}
function respond(origin: string | null, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: headers(origin) });
}
async function mac(key: Uint8Array, text: string) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
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

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const url = new URL(req.url);
  if (req.method === 'GET' && url.searchParams.has('health')) return respond(origin, 200, { version: '1.0', configured: ready() });
  if (req.method === 'GET' && url.searchParams.has('selftest')) {
    try { const checks = await selftest(); return respond(origin, Object.values(checks).every(Boolean) ? 200 : 500, checks); }
    catch { return respond(origin, 500, { error: 'SELFTEST_FAILED' }); }
  }
  if (origin && origin !== ORIGIN) return respond(origin, 403, { error: 'ORIGIN_NOT_ALLOWED' });
  if (req.method === 'OPTIONS') return origin === ORIGIN ? new Response(null, { status: 204, headers: headers(origin) }) : respond(origin, 403, { error: 'ORIGIN_NOT_ALLOWED' });
  if (req.method !== 'POST') return respond(origin, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (!ready() || !db) return respond(origin, 503, { error: 'NOT_CONFIGURED' });
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return respond(origin, 415, { error: 'JSON_REQUIRED' });
  if (Number(req.headers.get('content-length') ?? 0) > 16000) return respond(origin, 413, { error: 'TOO_LARGE' });
  let input: unknown;
  try { const body = await req.text(); if (body.length > 16000) throw Error(); input = JSON.parse(body); }
  catch { return respond(origin, 400, { error: 'BAD_REQUEST' }); }
  if (!input || typeof input !== 'object' || typeof (input as { initData?: unknown }).initData !== 'string') return respond(origin, 400, { error: 'BAD_REQUEST' });
  let player;
  try { player = await verifyInitData((input as { initData: string }).initData, BOT_TOKEN, Math.floor(Date.now() / 1000)); }
  catch (err) { return respond(origin, 401, { error: String(err) === 'Error: EXPIRED_INIT_DATA' ? 'EXPIRED_INIT_DATA' : 'INVALID_INIT_DATA' }); }
  const { data, error } = await db.from('game_players').upsert({ ...player, last_seen_at: new Date().toISOString() }, { onConflict: 'telegram_id' }).select('telegram_id,first_name,username,created_at').single();
  if (error || !data) { console.error('GAME_PLAYER_SAVE', error?.code ?? 'NO_DATA'); return respond(origin, 500, { error: 'SAVE_FAILED' }); }
  return respond(origin, 200, { ok: true, player: { id: String(data.telegram_id), firstName: data.first_name, username: data.username, joinedAt: data.created_at } });
});