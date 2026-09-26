import Phaser from 'phaser';
import { Art } from './Art';
import { LAZY_ATLAS_GROUPS, MANIFEST_BY_KEY, type AtlasGroup, type PackFile } from './manifest';
import { services } from '../services';

/** Groups whose real art is registered and live (kept for the whole session). */
const done = new Set<AtlasGroup>();
/** One load attempt at a time per group; settled promises are dropped so a fresh scene can retry. */
const inflight = new Map<AtlasGroup, Promise<boolean>>();

/** True when every frame of this atlas group is already registered as real art. */
function groupLoaded(group: AtlasGroup, pack: PackFile): boolean {
  for (const a of pack.atlases) {
    if (!a.frames.some((f) => MANIFEST_BY_KEY.get(f)?.atlas === group)) continue;
    if (!a.frames.every((f) => Art.isReal(f))) return false;
  }
  return true;
}

/**
 * Loads a lazy atlas group (see LAZY_ATLAS_GROUPS) the first time it is needed — the boss art is
 * fetched in the background while the title screen is up, so the first paint never waits for it.
 * Resolves true when real art is registered; false keeps the runtime placeholder (never throws,
 * never blocks gameplay: the caller may await it, but a timeout keeps the placeholder either way).
 */
export function ensureAtlas(scene: Phaser.Scene, group: AtlasGroup): Promise<boolean> {
  if (done.has(group)) return Promise.resolve(true);
  const running = inflight.get(group);
  if (running) return running;
  const pack = scene.registry.get('pack') as PackFile | undefined;
  if (!pack || !LAZY_ATLAS_GROUPS.includes(group)) return Promise.resolve(false);
  if (groupLoaded(group, pack)) {
    done.add(group);
    return Promise.resolve(true);
  }

  const sheets = pack.atlases.filter((a) => a.frames.some((f) => MANIFEST_BY_KEY.get(f)?.atlas === group));
  const promise = new Promise<boolean>((resolve) => {
    const base = 'assets/';
    const v = `?v=${pack.version}`;
    for (const a of sheets) {
      const texture = services.caps.webp ? a.webp : a.png;
      scene.load.atlas(`atlas:${a.name}`, base + texture + v, base + a.json + v);
    }
    // The loader settles even when files fail; registration is skipped for missing textures.
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      inflight.delete(group);
      let allReal = true;
      for (const a of sheets) {
        if (!scene.textures.exists(`atlas:${a.name}`)) {
          allReal = false;
          continue;
        }
        for (const frame of a.frames) Art.register(frame, { texture: `atlas:${a.name}`, frame }, true);
      }
      if (allReal) {
        done.add(group);
        // They were listed as "missing" while only the placeholder existed (debug overlay).
        for (let i = Art.missing.length - 1; i >= 0; i--) {
          const def = MANIFEST_BY_KEY.get(Art.missing[i]);
          if (def?.atlas === group) Art.missing.splice(i, 1);
        }
      } else {
        console.info(`[assets] lazy atlas "${group}" unavailable — keeping placeholder`);
      }
      resolve(allReal);
    });
    scene.load.start();
  }).catch(() => false) as Promise<boolean>;
  inflight.set(group, promise);
  return promise;
}
