import { describe, expect, it } from 'vitest';
import { encodeStartParam, forgetTeamInvite, parseStartParam, readStartParam } from '../links';
import { INVITE_STATUS_TEXT, TEAM_ERROR_TEXT, teamErrorText } from '../teamText';

describe('team invite start parameters', () => {
  it('encodes a short, Telegram-safe code in the team kind', () => {
    const param = encodeStartParam({ kind: 'team', code: 'abcd2345' });
    expect(param).toBe('t_ABCD2345');
    expect(param).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(parseStartParam(param)).toEqual({ kind: 'team', code: 'ABCD2345' });
  });

  it('rejects a malformed team code instead of half-reading it', () => {
    expect(parseStartParam('t_')).toBeNull();
    expect(parseStartParam('t_ab')).toBeNull();
    expect(parseStartParam('t_AB-12')).toBeNull();
    expect(parseStartParam('t_' + 'A'.repeat(17))).toBeNull();
  });

  it('does not turn a team code into a name invite', () => {
    // `t_` must never fall through to the base64url name decoder.
    expect(parseStartParam('t_ABC23456')?.kind).toBe('team');
  });

  it('stops asking about an invite once it has been answered', () => {
    const param = encodeStartParam({ kind: 'team', code: 'FC7K2M9Q' });
    expect(readStartParam(param)).toEqual({ kind: 'team', code: 'FC7K2M9Q' });
    forgetTeamInvite('fc7k2m9q');
    expect(readStartParam(param)).toBeNull();
  });

  it('leaves challenges alone when a team invite is forgotten', () => {
    forgetTeamInvite('ZZZZ9999');
    const challenge = encodeStartParam({ kind: 'challenge', score: 500, name: 'سارا' });
    expect(readStartParam(challenge)?.kind).toBe('challenge');
  });
});

describe('invite and team messages', () => {
  it('gives invalid, expired and repeated invites distinct words', () => {
    const lines = [INVITE_STATUS_TEXT.invalid, INVITE_STATUS_TEXT.expired, INVITE_STATUS_TEXT.used, INVITE_STATUS_TEXT.already_member];
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('explains a used code differently from an expired one', () => {
    expect(teamErrorText('INVITE_USED')).toBe(TEAM_ERROR_TEXT.INVITE_USED);
    expect(teamErrorText('INVITE_EXPIRED')).toBe(TEAM_ERROR_TEXT.INVITE_EXPIRED);
    expect(teamErrorText('INVITE_USED')).not.toBe(teamErrorText('INVITE_EXPIRED'));
  });

  it('never shows an empty or unknown-code message', () => {
    for (const text of Object.values(TEAM_ERROR_TEXT)) expect(text.length).toBeGreaterThan(0);
    expect(teamErrorText('SOMETHING_NEW')).toBe(TEAM_ERROR_TEXT.UNKNOWN);
    expect(teamErrorText(undefined)).toBe(TEAM_ERROR_TEXT.UNKNOWN);
  });
});
