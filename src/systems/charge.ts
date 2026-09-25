import { BALANCE } from '../config/balance';
import { lerp } from '../utils/geom';

/**
 * charging: filling up to 100%;
 * golden:   at 100% and inside a golden pulse — releasing now is a critical;
 * full:     at 100% between pulses.
 */
export type ChargePhase = 'charging' | 'golden' | 'full';

export interface ChargeState {
  charge: number;
  phase: ChargePhase;
}

type BowTuning = typeof BALANCE.bow;

/**
 * Bow charge as a pure function of hold time: 0 → 100% over chargeMs, then it stays full and
 * pulses gold — goldenMs of gold every goldenMs + goldenGapMs, the first pulse starting the moment
 * it is full. Never decays, so the player can take their time aiming and release on a pulse.
 */
export function chargeAt(heldMs: number, bow: BowTuning = BALANCE.bow, out: ChargeState = { charge: 0, phase: 'charging' }): ChargeState {
  if (heldMs < bow.chargeMs) {
    out.charge = Math.max(0, heldMs / bow.chargeMs);
    out.phase = 'charging';
    return out;
  }
  out.charge = 1;
  const cycle = (heldMs - bow.chargeMs) % (bow.goldenMs + bow.goldenGapMs);
  out.phase = cycle < bow.goldenMs ? 'golden' : 'full';
  return out;
}

export interface ShotStats {
  damage: number;
  crit: boolean;
  speed: number;
  pierce: number;
}

export function shotFor(state: ChargeState, arrow = BALANCE.arrow): ShotStats {
  const crit = state.phase === 'golden';
  const base = lerp(arrow.minDamage, arrow.maxDamage, Math.pow(state.charge, arrow.damageCurve));
  return {
    damage: Math.round(crit ? base * arrow.critMultiplier : base),
    crit,
    speed: lerp(arrow.speedMin, arrow.speedMax, state.charge),
    pierce: crit ? arrow.critPierce : 0,
  };
}

/** Keeps an aim angle (screen space, up = -π/2) within [-π + min, -min]; downward angles go to the nearer side. */
export function clampAim(a: number, minDeg: number = BALANCE.bow.minAimAngleDeg): number {
  const min = (minDeg * Math.PI) / 180;
  if (a > -min && a <= Math.PI / 2) return -min;
  if (a < -Math.PI + min || a > Math.PI / 2) return -Math.PI + min;
  return a;
}
