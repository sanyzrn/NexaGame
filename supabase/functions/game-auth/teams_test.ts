import { assertEquals, assertMatch } from 'jsr:@std/assert@1';
import {
  CODE_ALPHABET,
  cleanTeamName,
  inviteStatusError,
  newInviteCode,
  normalizeInviteCode,
} from './teams.ts';

Deno.test('invite codes are short, uppercase and unambiguous', () => {
  const code = newInviteCode(8, (bytes) => bytes.fill(0));
  assertEquals(code.length, 8);
  assertEquals(code, CODE_ALPHABET[0].repeat(8));
  assertMatch(code, /^[A-Z0-9]{8}$/);
  // No I, O, 0 or 1: codes are read aloud and typed by hand.
  for (const ch of 'IO01') assertEquals(CODE_ALPHABET.includes(ch), false);
});

Deno.test('random bytes map across the whole alphabet', () => {
  const bytes = new Uint8Array(64).map((_, i) => i);
  const code = newInviteCode(64, () => bytes);
  assertEquals(code.length, 64);
  assertEquals(new Set(code).size, CODE_ALPHABET.length);
});

Deno.test('invite codes are case-insensitive and reject junk', () => {
  assertEquals(normalizeInviteCode('  abcd2345 '), 'ABCD2345');
  assertEquals(normalizeInviteCode('t_ABCD2345'), '');
  assertEquals(normalizeInviteCode('AB'), '');
  assertEquals(normalizeInviteCode('AB-CD234'), '');
  assertEquals(normalizeInviteCode('A'.repeat(17)), '');
  assertEquals(normalizeInviteCode(42), '');
  assertEquals(normalizeInviteCode(null), '');
});

Deno.test('team names are trimmed, spaced and capped', () => {
  assertEquals(cleanTeamName('  لشکر   سارا ', 'سارا'), 'لشکر سارا');
  assertEquals(cleanTeamName('', 'کاوه'), 'لشکر کاوه');
  assertEquals(cleanTeamName(undefined, 'کاوه'), 'لشکر کاوه');
  assertEquals(cleanTeamName('x'.repeat(80), 'کاوه').length, 32);
  assertEquals(cleanTeamName('   ', 'کاوه'), 'لشکر کاوه');
});

Deno.test('each unredeemable invite maps to its own error code', () => {
  assertEquals(inviteStatusError('expired'), 'INVITE_EXPIRED');
  assertEquals(inviteStatusError('used'), 'INVITE_USED');
  assertEquals(inviteStatusError('full'), 'TEAM_FULL');
  assertEquals(inviteStatusError('invalid'), 'INVITE_INVALID');
});
