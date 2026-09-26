import Phaser from 'phaser';
import { ART_ANCHORS, POSE_FALLBACK } from '../data/entities';
import { Signal } from '../utils/Signal';
import { MANIFEST_BY_KEY } from './manifest';

export interface TexRef {
  texture: string;
  frame?: string;
}

export interface Anchor {
  ox: number;
  oy: number;
  /** The pose is drawn mirrored (see ART_ANCHORS). */
  flip: boolean;
}

/**
 * Resolves manifest keys to a texture (+ atlas frame), whether the art was packed into an atlas,
 * loaded standalone, or generated as a placeholder. Gameplay code only ever uses manifest keys.
 *
 * Real art can carry per-pose anchors and mirroring (`ART_ANCHORS`), and a missing pose falls back
 * to a real sibling pose when there is one (`POSE_FALLBACK`).
 */
class ArtRegistry {
  private readonly refs = new Map<string, TexRef>();
  private readonly real = new Set<string>();
  private readonly anchors = new Map<string, Anchor>();
  /** Fires (with the key) whenever real art is registered late (lazy atlas groups). */
  readonly onChange = new Signal<string>();
  /** Era test skins (recoloured copies) → the base key they copy, whose anchor they share. */
  private readonly cloneOf = new Map<string, string>();
  private skin: string | null = null;
  readonly missing: string[] = [];
  /** Era skins drawn as recoloured test art (their PNG is not in assets-src yet). */
  readonly testSkins: string[] = [];

  register(key: string, ref: TexRef, real: boolean): void {
    this.refs.set(key, ref);
    if (real) this.real.add(key);
    else this.real.delete(key);
    this.cloneOf.delete(key);
    this.anchors.clear();
    if (real) this.onChange.emit(key);
  }

  unregister(key: string): void {
    this.refs.delete(key);
    this.real.delete(key);
    this.cloneOf.delete(key);
    this.anchors.clear();
  }

  registerClone(key: string, ref: TexRef, base: string): void {
    this.register(key, ref, false);
    this.cloneOf.set(key, base);
  }

  /** The era skin prefix (e.g. 'e2'), or null for the first era's own art. Set before building a scene. */
  get currentSkin(): string | null {
    return this.skin;
  }

  setSkin(prefix: string | null): void {
    this.skin = prefix;
    this.anchors.clear();
  }

  has(key: string): boolean {
    return this.refs.has(key);
  }

  /** True when the key is drawn from a real PNG (not a placeholder). */
  isReal(key: string): boolean {
    return this.real.has(key);
  }

  /** The key that is actually drawn for `key`: the era's skin first, then a real fallback pose. */
  resolve(key: string): string {
    if (this.skin !== null) {
      const s = `${this.skin}_${key}`;
      if (this.real.has(s)) return s;
      const fallback = POSE_FALLBACK[key];
      if (fallback !== undefined && this.real.has(`${this.skin}_${fallback}`)) return `${this.skin}_${fallback}`;
      if (this.refs.has(s)) return s;
    }
    return this.baseResolve(key);
  }

  private baseResolve(key: string): string {
    if (this.real.has(key)) return key;
    const fallback = POSE_FALLBACK[key];
    return fallback !== undefined && this.real.has(fallback) ? fallback : key;
  }

  ref(key: string): TexRef {
    const ref = this.refs.get(this.resolve(key));
    if (!ref) throw new Error(`[Art] unknown asset key "${key}"`);
    return ref;
  }

  /** Anchor for a pose: ART_ANCHORS for real art, else the manifest anchor. */
  anchor(key: string): Anchor {
    const drawn = this.resolve(key);
    let a = this.anchors.get(drawn);
    if (!a) {
      const base = this.cloneOf.get(drawn);
      const src = base !== undefined ? this.baseResolve(base) : drawn;
      const def = MANIFEST_BY_KEY.get(src);
      const override = this.real.has(src) ? ART_ANCHORS[src] : undefined;
      a = {
        ox: override?.ox ?? def?.ox ?? 0.5,
        oy: override?.oy ?? def?.oy ?? 0.5,
        flip: override?.flip ?? false,
      };
      this.anchors.set(drawn, a);
    }
    return a;
  }

  image(scene: Phaser.Scene, x: number, y: number, key: string): Phaser.GameObjects.Image {
    const ref = this.ref(key);
    const img = scene.add.image(x, y, ref.texture, ref.frame);
    const a = this.anchor(key);
    return img.setOrigin(a.ox, a.oy).setFlipX(a.flip);
  }

  /** Swaps an image to another pose (manifest key), applying that pose's anchor and mirroring. */
  setPose(img: Phaser.GameObjects.Image, key: string): void {
    const ref = this.ref(key);
    if (img.texture.key === ref.texture && (ref.frame === undefined || img.frame.name === ref.frame)) return;
    img.setTexture(ref.texture, ref.frame);
    const a = this.anchor(key);
    img.setOrigin(a.ox, a.oy).setFlipX(a.flip);
  }
}

export const Art = new ArtRegistry();
