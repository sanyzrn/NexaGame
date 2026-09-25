import Phaser from 'phaser';
import { DEPTH } from '../config/display';
import { FEEL } from '../config/feel';
import type { ShadowDef } from '../data/entities';

const TEX_W = 128;
const TEX_H = 64;
/** The shadow texture's ellipse fills its box; this is its radius in texture px. */
const TEX_RX = TEX_W / 2;
const TEX_RY = TEX_H / 2;
const AWAY_FROM_SUN = FEEL.light.sunSide === 'left' ? 1 : -1;

/** Soft elliptical floor shadow, anchored at an object's feet (and slightly away from the sun). */
export class Shadow {
  readonly img: Phaser.GameObjects.Image;
  private sx = 1;
  private sy = 1;

  /** `def` radii are in source-box px; `scale` is the art's display scale. */
  constructor(scene: Phaser.Scene, def: ShadowDef, scale: number) {
    this.img = scene.add.image(0, 0, 'fx_shadow')
      .setTint(FEEL.shadow.color).setAlpha(FEEL.shadow.alpha).setDepth(DEPTH.shadows);
    this.configure(def, scale);
  }

  /** Re-sizes the shadow for another object (pooled enemies change type). */
  configure(def: ShadowDef, scale: number): this {
    this.sx = (def.rx * scale) / TEX_RX;
    this.sy = (def.ry * scale) / TEX_RY;
    this.img.setScale(this.sx, this.sy);
    return this;
  }

  /** `size` scales the ellipse (hover height, squash), `alpha` fades it (1 = normal). */
  place(x: number, y: number, size = 1, alpha = 1): this {
    this.img.setPosition(x + FEEL.shadow.offsetX * AWAY_FROM_SUN * size, y)
      .setScale(this.sx * size, this.sy * size)
      .setAlpha(FEEL.shadow.alpha * alpha);
    return this;
  }

  setVisible(v: boolean): this {
    this.img.setVisible(v);
    return this;
  }
}
