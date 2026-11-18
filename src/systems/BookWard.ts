import type { Boss } from '../entities/Boss';
import type { FX } from './FX';
import type { LibraryLamps } from './LibraryLamps';
import { SnuffClock } from './libraryRules';

export interface WardHud {
  showToast(title: string, sub?: string, variant?: string): void;
}

/**
 * The Book-Burning Div's side of the Library of Bukhara.
 *
 * He breathes cold on a cadence and puts a lamp out; a fire arrow that reaches him burns the charred
 * parchment off his ink heart, which is the only way through the armour he starts the fight with.
 * Each hint is shown once, at the moment it matters (aim through a lamp, first snuff, first weak
 * point, first relight) rather than in a wall of text before the fight.
 */
export class BookWard {
  private readonly snuff = new SnuffClock();
  private readonly shown = new Set<'aim' | 'armour' | 'snuff' | 'heart' | 'relight'>();
  /** Keeps hints from stacking on top of each other in the HUD. */
  private quietMs = 0;

  constructor(
    private readonly deps: {
      lamps: LibraryLamps;
      boss: Boss;
      fx: FX;
      hud: WardHud;
      onZonesChanged: () => void;
    },
  ) {
    deps.lamps.onZonesChanged = deps.onZonesChanged;
    deps.lamps.onAimHint = () => this.hint('aim', 'تیر آتش می‌گیرد', 'از شعلهٔ چراغ رد شو، بعد به دیو بزن');
  }

  get weakOpen(): boolean {
    return this.deps.boss.weakOpen;
  }

  get lampStates(): { lit: boolean; darkLeft: number }[] {
    return this.deps.lamps.states;
  }

  /** A fire arrow hit the Div: the ink heart opens for a few seconds. */
  ignite(): void {
    const boss = this.deps.boss;
    if (!boss.brain.fighting) return;
    boss.exposeWeak();
    const gem = boss.gemPoint({ x: 0, y: 0 });
    this.deps.fx.ring(gem.x, gem.y, 0xffb060, 0.7, 4, 540);
    this.deps.fx.flameLick(gem.x, gem.y);
    this.deps.fx.sparkleAt(gem.x, gem.y, 46);
    this.hint('heart', 'قلب جوهری نمایان شد', 'همین حالا به آن بزن!');
  }

  /** The aim line crossed a lamp: flare it (the pre-shot affordance). */
  aimThrough(ox: number, oy: number, dx: number, dy: number): void {
    this.deps.lamps.aim(ox, oy, dx, dy);
  }

  /** A fire arrow crossed lamp `i`. */
  touchLamp(i: number): void {
    if (this.deps.lamps.touch(i)) this.hint('relight', 'چراغ دوباره روشن شد', 'آتش را به چراغ‌های خاموش برسان');
  }

  /** The player's arrows bounce off the armour: point at the lamps instead. */
  armourTip(): void {
    this.hint('armour', 'قلب دیو بسته است', 'تیر آتشین به او بزن تا قلبش باز شود');
  }

  /** QA / test hook: snuff one lamp right now. */
  debugSnuff(): number {
    return this.deps.lamps.snuffNext();
  }

  update(dt: number): void {
    this.deps.lamps.update(dt);
    if (this.quietMs > 0) this.quietMs -= dt;
    const boss = this.deps.boss;
    // His cold breath only matters while he is up behind his armour.
    const armed = boss.brain.fighting && boss.brain.armored;
    if (!this.snuff.tick(dt, armed) || this.deps.lamps.litCount === 0) return;
    if (this.deps.lamps.snuffNext() >= 0) {
      this.hint('snuff', 'نفس سرد دیو', 'چراغ خاموش شد — از چراغ دیگر رد شو یا روشنش کن');
    }
  }

  private hint(kind: 'aim' | 'armour' | 'snuff' | 'heart' | 'relight', title: string, sub: string): void {
    if (this.shown.has(kind) || this.quietMs > 0) return;
    this.shown.add(kind);
    this.quietMs = 2800;
    this.deps.hud.showToast(title, sub);
  }
}
