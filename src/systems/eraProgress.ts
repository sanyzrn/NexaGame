import { ERAS, type EraDef } from '../data/eras';
import { storage } from '../utils/storage';

const KEY_UNLOCKED = 'darafsh.era.unlocked';
const KEY_CURRENT = 'darafsh.era.current';

/** Highest era index opened so far (0 = only the first era). */
export function unlockedIndex(): number {
  const n = Number(storage.get(KEY_UNLOCKED) ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.min(ERAS.length - 1, Math.floor(n))) : 0;
}

export function isUnlocked(index: number): boolean {
  return index <= unlockedIndex() && ERAS[index]?.playable === true;
}

/** `?era=<id or number>` plays that era regardless of progress (testing, challenge links later). */
function urlEra(): number {
  const q = new URLSearchParams(window.location.search).get('era');
  if (q === null) return -1;
  const byNum = Number(q) - 1;
  const i = Number.isInteger(byNum) ? byNum : ERAS.findIndex((e) => e.id === q);
  return i >= 0 && i < ERAS.length && ERAS[i].playable ? i : -1;
}

export function currentIndex(): number {
  const forced = urlEra();
  if (forced >= 0) return forced;
  const i = ERAS.findIndex((e) => e.id === storage.get(KEY_CURRENT));
  return i >= 0 && isUnlocked(i) ? i : 0;
}

export function currentEra(): EraDef {
  return ERAS[currentIndex()];
}

export function selectEra(index: number): boolean {
  if (!isUnlocked(index)) return false;
  storage.set(KEY_CURRENT, ERAS[index].id);
  return true;
}

/**
 * The boss of `era` fell: opens the next era. Returns the next era if it is playable (the
 * time jump can take the player there), otherwise null («به‌زودی»).
 */
export function completeEra(era: EraDef): EraDef | null {
  const i = ERAS.indexOf(era);
  const next = ERAS[i + 1];
  if (!next) return null;
  if (i + 1 > unlockedIndex()) storage.set(KEY_UNLOCKED, String(i + 1));
  return next.playable ? next : null;
}
