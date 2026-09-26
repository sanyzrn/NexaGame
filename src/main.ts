import './styles.css';
import Phaser from 'phaser';
import { COLORS, DESIGN_H, DESIGN_W } from './config/display';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { CardScene } from './scenes/CardScene';
import { PauseScene } from './scenes/PauseScene';
import { PreloadScene } from './scenes/PreloadScene';
import { ResultScene } from './scenes/ResultScene';
import { TitleScene } from './scenes/TitleScene';
import { services } from './services';

/** Lossy+alpha WebP probe (decoding, not encoding — Safari can decode but not encode WebP). */
function detectWebp(): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = 'data:image/webp;base64,UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==';
  });
}

async function loadFonts(): Promise<void> {
  if (!document.fonts) return;
  const timeout = new Promise<void>((r) => setTimeout(r, 3000));
  await Promise.race([
    Promise.all([document.fonts.load('400 40px Vazirmatn', 'پهلوان'), document.fonts.load('900 40px Vazirmatn', 'پهلوان')]),
    timeout,
  ]).catch(() => undefined);
  // Not awaited: only the boss fight's big titles use it, minutes later.
  void document.fonts.load('700 40px Nastaliq', 'تیر آرش').catch(() => undefined);
}

/** The branded pre-boot splash (index.html) leaves once the Phaser canvas has its first frame. */
function dismissSplash(): void {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.classList.add('splash-out');
  setTimeout(() => splash.remove(), 450);
}

/**
 * M6: the graceful error screen. Anything fatal during boot (a failed bundle, a boot exception)
 * shows a Persian panel with a retry button instead of a black screen. Past boot (the game's
 * READY event), errors are logged and the session stays alive.
 */
function wireBootErrorHandling(): void {
  const booted = () => (window as unknown as { __darafshBooted?: boolean }).__darafshBooted === true;
  const show = () => {
    if (booted()) return;
    document.getElementById('splash')?.classList.add('splash-hidden');
    document.getElementById('error-screen')?.classList.add('error-visible');
  };
  // Real script/JS failures: element-level resource errors don't reach the window handler, and
  // the asset pipeline replaces anything missing with placeholders, so only JS errors are fatal.
  window.addEventListener('error', show);
  window.addEventListener('unhandledrejection', show);
}

async function start(): Promise<void> {
  services.telegram.init(COLORS.letterboxCss);
  services.safeArea.init();
  wireBootErrorHandling();
  const [webp] = await Promise.all([detectWebp(), loadFonts()]);
  services.caps.webp = webp;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: DESIGN_W,
    height: DESIGN_H,
    backgroundColor: COLORS.letterboxCss,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    render: { antialias: true, powerPreference: 'high-performance' },
    disableContextMenu: true,
    banner: false,
    scene: [BootScene, PreloadScene, GameScene, HudScene, TitleScene, ResultScene, CardScene, PauseScene],
  });
  // The canvas's first frame replaces the DOM splash; from here the game owns the screen.
  game.events.once(Phaser.Core.Events.READY, () => {
    (window as unknown as { __darafshBooted?: boolean }).__darafshBooted = true;
    dismissSplash();
  });
  // M6: watch the real frame rate — light effects by themselves on a weak phone.
  services.perf.attach(game);

  services.telegram.on('viewportChanged', () => game.scale.refresh());
  services.safeArea.onChange.add(() => game.scale.refresh());
  // Telegram flips its day/night theme: keep our own frame colours asserted on top.
  services.telegram.on('themeChanged', () => services.telegram.onThemeChange());
  // Automation handle: dev builds always, production with ?qa=1 (see QA.md — used by the smoke
  // harness to drive a full run and read scene state; harmless otherwise). ?perf=0 keeps the
  // auto light-effects switch off (profiling full effects on a slow test renderer).
  const params = new URLSearchParams(window.location.search);
  if (import.meta.env.DEV || params.has('qa')) {
    (window as unknown as { __game: Phaser.Game }).__game = game;
    (window as unknown as { __svc: typeof services }).__svc = services;
  }
  if (params.get('perf') === '0') services.perf.enabled = false;

  // iOS/autoplay: the very first gesture anywhere unlocks the (procedural) audio context.
  const unlock = () => services.audio.unlock();
  window.addEventListener('pointerdown', unlock, { passive: true, capture: true });
  window.addEventListener('touchstart', unlock, { passive: true, capture: true });

  // M6: leaving or minimising mid-run pauses the run (the pause menu freezes the world) and the
  // audio context; returning leaves the pause menu open — the player resumes when ready.
  const pauseIfRunning = () => {
    const gameScene = game.scene.getScene('Game') as GameScene | undefined;
    gameScene?.autoPause();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      services.audio.suspend();
      pauseIfRunning();
    } else {
      services.audio.resume();
    }
  });
  services.telegram.on('deactivated', () => {
    services.audio.suspend();
    pauseIfRunning();
  });
}

void start();
