import { FEEL } from '../config/feel';
import { Signal } from '../utils/Signal';
import { storage } from '../utils/storage';

const REDUCED_KEY = 'darafsh.reducedEffects';
const TUTORIAL_KEY = 'darafsh.tutorialDone';
const INTRO_KEY = 'darafsh.bossIntroSeen';

/** Player settings persisted in localStorage. */
export class Settings {
  readonly onReducedChange = new Signal<boolean>();
  private _reduced = storage.get(REDUCED_KEY) === '1';

  /** Weak-phone mode: half the particles, no light shafts. */
  get reducedEffects(): boolean {
    return this._reduced;
  }

  setReducedEffects(on: boolean): void {
    if (on === this._reduced) return;
    this._reduced = on;
    storage.set(REDUCED_KEY, on ? '1' : '0');
    this.onReducedChange.emit(on);
  }

  /** A full-quality particle count, scaled for the current quality (never below 1 if it was ≥ 1). */
  count(n: number): number {
    if (!this._reduced || n <= 0) return n;
    return Math.max(1, Math.round(n * FEEL.quality.reducedParticleScale));
  }

  get tutorialDone(): boolean {
    return storage.get(TUTORIAL_KEY) === '1';
  }

  markTutorialDone(): void {
    storage.set(TUTORIAL_KEY, '1');
  }

  /** The boss intro has played once: from now on a tap skips it. */
  get bossIntroSeen(): boolean {
    return storage.get(INTRO_KEY) === '1';
  }

  markBossIntroSeen(): void {
    storage.set(INTRO_KEY, '1');
  }
}
