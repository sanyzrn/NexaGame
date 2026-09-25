import type { TelegramBridge } from './TelegramBridge';

export type HapticKind = 'tick' | 'light' | 'medium' | 'heavy';

const PRIORITY: Record<HapticKind, number> = { tick: 0, light: 1, medium: 2, heavy: 3 };
const VIBRATE_MS: Record<HapticKind, number> = { tick: 4, light: 10, medium: 22, heavy: 40 };
/** Weaker pulses arriving within this window of a stronger one are dropped. */
const THROTTLE_MS = 45;

/** Telegram HapticFeedback when available, navigator.vibrate otherwise (Android browsers). */
export class Haptics {
  enabled = true;
  private lastAt = 0;
  private lastPriority = -1;

  constructor(private readonly telegram: TelegramBridge) {}

  play(kind: HapticKind): void {
    if (!this.enabled) return;
    const now = performance.now();
    const p = PRIORITY[kind];
    if (now - this.lastAt < THROTTLE_MS && p <= this.lastPriority) return;
    this.lastAt = now;
    this.lastPriority = p;

    const tg = this.telegram.haptics;
    if (tg) {
      if (kind === 'tick') tg.selectionChanged();
      else tg.impactOccurred(kind);
      return;
    }
    try {
      navigator.vibrate?.(VIBRATE_MS[kind]);
    } catch {
      /* unsupported */
    }
  }
}
