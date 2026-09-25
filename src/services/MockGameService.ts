import { faNum } from '../utils/fa';
import { storage } from '../utils/storage';
import type { GameService, GroupInfo, PlayerProfile, RunResult, RunSubmitResponse, ShareRequest, ShareTicket } from './GameService';
import type { TelegramBridge } from './TelegramBridge';

const BEST_KEY = 'darafsh.bestScore';

/** Local, backend-free implementation used by the demo. */
export class MockGameService implements GameService {
  private group: GroupInfo = {
    id: 'demo-group',
    name: 'لشکر دوستان',
    bossName: 'دیو سپید',
    bossHpMax: 200_000,
    bossHp: 110_000,
  };

  constructor(private readonly telegram: TelegramBridge) {}

  async getProfile(): Promise<PlayerProfile> {
    return { id: this.telegram.userId ?? 'guest', name: this.telegram.userFirstName ?? 'پهلوان' };
  }

  async getGroup(): Promise<GroupInfo> {
    return { ...this.group };
  }

  async submitRun(result: RunResult): Promise<RunSubmitResponse> {
    this.group = { ...this.group, bossHp: Math.max(0, this.group.bossHp - result.damage) };
    const prev = Number(storage.get(BEST_KEY) ?? 0);
    const isNewBest = result.score > prev;
    if (isNewBest) storage.set(BEST_KEY, String(result.score));
    return { group: { ...this.group }, bestScore: Math.max(prev, result.score), isNewBest };
  }

  async prepareShare(request: ShareRequest): Promise<ShareTicket> {
    const url = location.href.split('#')[0];
    const text = `من در «درفش» ${faNum(request.damage)} آسیب به دیو سپید زدم! به ${request.groupName} بپیوند.`;
    return { kind: 'link', url, text };
  }
}
