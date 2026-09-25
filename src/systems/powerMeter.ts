import { BALANCE } from '../config/balance';

type PowerTuning = typeof BALANCE.power;
export type PowerGain = 'golden' | 'kill' | 'trickShot';

/**
 * The school power's meter (pure; unit tested). It fills mostly from golden hits, so the power is
 * earned by the core skill; kills, combo milestones and trick shots top it up. Full = ready.
 */
export class PowerMeter {
  value = 0;

  constructor(private readonly cfg: PowerTuning = BALANCE.power) {}

  get full(): boolean {
    return this.value >= 1;
  }

  /** Returns how much was actually added (0 when already full). */
  add(kind: PowerGain): number {
    return this.raise(this.cfg.gain[kind]);
  }

  /** Called with the new combo count: every `comboEvery` hits adds a little. */
  combo(n: number): number {
    return n > 0 && n % this.cfg.comboEvery === 0 ? this.raise(this.cfg.gain.comboStep) : 0;
  }

  /** A blessing (the Homa, the golden imp): straight to full. */
  fill(): void {
    this.value = 1;
  }

  /** Uses the power: true (and empties) only when full. */
  spend(): boolean {
    if (!this.full) return false;
    this.value = 0;
    return true;
  }

  private raise(v: number): number {
    const before = this.value;
    this.value = Math.min(1, this.value + v);
    return this.value - before;
  }
}
