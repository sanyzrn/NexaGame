import { afterEach, describe, expect, it, vi } from 'vitest';

/** `links` reads the build settings once, at import: load a fresh copy per configuration. */
async function loadLinks(bot?: string, app?: string): Promise<typeof import('../links')> {
  vi.resetModules();
  vi.stubEnv('VITE_TG_BOT', bot ?? '');
  vi.stubEnv('VITE_TG_APP', app ?? '');
  return import('../links');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

const PAGE = 'https://game.example.ir/play?utm=x#top';

describe('deep links from build settings', () => {
  it('builds a Mini App link with the short name and the start parameter', async () => {
    const { appLink, encodeStartParam } = await loadLinks('@NexaBot', 'darafsh');
    const param = encodeStartParam({ kind: 'invite', from: 'سارا' });
    expect(appLink(param, PAGE)).toBe(`https://t.me/NexaBot/darafsh?startapp=${param}`);
  });

  it('opens the main Mini App when only the bot is configured', async () => {
    const { appLink, encodeStartParam } = await loadLinks('NexaBot');
    const param = encodeStartParam({ kind: 'challenge', score: 12400, name: 'سارا' });
    expect(appLink(param, PAGE)).toBe(`https://t.me/NexaBot?startapp=${param}`);
  });

  it('accepts a pasted full Mini App link in the build setting', async () => {
    const { appLink } = await loadLinks('https://t.me/NexaBot/darafsh');
    expect(appLink('i_YQ', PAGE)).toBe('https://t.me/NexaBot/darafsh?startapp=i_YQ');
  });

  it('keeps plain web links for builds without bot settings', async () => {
    const { appLink, telegramLink } = await loadLinks();
    expect(telegramLink('i_YQ')).toBeNull();
    expect(appLink('i_YQ', PAGE)).toBe('https://game.example.ir/play?startapp=i_YQ');
    expect(appLink(null, PAGE)).toBe('https://game.example.ir/play');
  });

  it('ignores an invalid bot value instead of baking a dead t.me link', async () => {
    const { appLink } = await loadLinks('not a bot!');
    expect(appLink('i_YQ', PAGE)).toBe('https://game.example.ir/play?startapp=i_YQ');
  });
});

describe('start parameters', () => {
  it('round-trips invite names that base64url turns into - and _', async () => {
    const { encodeStartParam, parseStartParam } = await loadLinks();
    // Names whose base64url form contains `_` or `-` used to be split apart and lost.
    for (const name of ['سارا', 'پهلوان', 'آرش کمانگیر', 'درفش‌دار', 'Zahhak', 'رستم دستان']) {
      const param = encodeStartParam({ kind: 'invite', from: name });
      expect(param).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
      expect(parseStartParam(param)).toEqual({ kind: 'invite', from: name.slice(0, 14) });
    }
  });

  it('keeps a challenge readable too', async () => {
    const { encodeStartParam, parseStartParam } = await loadLinks();
    const param = encodeStartParam({ kind: 'challenge', score: 987654, name: 'پهلوان' });
    expect(param.length).toBeLessThanOrEqual(64);
    expect(parseStartParam(param)).toEqual({ kind: 'challenge', score: 987654, name: 'پهلوان' });
  });

  it('falls back to a readable name instead of an empty ribbon', async () => {
    const { parseStartParam, UNKNOWN_INVITER } = await loadLinks();
    expect(parseStartParam('i_')).toBeNull();
    expect(parseStartParam(`i_${btoa('   ').replace(/=+$/, '')}`)).toEqual({ kind: 'invite', from: UNKNOWN_INVITER });
  });
});
