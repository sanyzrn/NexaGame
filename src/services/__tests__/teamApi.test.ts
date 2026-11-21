import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TelegramBridge } from '../TelegramBridge';

const ENDPOINT = 'https://demo.supabase.co/functions/v1/game-auth';
const TEAM = {
  id: 'team-1',
  name: 'لشکر سارا',
  role: 'owner',
  maxMembers: 10,
  members: [{ id: '1', name: 'سارا', role: 'owner', joinedAt: '2026-01-01T00:00:00Z' }],
};

/** `gameApi` reads the build settings once, at import: load a fresh client per test. */
async function loadApi() {
  vi.resetModules();
  vi.stubEnv('VITE_GAME_API_URL', ENDPOINT);
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  const mod = await import('../TeamApi');
  return mod;
}

function telegram(overrides: Partial<TelegramBridge> = {}): TelegramBridge {
  return {
    isTelegram: true,
    initData: 'auth_date=1&user=%7B%7D&hash=abc',
    userFirstName: 'سارا',
    ...overrides,
  } as unknown as TelegramBridge;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Telegram sign-in', () => {
  it('sends initData and keeps the player and team from the answer', async () => {
    const fetchMock = vi.fn(async () => json({ ok: true, player: { id: '1', firstName: 'سارا', username: null }, team: TEAM }));
    vi.stubGlobal('fetch', fetchMock);
    const { TeamApi } = await loadApi();

    const api = new TeamApi(telegram());
    expect(api.available).toBe(true);
    await api.ready();

    expect(api.signedIn).toBe(true);
    expect(api.playerName).toBe('سارا');
    expect(api.team?.name).toBe('لشکر سارا');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(ENDPOINT);
    expect((init.headers as Record<string, string>).apikey).toBe('anon-key');
    const body = JSON.parse(String(init.body)) as { initData: string; action?: string };
    expect(body.initData).toContain('auth_date');
    expect(body.action).toBeUndefined();
  });

  it('survives a backend that never answers, and reports it as unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    const { TeamApi } = await loadApi();

    const api = new TeamApi(telegram());
    await api.ready(); // never rejects
    expect(api.signedIn).toBe(false);
    expect(await api.previewInvite('ABCD2345')).toEqual({ status: 'unreachable' });
    await expect(api.createInvite()).rejects.toMatchObject({ code: 'SIGN_IN_FAILED' });
  });

  it('does not call the backend outside Telegram', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { TeamApi } = await loadApi();

    const api = new TeamApi(telegram({ isTelegram: false, initData: '' }));
    expect(api.available).toBe(false);
    await api.ready();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await api.previewInvite('ABCD2345')).toEqual({ status: 'unauthenticated' });
  });
});

describe('team invites', () => {
  it('creates the team first, then a single-use code', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ ok: true, player: { id: '1', firstName: 'سارا', username: null }, team: null }))
      .mockResolvedValueOnce(json({ ok: true, player: { id: '1', firstName: 'سارا', username: null }, team: TEAM }))
      .mockResolvedValueOnce(json({ ok: true, code: 'ABCD2345', expiresAt: '2026-01-02T00:00:00Z', team: TEAM }));
    vi.stubGlobal('fetch', fetchMock);
    const { TeamApi } = await loadApi();

    const api = new TeamApi(telegram());
    const invite = await api.createInvite();

    expect(invite.code).toBe('ABCD2345');
    expect(api.team?.name).toBe('لشکر سارا');
    const actions = fetchMock.mock.calls.map((call) => JSON.parse(String((call as unknown as [string, RequestInit])[1].body)).action);
    expect(actions).toEqual([undefined, 'team.create', 'team.invite']);
  });

  it('reports a reused code with its own error, not a generic failure', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ ok: true, player: { id: '2', firstName: 'کاوه', username: null }, team: null }))
      .mockResolvedValueOnce(json({ ok: false, error: 'INVITE_USED' }, 409));
    vi.stubGlobal('fetch', fetchMock);
    const { TeamApi, TeamApiError } = await loadApi();

    const api = new TeamApi(telegram());
    const error = await api.join('ABCD2345').catch((err: unknown) => err);
    expect(error).toBeInstanceOf(TeamApiError);
    expect((error as InstanceType<typeof TeamApiError>).code).toBe('INVITE_USED');
  });

  it('shows the expired state before joining', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ ok: true, player: { id: '2', firstName: 'کاوه', username: null }, team: null }))
      .mockResolvedValueOnce(json({ ok: true, invite: { status: 'expired', teamName: 'لشکر سارا' } }));
    vi.stubGlobal('fetch', fetchMock);
    const { TeamApi } = await loadApi();

    const api = new TeamApi(telegram());
    expect(await api.previewInvite('ZZZZ9999')).toEqual({ status: 'expired', teamName: 'لشکر سارا' });
  });

  it('shows the inviter and team on a usable invite', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ ok: true, player: { id: '2', firstName: 'کاوه', username: null }, team: null }))
      .mockResolvedValueOnce(json({ ok: true, invite: { status: 'valid', teamName: 'لشکر سارا', inviterName: 'سارا', expiresAt: '2026-01-02T00:00:00Z' } }));
    vi.stubGlobal('fetch', fetchMock);
    const { TeamApi } = await loadApi();

    const api = new TeamApi(telegram());
    const preview = await api.previewInvite('abcd2345');
    expect(preview).toMatchObject({ status: 'valid', teamName: 'لشکر سارا', inviterName: 'سارا' });
    const body = JSON.parse(String((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(body).toMatchObject({ action: 'team.invite_info', code: 'abcd2345' });
  });
});
