import { BALANCE } from '../config/balance';

/**
 * Hidden → Intro → Phase1 → Armor → Stunned ↔ Armor → Finisher → Dead
 * (after a finisher released too early: Finisher → Armor, and Finisher again after a while).
 */
export type BossState = 'hidden' | 'intro' | 'phase1' | 'armor' | 'stunned' | 'finisher' | 'dead';

export type BossEvent = 'armor' | 'stun' | 'recover' | 'lowHp' | 'summon' | 'boulder' | 'finisher' | 'dead';

export interface BossHit {
  damage: number;
  crit: boolean;
  /** The arrow went through the chest gem. */
  gem: boolean;
}

export interface BossHitResult {
  /** Damage actually taken (0 when blocked or not hittable). */
  damage: number;
  blocked: boolean;
}

type BossTuning = Omit<typeof BALANCE.boss, 'hp'> & { hp: number };

export interface FinisherTuning {
  triggerPct: number;
  earlyHpPct: number;
  retryMs: number;
}

/**
 * The White Div's fight logic, as a pure state machine (no Phaser; unit tested). The Boss entity
 * animates whatever this decides. Events are queued in `events` and drained by the owner each frame.
 */
export class BossBrain {
  state: BossState = 'hidden';
  readonly maxHp: number;
  hp: number;
  lowHp = false;
  stunLeft = 0;
  summonLeft: number;
  /** >0 after an early finisher release: counts down to offering it again. */
  retryLeft = 0;
  readonly events: BossEvent[] = [];
  /** Index into cfg.boulders.at (scripted barrages by hp threshold). */
  private boulderIdx = 0;
  /** Time to the next repeating barrage (armour / ash fury). */
  private boulderLeft = 0;

  constructor(private readonly cfg: BossTuning = BALANCE.boss, private readonly fin: FinisherTuning) {
    this.maxHp = this.hp = cfg.hp;
    this.summonLeft = cfg.summon.firstMs;
  }

  get hpPct(): number {
    return this.hp / this.maxHp;
  }

  /** Arrows can hurt him (or at least hit him) in these states. */
  get fighting(): boolean {
    return this.state === 'phase1' || this.state === 'armor' || this.state === 'stunned';
  }

  /** The barrier is up. */
  get armored(): boolean {
    return this.state === 'armor';
  }

  /** خشم خاکستری: latched under lowHpPct — hotter, faster, meaner. */
  get fury(): boolean {
    return this.lowHp;
  }

  startIntro(): void {
    if (this.state === 'hidden') this.state = 'intro';
  }

  introDone(): void {
    if (this.state === 'intro') this.state = 'phase1';
  }

  hit(h: BossHit): BossHitResult {
    if (!this.fighting) return { damage: 0, blocked: true };
    const c = this.cfg;
    let damage = h.damage * (h.gem ? c.gemMultiplier : 1);
    if (this.state === 'armor') {
      // Only golden arrows get through the barrier; a golden arrow into the gem stuns him.
      if (!h.crit) return { damage: 0, blocked: true };
      if (h.gem) {
        this.state = 'stunned';
        this.stunLeft = c.stunMs;
        this.events.push('stun');
      }
    } else if (this.state === 'stunned') {
      damage *= c.stunDamageMultiplier;
    }
    damage = Math.round(damage);
    this.applyDamage(damage);
    return { damage, blocked: false };
  }

  /**
   * The Rostami power's quake reaches him: an armoured Div's barrier shatters and he is stunned,
   * exactly as by a golden arrow through the gem. Returns true if it broke the barrier.
   */
  quake(): boolean {
    if (this.state !== 'armor') return false;
    this.state = 'stunned';
    this.stunLeft = this.cfg.stunMs;
    this.events.push('stun');
    return true;
  }

  tick(dt: number): void {
    if (this.state === 'stunned') {
      this.stunLeft -= dt;
      if (this.stunLeft <= 0) {
        this.state = 'armor';
        this.events.push('recover');
      }
    }
    if (this.state === 'phase1' || this.state === 'armor') {
      this.summonLeft -= dt;
      if (this.summonLeft <= 0) {
        this.summonLeft = this.state === 'phase1' ? this.cfg.summon.phase1EveryMs : this.cfg.summon.armorEveryMs;
        if (this.fury) this.summonLeft *= this.cfg.fury.summonEveryMul;
        this.events.push('summon');
      }
      // سنگ‌باران: while armoured or in ash fury, a repeating barrage (never while stunned).
      this.boulderLeft -= dt;
      if (this.boulderLeft <= 0) {
        this.boulderLeft = this.fury ? this.cfg.boulders.furyEveryMs : this.cfg.boulders.armorEveryMs;
        this.events.push('boulder');
      }
    }
    if (this.retryLeft > 0 && this.fighting) {
      this.retryLeft -= dt;
      if (this.retryLeft <= 0) this.enterFinisher();
    }
  }

  /** The team finisher landed: `full` = every segment was lit. */
  finisherResult(full: boolean): void {
    if (this.state !== 'finisher') return;
    if (full) {
      this.hp = 0;
      this.state = 'dead';
      this.events.push('dead');
      return;
    }
    this.hp = Math.max(1, Math.round(this.maxHp * this.fin.earlyHpPct));
    this.state = 'armor';
    this.retryLeft = this.fin.retryMs;
    this.events.push('armor');
  }

  private applyDamage(damage: number): void {
    const before = this.hp;
    const floor = this.retryLeft > 0 ? 1 : Math.round(this.maxHp * this.fin.triggerPct);
    this.hp = Math.max(floor, this.hp - damage);
    // Scripted boulder barrages at hp thresholds (each fires once, high → low).
    const at = this.cfg.boulders.at;
    while (this.boulderIdx < at.length && this.hpPct <= at[this.boulderIdx]) {
      this.boulderIdx++;
      this.events.push('boulder');
    }
    if (!this.lowHp && this.hpPct <= this.cfg.lowHpPct) {
      this.lowHp = true;
      this.events.push('lowHp');
    }
    if (this.retryLeft <= 0 && this.hp <= floor && before > floor) {
      this.enterFinisher();
      return;
    }
    if (this.state === 'phase1' && this.hpPct <= this.cfg.armorAtPct) {
      this.state = 'armor';
      this.boulderLeft = this.cfg.boulders.armorEveryMs;
      this.events.push('armor');
    }
    // خشم خاکستری: once fury latches, the next barrage never waits longer than the fury cadence
    // (checked last so a same-hit armor transition can't overwrite it).
    if (this.lowHp) this.boulderLeft = Math.min(this.boulderLeft, this.cfg.boulders.furyEveryMs);
  }

  private enterFinisher(): void {
    this.retryLeft = 0;
    this.stunLeft = 0;
    this.hp = Math.min(this.hp, Math.round(this.maxHp * this.fin.triggerPct));
    this.state = 'finisher';
    this.events.push('finisher');
  }
}
