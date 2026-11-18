import type { DecorDef } from '../entities/Decor';
import { ARENA } from './arena';

/**
 * The Library of Bukhara's lamps. The two braziers that already stand inside every arena become the
 * era's lamps, plus one reading lamp on the central line under the Div: one straight shot from the
 * hero can pass through its flame and still reach his chest, which is how the mechanic introduces
 * itself. All three can be snuffed by the boss and relit.
 */
const IN_ARENA_BRAZIERS = new Set([215, 865]);

export const SAMANID_DECOR: readonly DecorDef[] = [
  ...ARENA.decor.map((d): DecorDef =>
    d.key === 'brazier' && IN_ARENA_BRAZIERS.has(d.x) ? { ...d, lamp: true } : { ...d }),
  /** چراغ مطالعه: a brass reading lamp on the floor, in the line of fire. */
  { key: 'brazier', x: 540, y: 905, scale: 0.5, lamp: true },
];

export const LIBRARY_LAMP_COUNT = SAMANID_DECOR.filter((d) => d.lamp).length;
