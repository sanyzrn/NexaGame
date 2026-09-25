/**
 * The player's group ("لشکر") for the demo, plus the pacing of the simulated teammates.
 * MockGameService plays these members; a real backend supplies its own through GameService,
 * with no UI changes. Chain multipliers (a gameplay number) live in balance.ts.
 */

export type School = 'rostami' | 'arashi' | 'simorghi';

export interface SchoolDef {
  /** Persian name as shown in the UI. */
  name: string;
  /** Avatar rim, toast accent, spirit and volley-trail colour. */
  color: number;
}

export const SCHOOLS: Readonly<Record<School, SchoolDef>> = {
  /** Heavy arrows that break armour. */
  rostami: { name: 'رستمی', color: 0xe0582e },
  /** Precise, long arrows at weak points. */
  arashi: { name: 'آرشی', color: 0x4a8fe6 },
  /** Healing arrows and charms that lift the whole group. */
  simorghi: { name: 'سیمرغی', color: 0x2fc4a2 },
};

export interface MockMember {
  id: string;
  name: string;
  school: School;
  /** Already in the fight when the run starts (the others "join" during it). */
  active: boolean;
  /** Telegram profile photo; empty = the generated initial avatar. */
  photoUrl?: string;
}

export const MOCK_GROUP = {
  id: 'demo-group',
  name: 'لشکر دوستان',
  bossName: 'دیو سپید',
  bossHpMax: 60_000,
  bossHp: 38_400,
  members: [
    { id: 'm1', name: 'سارا', school: 'simorghi', active: true },
    { id: 'm2', name: 'کاوه', school: 'rostami', active: true },
    { id: 'm3', name: 'نیلوفر', school: 'arashi', active: true },
    { id: 'm4', name: 'بهرام', school: 'rostami', active: true },
    { id: 'm5', name: 'مهسا', school: 'simorghi', active: false },
    { id: 'm6', name: 'داریوش', school: 'arashi', active: false },
  ] as readonly MockMember[],
};

/** How the simulated teammates behave (ms, group-Div hp). */
export const MOCK_PACING = {
  /** The first activity (someone joins) arrives this soon… */
  firstMs: 3500,
  /** …then one every this long (random in range). */
  gapMs: [6000, 10500] as const,
  /** Activities waiting for the UI; the simulation idles while this many are queued. */
  inboxMax: 2,
  /** Damage per hit by school, before the chain multiplier. A crit multiplies it. */
  damage: {
    rostami: [900, 1600] as const,
    arashi: [700, 1300] as const,
    simorghi: [400, 800] as const,
  },
  critMultiplier: 2.2,
  critChance: { rostami: 0.15, arashi: 0.35, simorghi: 0.1 },
  /** Relative odds of each activity (joins only while someone is still out). */
  weights: { damage: 5, chain: 2, join: 2 },
  /** Simorghi members lean toward the chain (they lift the group). */
  simorghiChainBonus: 2,
  /** Teammates never take the Div below this fraction during a demo run. */
  hpFloorPct: 0.05,
} as const;

/** The player's own colour in team moments (the last ring segment, the gold stream). */
export const PLAYER_COLOR = 0xffd24a;

/** A member as the team moments draw them (finisher spirits, rescue, volley). */
export interface TeamMember {
  name: string;
  color: number;
  /** Texture key of the member's avatar (see ui/avatar.ts). */
  avatar?: string;
}
