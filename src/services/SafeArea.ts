import { Signal } from '../utils/Signal';
import type { Insets, TelegramBridge } from './TelegramBridge';

/**
 * Where the screen is unsafe for HUD: phone notches and home bars (CSS env(safe-area-inset-*)),
 * plus Telegram's own header controls in fullscreen (contentSafeAreaInset). Values are CSS px of
 * the page; `designInsets` converts them to the part that actually overlaps the letterboxed canvas.
 */
export class SafeArea {
  readonly onChange = new Signal<void>();
  readonly css: Insets = { top: 0, bottom: 0, left: 0, right: 0 };
  private probe: HTMLDivElement | null = null;

  constructor(private readonly telegram: TelegramBridge) {}

  /** Starts measuring (after the DOM exists). */
  init(): void {
    const p = document.createElement('div');
    p.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(p);
    this.probe = p;
    const update = () => this.measure();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    for (const ev of ['safeAreaChanged', 'contentSafeAreaChanged', 'fullscreenChanged', 'viewportChanged'] as const) {
      this.telegram.on(ev, update);
    }
    this.measure();
  }

  measure(): void {
    let env = { top: 0, bottom: 0, left: 0, right: 0 };
    if (this.probe) {
      const cs = getComputedStyle(this.probe);
      env = {
        top: parseFloat(cs.paddingTop) || 0,
        bottom: parseFloat(cs.paddingBottom) || 0,
        left: parseFloat(cs.paddingLeft) || 0,
        right: parseFloat(cs.paddingRight) || 0,
      };
    }
    const tg = this.telegram.safeInsets;
    // `?safetop=60` simulates a notch (CSS px) for testing on desktop.
    const sim = Number(new URLSearchParams(location.search).get('safetop')) || 0;
    const next: Insets = {
      top: Math.max(env.top, tg.top, sim),
      bottom: Math.max(env.bottom, tg.bottom),
      left: Math.max(env.left, tg.left),
      right: Math.max(env.right, tg.right),
    };
    const c = this.css;
    if (next.top === c.top && next.bottom === c.bottom && next.left === c.left && next.right === c.right) return;
    Object.assign(c, next);
    this.onChange.emit();
  }

  /**
   * The unsafe band at each edge in design px, for a canvas shown at `bounds` (CSS px, e.g.
   * `scene.scale.canvasBounds`) with design size `w`×`h`. Zero where the letterbox already covers it.
   */
  designInsets(bounds: { left: number; top: number; width: number; height: number }, w: number, h: number): Insets {
    const sx = bounds.width / w || 1;
    const sy = bounds.height / h || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      top: Math.max(0, this.css.top - bounds.top) / sy,
      bottom: Math.max(0, this.css.bottom - (vh - bounds.top - bounds.height)) / sy,
      left: Math.max(0, this.css.left - bounds.left) / sx,
      right: Math.max(0, this.css.right - (vw - bounds.left - bounds.width)) / sx,
    };
  }
}
