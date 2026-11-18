import { ARENA } from '../data/arena';
import type { Brazier } from '../entities/Decor';
import type { FX } from './FX';
import { LampBank, lampOnRay, type LampSpot } from './libraryRules';

/**
 * The Library of Bukhara's lamps: state (LampBank), the arrow fire zones they own, and the visual
 * feedback. A snuffed lamp smokes and keeps a dim ember; a fire arrow relights it; the lamp the aim
 * line crosses flares, so the player sees the shot that would catch fire before loosing it.
 *
 * Kept apart from the boss logic (BookWard) so either can change without the other.
 */
export class LibraryLamps {
  readonly bank: LampBank;
  private readonly spots: LampSpot[];
  private aimHintShown = false;
  /** A lamp's lit state changed: the owner rebuilds the arrow fire zones. */
  onZonesChanged: (() => void) | null = null;
  /** The first time the aim line crosses a lit lamp (discoverability). */
  onAimHint: (() => void) | null = null;

  constructor(
    private readonly lamps: readonly Brazier[],
    private readonly fx: FX,
  ) {
    this.bank = new LampBank(lamps.length);
    this.spots = lamps.map((l) => ({ x: l.x, y: l.y, r: ARENA.fireRadius }));
  }

  get count(): number {
    return this.lamps.length;
  }

  get litCount(): number {
    return this.bank.litCount;
  }

  get states(): { lit: boolean; darkLeft: number }[] {
    return this.lamps.map((_, i) => ({ lit: this.bank.isLit(i), darkLeft: this.bank.darkLeft(i) }));
  }

  /** Fire zones for the arrows: lit lamps ignite, dark ones are relight targets. */
  zones(): { x: number; y: number; r: number; lamp: number; lit: boolean }[] {
    return this.spots.map((s, i) => ({ x: s.x, y: s.y, r: s.r, lamp: i, lit: this.bank.isLit(i) }));
  }

  /** The Div's cold breath: puts one lamp out. Returns its index, or -1 if all were dark. */
  snuffNext(pick?: (n: number) => number): number {
    const i = this.bank.nextLit(pick);
    if (i < 0) return -1;
    this.bank.snuff(i);
    this.lamps[i].setLit(false);
    const s = this.spots[i];
    this.fx.ring(s.x, s.y, 0x9fd8ff, 0.5, 3, 460);
    this.fx.dustBurst(s.x, s.y - 10, 6);
    this.onZonesChanged?.();
    return i;
  }

  /** Lights a dark lamp (embers or a fire arrow). Returns true if it was dark. */
  relight(i: number): boolean {
    if (!this.bank.relight(i)) return false;
    const lamp = this.lamps[i];
    const s = this.spots[i];
    lamp.setLit(true);
    lamp.flare(620);
    this.fx.ring(s.x, s.y, 0xffb060, 0.55, 3, 480);
    this.fx.flameLick(s.x, s.y);
    this.onZonesChanged?.();
    return true;
  }

  /** A fire arrow crossed lamp `i`: relight it. */
  touch(i: number): boolean {
    return this.relight(i);
  }

  /** The aim ray: flare the first lamp it crosses, and teach the mechanic the first time. */
  aim(ox: number, oy: number, dx: number, dy: number): void {
    const i = lampOnRay(ox, oy, dx, dy, this.spots);
    if (i < 0 || !this.bank.isLit(i)) return;
    this.lamps[i].flare(180);
    if (this.aimHintShown) return;
    this.aimHintShown = true;
    this.onAimHint?.();
  }

  update(dt: number): void {
    const back = this.bank.tick(dt);
    if (!back.length) return;
    for (const i of back) {
      this.lamps[i].setLit(true);
      this.lamps[i].flare(600);
      this.fx.flameLick(this.spots[i].x, this.spots[i].y);
    }
    this.onZonesChanged?.();
  }
}
