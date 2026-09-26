import { Audio } from '../systems/Audio';
import { Perf } from '../systems/Perf';
import type { GameService } from './GameService';
import { Haptics } from './Haptics';
import { MockGameService } from './MockGameService';
import { SafeArea } from './SafeArea';
import { Settings } from './Settings';
import { TelegramBridge } from './TelegramBridge';

/** App-wide singletons, created once before the Phaser game boots. */
const telegram = new TelegramBridge();
const settings = new Settings();

export const services = {
  telegram,
  haptics: new Haptics(telegram),
  audio: new Audio(),
  settings,
  safeArea: new SafeArea(telegram),
  game: new MockGameService(telegram) as GameService,
  perf: new Perf(settings),
  caps: { webp: true },
};
