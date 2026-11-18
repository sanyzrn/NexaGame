/**
 * Team membership for «درفش», used by the game-auth Edge Function.
 *
 * Telegram identity is already verified by the caller; everything here takes the verified player
 * id. The browser never talks to the database: it calls game-auth, which uses the service role.
 *
 * One team per player. Invites are short, single-use codes with an expiry; both are enforced in
 * SQL (see supabase/migrations) so concurrent joins cannot double-use a code or overfill a team.
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.57.0';

export const TEAM_MAX_MEMBERS = 10;
/** How long a freshly shared invite stays usable. */
export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
/** No I/O/0/1: codes are read aloud and typed by hand. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 8;

export interface AuthedPlayer {
  telegram_id: number;
  first_name: string;
  username: string | null;
}

export type MemberRole = 'owner' | 'member';

export interface TeamMemberView {
  id: string;
  name: string;
  role: MemberRole;
  joinedAt: string;
}

export interface TeamView {
  id: string;
  name: string;
  role: MemberRole;
  maxMembers: number;
  members: TeamMemberView[];
}

/** Why an invite cannot be used. Each one has its own message in the game. */
export type InviteStatus =
  | 'valid'
  | 'invalid'
  | 'expired'
  | 'used'
  | 'already_joined'
  | 'already_member'
  | 'other_team'
  | 'full'
  /** The redemption succeeded. */
  | 'joined';

export interface InvitePreview {
  status: InviteStatus;
  teamName?: string;
  inviterName?: string;
  expiresAt?: string;
}

/** An API error with a stable code the client maps to a Persian message. */
export class TeamError extends Error {
  constructor(readonly code: string, readonly status = 400) {
    super(code);
  }
}

/** A random invite code (8 chars from CODE_ALPHABET). */
export function newInviteCode(
  length = CODE_LENGTH,
  random: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes),
): string {
  const bytes = random(new Uint8Array(length));
  let code = '';
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

/** Invite codes are case-insensitive and unambiguous; anything else is not a code. */
export function normalizeInviteCode(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9]{4,16}$/.test(code) ? code : '';
}

/** A team name the game can show: trimmed, single-spaced, at most 32 characters. */
export function cleanTeamName(raw: unknown, fallbackName: string): string {
  const given = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
  const base = given || `لشکر ${fallbackName}`.trim();
  return base.slice(0, 32) || 'لشکر بی‌نام';
}

function fail(): never {
  throw new TeamError('STORE_FAILED', 500);
}

/** The API error code for an invite that could not be redeemed (successes are handled separately). */
export function inviteStatusError(status: InviteStatus): string {
  switch (status) {
    case 'expired':
      return 'INVITE_EXPIRED';
    case 'used':
      return 'INVITE_USED';
    case 'full':
      return 'TEAM_FULL';
    default:
      return 'INVITE_INVALID';
  }
}

/** The player's team with its roster (owner first, then by join time), or null. */
export async function loadTeam(db: SupabaseClient, telegramId: number): Promise<TeamView | null> {
  const membership = await db
    .from('game_team_members')
    .select('team_id, member_role')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (membership.error) fail();
  const teamId = membership.data?.team_id as string | undefined;
  if (!teamId) return null;

  const team = await db.from('game_teams').select('id, name').eq('id', teamId).maybeSingle();
  if (team.error) fail();
  if (!team.data) return null;

  const rows = await db
    .from('game_team_members')
    .select('telegram_id, member_role, joined_at')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });
  if (rows.error || !rows.data) fail();

  const ids = rows.data.map((row) => Number(row.telegram_id));
  const names = new Map<number, string>();
  if (ids.length) {
    const players = await db.from('game_players').select('telegram_id, first_name').in('telegram_id', ids);
    if (players.error) fail();
    for (const player of players.data ?? []) names.set(Number(player.telegram_id), String(player.first_name));
  }

  const members: TeamMemberView[] = rows.data.map((row) => {
    const id = Number(row.telegram_id);
    return {
      id: String(row.telegram_id),
      name: names.get(id) ?? 'هم‌رزم',
      role: row.member_role === 'owner' ? 'owner' : 'member',
      joinedAt: String(row.joined_at),
    };
  });
  members.sort((a, b) => (a.role === b.role ? 0 : a.role === 'owner' ? -1 : 1));

  return {
    id: String(team.data.id),
    name: String(team.data.name),
    role: membership.data?.member_role === 'owner' ? 'owner' : 'member',
    maxMembers: TEAM_MAX_MEMBERS,
    members,
  };
}

/** Creates the player's team (or returns the one they already have). */
export async function createTeam(db: SupabaseClient, player: AuthedPlayer, rawName: unknown): Promise<TeamView> {
  const name = cleanTeamName(rawName, player.first_name);
  const { data, error } = await db.rpc('game_create_team', { p_name: name, p_telegram_id: player.telegram_id });
  if (error) fail();
  const status = (data as { status?: string } | null)?.status;
  if (status !== 'created' && status !== 'exists') fail();
  const team = await loadTeam(db, player.telegram_id);
  if (!team) fail();
  return team;
}

/** A fresh single-use invite for the player's team. */
export async function createInvite(
  db: SupabaseClient,
  player: AuthedPlayer,
): Promise<{ code: string; expiresAt: string }> {
  const team = await loadTeam(db, player.telegram_id);
  if (!team) throw new TeamError('NO_TEAM', 409);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newInviteCode();
    const { error } = await db.from('game_team_invites').insert({
      code,
      team_id: team.id,
      created_by: player.telegram_id,
      expires_at: expiresAt,
    });
    if (!error) return { code, expiresAt };
    // 23505 = duplicate code: astronomically unlikely, retry with a new one.
    if (error.code !== '23505') fail();
  }
  return fail();
}

/**
 * What the invite would do for this player, without changing anything — the confirmation card
 * before joining. A malformed code is `invalid` (never an error), so the UI can explain it.
 */
export async function previewInvite(
  db: SupabaseClient,
  rawCode: unknown,
  telegramId: number,
): Promise<InvitePreview> {
  const code = normalizeInviteCode(rawCode);
  if (!code) return { status: 'invalid' };

  const invite = await db
    .from('game_team_invites')
    .select('team_id, created_by, expires_at, used_at, used_by')
    .eq('code', code)
    .maybeSingle();
  if (invite.error) fail();
  if (!invite.data) return { status: 'invalid' };

  const teamId = String(invite.data.team_id);
  const team = await db.from('game_teams').select('name').eq('id', teamId).maybeSingle();
  if (team.error) fail();
  const teamName = team.data ? String(team.data.name) : undefined;

  if (invite.data.used_at) {
    return { status: invite.data.used_by !== null && Number(invite.data.used_by) === telegramId ? 'already_joined' : 'used', teamName };
  }
  if (new Date(String(invite.data.expires_at)).getTime() <= Date.now()) return { status: 'expired', teamName };

  const membership = await db
    .from('game_team_members')
    .select('team_id')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (membership.error) fail();
  const currentTeam = membership.data?.team_id as string | undefined;
  if (currentTeam) {
    const isSame = String(currentTeam) === teamId;
    return { status: isSame ? 'already_member' : 'other_team', teamName };
  }

  const count = await db
    .from('game_team_members')
    .select('telegram_id', { count: 'exact', head: true })
    .eq('team_id', teamId);
  if (count.error) fail();
  if ((count.count ?? 0) >= TEAM_MAX_MEMBERS) return { status: 'full', teamName };

  const inviter = await db.from('game_players').select('first_name').eq('telegram_id', invite.data.created_by).maybeSingle();
  if (inviter.error) fail();

  return {
    status: 'valid',
    teamName,
    inviterName: inviter.data ? String(inviter.data.first_name) : undefined,
    expiresAt: String(invite.data.expires_at),
  };
}

/** Redeems the invite (atomically, in SQL) and returns the roster the player just joined. */
export async function redeemInvite(
  db: SupabaseClient,
  player: AuthedPlayer,
  rawCode: unknown,
): Promise<{ status: InviteStatus; team: TeamView | null }> {
  const code = normalizeInviteCode(rawCode);
  if (!code) return { status: 'invalid', team: null };

  const { data, error } = await db.rpc('game_redeem_team_invite', {
    p_code: code,
    p_telegram_id: player.telegram_id,
  });
  if (error) fail();
  const result = data as { status?: string; teamName?: string } | null;
  const status = (result?.status ?? 'invalid') as InviteStatus;
  if (status === 'joined' || status === 'already_joined' || status === 'already_member') {
    return { status, team: await loadTeam(db, player.telegram_id) };
  }
  return { status, team: null };
}
