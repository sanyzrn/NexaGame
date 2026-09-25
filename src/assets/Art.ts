import Phaser from 'phaser';
import { ART_ANCHORS, POSE_FALLBACK } from '../data/entities';
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
  readonly missing: string[] = [];

  register(key: string, ref: TexRef, real: boolean): void {
    this.refs.set(key, ref);
    if (real) this.real.add(key);
    else this.real.delete(key);
    this.anchors.clear();
  }

  has(key: string): boolean {
    return this.refs.has(key);
  }

  /** True when the key is drawn from a real PNG (not a placeholder). */
  isReal(key: string): boolean {
    return this.real.has(key);
  }

  /** The key that is actually drawn for `key` (a real fallback pose wins over a placeholder). */
  resolve(key: string): string {
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
      const def = MANIFEST_BY_KEY.get(drawn);
      const override = this.real.has(drawn) ? ART_ANCHORS[drawn] : undefined;
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
