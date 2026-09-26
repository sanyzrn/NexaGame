/**
 * Arena layout for "The First Trial", in design px (1080x1920), matched to bg_arena_01.
 * The placeholder background is painted from these numbers too, so both stay in sync.
 * Edit freely — the debug overlay (` key or 3-finger tap) draws walls, lines and collision shapes.
 */
export const ARENA = {
  walls: {
    /** Arrows ricochet off the side walls… */
    left: 125,
    right: 955,
    /** …and are absorbed by the top wall (the White Div waits behind it). */
    top: 300,
    /** Below this arrows are simply removed. */
    bottom: 1920,
  },

  /** Hero anchor (feet), on the mosaic platform. */
  hero: { x: 540, y: 1690 },
  platform: { x: 540, y: 1652, r: 240 },

  /** Enemies appear on this ground line… */
  spawnY: 345,
  /** …and lunge at the hero once their feet reach this one. */
  attackY: 1440,

  /**
   * Pillar base anchors. Mirrored in x; staggered in y like the reference.
   * For a fully symmetric layout give both the same y.
   */
  pillars: [
    { x: 262, y: 1150 },
    { x: 818, y: 1330 },
  ],

  /** Decoration only (no collision), on the side edges. `scale` multiplies the source art. */
  decor: [
    { key: 'banner', x: 58, y: 150, scale: 0.55 },
    { key: 'banner', x: 1022, y: 150, scale: 0.55, flip: true },
    { key: 'banner', x: 42, y: 1225, scale: 0.55 },
    { key: 'banner', x: 1038, y: 1240, scale: 0.55, flip: true },
    { key: 'brazier', x: 50, y: 525, scale: 0.38 },
    { key: 'brazier', x: 1030, y: 525, scale: 0.38 },
    { key: 'brazier', x: 88, y: 1795, scale: 0.4 },
    { key: 'brazier', x: 992, y: 1795, scale: 0.4 },
    /** Fire braziers INSIDE the arena: an arrow that passes through the flame catches fire.
     *  Placed high on the side walls, clear of the pillars' shadow from the hero's bow — a shot at
     *  the top corners lights up, and so does a bank shot off a side wall. */
    { key: 'brazier', x: 215, y: 700, scale: 0.52 },
    { key: 'brazier', x: 865, y: 640, scale: 0.52 },
  ],

  /**
   * Kettle-pots standing on the arena floor. Breakable (one arrow): each hides a little something,
   * rolled per run. Arrows pass through — a pot never shields an enemy.
   */
  pots: [
    { x: 322, y: 640, scale: 0.5 },
    { x: 758, y: 788, scale: 0.5, flip: true },
    { x: 540, y: 1052, scale: 0.5 },
  ],

  /** How far from a brazier flame's centre an arrow catches fire (design px). */
  fireRadius: 108,

  /**
   * The White Div, between the two lamassu reliefs. `y` is his anchor (the knuckle line).
   * lurk: sunk behind the wall during the waves, only his head over the parapet;
   * fight: risen, hands slammed onto the wall base.
   */
  boss: {
    x: 540,
    lurk: { y: 318, scale: 0.29 },
    fight: { y: 300, scale: 0.33 },
  },
  /**
   * Slices of the background redrawn over the White Div, so the wall hides him.
   * wall: everything below the parapet (while he lurks and rises); waist: only between his hands
   * once they are over the wall.
   */
  bossOccluders: {
    wall: [
      { x: 180, y: 96, w: 210, h: 330 },
      { x: 390, y: 176, w: 300, h: 250 },
      { x: 690, y: 96, w: 210, h: 330 },
    ],
    waist: [
      { x: 488, y: 298, w: 140, h: 42 },
    ],
  },
  /** Cracks in the wall base that summoned imps burst out of. */
  summonPoints: [
    { x: 300, y: 330 },
    { x: 540, y: 340 },
    { x: 780, y: 330 },
  ],

  /** Enemies step around pillars within this distance (px) of the base centre. */
  pillarAvoid: { radius: 92, ahead: 190 },
} as const;

export type ArenaDef = typeof ARENA;
