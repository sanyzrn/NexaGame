/**
 * Team finishers: a boss's last moment, charged by the whole group. Driven by config so every boss
 * can have its own. The TeamFinisher system runs the sequence; GameScene plays the world side
 * (the arrow's flight, the boss breaking).
 */
export interface FinisherDef {
  id: string;
  /** Calligraphic title shown when it starts. */
  title: string;
  /** Prompt under the ring before the player touches, and when every segment is lit. */
  holdPrompt: string;
  releasePrompt: string;
  /** Triggers when the boss falls to this fraction of its hp (the boss can't die before it). */
  triggerPct: number;
  /** Hold time to light each segment (one per teammate, plus the player). */
  segmentMs: number;
  /** Released before every segment was lit: the boss survives at this fraction… */
  earlyHpPct: number;
  /** …and the finisher is offered again after this long. */
  retryMs: number;
  /** Ring colours. */
  color: number;
  glow: number;
}

export const FINISHERS: Readonly<Record<string, FinisherDef>> = {
  /** Arash the Archer put his whole life into one arrow. */
  arash: {
    id: 'arash',
    title: 'تیر آرش — لشکر با توست!',
    holdPrompt: 'نگه دار… لشکر می‌آید',
    releasePrompt: 'رها کن!',
    triggerPct: 0.1,
    segmentMs: 480,
    earlyHpPct: 0.03,
    retryMs: 6000,
    color: 0xffd24a,
    glow: 0xfff0b0,
  },
};
