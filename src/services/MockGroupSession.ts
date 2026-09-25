import { MOCK_PACING, type School } from '../config/team';
import type { Chain } from './chain';
import type { ChainView, GroupMember, GroupSession, TeamActivity } from './GameService';

/** The group's state, shared by every run's session (the mock's stand-in for the server). */
export interface MockGroupState {
  name: string;
  bossName: string;
  hp: number;
  hpMax: number;
  members: GroupMember[];
  chain: Chain;
  recent: TeamActivity[];
}

type Pacing = typeof MOCK_PACING;

const RECENT_MAX = 12;

/**
 * Simulated teammates for one run. A small scheduler (driven by `tick`, so it stops when the game
 * pauses) queues what the teammates "do" into an inbox; the UI takes one with `next()` when it has
 * a calm moment, and that is when its effect lands on the shared state. The first few activities
 * are scripted so every run shows the feed's range early: someone joins, someone hits, someone
 * lights the chain.
 */
export class MockGroupSession implements GroupSession {
  private readonly inbox: TeamActivity[] = [];
  private waitMs: number;
  private made = 0;
  private closed = false;

  constructor(
    private readonly s: MockGroupState,
    private readonly rnd: () => number = Math.random,
    private readonly p: Pacing = MOCK_PACING,
  ) {
    this.waitMs = p.firstMs;
  }

  get name(): string {
    return this.s.name;
  }
  get bossName(): string {
    return this.s.bossName;
  }
  get hp(): number {
    return this.s.hp;
  }
  get hpMax(): number {
    return this.s.hpMax;
  }
  get members(): readonly GroupMember[] {
    return this.s.members;
  }
  get chain(): ChainView {
    return this.s.chain;
  }
  get recent(): readonly TeamActivity[] {
    return this.s.recent;
  }
  get pending(): number {
    return this.inbox.length;
  }

  tick(ms: number): void {
    if (this.closed) return;
    this.s.chain.tick(ms);
    if (this.inbox.length >= this.p.inboxMax) return;
    this.waitMs -= ms;
    if (this.waitMs > 0) return;
    const [lo, hi] = this.p.gapMs;
    this.waitMs = lo + this.rnd() * (hi - lo);
    const a = this.invent();
    if (a) this.inbox.push(a);
  }

  next(): TeamActivity | null {
    const a = this.inbox.shift();
    if (!a) return null;
    this.commit(a);
    return a;
  }

  addPlayerDamage(amount: number, crit: boolean): number {
    const dmg = Math.round(amount * this.s.chain.multiplier);
    this.s.hp = Math.max(0, this.s.hp - dmg);
    this.s.chain.extend(crit);
    return dmg;
  }

  addAllyDamage(_member: GroupMember, amount: number): number {
    const dmg = Math.round(amount * this.s.chain.multiplier);
    this.s.hp = Math.max(0, this.s.hp - dmg);
    return dmg;
  }

  raiseChain(): boolean {
    return this.s.chain.raise();
  }

  requestRescue(): GroupMember | null {
    // A Simorghi healer answers first, if one is in the fight.
    const active = this.s.members.filter((m) => m.active);
    const pool = active.length ? active : this.s.members;
    if (!pool.length) return null;
    const member = pool.find((m) => m.school === 'simorghi') ?? pool[Math.floor(this.rnd() * pool.length)];
    this.remember({ kind: 'rescue', member });
    return member;
  }

  close(): void {
    this.closed = true;
    this.inbox.length = 0;
  }

  // ---------------------------------------------------------------- simulation

  /** Applies an activity to the shared state as the UI shows it. */
  private commit(a: TeamActivity): void {
    const s = this.s;
    switch (a.kind) {
      case 'damage': {
        // The mock never kills the group Div mid-demo.
        const floor = Math.round(s.hpMax * this.p.hpFloorPct);
        const dmg = Math.round(a.amount * s.chain.multiplier);
        a.amount = Math.max(0, Math.min(dmg, s.hp - floor));
        s.hp -= a.amount;
        break;
      }
      case 'chain':
        a.rose = s.chain.raise();
        a.tier = s.chain.tier;
        break;
      case 'join':
        a.member.active = true;
        break;
      case 'rescue':
        break;
    }
    this.remember(a);
  }

  private remember(a: TeamActivity): void {
    this.s.recent.unshift(a);
    if (this.s.recent.length > RECENT_MAX) this.s.recent.length = RECENT_MAX;
  }

  private invent(): TeamActivity | null {
    const members = this.s.members;
    const active = members.filter((m) => m.active);
    const out = members.filter((m) => !m.active);
    const queuedJoins = new Set(this.inbox.filter((a) => a.kind === 'join').map((a) => a.member.id));
    const joinable = out.filter((m) => !queuedJoins.has(m.id));
    const n = this.made++;

    // Scripted opening: a join, a hit, then the chain is lit (unless it already burns).
    let kind: TeamActivity['kind'];
    if (n === 0 && joinable.length) kind = 'join';
    else if (n === 1) kind = 'damage';
    else if (n === 2 && this.s.chain.tier === 0) kind = 'chain';
    else kind = this.pickKind(joinable.length > 0);

    if (kind === 'join' && joinable.length) return { kind: 'join', member: this.pick(joinable) };
    const pool = active.length ? active : members;
    if (!pool.length) return null;
    if (kind === 'chain') {
      const lifters = pool.flatMap((m) => (m.school === 'simorghi' ? Array(1 + this.p.simorghiChainBonus).fill(m) : [m]));
      return { kind: 'chain', member: this.pick(lifters), tier: 0, rose: false };
    }
    const member = this.pick(pool);
    return this.damageBy(member);
  }

  private pickKind(canJoin: boolean): TeamActivity['kind'] {
    const w = this.p.weights;
    const total = w.damage + w.chain + (canJoin ? w.join : 0);
    let r = this.rnd() * total;
    if ((r -= w.damage) < 0) return 'damage';
    if ((r -= w.chain) < 0) return 'chain';
    return 'join';
  }

  private damageBy(member: GroupMember): TeamActivity {
    const school: School = member.school;
    const [lo, hi] = this.p.damage[school];
    const crit = this.rnd() < this.p.critChance[school];
    const base = lo + this.rnd() * (hi - lo);
    return { kind: 'damage', member, amount: Math.round((base * (crit ? this.p.critMultiplier : 1)) / 10) * 10, crit };
  }

  private pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.rnd() * list.length)];
  }
}
