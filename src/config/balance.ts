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
    /** سنگ‌انداز: stops at slinger.rangeY and lobs destructible rocks at the hero. */
    slinger: {
      hp: 90,
      speed: 58,
      /** Walks down to a random stop line in this band, then holds position. */
      stopY: [640, 900] as const,
      /** First throw after arriving, then one every cooldownMs (±20%). */
      firstThrowMs: 900,
      cooldownMs: 3000,
      /** Telegraphed wind-up before the stone leaves the sling. */
      windupMs: 820,
      rock: {
        hp: 1,
        /** Flight time and arc height of the lob. */
        flightMs: 1150,
        arcPx: 320,
        radius: 26,
        /** Aims this far ahead of the hero's bow (fraction of flight time × nothing fancy). */
        aimSpreadPx: 120,
      },
    },
    /** نفتی‌دار: a walking cauldron of naphtha. Explodes on death — use it against the crowd. */
    bomber: {
      hp: 150,
      speed: 34,
      /** Lethal damage lights the fuse instead of killing outright… */
      fuseMs: 1500,
      /** …but a fire arrow sets it off almost instantly. */
      fireFuseMs: 180,
      boom: {
        radius: 270,
        /** Damage to enemies caught in the blast (the player is never hurt by it). */
        damage: 130,
      },
    },
    /** شبح: fades in and out of the world; only solid wounds count. Fire pins it solid. */
    wraith: {
      hp: 55,
      speed: 92,
      solidMs: 2500,
      ghostMs: 1700,
      /** Shimmer warning before it slips out of the world. */
      telegraphMs: 420,
      hoverPx: 46,
    },
  },

  /** The White Div (دیو سپید). Percentages are of his max hp. */
  boss: {
    /** He rises after this many waves are cleared. */
    afterWave: 4,
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
    /** سنگ‌باران: he rips chunks of the wall and hurls them. Shoot them down. */
    boulders: {
      /** Scripted barrages when his hp first crosses these fractions (high → low). */
      at: [0.7, 0.45] as const,
      /** Then a repeating barrage while armoured / in ash fury. */
      armorEveryMs: 15000,
      furyEveryMs: 9000,
      /** In ash fury each throw looses two boulders. */
      furyCount: 2,
      hp: 60,
      radius: 88,
      flightMs: 2350,
      arcPx: 210,
      /** A boulder that lands crushes enemies this close (a gift for the quick-witted). */
      crushRadius: 150,
      crushDamage: 200,
      /** A boulder that lands near the hero staggers the bow for this long (never a heart). */
      heroStaggerMs: 1300,
      heroStaggerRadius: 300,
    },
    /** خشم خاکستری (ash fury), under lowHpPct: hotter, faster, meaner. */
    fury: { summonEveryMul: 0.65 },
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

  /**
   * School powers. The meter fills mostly from golden hits, so a power is a reward for the core skill,
   * never a replacement for it: about three golden hits (plus a few kills) per use.
   */
  power: {
    gain: { golden: 0.3, kill: 0.05, comboStep: 0.08, trickShot: 0.2 },
    /** Combo milestones that add `comboStep`. */
    comboEvery: 5,
    /** A tap on the power button: released within this long and this close counts, a drag doesn't. */
    tapMaxMs: 450,
    tapMaxMovePx: 36,
    rostami: {
      /** The quake: damage to every enemy it reaches (shields can't stop the ground). */
      damage: 90,
      radius: 1250,
      stunMs: 1300,
      pushPx: 120,
      /** Against the Div: damage, and an armoured Div's barrier shatters (he is stunned, as by a golden gem hit). */
      bossDamage: 260,
    },
    arashi: {
      /** Golden arrows loosed at once, each at its own target (the Div's gem first). */
      arrows: 3,
      staggerMs: 90,
    },
    simorghi: {
      heal: 1,
      /** The next lunge that would cost a heart is turned away. */
      wardMs: 9000,
      /** Enemies under the wings walk this much slower, for this long. */
      slow: 0.5,
      slowMs: 3500,
      /** Lifts the whole group's chain one tier. */
      chainTiers: 1,
    },
  },

  /** Surprises that touch gameplay (their looks and on/off flags are in feel.ts). */
  surprises: {
    goldenImp: { chancePerWave: 0.22, hp: 40, speed: 330, groupBonus: 1500 },
    homa: { chancePerRun: 0.1, afterMs: 22000 },
    fleeing: { combo: 12, chance: 0.3 },
    flameBow: { goldenStreak: 5, ms: 8000 },
  },

  /** Fire: arrows that pass through a brazier's flame. */
  fire: {
    /** Burn duration and tick cadence after a fire arrow hits. */
    ms: 2000,
    tickMs: 250,
    /** Damage per tick (×BALANCE.slinger-agnostic; scaled by the omen's fireMul). */
    dps: 14,
  },

  /** Kettle-pots on the floor: shoot them for a surprise. Contents are rolled per run. */
  pots: {
    hp: 1,
    /** What a broken pot may hold (rolled once per pot when the run starts). */
    loot: { coins: 0.5, triple: 0.28, heart: 0.22 } as const,
    coinsScore: 200,
    coinsPower: 0.06,
  },

  /** سه‌تیر: the next releases each loose a fan of three. */
  triple: {
    /** Max charges carried at once. */
    max: 9,
    /** Charges gained per pickup. */
    charges: 3,
    /** Side-arrow spread and their damage share (the centre arrow is untouched). */
    spreadDeg: 9,
    sideDamageMul: 0.7,
  },

  /** Elites: veterans of a later wave, marked in gold, worth more. */
  elite: {
    hpMul: 2.2,
    speedMul: 1.1,
    scaleMul: 1.14,
    /** Guaranteed drop when one dies. */
    drop: 'triple' as 'triple' | 'heart',
    scoreBonus: 250,
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
