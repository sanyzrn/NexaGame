import Phaser from 'phaser';
import { Art } from '../assets/Art';

export interface Point { x: number; y: number }

/** Where a pose's trimmed frame sits relative to its anchor. */
interface Geo {
  left: number;
  top: number;
  w: number;
  h: number;
  flip: number;
}

type PoseView = Phaser.GameObjects.Rope | Phaser.GameObjects.Image;

/**
 * A pose drawn as a vertical strip of rows (a Phaser Rope) that can be sheared, stretched and
 * squeezed row by row — body/cape sway, breathing, leaning, head bob and cloth billow without
 * rigging or extra art. Phaser has no Canvas renderer for ropes, so Canvas uses an anchored image.
 *
 * Local space: design px before the rope's own scale, relative to the pose anchor. `t` runs from
 * 0 at the pinned end (feet, or the top of a hanging banner) to 1 at the free end.
 *
 * Pose changes can cross-fade: the old pose stays on top as a "ghost" strip, deformed the same way,
 * and fades out, so a pose never snaps.
 */
export class BendSprite {
  readonly view: PoseView;

  /** Horizontal offset of the free end; blends in from `swayStart` along the strip. */
  sway = 0;
  swayStart = 0;
  swayCurve = 1.6;
  /** Vertical scale around the anchor (breathing). */
  stretch = 1;
  /** Vertical offset of the free end, blended in quadratically (lean back, head bob). */
  endShift = 0;
  /** Width multiplier at the free end, blended in quadratically (bow flex, tension). */
  endWidth = 1;
  /** Travelling sideways wave (cloth): amplitude as a fraction of the width, and its phase. */
  wave = 0;
  wavePhase = 0;

  private key = '';
  private tintColor = 0xffffff;
  private mirror = false;
  private readonly geo: Geo = { left: 0, top: 0, w: 1, h: 1, flip: 1 };
  private ghost: PoseView | null = null;
  private readonly ghostGeo: Geo = { left: 0, top: 0, w: 1, h: 1, flip: 1 };
  private ghostLeft = 0;
  private ghostMs = 1;
  private readonly rows: number;
  private readonly pinTop: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, key: string, opts: { rows?: number; pin?: 'feet' | 'top' } = {}) {
    this.rows = opts.rows ?? 8;
    this.pinTop = opts.pin === 'top';
    this.view = this.createView(scene, x, y, key);
    this.setPose(key, true);
  }

  private createView(scene: Phaser.Scene, x: number, y: number, key: string): PoseView {
    const ref = Art.ref(key);
    if (scene.game.renderer.type !== Phaser.WEBGL) return scene.add.image(x, y, ref.texture, ref.frame);
    // A number of points is valid at runtime (Rope splits the frame), the typings only list arrays.
    return scene.add.rope(x, y, ref.texture, ref.frame, this.rows as unknown as Phaser.Types.Math.Vector2Like[], false);
  }

  get pose(): string {
    return this.key;
  }

  /** Switches pose (manifest key), cross-fading over `fadeMs`. Returns true if it changed. */
  setPose(key: string, force = false, fadeMs = 0): boolean {
    if (key === this.key && !force) return false;
    if (fadeMs > 0 && this.key) this.startGhost(fadeMs);
    this.key = key;
    this.apply(this.view, key, this.geo);
    return true;
  }

  private apply(r: PoseView, key: string, g: Geo): void {
    const ref = Art.ref(key);
    r.setTexture(ref.texture, ref.frame);
    const a = Art.anchor(key);
    const f = r.frame;
    g.left = f.x - a.ox * f.realWidth;
    g.top = f.y - a.oy * f.realHeight;
    g.w = f.width;
    g.h = f.height;
    const flipped = a.flip !== this.mirror;
    g.flip = flipped ? -1 : 1;
    if (r instanceof Phaser.GameObjects.Rope) {
      if (r.flipX !== flipped) r.setFlipX(flipped);
      else r.updateUVs();
    } else {
      r.setOrigin(a.ox, a.oy).setFlipX(flipped);
    }
  }

  private startGhost(ms: number): void {
    const r = this.view;
    if (!this.ghost) {
      this.ghost = this.createView(r.scene, r.x, r.y, this.key);
    }
    this.apply(this.ghost, this.key, this.ghostGeo);
    this.ghost.setVisible(true);
    this.ghostLeft = this.ghostMs = ms;
  }

  /** Mirrors every pose around the anchor (on top of any per-pose flip). */
  setMirror(on: boolean): this {
    this.mirror = on;
    this.setPose(this.key, true);
    return this;
  }

  /** Multiplies (or with `fill`, replaces) the colour of the whole strip. Allocation-free. */
  setTint(color: number, fill = false): this {
    const changed = color !== this.tintColor;
    this.tintView(this.view, color, fill, changed);
    if (this.ghost) this.tintView(this.ghost, color, fill, changed);
    this.tintColor = color;
    return this;
  }

  private tintView(view: PoseView, color: number, fill: boolean, changed: boolean): void {
    if (view instanceof Phaser.GameObjects.Rope) {
      view.tintFill = fill;
      if (changed) view.colors.fill(color);
    } else if (fill) view.setTintFill(color);
    else view.setTint(color);
  }

  /**
   * Writes the deformed rows into the rope (and the fading ghost of the previous pose).
   * Call once per frame after changing the parameters; `dtMs` advances the cross-fade.
   */
  update(dtMs = 0): void {
    const r = this.view;
    if (r instanceof Phaser.GameObjects.Rope) this.write(r, this.geo);
    const g = this.ghost;
    if (!g || !g.visible) return;
    this.ghostLeft -= dtMs;
    if (this.ghostLeft <= 0) {
      g.setVisible(false);
      return;
    }
    g.setPosition(r.x, r.y).setScale(r.scaleX, r.scaleY).setRotation(r.rotation).setDepth(r.depth + 0.01)
      .setAlpha(r.alpha * (this.ghostLeft / this.ghostMs));
    if (g instanceof Phaser.GameObjects.Rope) this.write(g, this.ghostGeo);
  }

  private write(r: Phaser.GameObjects.Rope, g: Geo): void {
    const v = r.vertices;
    const n = this.rows;
    const hw0 = g.w / 2;
    const cx0 = (g.left + hw0) * g.flip;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const t = this.pinTop ? f : 1 - f;
      const ly = g.top + f * g.h;
      const cx = cx0 + this.shiftX(t, g.w);
      const hw = hw0 * (1 + (this.endWidth - 1) * t * t);
      const y = ly * this.stretch + this.endShift * t * t;
      const k = i * 4;
      v[k] = cx + hw;
      v[k + 1] = y;
      v[k + 2] = cx - hw;
      v[k + 3] = y;
    }
    // Our vertices are final: stop the renderer from rebuilding them from `points`.
    r.dirty = false;
  }

  setVisible(v: boolean): this {
    this.view.setVisible(v);
    if (!v) this.ghost?.setVisible(false);
    return this;
  }

  /**
   * World position of a point given in pose-local source-box px (relative to the anchor, unscaled,
   * unmirrored) after the current deformation and the rope transform — to pin glows to the art.
   */
  worldPoint(bx: number, by: number, out: Point): Point {
    const g = this.geo;
    const r = this.view;
    let x = bx * g.flip;
    let y = by;
    if (r instanceof Phaser.GameObjects.Rope) {
      const f = Phaser.Math.Clamp((by - g.top) / g.h, 0, 1);
      const t = this.pinTop ? f : 1 - f;
      const cx0 = (g.left + g.w / 2) * g.flip;
      x += (x - cx0) * (this.endWidth - 1) * t * t + this.shiftX(t, g.w);
      y = y * this.stretch + this.endShift * t * t;
    }
    const sx = x * r.scaleX;
    const sy = y * r.scaleY;
    const c = Math.cos(r.rotation);
    const s = Math.sin(r.rotation);
    out.x = r.x + sx * c - sy * s;
    out.y = r.y + sx * s + sy * c;
    return out;
  }

  private shiftX(t: number, w: number): number {
    const sw = t <= this.swayStart ? 0 : Math.pow((t - this.swayStart) / (1 - this.swayStart), this.swayCurve);
    return this.sway * sw + (this.wave !== 0 ? this.wave * w * t * Math.sin(this.wavePhase + t * 4.2) : 0);
  }
}
