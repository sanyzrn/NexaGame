/**
 * The player's group ("لشکر"). Simulated for the demo; a backend (GameService) will supply the real
 * members later. Colours tint each member's avatar spirit in team moments.
 */
export interface TeamMember {
  name: string;
  color: number;
}

export const DEMO_TEAM: { name: string; members: readonly TeamMember[] } = {
  name: 'لشکر دوستان',
  members: [
    { name: 'علی', color: 0x4a90e2 },
    { name: 'سارا', color: 0xe25a4a },
    { name: 'رضا', color: 0x4ab87a },
    { name: 'مریم', color: 0xb05ad8 },
    { name: 'کاوه', color: 0xe2a13a },
  ],
};

/** The player's own entry (shown last, in gold). */
export const PLAYER_COLOR = 0xffd24a;
