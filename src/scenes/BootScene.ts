import Phaser from 'phaser';
import type { PackFile } from '../assets/manifest';

export const EMPTY_PACK: PackFile = { version: 'none', atlases: [], images: [] };

/** Fetches public/assets/pack.json (what real art exists). A missing file means "all placeholders". */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {
      console.warn('[assets] public/assets/pack.json not found — run `npm run assets`. Using placeholders for everything.');
    });
    this.load.json('pack', `assets/pack.json?t=${Date.now()}`);
  }

  create(): void {
    const pack = (this.cache.json.get('pack') as PackFile | undefined) ?? EMPTY_PACK;
    this.registry.set('pack', pack);
    this.scene.start('Preload');
  }
}
