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

  /**
   * زنجیرهٔ درفش: the group's damage chain. Teammates raise it a tier (and refill it), the player's
   * hits keep it burning. When the time runs out it drops one tier, half-full.
   */
  chain: {
    /** Damage multiplier to the group Div per tier (tier 0 = no chain). */
    multipliers: [1, 1.2, 1.5, 2] as const,
    /** Burn time per tier; higher tiers burn faster. */
    durationMs: [0, 24000, 19000, 15000] as const,
    /** Time the player's hits add back (capped at the tier's full time). */
    hitExtendMs: 900,
    critExtendMs: 1600,
    /** After a drop, the lower tier starts this full. */
    dropRefill: 0.5,
  },

  /** Teammate rescue: the first time the last heart is lost, a teammate revives the hero. */
  rescue: {
    hearts: 1,
    /** Invulnerable (golden shimmer) after the revive. */
    shieldMs: 2600,
    /** Enemies this close to the hero are swept away by the revive. */
    clearRadius: 560,
  },

  /** The run's score (Result screen, Hero Card, best score). */
  score: {
    /** Points per point of damage the player dealt (enemies + the Div). */
    damage: 1,
    kill: 40,
    bestCombo: 60,
    golden: 80,
    victory: 3000,
    /** Per heart still full at victory. */
    heartLeft: 500,
  },

  /**
   * Stars: 1 for a victory (or for a defeat that reached the Div), +1 for a sharp eye (golden
   * accuracy or a long combo), +1 for a clean fight (victory, no rescue, few hearts lost).
   */
  stars: {
    goldenPct: 0.35,
    bestCombo: 10,
    maxHeartsLost: 1,
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
