/**
 * Thin wrapper over the Telegram WebApp SDK (public/vendor/telegram-web-app.js).
 * Every call is feature-checked, so the game runs the same in a normal browser.
 */

type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

interface TgHapticFeedback {
  impactOccurred(style: ImpactStyle): void;
  notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  selectionChanged(): void;
}

interface TgWebApp {
  initData: string;
  initDataUnsafe: { user?: { id?: number; first_name?: string; last_name?: string; username?: string } };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string | undefined>;
  isVersionAtLeast(version: string): boolean;
  ready(): void;
  expand(): void;
  disableVerticalSwipes?(): void;
  lockOrientation?(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor?(color: string): void;
  openTelegramLink(url: string): void;
  /** Bot API 8.0: shares a message prepared with savePreparedInlineMessage. */
  shareMessage?(id: string, cb?: (sent: boolean) => void): void;
  onEvent(event: string, cb: () => void): void;
  offEvent(event: string, cb: () => void): void;
  HapticFeedback?: TgHapticFeedback;
  /** Bot API 8.0: device safe area (notch, home bar), and Telegram's own controls inside it (fullscreen). */
  safeAreaInset?: Insets;
  contentSafeAreaInset?: Insets;
}

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type TgEvent =
  | 'viewportChanged' | 'activated' | 'deactivated' | 'themeChanged'
  | 'safeAreaChanged' | 'contentSafeAreaChanged' | 'fullscreenChanged';

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export class TelegramBridge {
  readonly webApp: TgWebApp | null;
  /** True only inside a real Telegram client (the SDK object also exists in normal browsers). */
  readonly isTelegram: boolean;

  constructor() {
    const wa = window.Telegram?.WebApp ?? null;
    this.webApp = wa;
    this.isTelegram = !!wa && wa.platform !== 'unknown' && wa.initData !== '';
  }

  init(frameColor: string): void {
    const wa = this.webApp;
    if (!wa || !this.isTelegram) return;
    wa.ready();
    wa.expand();
    // Dragging to aim must never swipe the Mini App closed.
    if (wa.isVersionAtLeast('7.7')) wa.disableVerticalSwipes?.();
    if (wa.isVersionAtLeast('8.0')) wa.lockOrientation?.();
    if (wa.isVersionAtLeast('6.9')) wa.setHeaderColor(frameColor);
    if (wa.isVersionAtLeast('6.1')) wa.setBackgroundColor(frameColor);
    if (wa.isVersionAtLeast('7.10')) wa.setBottomBarColor?.(frameColor);
  }

  get platform(): string {
    return this.isTelegram ? this.webApp!.platform : 'browser';
  }

  get version(): string {
    return this.webApp?.version ?? '-';
  }

  get userFirstName(): string | null {
    return (this.isTelegram && this.webApp!.initDataUnsafe.user?.first_name) || null;
  }

  get userId(): string | null {
    const id = this.isTelegram ? this.webApp!.initDataUnsafe.user?.id : undefined;
    return id !== undefined ? String(id) : null;
  }

  /** Telegram theme params (bg_color, button_color, …), empty outside Telegram. */
  get theme(): Record<string, string | undefined> {
    return this.isTelegram ? this.webApp!.themeParams : {};
  }

  get haptics(): TgHapticFeedback | null {
    const wa = this.webApp;
    return this.isTelegram && wa && wa.isVersionAtLeast('6.1') && wa.HapticFeedback ? wa.HapticFeedback : null;
  }

  /** Subscribes to a WebApp event; returns an unsubscribe function. No-op outside Telegram. */
  /** Telegram's safe area plus its content safe area (css px), zeros outside Telegram or before 8.0. */
  get safeInsets(): Insets {
    const wa = this.webApp;
    const out = { top: 0, bottom: 0, left: 0, right: 0 };
    if (!wa || !this.isTelegram) return out;
    for (const inset of [wa.safeAreaInset, wa.contentSafeAreaInset]) {
      if (!inset) continue;
      out.top += inset.top || 0;
      out.bottom += inset.bottom || 0;
      out.left += inset.left || 0;
      out.right += inset.right || 0;
    }
    return out;
  }

  on(event: TgEvent, cb: () => void): () => void {
    const wa = this.webApp;
    if (!wa || !this.isTelegram) return () => {};
    wa.onEvent(event, cb);
    return () => wa.offEvent(event, cb);
  }

  /** Shares a prepared inline message (needs a backend and Bot API 8.0). */
  shareMessage(id: string): boolean {
    const wa = this.webApp;
    if (!wa || !this.isTelegram || !wa.isVersionAtLeast('8.0') || !wa.shareMessage) return false;
    wa.shareMessage(id);
    return true;
  }

  /** Opens Telegram's share sheet with a link + text (the only share path without a backend). */
  shareLink(url: string, text: string): boolean {
    if (!this.isTelegram) return false;
    const link = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    this.webApp!.openTelegramLink(link);
    return true;
  }
}
