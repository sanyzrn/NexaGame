import Phaser from 'phaser';
import { ERAS, type EraDef } from '../data/eras';
import { Art } from './Art';
import { ensureAtlas } from './lazy';
import { ERA_SKINS, MANIFEST, MANIFEST_BY_KEY, type AssetDef } from './manifest';

/** Test skins by the base key they copy, so a late real base (the lazy boss) can repaint them. */
const cloneByBase = new Map<string, { def: AssetDef; textures: Phaser.Textures.TextureManager }>();
let listening = false;

/**
 * Fetches an era's real skins (a lazy atlas group) before its world is built. Resolves true
 * when there is nothing to fetch or the art landed; never throws, never blocks longer than
 * `timeoutMs` (the test art stands in until the real art arrives).
 */
export function loadEraArt(scene: Phaser.Scene, era: EraDef, timeoutMs = 4000): Promise<boolean> {
  const group = ERA_SKINS.find((s) => s.prefix === era.skin)?.atlas;
  if (!group) return Promise.resolve(true);
  return Promise.race([
    ensureAtlas(scene, group),
    new Promise<boolean>((r) => scene.time.delayedCall(timeoutMs, () => r(false))),
  ]);
}

/**
 * Switches the art to `era` before a scene builds its world: the era's real skins win, missing
 * ones get recoloured test art now (only for this era — other eras' test art is freed).
 */
export function applyEraArt(scene: Phaser.Scene, era: EraDef): void {
  if (!listening) {
    listening = true;
    // Registered before any entity subscribes, so a clone is repainted before the Boss re-poses.
    Art.onChange.add((key) => {
      const c = cloneByBase.get(key);
      if (c && Art.has(c.def.key) && !Art.isReal(c.def.key)) paintClone(c.textures, c.def);
    });
  }
  Art.setSkin(null);
  for (const key of Art.testSkins.slice()) {
    if (era.skin !== null && key.startsWith(`${era.skin}_`)) continue;
    Art.unregister(key);
    scene.textures.remove(key);
    Art.testSkins.splice(Art.testSkins.indexOf(key), 1);
    const base = MANIFEST_BY_KEY.get(key)?.skinOf;
    if (base !== undefined) cloneByBase.delete(base);
  }
  if (era.skin !== null) {
    for (const def of MANIFEST) {
      if (def.skinOf && def.key.startsWith(`${era.skin}_`) && !Art.has(def.key)) createSkinClone(scene.textures, def);
    }
  }
  Art.setSkin(era.skin);
}

/**
 * Test art for an era skin whose PNG is not in assets-src yet: the base art (real or placeholder),
 * drawn at its full source size and recoloured toward the era's tint (hue/saturation via the
 * 'color' blend, alpha preserved). Backgrounds get a faint «تصویر آزمایشی» stamp so nobody mistakes
 * them for final art. Same size and anchor as the base, so hitboxes and layout just work.
 */
function createSkinClone(textures: Phaser.Textures.TextureManager, def: AssetDef): void {
  const base = def.skinOf!;
  const frame = frameOf(textures, base);
  const tex = textures.createCanvas(def.key, frame.realWidth, frame.realHeight);
  if (!tex) return;
  paintClone(textures, def);
  Art.registerClone(def.key, { texture: def.key }, base);
  Art.testSkins.push(def.key);
  cloneByBase.set(base, { def, textures });
}

function frameOf(textures: Phaser.Textures.TextureManager, base: string): Phaser.Textures.Frame {
  const skin = Art.currentSkin;
  Art.setSkin(null);
  const ref = Art.ref(base);
  Art.setSkin(skin);
  return textures.getFrame(ref.texture, ref.frame);
}

function paintClone(textures: Phaser.Textures.TextureManager, def: AssetDef): void {
  const base = def.skinOf!;
  const prefix = def.key.slice(0, def.key.length - base.length - 1);
  const tint = ERAS.find((e) => e.skin === prefix)?.testTint ?? 0xffffff;
  const tex = textures.get(def.key) as Phaser.Textures.CanvasTexture;
  const frame = frameOf(textures, base);
  const w = tex.width;
  const h = tex.height;
  const ctx = tex.getContext();
  const draw = () => ctx.drawImage(frame.source.image as CanvasImageSource,
    frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, frame.x, frame.y, frame.cutWidth, frame.cutHeight);

  ctx.clearRect(0, 0, w, h);
  draw();
  ctx.globalCompositeOperation = 'color';
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = `#${tint.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'destination-in';
  draw();
  ctx.globalCompositeOperation = 'source-over';

  if (!def.alpha) {
    ctx.font = '900 34px Vazirmatn, sans-serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(`تصویر آزمایشی · ${def.key}`, w / 2, h - 28);
  }
  tex.refresh();
}
