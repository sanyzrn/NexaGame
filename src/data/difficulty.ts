/**
 * درجهٔ سختی. Chosen on the title's menu and saved on the device; applied on top of the era's own
 * scaling (hp, speed) and the day's omen. Harder levels pay more score, so the group leaderboard
 * rewards courage without locking anyone out of the story.
 */
export type DifficultyId = 'easy' | 'normal' | 'hard' | 'legend';

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  /** One line for the picker. */
  line: string;
  hearts: number;
  enemyHpMul: number;
  enemySpeedMul: number;
  bossHpMul: number;
  scoreMul: number;
  /** Badge colour on the menus. */
  color: number;
}

export const DIFFICULTIES: readonly DifficultyDef[] = [
  { id: 'easy', name: 'آسان', line: '۴ جان، دیوهای کندتر و ضعیف‌تر', hearts: 4, enemyHpMul: 0.75, enemySpeedMul: 0.85, bossHpMul: 0.75, scoreMul: 0.8, color: 0x3fae6a },
  { id: 'normal', name: 'معمولی', line: 'همان‌گونه که پهلوانان جنگیدند', hearts: 3, enemyHpMul: 1, enemySpeedMul: 1, bossHpMul: 1, scoreMul: 1, color: 0x4a8fe6 },
  { id: 'hard', name: 'سخت', line: 'دیوهای تندتر و سرسخت‌تر · امتیاز ×۱٫۳۵', hearts: 3, enemyHpMul: 1.3, enemySpeedMul: 1.12, bossHpMul: 1.35, scoreMul: 1.35, color: 0xe0782e },
  { id: 'legend', name: 'افسانه‌ای', line: 'فقط ۲ جان، برای رستم‌ها · امتیاز ×۱٫۸', hearts: 2, enemyHpMul: 1.6, enemySpeedMul: 1.25, bossHpMul: 1.7, scoreMul: 1.8, color: 0xd23a2e },
];

export const DIFFICULTY_BY_ID: ReadonlyMap<DifficultyId, DifficultyDef> = new Map(DIFFICULTIES.map((d) => [d.id, d]));
