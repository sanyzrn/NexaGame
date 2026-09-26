import type Phaser from 'phaser';
import { FEEL } from '../config/feel';
import type { Settings } from '../services/Settings';
import { Signal } from '../utils/Signal';

export interface AutoReduceConfig {
  enabled: boolean;
  /** Under this many frames per second… */
  minFps: number;
  /** …for this long, continuously → switch to light effects automatically. */
  sustainMs: number;
  /** How often the smoothed FPS value is fed to the budget. */
  sampleMs: number;
}

/**
 * Pure decision core for the auto quality switch (unit-tested): fires once, and never again once
 * the player has set the effects themselves — the auto mode must not fight the player's choice.
 */
export class PerfBudget {
  private belowMs = 0;
  private fired = false;
  private playerOverrode = false;

  constructor(private readonly cfg: AutoReduceConfig) {}

  /** One FPS sample (measured over `dtMs`); true when the auto switch should happen now. */
  sample(fps: number, dtMs: number): boolean {
    if (!this.cfg.enabled || this.fired || this.playerOverrode) return false;
    if (fps >= this.cfg.minFps) {
      this.belowMs = 0;
      return false;
    }
    this.belowMs += dtMs;
    if (this.belowMs < this.cfg.sustainMs) return false;
    this.fired = true;
    return true;
  }

  /** Any manual change to the effects toggle: the auto switch stands down for the session. */
  manualSet(): void {
    this.playerOverrode = true;
  }

  get isFired(): boolean {
    return this.fired;
  }
}

/**
 * Watches the real frame rate and, on a weak phone, switches to light effects by itself
 * (M6: FPS under `minFps` for 3 seconds → light effects + a tiny toast). The player can always
 * turn full effects back on in the pause menu; from then on the auto switch stays out of the way.
 */
export class Perf {
  /** Master switch (`?perf=0` disables — used by the QA harness to profile full effects). */
  enabled = true;
  /** Fired together with the automatic switch; the Game scene turns it into a HUD toast. */
  readonly onAutoReduce = new Signal<void>();
  private budget = new PerfBudget(FEEL.quality.autoReduce);
  private accMs = 0;
  private attached = false;

  constructor(private readonly settings: Settings) {
    // The player's own toggle always wins — now and for the rest of the session.
    this.settings.onReducedChange.add(({ source }) => {
      if (source === 'manual') this.budget.manualSet();
    });
  }

  /** Reads the smoothed FPS from the game loop; no allocations, runs once per frame. */
  attach(game: Phaser.Game): void {
    if (this.attached) return;
    this.attached = true;
    // 'poststep' = Phaser.Core.Events.POST_STEP (literal keeps this module free of a Phaser
    // runtime import, so the decision core stays unit-testable in Node).
    game.events.on('poststep', (_time: number, delta: number) => {
      if (!this.enabled) return;
      this.accMs += delta;
      if (this.accMs < FEEL.quality.autoReduce.sampleMs) return;
      const fps = game.loop.actualFps;
      const dt = this.accMs;
      this.accMs = 0;
      if (this.budget.sample(fps, dt) && !this.settings.reducedEffects) {
        this.settings.setReducedEffects(true, 'auto');
        this.onAutoReduce.emit();
      }
    });
  }
}
