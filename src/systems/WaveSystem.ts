import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { ARENA } from '../data/arena';
import { WAVES, scheduleWave, type ScheduledSpawn } from '../data/waves';
import { Enemy, type EnemyHooks, type EnemyWorld, type SpawnOptions } from '../entities/Enemy';
import { Signal } from '../utils/Signal';

export interface WaveInfo {
  /** 0-based wave index. */
  index: number;
  /** Waves in this level (the White Div rises after the last one). */
  total: number;
}

/** Enemy objects are reused; this many exist up front (the pool grows if a wave ever needs more). */
const POOL = 28;

/**
 * Runs the level's waves (the first BALANCE.boss.afterWave of data/waves.ts): spawns each wave's
 * enemies on schedule from a pool, reports when a wave starts and is cleared, then waits and starts
 * the next. After the last one it reports onAllCleared (the boss rises) and stops; the boss can
 * still summon enemies from the same pool.
 *
 * `mods` (set before start): the omen of the day — enemy speed multiplier and a schedule filter
 * (e.g. extra flyers on a night-of-tulips run).
 */
export class WaveSystem {
  readonly onWaveStart = new Signal<WaveInfo>();
  readonly onWaveCleared = new Signal<WaveInfo>();
  /** Every wave of the level is done. */
  readonly onAllCleared = new Signal<WaveInfo>();
  readonly enemies: Enemy[] = [];
  readonly info: WaveInfo = { index: -1, total: Math.min(WAVES.length, BALANCE.boss.afterWave) };
  /** The omen of the day, applied to spawns (set by GameScene before start). */
  mods: { speedMul?: number; filter?: (q: ScheduledSpawn[]) => ScheduledSpawn[] } = {};

  private queue: ScheduledSpawn[] = [];
  private next = 0;
  private waveT = 0;
  private waitLeft = 0;
  private running = false;
  private stopped = true;

  constructor(private readonly scene: Phaser.Scene, private readonly hooks: EnemyHooks) {
    for (let i = 0; i < POOL; i++) this.enemies.push(new Enemy(scene, hooks));
  }

  start(): void {
    this.stopped = false;
    this.running = false;
    this.waitLeft = BALANCE.waves.startDelayMs;
  }

  /** No more spawns (enemies already on the field keep going). */
  stop(): void {
    this.stopped = true;
  }

  get aliveCount(): number {
    let n = 0;
    for (const e of this.enemies) if (e.alive) n++;
    return n;
  }

  /** Spawns still to come in the current wave. */
  get pending(): number {
    return this.running ? this.queue.length - this.next : 0;
  }

  update(dt: number, world: EnemyWorld): void {
    for (const e of this.enemies) e.update(dt, world);
    if (this.stopped) return;

    if (!this.running) {
      this.waitLeft -= dt;
      if (this.waitLeft <= 0) this.begin();
      return;
    }
    this.waveT += dt;
    while (this.next < this.queue.length && this.queue[this.next].at <= this.waveT) this.spawn(this.queue[this.next++]);
    if (this.next >= this.queue.length && this.aliveCount === 0) {
      this.running = false;
      this.waitLeft = BALANCE.waves.betweenMs;
      this.onWaveCleared.emit(this.info);
      if (this.info.index >= this.info.total - 1) {
        this.stopped = true;
        this.onAllCleared.emit(this.info);
      }
    }
  }

  /** The boss calls enemies out of the wall: they burst from these cracks. */
  summon(count: number, points: readonly { x: number; y: number }[], types: readonly Enemy['type'][] = ['imp']): void {
    const start = Math.floor(Math.random() * points.length);
    for (let i = 0; i < count; i++) {
      const pt = points[(start + i) % points.length];
      const type = types[i % types.length];
      this.freeEnemy().spawn(type, pt.x + Phaser.Math.Between(-30, 30), 1, pt.y, { speedMul: this.mods.speedMul });
    }
  }

  /** Every enemy on the field dissolves in gold (the finisher's shockwave), nearest first. */
  clearAll(fromX: number, fromY: number, pxPerMs: number): void {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - fromX, e.y - fromY);
      this.scene.time.delayedCall(d / pxPerMs, () => e.vanish());
    }
  }

  /** One enemy at `x`: from the top edge, or bursting in at `y` (the tutorial's shield-bearer). */
  spawnOne(type: Enemy['type'], x: number, y?: number, opts?: SpawnOptions): Enemy {
    const e = this.freeEnemy();
    e.spawn(type, x, 1, y, opts);
    return e;
  }

  /** Enemies within `radius` of a point dissolve in gold (the rescue's shockwave), nearest first. */
  clearNear(fromX: number, fromY: number, radius: number, pxPerMs: number): void {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - fromX, e.y - fromY);
      if (d <= radius) this.scene.time.delayedCall(d / pxPerMs, () => e.vanish());
    }
  }

  private begin(): void {
    const info = this.info;
    info.index++;
    let q = scheduleWave(WAVES[info.index], Math.random);
    if (this.mods.filter) q = this.mods.filter(q);
    this.queue = q;
    this.next = 0;
    this.waveT = 0;
    this.running = true;
    this.onWaveStart.emit(info);
  }

  private freeEnemy(): Enemy {
    let e = this.enemies.find((q) => !q.active);
    if (!e) {
      e = new Enemy(this.scene, this.hooks);
      this.enemies.push(e);
    }
    return e;
  }

  private spawn(s: ScheduledSpawn): void {
    const m = BALANCE.waves.sideMargin;
    const x = ARENA.walls.left + m + s.x * (ARENA.walls.right - ARENA.walls.left - m * 2);
    this.freeEnemy().spawn(s.type, x, 1, undefined, { elite: s.elite, speedMul: this.mods.speedMul });
  }
}
