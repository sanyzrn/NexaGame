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

async function start(): Promise<void> {
  services.telegram.init(COLORS.letterboxCss);
  services.safeArea.init();
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

  services.telegram.on('viewportChanged', () => game.scale.refresh());
  services.safeArea.onChange.add(() => game.scale.refresh());
  // Dev only: lets automated screenshots and the console inspect the running game.
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) services.audio.suspend();
    else services.audio.resume();
  });
}

void start();
