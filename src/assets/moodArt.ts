import Phaser from 'phaser';
import type { EraDef } from '../data/eras';
import { pickMood, type MoodDef } from '../data/moods';
import { Art } from './Art';
import { ensureLazy, hasPackedImage } from './lazy';

const NEXT_KEY = 'mood.next';

/** The painted background for this mood in this era (e.g. e2_bg_arena_night), or null. */
function bgKey(mood: MoodDef, era: EraDef): string | null {
  if (!mood.bg) return null;
  return era.skin ? `${era.skin}_${mood.bg}` : mood.bg;
}

/**
 * Picks this run's mood and points the arena background at its painted variant when that art is
 * loaded (returns true then: the runtime grade becomes a whisper). Moods are prepared one run
 * ahead: the next run's mood is drawn now and its background fetched in the background, so a
 * painted night never delays the start of a run. `?mood=<id>` forces a mood (testing).
 */
export function applyMood(scene: Phaser.Scene, era: EraDef): { mood: MoodDef; painted: boolean } {
  const forced = new URLSearchParams(window.location.search).get('mood');
  const queued = scene.registry.get(NEXT_KEY) as MoodDef | undefined;
  const mood = forced ? pickMood(Math.random, forced) : queued ?? pickMood();
  Art.setAlias('bg_arena_01', null);
  const key = bgKey(mood, era);
  const painted = key !== null && Art.isReal(key);
  // The alias is the base mood key; Art's skin prefix turns it into this era's version.
  if (painted) Art.setAlias('bg_arena_01', mood.bg);

  const next = pickMood();
  scene.registry.set(NEXT_KEY, next);
  const nextKey = bgKey(next, era);
  if (nextKey && !Art.isReal(nextKey) && hasPackedImage(scene, nextKey)) void ensureLazy(scene, nextKey);
  return { mood, painted };
}
