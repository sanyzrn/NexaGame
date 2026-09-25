/**
 * Every gameplay number lives here (look-and-motion numbers are in feel.ts). Times in ms, distances in design px (1080x1920),
 * speeds in px/s, charge in 0..1.
 */
export const BALANCE = {
  bow: {
    /** Time to charge from 0 to 100% while the finger is down. */
    chargeMs: 700,
    /** At 100% the bow pulses gold: this long gold (release = critical)… */
    goldenMs: 350,
    /** …then this long plain full power, and again. The first pulse starts the moment it's full. */
    goldenGapMs: 650,
    /** Pause after a shot before the next one can charge (you can already aim during it). */
    cooldownMs: 250,
    /** The aim points from the bow to the finger; closer than this, the last direction is kept. */
    aimMinDistance: 70,
    /** Aim smoothing (time constant): filters finger jitter without feeling laggy. */
    aimSmoothingMs: 35,
    /** Aim cannot go lower than this many degrees above horizontal. */
    minAimAngleDeg: 10,
    /** Releasing with the finger this far below the bow cancels the shot. */
    cancelBelowPx: 110,
  },

  arrow: {
    minDamage: 20,
    maxDamage: 100,
    /** damage = lerp(min, max, charge ^ curve) — >1 rewards full charge. */
    damageCurve: 1.4,
    critMultiplier: 2.5,
    /** Enemies a critical arrow passes through before stopping on the next one. */
    critPierce: 1,
    speedMin: 2000,
    speedMax: 3000,
    maxBounces: 2,
    /** Collision radius against enemies (the tip is a point against walls and pillars). */
    radius: 10,
    maxLifeMs: 2500,
    /** Display scale of the arrow sprite (256x64 source). */
    scale: 0.55,
  },

  preview: {
    /** Ricochets shown by the dotted line. */
    bounces: 1,
    maxLength: 2600,
    /** Length of the line after the bounce. */
    afterBounceLength: 1100,
    dashLength: 26,
    dashGap: 20,
    /** Dash scroll speed, px/s. */
    marchSpeed: 90,
  },

  hero: {
    hearts: 3,
    /** After losing a heart, further hits are ignored for this long. */
    invulnerableMs: 900,
  },

  /** Per enemy type: hit points and walking speed (px/s, ±FEEL.enemy.walk.speedJitter per enemy). */
  enemies: {
    imp: { hp: 60, speed: 66 },
    shield: {
      hp: 200,
      speed: 40,
      /** Arrows arriving within this angle of straight-on clang off the shield (no damage). */
      frontalDeg: 50,
    },
    flyer: { hp: 45, speed: 80 },
  },

  /** The White Div (دیو سپید). Percentages are of his max hp. */
  boss: {
    /** He rises after this many waves are cleared. */
    afterWave: 3,
    hp: 5000,
    /** Arrows through the chest gem deal this much more. */
    gemMultiplier: 2,
    /** At 50% a barrier forms: only golden (critical) arrows get through it. */
    armorAtPct: 0.5,
    /** A golden arrow into the gem while armored stuns him: barrier down, more damage taken. */
    stunMs: 3200,
    stunDamageMultiplier: 1.5,
    /** Under 25%: faster breathing, glowing cracks, stumbles. */
    lowHpPct: 0.25,
    /** He calls imps out of the wall: first after firstMs, then every … (per phase). */
    summon: { firstMs: 6000, phase1EveryMs: 11000, armorEveryMs: 8500, count: [2, 3] as const },
  },

  waves: {
    /** Pause before the first wave, and between waves. */
    startDelayMs: 1500,
    betweenMs: 2600,
    /** Enemies keep this far (px) from the side walls when they spawn. */
    sideMargin: 80,
  },
} as const;

export type Balance = typeof BALANCE;
