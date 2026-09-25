/**
 * Backend contract. The demo uses MockGameService; a Cloudflare Workers implementation
 * can replace it later without touching gameplay code.
 */

export interface PlayerProfile {
  id: string;
  name: string;
}

export interface GroupInfo {
  id: string;
  name: string;
  bossName: string;
  bossHpMax: number;
  bossHp: number;
}

export interface RunResult {
  score: number;
  bestCombo: number;
  crits: number;
  damage: number;
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
  /** PNG data URL of the rendered Hero Card (a backend can upload it and prepare a Telegram message). */
  cardDataUrl?: string;
}

export type ShareTicket =
  /** Telegram share sheet with a link and text (works without a backend). */
  | { kind: 'link'; url: string; text: string }
  /** Prepared inline message (Bot API savePreparedInlineMessage) for WebApp.shareMessage — needs a backend. */
  | { kind: 'preparedMessage'; id: string };

export interface GameService {
  getProfile(): Promise<PlayerProfile>;
  getGroup(): Promise<GroupInfo>;
  submitRun(result: RunResult): Promise<RunSubmitResponse>;
  prepareShare(request: ShareRequest): Promise<ShareTicket>;
}
