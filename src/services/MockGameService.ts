import { MOCK_GROUP, type School } from '../config/team';
import { faNum } from '../utils/fa';
import { appLink, encodeStartParam } from './links';
import type { TeamApi, TeamView } from './TeamApi';
import { storage } from '../utils/storage';
import { Chain } from './chain';
import type {
  GameService, GroupInfo, GroupSession, PlayerProfile, RunResult, RunSubmitResponse, ShareRequest, ShareTicket,
} from './GameService';
import { MockGroupSession, type MockGroupState } from './MockGroupSession';
import type { TelegramBridge } from './TelegramBridge';

const BEST_KEY = 'darafsh.bestScore';
/** How many real teammates are in the fight from the first second (the rest "join" during it). */
const REAL_ACTIVE = 4;
const SCHOOL_ORDER: readonly School[] = ['rostami', 'arashi', 'simorghi'];

/** A stable school per teammate, so the same friend keeps the same colour and powers. */
function schoolFor(id: string): School {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) % 9973;
  return SCHOOL_ORDER[hash % SCHOOL_ORDER.length];
}

/** Local, backend-free implementation used by the demo. The group (config/team.ts) is simulated. */
export class MockGameService implements GameService {
  /** Lives across runs, like the server's group would. */
  private readonly group: MockGroupState = {
    name: MOCK_GROUP.name,
    bossName: MOCK_GROUP.bossName,
    hp: MOCK_GROUP.bossHp,
    hpMax: MOCK_GROUP.bossHpMax,
    members: [],
    chain: new Chain(),
    recent: [],
  };

  /** True while `group.members` is the player's real Telegram team rather than the demo line-up. */
  private realRoster = false;

  constructor(
    private readonly telegram: TelegramBridge,
    /** Real teams through game-auth; absent in a pure browser build. */
    private readonly team?: TeamApi,
  ) {}

  /** The signed-in player's team, or null (demo build, no team, or the backend is unreachable). */
  private async realTeam(): Promise<TeamView | null> {
    if (!this.team) return null;
    await this.team.ready();
    return this.team.team;
  }

  async getProfile(): Promise<PlayerProfile> {
    const bestScore = Number(storage.get(BEST_KEY) ?? 0) || 0;
    return { id: this.telegram.userId ?? 'guest', name: this.telegram.userFirstName ?? 'پهلوان', bestScore };
  }

  /**
   * The group shown on the title and used during a run: the player's real Telegram team when they
   * have one, otherwise the demo line-up. Boss HP and damage stay simulated (real-time combat is a
   * later task); only the roster and its names are real.
   */
  async getGroup(): Promise<GroupInfo> {
    const team = await this.realTeam();
    const g = this.group;
    if (team) {
      this.realRoster = true;
      g.name = team.name;
      g.members = team.members.map((m, i) => ({
        id: m.id,
        name: m.name,
        school: schoolFor(m.id),
        active: i < REAL_ACTIVE,
      }));
    } else if (this.realRoster) {
      // Signed in without a team (or back in the demo): never leave a stale real roster behind.
      this.realRoster = false;
      g.name = MOCK_GROUP.name;
      g.members = MOCK_GROUP.members.map((m) => ({ ...m }));
    }
    const members = (g.members.length ? g.members : MOCK_GROUP.members).map((m) => ({ ...m }));
    return {
      id: team ? team.id : MOCK_GROUP.id,
      name: g.name,
      bossName: g.bossName,
      bossHpMax: g.hpMax,
      bossHp: g.hp,
      members,
    };
  }

  async joinGroup(): Promise<GroupSession> {
    // Syncs the roster (real team or demo line-up) before the run's simulated session starts.
    await this.getGroup();
    return new MockGroupSession(this.group);
  }

  async submitRun(result: RunResult): Promise<RunSubmitResponse> {
    // The run's damage already reached the group Div live (GroupSession.addPlayerDamage).
    const prev = Number(storage.get(BEST_KEY) ?? 0);
    const isNewBest = result.score > prev;
    if (isNewBest) storage.set(BEST_KEY, String(result.score));
    return { group: await this.getGroup(), bestScore: Math.max(prev, result.score), isNewBest };
  }

  async prepareShare(request: ShareRequest): Promise<ShareTicket> {
    const moment = request.moment ? ` «${request.moment}»` : '';
    const text = `${request.heroName} در «درفش» ${faNum(request.score)} امتیاز گرفت و ${faNum(request.damage)} آسیب به دیو سپید زد!${moment} ⚔️ رکوردش را می‌زنی؟`;
    const param = encodeStartParam({ kind: 'challenge', score: request.score, name: request.heroName });
    return { kind: 'link', url: appLink(param), text };
  }

  async prepareInvite(groupName: string): Promise<ShareTicket> {
    const from = this.telegram.userFirstName ?? 'یک هم‌رزم';
    // The inviter's name is in the message itself as well as in the start parameter, so the
    // receiver knows who called them in before even opening the game.
    const text = `${from} تو را به لشکر «${groupName}» در «درفش» فراخواند. بیا با هم دیو سپید را شکست بدهیم 🏹`;
    return { kind: 'link', url: appLink(encodeStartParam({ kind: 'invite', from })), text };
  }
}
