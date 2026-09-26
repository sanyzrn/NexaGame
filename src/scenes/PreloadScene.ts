import Phaser from 'phaser';
import { Art } from '../assets/Art';
import { createFxTextures } from '../assets/fxTextures';
import { LAZY_ATLAS_GROUPS, MANIFEST, MANIFEST_BY_KEY, type PackFile } from '../assets/manifest';
import { createPlaceholder } from '../assets/placeholders';
import { COLORS, DESIGN_H, DESIGN_W, FONT_FAMILY } from '../config/display';
import { services } from '../services';
import { buttonTex, dimTex, gradientText, panelTex } from '../ui/kit';

/** An atlas sheet is lazy when it belongs entirely to a lazy group (fetched later, not at boot). */
function isLazySheet(a: PackFile['atlases'][number]): boolean {
  return a.frames.length > 0 && a.frames.every((f) => {
    const group = MANIFEST_BY_KEY.get(f)?.atlas;
    return group !== undefined && group !== null && (LAZY_ATLAS_GROUPS as readonly string[]).includes(group);
  });
}

/** Loads real art needed for the first paint, generates placeholders for the rest, shows progress. */
export class PreloadScene extends Phaser.Scene {
  private failed = new Set<string>();

  constructor() {
    super('Preload');
  }

  preload(): void {
    const pack = this.registry.get('pack') as PackFile;
    this.drawProgress();

    const base = 'assets/';
    const v = `?v=${pack.version}`;
    for (const a of pack.atlases) {
      if (isLazySheet(a)) continue; // boss art: fetched in the background while the title is up
      const texture = services.caps.webp ? a.webp : a.png;
      this.load.atlas(`atlas:${a.name}`, base + texture + v, base + a.json + v);
    }
    const lazy = new Set(MANIFEST.filter((d) => d.lazy).map((d) => d.key));
    for (const img of pack.images) {
      if (lazy.has(img.key)) continue;
      this.load.image(img.key, base + (services.caps.webp ? img.webp : img.fallback) + v);
    }

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      this.failed.add(file.key);
      console.warn(`[assets] failed to load ${file.src}`);
    });
  }

  create(): void {
    const pack = this.registry.get('pack') as PackFile;
    const lazyKeys = new Set(MANIFEST.filter((d) => d.lazy).map((d) => d.key));

    for (const a of pack.atlases) {
      const key = `atlas:${a.name}`;
      if (this.failed.has(key) || !this.textures.exists(key) || isLazySheet(a)) continue;
      for (const frame of a.frames) Art.register(frame, { texture: key, frame }, true);
    }
    for (const img of pack.images) {
      if (lazyKeys.has(img.key)) continue;
      if (!this.failed.has(img.key) && this.textures.exists(img.key)) Art.register(img.key, { texture: img.key }, true);
    }

    Art.missing.length = 0;
    for (const def of MANIFEST) {
      if (Art.has(def.key)) continue;
      // card_bg exists on disk and HeroCard renders it only after ensureLazy resolves.
      if (def.lazy && pack.images.some((i) => i.key === def.key)) continue;
      // Lazy atlas frames (the boss) get their placeholder NOW too: the Boss entity is built the
      // moment the game scene boots, and the real texture swaps in when the lazy load lands.
      createPlaceholder(this, def);
      Art.register(def.key, { texture: def.key }, false);
      if (!def.lazy) Art.missing.push(def.key);
    }
    if (Art.missing.length && import.meta.env.DEV) {
      // Production stays silent: placeholders are the designed stand-in until final art lands.
      console.info(`[assets] ${Art.missing.length}/${MANIFEST.length} assets missing — using placeholders:\n  ${Art.missing.join(', ')}`);
    }

    createFxTextures(this);
    // The title is the arena itself at dusk, with the Title overlay on top.
    this.scene.start('Game', { title: true });
  }

  private drawProgress(): void {
    const cx = DESIGN_W / 2;
    const cy = DESIGN_H / 2;
    const w = 600;
    this.add.image(0, 0, dimTex(this)).setOrigin(0).setDisplaySize(DESIGN_W, DESIGN_H).setTint(0x8a9cff);
    this.add.image(cx, cy - 40, panelTex(this, 760, 560));
    gradientText(this.add.text(cx, cy - 200, 'درفش', {
      fontFamily: FONT_FAMILY, fontSize: '150px', fontStyle: '900', rtl: true, stroke: '#3a2208', strokeThickness: 8,
    }).setOrigin(0.5));
    this.add.text(cx, cy - 70, 'نبرد پهلوانان', {
      fontFamily: FONT_FAMILY, fontSize: '50px', color: COLORS.parchmentCss, rtl: true,
    }).setOrigin(0.5);
    // Framed bar: dark track, gold fill revealed by cropping a full-width bar.
    const track = this.add.graphics();
    track.fillStyle(0x070b1c, 0.9).fillRoundedRect(cx - w / 2 - 10, cy + 50, w + 20, 52, 26);
    track.lineStyle(4, COLORS.gold, 1).strokeRoundedRect(cx - w / 2 - 10, cy + 50, w + 20, 52, 26);
    const fill = this.add.image(cx - w / 2, cy + 76, buttonTex(this, w, 34, 'gold')).setOrigin(0, 0.5);
    const pad = (fill.width - w) / 2;
    fill.setX(cx - w / 2 - pad).setCrop(pad, 0, 1, fill.height);
    const label = this.add.text(cx, cy + 150, 'در حال آماده‌سازی میدان…', {
      fontFamily: FONT_FAMILY, fontSize: '32px', color: '#b9c3e6', rtl: true,
    }).setOrigin(0.5);
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => {
      fill.setCrop(pad, 0, Math.max(1, w * p), fill.height);
      if (p >= 1) label.setText('آماده!');
    });
  }
}
