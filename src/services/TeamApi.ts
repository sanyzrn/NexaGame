import { GAME_API } from '../config/gameApi';
import type { TelegramBridge } from './TelegramBridge';

/**
 * Telegram sign-in and real team membership, through the `game-auth` Edge Function.
 *
 * The browser never holds a database key: it sends the Telegram `initData` it already has, the
 * function verifies it with the bot token, and every team action is scoped to that verified player.
 * That is why there is no session token to store — a fresh sign-in is the identity.
 */
export type TeamErrorCode =
  | 'NOT_CONFIGURED'
  | 'NOT_IN_TELEGRAM'
  | 'SIGN_IN_FAILED'
  | 'NETWORK'
  | 'EXPIRED_INIT_DATA'
  | 'INVALID_INIT_DATA'
  | 'ALREADY_IN_TEAM'
  | 'NO_TEAM'
  | 'INVITE_INVALID'
  | 'INVITE_EXPIRED'
  | 'INVITE_USED'
  | 'TEAM_FULL'
  | 'STORE_FAILED'
  | 'UNKNOWN';

export class TeamApiError extends Error {
  constructor(readonly code: TeamErrorCode) {
    super(code);
    this.name = 'TeamApiError';
  }
}

export interface PlayerView {
  id: string;
  firstName: string;
  username: string | null;
}

export interface TeamMemberView {
  id: string;
  name: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface TeamView {
  id: string;
  name: string;
  role: 'owner' | 'member';
  maxMembers: number;
  members: TeamMemberView[];
}

/** What an invite would do for this player, without joining. */
export type InvitePreviewStatus =
  | 'valid'
  | 'invalid'
  | 'expired'
  | 'used'
  | 'already_joined'
  | 'already_member'
  | 'other_team'
  | 'full'
  | 'unauthenticated'
  | 'unreachable';

export interface InvitePreview {
  status: InvitePreviewStatus;
  teamName?: string;
  inviterName?: string;
  expiresAt?: string;
}

export interface TeamInvite {
  code: string;
  expiresAt: string;
}

interface ApiResponse {
  ok?: boolean;
  error?: string;
  player?: PlayerView;
  team?: TeamView | null;
  invite?: InvitePreview;
  code?: string;
  expiresAt?: string;
  status?: string;
}

const KNOWN_ERRORS = new Set<TeamErrorCode>([
  'ALREADY_IN_TEAM', 'NO_TEAM', 'INVITE_INVALID', 'INVITE_EXPIRED', 'INVITE_USED', 'TEAM_FULL',
  'STORE_FAILED', 'EXPIRED_INIT_DATA', 'INVALID_INIT_DATA',
]);
const TIMEOUT_MS = 12_000;
/** After a failed sign-in, wait this long before trying again on its own. */
const RETRY_AFTER_MS = 15_000;

export class TeamApi {
  private playerView: PlayerView | null = null;
  private teamView: TeamView | null = null;
  private session: Promise<void> | null = null;
  private authed = false;
  private failedAt = 0;

  constructor(private readonly telegram: TelegramBridge) {}

  /** The signed-in player's team (with the real roster), or null. */
  get team(): TeamView | null {
    return this.teamView;
  }

  get signedIn(): boolean {
    return this.authed;
  }

  /** Real teams need both a Telegram identity and a build with the backend configured. */
  get available(): boolean {
    return Boolean(GAME_API.endpoint) && this.telegram.isTelegram;
  }

  /** The player's Telegram first name, for the team name and share texts. */
  get playerName(): string {
    return this.playerView?.firstName ?? this.telegram.userFirstName ?? 'پهلوان';
  }

  /**
   * Signs in (once) and loads the player's team. Never rejects: the game is playable whether or
   * not the backend answers, and a failure is retried no sooner than RETRY_AFTER_MS.
   */
  ready(): Promise<void> {
    if (!this.available || this.authed) return Promise.resolve();
    if (this.session) return this.session;
    if (Date.now() - this.failedAt < RETRY_AFTER_MS) return Promise.resolve();
    this.session = this.signIn();
    return this.session;
  }

  private async signIn(): Promise<void> {
    try {
      const res = await this.call(null);
      if (!res.player) throw new TeamApiError('UNKNOWN');
      this.playerView = res.player;
      this.teamView = res.team ?? null;
      this.authed = true;
      this.failedAt = 0;
    } catch {
      this.authed = false;
      this.failedAt = Date.now();
    } finally {
      this.session = null;
    }
  }

  /** Creates the player's team (or returns the one they already have). */
  async createTeam(name?: string): Promise<TeamView> {
    await this.requireSignedIn();
    const res = await this.call('team.create', name ? { name } : {});
    if (!res.team) throw new TeamApiError('STORE_FAILED');
    this.teamView = res.team;
    return res.team;
  }

  /** A fresh single-use invite for the player's team, creating the team on the first invite. */
  async createInvite(): Promise<TeamInvite> {
    await this.requireSignedIn();
    if (!this.teamView) await this.createTeam();
    const res = await this.call('team.invite');
    if (!res.code || !res.expiresAt) throw new TeamApiError('STORE_FAILED');
    this.teamView = res.team ?? this.teamView;
    return { code: res.code, expiresAt: res.expiresAt };
  }

  /** Reads what the invite would do for this player (the confirmation card), without joining. */
  async previewInvite(code: string): Promise<InvitePreview> {
    if (!this.available) return { status: 'unauthenticated' };
    try {
      await this.ready();
      // A failed sign-in is a server/connection problem, not «open the game in Telegram».
      if (!this.signedIn) return { status: this.failedAt ? 'unreachable' : 'unauthenticated' };
      const res = await this.call('team.invite_info', { code });
      return res.invite ?? { status: 'invalid' };
    } catch (err) {
      if (err instanceof TeamApiError && err.code === 'INVITE_INVALID') return { status: 'invalid' };
      return { status: 'unreachable' };
    }
  }

  /** Redeems the invite. Throws a TeamApiError with the server's reason when it cannot. */
  async join(code: string): Promise<TeamView> {
    await this.requireSignedIn();
    const res = await this.call('team.join', { code });
    if (!res.team) throw new TeamApiError('STORE_FAILED');
    this.teamView = res.team;
    return res.team;
  }

  private async requireSignedIn(): Promise<void> {
    if (!this.available) {
      throw new TeamApiError(this.telegram.isTelegram ? 'NOT_CONFIGURED' : 'NOT_IN_TELEGRAM');
    }
    await this.ready();
    if (!this.signedIn) throw new TeamApiError('SIGN_IN_FAILED');
  }

  private async call(action: string | null, payload: Record<string, unknown> = {}): Promise<ApiResponse> {
    if (!GAME_API.endpoint) throw new TeamApiError('NOT_CONFIGURED');
    const initData = this.telegram.initData;
    if (!this.telegram.isTelegram || !initData) throw new TeamApiError('NOT_IN_TELEGRAM');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(GAME_API.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(GAME_API.anonKey ? { apikey: GAME_API.anonKey, authorization: `Bearer ${GAME_API.anonKey}` } : {}),
        },
        body: JSON.stringify({ initData, ...(action ? { action } : {}), ...payload }),
        signal: controller.signal,
      });
      let body: ApiResponse = {};
      try {
        body = (await res.json()) as ApiResponse;
      } catch {
        /* a proxy error page is a network failure, below */
      }
      if (!res.ok || body.ok === false) throw new TeamApiError(this.errorCode(body.error));
      return body;
    } catch (err) {
      if (err instanceof TeamApiError) throw err;
      throw new TeamApiError('NETWORK');
    } finally {
      clearTimeout(timer);
    }
  }

  private errorCode(raw: string | undefined): TeamErrorCode {
    if (raw && KNOWN_ERRORS.has(raw as TeamErrorCode)) return raw as TeamErrorCode;
    if (raw === 'BAD_REQUEST' || raw === 'INVALID_INIT_DATA') return 'INVALID_INIT_DATA';
    return 'UNKNOWN';
  }
}
