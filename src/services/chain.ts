import { BALANCE } from '../config/balance';

type ChainTuning = typeof BALANCE.chain;

/**
 * زنجیرهٔ درفش as a pure state machine (no Phaser; unit tested). Tier 0 = no chain. A teammate
 * raises it one tier and refills it; the player's hits add time back; when the time runs out it
 * drops one tier, partly refilled, until it goes out.
 */
export class Chain {
  tier = 0;
  leftMs = 0;

  constructor(private readonly cfg: ChainTuning = BALANCE.chain) {}

  get maxTier(): number {
    return this.cfg.multipliers.length - 1;
  }

  get multiplier(): number {
    return this.cfg.multipliers[this.tier];
  }

  /** Full burn time of the current tier. */
  get durationMs(): number {
    return this.cfg.durationMs[this.tier];
  }

  /** 1 = just lit, 0 = about to drop. */
  get progress(): number {
    return this.tier === 0 ? 0 : Math.max(0, Math.min(1, this.leftMs / this.durationMs));
  }

  /** A teammate fans the flame: one tier up (at the top it only refills). Returns true if the tier rose. */
  raise(): boolean {
    const rose = this.tier < this.maxTier;
    if (rose) this.tier++;
    this.leftMs = this.durationMs;
    return rose;
  }

  /** The player's hit keeps it burning. */
  extend(crit: boolean): void {
    if (this.tier === 0) return;
    this.leftMs = Math.min(this.durationMs, this.leftMs + (crit ? this.cfg.critExtendMs : this.cfg.hitExtendMs));
  }

  /** Advances the burn; returns true when the tier dropped this tick. */
  tick(ms: number): boolean {
    if (this.tier === 0) return false;
    this.leftMs -= ms;
    if (this.leftMs > 0) return false;
    this.tier--;
    this.leftMs = this.tier > 0 ? this.durationMs * this.cfg.dropRefill : 0;
    return true;
  }
}
