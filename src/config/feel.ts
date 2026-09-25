/**
 * Every look-and-motion number: juice, animation, lighting and particles.
 * Times in ms, distances in design px (1080x1920), angles in degrees, frequencies in Hz.
 * Particle counts are for full quality; "reduced effects" (pause menu) scales them by
 * `quality.reducedParticleScale` and turns the light shafts off.
 * Gameplay numbers (damage, hp, speeds, waves) live in balance.ts.
 */
export const FEEL = {
  quality: {
    reducedParticleScale: 0.5,
  },

  // ---------------------------------------------------------------- impacts & camera

  hitStopMs: 60,
  shake: {
    hit: { ms: 70, intensity: 0.0015 },
    crit: { ms: 140, intensity: 0.006 },
    kill: { ms: 160, intensity: 0.004 },
    hurt: { ms: 240, intensity: 0.009 },
    growl: { ms: 480, intensity: 0.0018 },
    step: { ms: 60, intensity: 0.0006 },
  },
  /** Full-screen white flash on critical hits. */
  critFlash: { alpha: 0.12, ms: 120 },
  /** Haptic tick when the golden window opens. */
  goldenHaptic: true,

  // ---------------------------------------------------------------- atmosphere

  light: {
    /** Where the sun is. bg_arena_01 is lit from the top-left (see its shadows); flip if the art changes. */
    sunSide: 'left' as 'left' | 'right',
    /** Multiply layer: sun-side top → far-side bottom (golden hour falloff). */
    grade: { sunTop: '#fffaf0', farTop: '#f4e6dc', sunBottom: '#eadccb', farBottom: '#cdb8aa' },
    /** Additive warm bloom from the sun corner. */
    warm: { color: '#ff9f45', alpha: 0.2, radius: 1.15 },
    vignette: { color: '#2b1406', alpha: 0.55, inner: 0.5, outer: 1.05 },
    shafts: {
      count: 3,
      color: 0xffdca8,
      alpha: [0.12, 0.22] as const,
      periodMs: [5200, 8200] as const,
      width: 190,
      length: 2300,
      angleDeg: 24,
    },
  },

  motes: {
    count: 22,
    lifeMs: [7000, 12000] as const,
    speed: [6, 18] as const,
    scale: [0.06, 0.15] as const,
    alpha: 0.55,
    colors: [0xffe6b0, 0xffc978, 0xffa860] as readonly number[],
  },

  /** Background foliage (trees and bushes baked into the bg): very subtle wind shimmer. */
  foliage: { ampPx: 2, speed: 0.9 },

  shadow: {
    color: 0x1c1006,
    alpha: 0.36,
    /** Shadows fall away from the sun by this many px. */
    offsetX: 7,
  },

  brazier: {
    flameAlpha: 0.75,
    flameScale: 0.9,
    /** Flicker: relative width / height jitter of the flame. */
    flicker: { w: 0.1, h: 0.22 },
    glow: { scale: 3.4, alpha: [0.12, 0.3] as const, tint: 0xff9a3a },
    sparkEveryMs: [320, 1100] as const,
    sparkCount: [1, 3] as const,
  },

  banner: { swayDeg: 1.1, periodMs: [3600, 5200] as const, tailPx: 7, billow: 0.03 },

  // ---------------------------------------------------------------- the White Div

  boss: {
    /** Pose changes cross-fade instead of snapping. */
    poseFadeMs: 160,
    idle: {
      /** Breathing: vertical stretch, with a slight horizontal counter-squash. */
      breathe: 0.03,
      counterSquash: 0.4,
      breathMs: 3400,
      lowHpBreathMs: 1800,
      bobPx: 4,
      bobMs: 5600,
      tiltDeg: 0.8,
      headSwayPx: 3,
      /** Hair and cloth: a faint travelling wobble along the body. */
      clothWave: 0.004,
      gemAlpha: [0.35, 0.9] as const,
      gemScale: [1.1, 1.5] as const,
      eyeAlpha: [0.55, 1] as const,
      /** Glints sweeping along the shoulder armor. */
      shineEveryMs: [3500, 7000] as const,
      shineMs: 460,
    },
    /** Growls while lurking during the waves. */
    growlEveryMs: [7000, 13000] as const,
    roarMs: 900,
    /** Hit reactions ride a spring: they overshoot and settle. */
    spring: { hz: 2.4, damping: 0.32 },
    flinch: { liftPx: 7, tiltDeg: 3, flashMs: 80 },
    recoil: { liftPx: 30, tiltDeg: 5, squash: 0.07, hitStopMs: 110, shake: { ms: 280, intensity: 0.01 }, gemFlare: 3.4 },
    intro: {
      darken: 0.3,
      drumsAtMs: [0, 380, 760] as readonly number[],
      zoom: 1.16,
      focusY: 620,
      pushMs: 1100,
      returnMs: 700,
      /** Anticipation: he ducks before rising. */
      sinkMs: 420,
      sinkPx: 36,
      riseMs: 720,
      /** Ease-out-back strength of the rise. */
      riseOvershoot: 1.7,
      slamAtMs: 1200,
      slamDropPx: 22,
      slamMs: 160,
      slamShake: { ms: 500, intensity: 0.015 },
      slamHitStopMs: 90,
      roarAtMs: 1560,
      roarShake: { ms: 650, intensity: 0.006 },
      barAtMs: 1800,
      endMs: 2500,
      debris: 26,
      dust: 22,
    },
    cracks: { everyPct: 0.07, max: 12, segments: [4, 7] as const, stepPx: [26, 48] as const },
    armor: {
      formMs: 700,
      /** Barrier radius (design px) around his chest, and its look. */
      radius: 180,
      spinDegPerSec: 14,
      plates: 6,
      glowAlpha: 0.42,
      pulseMs: 1600,
      chipMs: 420,
      color: 0xe8b04a,
    },
    summon: {
      /** Anticipation: hand raised, purple energy flowing in. */
      chargeMs: 820,
      slamMs: 280,
      inflowPerSec: 50,
      /** Summoned imps leap out of the wall cracks. */
      burstLeapPx: 70,
      burstMs: 480,
    },
    stun: {
      stars: 5,
      starOrbit: { rx: 78, ry: 24 },
      starSpinMs: 900,
      wobblePx: 6,
      wobbleHz: 2.2,
      gemBoost: 1.8,
      /** Recovery: a quick head shake. */
      shakeOffMs: 620,
      shakeOffPx: 14,
    },
    lowHp: {
      stumbleEveryMs: [5000, 9000] as const,
      stumbleMs: 800,
      stumbleDropPx: 22,
      stumbleTiltDeg: 4,
      embersPerSec: 7,
    },
    shatter: { grid: 4, flyPx: [220, 720] as const, spinDeg: 540, ms: 1500 },
  },

  /** Team finisher (the Arrow of Arash). World-side timings; hold/segment rules are in data/finishers.ts. */
  finisher: {
    slowMo: 0.12,
    desaturate: 0.8,
    darken: 0.22,
    titleMs: 900,
    /** Ring around the hero's chest. */
    ringRadius: 230,
    ringLift: 150,
    segmentGapDeg: 7,
    spiritFlyMs: 540,
    arrowScale: 1.6,
    flightMs: 1350,
    earlyFlightMs: 520,
    camZoom: 1.2,
    freezeMs: 380,
    flash: { alpha: 0.9, ms: 750 },
    shockwaveMs: 950,
    floodMs: 2200,
    victoryTitleAtMs: 1000,
    panelAtMs: 3300,
  },

  /**
   * Surprise: the Simorgh's feather. When the barrier first rises, the great bird's shadow sweeps the
   * arena and one feather drifts onto the hero's bow; the next arrow flies guided to the gem.
   */
  simorgh: {
    enabled: true,
    delayMs: 1700,
    sweepMs: 1500,
    shadowAlpha: 0.3,
    shadowScale: 2.4,
    feathers: 9,
    featherFlyMs: 1500,
    homingDegPerSec: 520,
    gustMs: 1700,
  },

  // ---------------------------------------------------------------- team feel (HUD)

  /** The group Div bar at the top: the whole group's shared foe. */
  groupBar: {
    width: 560,
    /** Displayed fill eases to the value with this time constant. */
    drainMs: 140,
    /** A teammate's chunk: the white trail waits, then drains. */
    trailDelayMs: 420,
    trailDrainMs: 520,
    /** Gold flare at the fill's edge when the player's stream lands. */
    edgeFlareMs: 260,
    bannerSwayDeg: 4,
    bannerSwayMs: 3800,
  },

  /** Gold stream from the player's hit up to the group bar ("my shot → our goal"). */
  stream: {
    /** Motes per damaging hit / crit / kill bonus. */
    motes: 3,
    critMotes: 6,
    killBonus: 2,
    staggerMs: 35,
    flightMs: [520, 760] as const,
    /** Sideways wander of the curve (px) and how high above the hit the control point sits. */
    spreadPx: 220,
    liftPx: 380,
    trailChance: 0.7,
    pool: 48,
  },

  /** Teammate toasts (right side, RTL: avatar on the right). */
  toast: {
    /** Scale of ui_toast_frame (its art is 480×149 inside a 640×160 box). */
    scale: 1,
    /** Right edge of the art, and the two slot centres (y). */
    rightX: 1068,
    slotsY: [360, 520] as readonly number[],
    inMs: 460,
    outMs: 260,
    holdMs: 2600,
    /** Waits at most this long for a calm moment, then shows while busy (never while blocked). */
    busyPatienceMs: 2600,
    /** Min gap between two toasts appearing. */
    gapMs: 650,
    sparkMs: 620,
  },

  /** زنجیرهٔ درفش indicator: flame, multiplier and countdown ring, per tier (index = tier). */
  chain: {
    x: 96,
    y: 200,
    ringR: 44,
    flameScale: [0, 0.62, 0.84, 1.08] as readonly number[],
    flameTint: [0, 0xff7a1c, 0xffb42a, 0xffd84a] as readonly number[],
    coreTint: [0, 0xffd890, 0xfff0b0, 0x8fe4ff] as readonly number[],
    glowAlpha: [0, 0.3, 0.45, 0.6] as readonly number[],
    /** Embers per second. */
    embers: [0, 3, 10, 24] as readonly number[],
    ringColor: [0, 0xff9a3a, 0xffd24a, 0xfff6d8] as readonly number[],
    /** Under this much time left the ring blinks. */
    warnAt: 0.22,
  },

  /** Combo badge tiers (combo ≥ value) and their flames. */
  combo: {
    x: 118,
    y: 640,
    tiers: [2, 5, 10, 20] as readonly number[],
    /** Flame particles per second behind the badge, per tier. */
    flames: [0, 6, 14, 26] as readonly number[],
    flameScale: [0, 0.45, 0.65, 0.9] as readonly number[],
    flameTint: [
      [0xff7a2a, 0xffb040],
      [0xff7a2a, 0xffb040],
      [0xffa030, 0xffe070],
      [0xffe070, 0xffffff, 0x9fe8ff],
    ] as readonly (readonly number[])[],
    textStops: [
      ['#e8402c', '#a8160e', '#5a0806'],
      ['#e8402c', '#a8160e', '#5a0806'],
      ['#ff5a1c', '#b8240a', '#5a0a02'],
      ['#ff2e5a', '#a8083a', '#40021e'],
    ] as readonly (readonly string[])[],
    shatter: { grid: 3, ms: 650, speed: [260, 560] as const, gravity: 1400, spinDeg: 360 },
  },

  hearts: {
    scale: 0.55,
    x: 52,
    gap: 70,
    y: 76,
    refillMs: 520,
  },

  /** یاری هم‌رزم: a teammate's spirit revives the hero once per run. */
  rescue: {
    enabled: true,
    slowMo: 0.15,
    dimAlpha: 0.72,
    dimInMs: 320,
    spiritDelayMs: 380,
    spiritFlyMs: 1100,
    reviveHoldMs: 450,
    undimMs: 600,
    shockPxPerMs: 2.2,
  },

  /**
   * Surprise: تیرباران هم‌رزمان (the host's volley). When the arena gets crowded near the hero, a war
   * horn sounds, the teammates who are in the fight rise along the bottom edge behind the hero, and
   * each looses one arrow in their school's colour that arcs over and plunges onto the enemy nearest
   * the hero, with their name popping above the hit.
   */
  volley: {
    enabled: true,
    /** Enemies in the danger zone (feet below this y) needed to call it… */
    dangerY: 1030,
    dangerCount: 3,
    /** …or one enemy about to lunge while the hero is on their last heart. */
    lastHeartY: 1300,
    firstAfterMs: 15000,
    cooldownMs: 40000,
    maxPerRun: 2,
    /** One arrow per active teammate, up to this many. */
    maxArrows: 6,
    damage: 140,
    riseMs: 520,
    firstShotMs: 700,
    staggerMs: 110,
    flightMs: 820,
    arcPx: 520,
    holdMs: 1500,
  },

  /** Phaser FX (glow, barrel, bloom, colour matrix). Only in WebGL, and off with "light effects". */
  shaderFx: true,

  // ---------------------------------------------------------------- hero

  hero: {
    breathe: 0.014,
    breathMs: 2600,
    /** Cape / body sway at the top of the figure; the legs (below swayStart) stay put. */
    swayPx: 3.5,
    swayMs: 3400,
    swayStart: 0.2,
    /** While drawing: the upper body leans back (toward the camera) and the bow flexes. */
    leanBackPx: 12,
    tension: 0.03,
    bowFlex: 0.08,
    leanTowardAim: 0.12,
    aura: { pulseMs: 300, scale: [1.8, 2.5] as const, alpha: 0.85 },
    sparkleEveryMs: 70,
    recoil: { nudgePx: 12, squash: 0.08, ms: 280 },
    releaseEaseMs: 240,
    /** The draw/full pose stays this long after release before easing back to idle. */
    releasePoseMs: 90,
    /** Fully drawn: leans further back and trembles a little with the strain. */
    fullLeanBackPx: 20,
    strainPx: 1.2,
    /** After release: the bow shakes and the cape flicks, on a spring. */
    followThrough: { flickPx: 12, bowShake: 0.06, hz: 5.5, damping: 0.25 },
    /** A tiny scale punch that hides pose swaps. */
    posePunch: 0.03,
    hurt: { ms: 560, flashMs: 120, knockbackPx: 26, blinkMs: 80, invulnerableMs: 900 },
    /** Golden shimmer while shielded after a rescue. */
    shimmer: { hz: 3.2, tint: 0xffe08a },
  },

  // ---------------------------------------------------------------- arrows, numbers

  arrow: {
    trailSpacing: 16,
    trail: { lifeMs: 200, scale: 0.42, alpha: 0.7 },
    critTrail: { lifeMs: 340, scale: 0.85, alpha: 1 },
    /** Stuck in a pillar or wall: shaft sinks in, quivers, stays, fades. */
    stickMs: 1500,
    stickFadeMs: 350,
    stickDepthPx: 14,
    quiverDeg: 6,
    quiverMs: 300,
    /** Bounced off a shield: tumbles away and fades. */
    deflectMs: 480,
  },

  numbers: {
    lifeMs: 820,
    risePx: 130,
    driftPx: 40,
    popMs: 180,
    overshoot: 1.35,
    size: 60,
    critSize: 96,
  },

  /** Per-event particle counts (full quality). */
  particles: {
    trailMax: 160,
    hitSparks: 12,
    critSparks: 26,
    bounceSparks: 10,
    goldenBurst: 14,
    snap: 8,
    absorbDust: 8,
    spawnSmoke: 12,
    deathSmoke: 14,
    deathSparkles: 12,
    comboCoins: 9,
    stepDust: 5,
    clang: 14,
    lungeSmoke: 16,
  },

  // ---------------------------------------------------------------- enemies

  enemy: {
    spawn: { popMs: 380, overshoot: 1.1, delayMs: 180 },
    walk: { tiltDeg: 4, speedJitter: 0.1 },
    hitFlashMs: 80,
    hitPoseMs: 150,
    knockbackPx: 22,
    knockbackDecayMs: 90,
    squash: 0.2,
    squashMs: 180,
    /** Deaths pick one of three dissolves: pop, spin, crumble. */
    death: { ms: 320, pop: 1.2, spinTurns: 1.4, crumbleMs: 420 },
    /** Golden dissolve when the finisher's shockwave sweeps them away. */
    goldMs: 520,
    hpBar: { h: 12, drainMs: 80, trailDelayMs: 300, trailDrainMs: 260 },
    lunge: { windupMs: 240, dashMs: 190, squash: 0.18, crouchPx: 10 },
  },
  imp: {
    stridePx: 30,
    bobPx: 6,
    driftPx: 55,
    driftPeriodMs: 3200,
    pause: { chancePerSec: 0.1, ms: 750, hopPx: 16, hops: 2, flickMs: 90, tiltDeg: 6 },
    /** The other pause idle: a quick head scratch (fidgety wiggle). */
    scratch: { ms: 800, wiggleDeg: 3.5, wiggleHz: 11 },
  },
  shield: {
    stridePx: 46,
    bobPx: 4,
    /** Raise the shield when the aim line passes this close to it. */
    raise: { marginPx: 30, liftPx: 7, scale: 0.05, easeMs: 120 },
    /** Sometimes stops to bang the shield. */
    pause: { chancePerSec: 0.07, ms: 1000, bangs: 2 },
  },
  flyer: {
    flapMs: 105,
    /** Banks into its zig-zag turns. */
    bankDeg: 8,
    hoverPx: 150,
    bobPx: 10,
    bobMs: 760,
    zigPx: 105,
    zigPeriodMs: 2800,
    tumble: { ms: 440, turns: 0.55, dropPx: 45 },
    shadowMinScale: 0.55,
  },
} as const;

export type Feel = typeof FEEL;
