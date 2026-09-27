import Phaser from 'phaser';
import { EFFECT_COLOR, pickEraEvent, type EraEventDef } from '../data/eraEvents';
import type { EraDef } from '../data/eras';
import type { MoodDef } from '../data/moods';
import { pickWeather, type WeatherDef, type WeatherId } from '../data/weather';
import type { Enemy } from '../entities/Enemy';
import { Sky } from '../render/Sky';
import { services } from '../services';
import { newDirector, planWave, type DirectorState } from './director';

export interface HappeningsHost {
  enemies(): readonly Enemy[];
  hero(): { x: number; y: number };
  /** False during the tutorial, the boss, cutscenes, the end of the run. */
  canSurprise(): boolean;
  headline(kicker: string, title: string, line: string, color: number): void;
  /** Base (era + omen + mood + difficulty) drift and fire, before the weather bends them. */
  baseDrift(): number;
  baseFire(): number;
  setDrift(degPerSec: number): void;
  setFire(mul: number): void;
  /** Weather's walk-time multiplier for every enemy (1 = none). */
  setEnemyTime(mul: number): void;
  // Event effects.
  decree(): void;
  treasury(): void;
  blessing(): void;
  reinforcements(): void;
  uprising(): void;
  /** A lightning bolt struck an enemy. */
  struck(e: Enemy, damage: number, killed: boolean): void;
}

const STRIKE_DAMAGE = 70;
const STRIKE_RADIUS = 150;

/**
 * Everything that happens *to* the battle rather than in it: the run's mood (time of day / season,
 * via Sky), weather rolling in mid-run, and historical events of the era with a headline and a
 * gameplay effect. The surprise director decides per wave; this runs it and applies the effects.
 */
export class Happenings {
  readonly sky: Sky;
  private readonly director: DirectorState = newDirector();
  private readonly shown = new Set<string>();
  private lastWeather: WeatherId | null = null;
  private lastFire = -1;
  private readonly params = new URLSearchParams(window.location.search);

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly era: EraDef,
    mood: MoodDef,
    flames: readonly { x: number; y: number }[],
    paintedBg: boolean,
    private readonly host: HappeningsHost,
  ) {
    this.sky = new Sky(scene, mood, flames, {
      strikeTarget: () => {
        const alive = host.enemies().filter((e) => e.alive && e.hittable);
        if (!alive.length) return null;
        const e = alive[Math.floor(Math.random() * alive.length)];
        return { x: e.hitX, y: e.hitY };
      },
      onStrike: (x, y) => {
        if (!host.canSurprise()) return;
        for (const e of host.enemies()) {
          if (!e.alive || !e.hittable || Math.hypot(e.hitX - x, e.hitY - y) > STRIKE_RADIUS) continue;
          host.struck(e, STRIKE_DAMAGE, e.crush(STRIKE_DAMAGE));
        }
      },
    }, paintedBg);
  }

  /** A wave began: maybe weather, maybe history, at a random moment of it. */
  waveStarted(index: number): void {
    const plan = planWave(this.director, index);
    // Testing: ?weather=<id> / ?event=1 force one into every wave from the second on.
    if (index >= 1 && this.params.get('weather')) plan.weatherAt = 1500;
    if (index >= 1 && this.params.get('event')) plan.eventAt = 4500;
    if (plan.weatherAt >= 0) this.scene.time.delayedCall(plan.weatherAt, () => this.startWeather());
    if (plan.eventAt >= 0) this.scene.time.delayedCall(plan.eventAt, () => this.fireEvent());
  }

  startWeather(forced?: WeatherDef): void {
    if (!this.host.canSurprise()) return;
    const w = forced ?? pickWeather(Math.random, this.lastWeather, this.params.get('weather'));
    this.lastWeather = w.id;
    this.sky.begin(w);
    this.host.headline('آب‌وهوا', w.name, w.line, w.accent);
  }

  fireEvent(forced?: EraEventDef): void {
    if (!this.host.canSurprise()) return;
    const ev = forced ?? pickEraEvent(this.era.id, Math.random, this.shown);
    if (!ev) return;
    this.shown.add(ev.title);
    this.host.headline(`رویداد تاریخی · عصر ${this.era.name} · ${ev.year}`, ev.title, ev.line, EFFECT_COLOR[ev.effect]);
    const h = this.host;
    switch (ev.effect) {
      case 'decree': h.decree(); break;
      case 'treasury': h.treasury(); break;
      case 'blessing': h.blessing(); break;
      case 'reinforcements': h.reinforcements(); break;
      case 'uprising': h.uprising(); break;
      case 'truce':
        for (const e of h.enemies()) e.slow(6500, 0.35);
        services.audio.play('featherChime');
        break;
      case 'ambush':
        for (const e of h.enemies()) e.slow(6000, 1.55);
        services.audio.play('horn');
        break;
    }
  }

  /** Per frame: the sky, and the weather's pull on arrows, fire and enemies (only in play). */
  update(dt: number, inPlay: boolean): void {
    this.sky.update(dt);
    if (!inPlay) return;
    const w = this.sky.current;
    const k = w?.strength ?? 0;
    this.host.setDrift(this.host.baseDrift() + (w ? w.def.driftDegPerSec * k : 0));
    const fire = this.host.baseFire() * (w ? 1 + (w.def.fireMul - 1) * k : 1);
    if (Math.abs(fire - this.lastFire) > 0.01) {
      this.lastFire = fire;
      this.host.setFire(fire);
    }
    // Multiplied into each enemy's walk, so a truce, an ambush or a power's slow still stack on it.
    this.host.setEnemyTime(w ? 1 - (1 - w.def.enemyTimeMul) * k : 1);
  }

  /** The run ended (or the boss rose): clear skies for the finale. */
  calm(): void {
    this.sky.end();
  }
}
