/**
 * Per-entity display and collision data — the only file to touch when real art replaces a placeholder
 * (besides dropping the PNG in /assets-src).
 *
 * Units:
 * - hitboxes, hp bars, bow point, shield: design px relative to the entity anchor, at the entity's scale;
 * - shadows and prop attachment points: source-box px (the manifest size), scaled with the art.
 * The debug overlay (` key or 3-finger tap) draws hitboxes so they can be tuned against the art.
 */

export interface CircleBox { type: 'circle'; x: number; y: number; r: number }
export interface RectBox { type: 'rect'; x: number; y: number; w: number; h: number }
export type Hitbox = CircleBox | RectBox;

export const circle = (x: number, y: number, r: number): CircleBox => ({ type: 'circle', x, y, r });
export const rect = (x: number, y: number, w: number, h: number): RectBox => ({ type: 'rect', x, y, w, h });

/** Soft floor shadow ellipse (radii in source-box px). */
export interface ShadowDef { rx: number; ry: number }

/**
 * Anchors for REAL art, per pose (0..1 of the manifest box). Placeholders are drawn at the manifest
 * anchor, so these only apply when the PNG exists. `flip` mirrors a pose (e.g. to keep a shield in the
 * same hand across walk frames). Regenerate suggestions with `npm run anchors -- --sheet`.
 */
export const ART_ANCHORS: Readonly<Record<string, { ox: number; oy: number; flip?: boolean }>> = {
  hero_idle: { ox: 0.502, oy: 0.928 },
  hero_draw: { ox: 0.52, oy: 0.883 },
  hero_full: { ox: 0.522, oy: 0.934 },
  imp_walk_1: { ox: 0.494, oy: 0.965 },
  imp_walk_2: { ox: 0.504, oy: 0.969 },
  imp_hit: { ox: 0.568, oy: 0.934 },
  // walk_1 is drawn mirrored (shield in the left hand): flip it so the shield stays on the right.
  shield_walk_1: { ox: 0.459, oy: 0.979, flip: true },
  shield_walk_2: { ox: 0.541, oy: 0.982 },
  shield_hit: { ox: 0.516, oy: 0.974 },
  flyer_up: { ox: 0.521, oy: 0.5 },
  flyer_down: { ox: 0.491, oy: 0.5 },
  flyer_hit: { ox: 0.55, oy: 0.5 },
};

/**
 * When a pose has no real art but its fallback does, the fallback is shown instead of the
 * code-drawn placeholder (so one missing file doesn't put a doodle among painted sprites).
 */
export const POSE_FALLBACK: Readonly<Record<string, string>> = {
  hero_hurt: 'hero_idle',
  imp_hit: 'imp_walk_1',
  shield_hit: 'shield_walk_2',
  flyer_hit: 'flyer_up',
  slinger_hit: 'slinger_walk_1',
  slinger_throw: 'slinger_walk_1',
  bomber_hit: 'bomber_walk_1',
  wraith_hit: 'wraith_walk_1',
  boss_roar: 'boss_idle',
  boss_stunned: 'boss_idle',
};

export const HERO = {
  poses: { idle: 'hero_idle', draw: 'hero_draw', full: 'hero_full', hurt: 'hero_hurt' },
  scale: 0.56,
  /** Arrow spawn point (the bow), relative to the hero anchor (feet). */
  bow: { x: 0, y: -210 },
  hitbox: circle(0, -120, 62),
  shadow: { rx: 110, ry: 30 } as ShadowDef,
} as const;

export const PILLAR = {
  key: 'pillar_01',
  scale: 0.58,
  /** Collision against arrows (the column shaft), relative to the base anchor. */
  collision: rect(-44, -330, 88, 290),
  shadow: { rx: 118, ry: 30 } as ShadowDef,
} as const;

/** Decoration props (no collision). */
export const PROPS = {
  brazier: {
    shadow: { rx: 118, ry: 30 } as ShadowDef,
    /** Base of the fire in the bowl, and its height (source-box px, relative to the anchor). */
    flame: { x: 0, y: -150, h: 110 },
  },
  pot: { shadow: { rx: 72, ry: 20 } as ShadowDef },
  banner: {},
} as const;

export interface EnemyDef {
  poses: { walk: readonly string[]; hit: string; throw?: string };
  scale: number;
  hitbox: CircleBox;
  /** Health bar centre, relative to the anchor (tight above the head). */
  hpBar: { y: number; w: number };
  shadow: ShadowDef;
  /** Impact spark colour. */
  color: number;
}

export const ENEMIES = {
  imp: {
    poses: { walk: ['imp_walk_1', 'imp_walk_2'], hit: 'imp_hit' },
    scale: 0.48,
    hitbox: circle(0, -56, 46),
    hpBar: { y: -126, w: 84 },
    shadow: { rx: 78, ry: 20 },
    color: 0xc77dff,
  },
  shield: {
    poses: { walk: ['shield_walk_1', 'shield_walk_2'], hit: 'shield_hit' },
    scale: 0.6,
    hitbox: circle(0, -110, 72),
    hpBar: { y: -232, w: 120 },
    shadow: { rx: 108, ry: 28 },
    color: 0xffb347,
  },
  flyer: {
    poses: { walk: ['flyer_up', 'flyer_down'], hit: 'flyer_hit' },
    scale: 0.62,
    hitbox: circle(0, 6, 50),
    hpBar: { y: -98, w: 90 },
    shadow: { rx: 78, ry: 20 },
    color: 0xe0629a,
  },
  slinger: {
    poses: { walk: ['slinger_walk_1', 'slinger_walk_2'], hit: 'slinger_hit', throw: 'slinger_throw' },
    scale: 0.52,
    hitbox: circle(0, -64, 48),
    hpBar: { y: -142, w: 92 },
    shadow: { rx: 82, ry: 21 },
    color: 0xa8c46a,
  },
  bomber: {
    poses: { walk: ['bomber_walk_1', 'bomber_walk_2'], hit: 'bomber_hit' },
    scale: 0.6,
    hitbox: circle(0, -92, 64),
    hpBar: { y: -196, w: 110 },
    shadow: { rx: 104, ry: 26 },
    color: 0x7ad84a,
  },
  wraith: {
    poses: { walk: ['wraith_walk_1', 'wraith_walk_2'], hit: 'wraith_hit' },
    scale: 0.56,
    hitbox: circle(0, -78, 50),
    hpBar: { y: -172, w: 88 },
    shadow: { rx: 74, ry: 16 },
    color: 0x9fe8ff,
  },
} as const satisfies Record<string, EnemyDef>;

export type EnemyType = keyof typeof ENEMIES;

/** The shield disc of the shield-bearer (frontal arrows clang off it), relative to the anchor. */
export const SHIELD_DISC = circle(38, -103, 55);

export interface Point2 { x: number; y: number }

/** Hit zones and attachment points of one White Div pose (source-box px, relative to the anchor). */
export interface BossPoseDef {
  /** Arrows hit this circle… */
  body: CircleBox;
  /** …and count as weak-point hits if they pass through this one (the chest gem). */
  gem: CircleBox;
  eyes: readonly Point2[];
  /** Centre of the head (stun stars circle it). */
  head: Point2;
}

/**
 * The White Div. Everything in source-box px (1024 box) relative to the anchor — the knuckle line —
 * and scaled with him; it follows his breathing and bending (BendSprite.worldPoint).
 */
export const BOSS = {
  poses: { idle: 'boss_idle', roar: 'boss_roar', stunned: 'boss_stunned' },
  zones: {
    boss_idle: {
      body: circle(20, -340, 300), gem: circle(38, -275, 72),
      eyes: [{ x: -22, y: -558 }, { x: 41, y: -558 }], head: { x: 10, y: -560 },
    },
    boss_roar: {
      body: circle(20, -380, 300), gem: circle(23, -225, 72),
      eyes: [{ x: -22, y: -550 }, { x: 48, y: -550 }], head: { x: 8, y: -545 },
    },
    boss_stunned: {
      body: circle(20, -340, 300), gem: circle(43, -275, 72),
      eyes: [{ x: -22, y: -545 }, { x: 48, y: -555 }], head: { x: 8, y: -560 },
    },
  } as Readonly<Record<string, BossPoseDef>>,
  /** Glow drawn over the gem (radius, source px). */
  gemGlowR: 46,
  /** Armor plates where damage cracks start (idle pose): shoulder pads, bracers, chest, belt. */
  armor: [
    { x: -292, y: -460 }, { x: 288, y: -460 }, { x: -382, y: -130 }, { x: 388, y: -130 },
    { x: -210, y: -420 }, { x: 210, y: -420 }, { x: -60, y: -300 }, { x: 90, y: -300 }, { x: 68, y: -95 },
  ] as readonly Point2[],
  /** Shine sweeps along the shoulder-pad edges (idle pose). */
  shine: [
    [{ x: -452, y: -410 }, { x: -320, y: -470 }, { x: -182, y: -500 }],
    [{ x: 188, y: -500 }, { x: 320, y: -470 }, { x: 448, y: -400 }],
  ] as readonly (readonly Point2[])[],
  /** The raised hand in the roar pose, where summoning energy gathers. */
  hand: { x: -322, y: -730 },
  /** Knuckles in the idle pose: slam dust and wall cracks. */
  knuckles: [{ x: -312, y: 50 }, { x: 368, y: 60 }] as readonly Point2[],
} as const;
