import { MOCK_GROUP } from '../config/team';
import { faNum } from '../utils/fa';
import { storage } from '../utils/storage';
import { Chain } from './chain';
import type {
  GameService, GroupInfo, GroupSession, PlayerProfile, RunResult, RunSubmitResponse, ShareRequest, ShareTicket,
} from './GameService';
import { MockGroupSession, type MockGroupState } from './MockGroupSession';
import type { TelegramBridge } from './TelegramBridge';

const BEST_KEY = 'darafsh.bestScore';

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

  constructor(private readonly telegram: TelegramBridge) {}

  async getProfile(): Promise<PlayerProfile> {
    const bestScore = Number(storage.get(BEST_KEY) ?? 0) || 0;
    return { id: this.telegram.userId ?? 'guest', name: this.telegram.userFirstName ?? 'پهلوان', bestScore };
  }

  async getGroup(): Promise<GroupInfo> {
    const g = this.group;
    const members = (g.members.length ? g.members : MOCK_GROUP.members).map((m) => ({ ...m }));
    return { id: MOCK_GROUP.id, name: g.name, bossName: g.bossName, bossHpMax: g.hpMax, bossHp: g.hp, members };
  }

  async joinGroup(): Promise<GroupSession> {
    // Every run starts with the configured line-up: some members in the fight, the rest joining.
    this.group.members = MOCK_GROUP.members.map((m) => ({ ...m }));
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
    const text = `${request.heroName} در «درفش» ${faNum(request.damage)} آسیب به دیو سپید زد! ⚔️ به «${request.groupName}» بپیوند.`;
    return { kind: 'link', url: this.appUrl(), text };
  }

  async prepareInvite(groupName: string): Promise<ShareTicket> {
    const text = `هم‌رزم! «${groupName}» در «درفش» با دیو سپید می‌جنگد. بیا با هم شکستش بدهیم 🏹`;
    return { kind: 'link', url: this.appUrl(), text };
  }

  /** The Mini App's own link (Telegram's share sheet needs an https URL; outside Telegram, this page). */
  private appUrl(): string {
    return location.href.split('#')[0].split('?')[0];
  }
}
