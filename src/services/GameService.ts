/**
 * Backend contract. The demo uses MockGameService; a Cloudflare Workers implementation
 * can replace it later without touching gameplay code.
 */

import type { School } from '../config/team';

export interface PlayerProfile {
  id: string;
  name: string;
  bestScore: number;
}

export interface GroupInfo {
  id: string;
  name: string;
  bossName: string;
  bossHpMax: number;
  bossHp: number;
  /** For the title's group chip and the Hero Card. */
  members: GroupMember[];
}

export interface RunResult {
  score: number;
  bestCombo: number;
  /** Golden (critical) releases. */
  crits: number;
  /** Arrows fired; crits / shots = golden-window accuracy. */
  shots: number;
  kills: number;
  /** Damage the player dealt to the group Div this run (chain applied). */
  damage: number;
  stars: number;
  durationMs: number;
  won: boolean;
}

export interface RunSubmitResponse {
  group: GroupInfo;
  bestScore: number;
  isNewBest: boolean;
}

export interface ShareRequest {
  heroName: string;
  groupName: string;
  damage: number;
  /** The run's score: the share becomes a challenge («رکوردم را بزن») with this to beat. */
  score: number;
  /** The run's best moment, appended to the share text («لحظهٔ برتر»). */
  moment?: string | null;
  /** PNG data URL of the rendered Hero Card (a backend can upload it and prepare a Telegram message). */
  cardDataUrl?: string;
}

export type ShareTicket =
  /** Telegram share sheet with a link and text (works without a backend). */
  | { kind: 'link'; url: string; text: string }
  /** Prepared inline message (Bot API savePreparedInlineMessage) for WebApp.shareMessage — needs a backend. */
  | { kind: 'preparedMessage'; id: string };

// ---------------------------------------------------------------- live group (team feel)

export interface GroupMember {
  id: string;
  name: string;
  school: School;
  /** In today's fight (members can join during a run). */
  active: boolean;
  /** Telegram profile photo; the UI draws a generated avatar until (or instead of) it. */
  photoUrl?: string;
}

/** Something a teammate did. The UI turns each into a toast (and a bar / chain effect). */
export type TeamActivity =
  | { kind: 'damage'; member: GroupMember; amount: number; crit: boolean }
  /** `rose`: the chain went up a tier (false: it was at the top and only refilled). */
  | { kind: 'chain'; member: GroupMember; tier: number; rose: boolean }
  | { kind: 'join'; member: GroupMember }
  | { kind: 'rescue'; member: GroupMember };

export interface ChainView {
  /** 0 = no chain. */
  readonly tier: number;
  readonly multiplier: number;
  /** Burn time left, 1 → 0. */
  readonly progress: number;
}

/**
 * A live view of the player's group during a run. Pull-based: the UI takes activities with
 * `next()` when it is ready to show one (calm moments only), and an activity's effect on the
 * shared state (hp, chain, members) is committed when it is taken, so what the player sees and
 * the state never disagree. A network implementation buffers incoming events behind `next()`.
 */
export interface GroupSession {
  readonly name: string;
  readonly bossName: string;
  readonly hp: number;
  readonly hpMax: number;
  readonly members: readonly GroupMember[];
  readonly chain: ChainView;
  /** Newest first (committed activities only). */
  readonly recent: readonly TeamActivity[];
  /** Activities waiting to be taken. */
  readonly pending: number;
  /** Advances the session (real ms while the run is not paused): chain burn, simulation, polling. */
  tick(ms: number): void;
  next(): TeamActivity | null;
  /** The player hurt a foe; returns the damage the group Div takes (chain applied). Keeps the chain burning. */
  addPlayerDamage(amount: number, crit: boolean): number;
  /** Teammates' damage outside the activity feed (the volley), chain applied; returns it. */
  addAllyDamage(member: GroupMember, amount: number): number;
  /** The player's Simorghi power lifts the group's chain; returns true if the tier rose. */
  raiseChain(): boolean;
  /** Someone answers the call for help (null = nobody can). Commits a 'rescue' activity. */
  requestRescue(): GroupMember | null;
  close(): void;
}

export interface GameService {
  getProfile(): Promise<PlayerProfile>;
  getGroup(): Promise<GroupInfo>;
  /** Opens the live group view for one run. */
  joinGroup(): Promise<GroupSession>;
  submitRun(result: RunResult): Promise<RunSubmitResponse>;
  prepareShare(request: ShareRequest): Promise<ShareTicket>;
  /** «دعوت هم‌رزم»: a link that brings a friend into the player's group (a backend can make it a referral). */
  prepareInvite(groupName: string): Promise<ShareTicket>;
}
