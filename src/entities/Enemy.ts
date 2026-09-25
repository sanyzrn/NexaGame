import Phaser from 'phaser';
import { Art } from '../assets/Art';
import { BALANCE } from '../config/balance';
import { COLORS, DEPTH, DESIGN_H, worldDepth } from '../config/display';
import { FEEL } from '../config/feel';
import { ARENA } from '../data/arena';
import { ENEMIES, SHIELD_DISC, type EnemyDef, type EnemyType } from '../data/entities';
import { Shadow } from '../render/Shadow';
import type { ArrowHit, HitOutcome, Target } from '../systems/ProjectileSystem';
import { clamp, rayCircle } from '../utils/geom';

/** Things enemies make happen in the world (sounds, effects, damage). Implemented by the Game scene. */
export interface EnemyHooks {
  spawned(e: Enemy): void;
  /** A heavy footstep (shield-bearer). */
  step(e: Enemy): void;
  taunt(e: Enemy): void;
  /** A shield-bearer bangs its shield (personality idle). */
  bang(e: Enemy): void;
  shieldRaised(e: Enemy): void;
  lungeStart(e: Enemy): void;
  reachedHero(e: Enemy): void;
  /** Left the arena without dying (a fleeing imp, the golden imp running off). */
  escaped?(e: Enemy): void;
}

/** Special kinds of life (surprises). */
export interface SpawnOptions {
  /** The rare golden imp: dashes sideways across the arena at `y`, never toward the hero. */
  golden?: boolean;
}

/** What enemies read from the world every frame (filled in place, never reallocated). */
export interface EnemyWorld {
  /** Where lunges land (the hero's body). */
  heroX: number;
  heroY: number;
  /** The aim line's first segment, while the player is aiming. */
  aiming: boolean;
  aimX: number;
  aimY: number;
  aimDX: number;
  aimDY: number;
}

const enum State { Off, Spawning, Walking, Lunging, Dying }

/** How it dies: three random dissolves, and a golden one for the finisher's shockwave. */
type DeathKind = 'pop' | 'spin' | 'crumble' | 'gold';
const DEATHS: readonly DeathKind[] = ['pop', 'spin', 'crumble'];

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
/** Flyers are in the air: drawn above everything standing on the floor. */
const AIR_DEPTH = worldDepth(DESIGN_H + 50);
let nextId = 1;

/** 0 → `peak` (at 60%) → 1: the spawn pop. */
function pop(k: number, peak: number): number {
  if (k < 0.6) {
    const u = 1 - k / 0.6;
    return peak * (1 - u * u);
  }
  const u = (k - 0.6) / 0.4;
  return peak + (1 - peak) * u * u * (3 - 2 * u);
}

/**
 * A pooled enemy of any type. Life: smoke puff and scale-up pop at the top edge → walk down
 * (never static: stepping poses, bob, waddle tilt, per-type behaviour) → lunge at the hero from
 * the attack line, or die (flash, knockback, squash, then dissolve).
 *
 * - imp: waddles with a sideways drift, sometimes stops to taunt (little hops) or scratch its head;
 * - shield-bearer: slow lurching steps with dust and a camera micro-shake; raises the shield when
 *   aimed at; arrows arriving head-on clang off it; sometimes stops to bang its shield;
 * - flyer: zig-zags in the air with fast wing flaps and a hover bob over its floor shadow; tumbles
 *   when hit.
 */
export class Enemy implements Target {
  readonly id = nextId++;
  type: EnemyType = 'imp';
  def: EnemyDef = ENEMIES.imp;
  hp = 0;
  maxHp = 1;
  /** Ground position: the feet, or the point on the floor under a flyer. */
  x = 0;
  y = 0;

  private state = State.Off;
  private readonly img: Phaser.GameObjects.Image;
  private readonly glint: Phaser.GameObjects.Image;
  private readonly shadow: Shadow;
  private readonly hpBack: Phaser.GameObjects.Rectangle;
  private readonly hpTrail: Phaser.GameObjects.Rectangle;
  private readonly hpFill: Phaser.GameObjects.Rectangle;

  /** Anchor position of the sprite this frame (for hit tests and effects). */
  private ax = 0;
  private ay = 0;
  private t = 0;
  private life = 0;
  private speed = 0;
  private stepPhase = 0;
  private lastStep = 0;
  private seed = 0;
  private popMul = 1;
  // imp
  private pauseLeft = 0;
  private pauseMs = 1;
  private tauntDone = false;
  private scratching = false;
  private bangs = 0;
  // death / spawn variants
  private death: DeathKind = 'pop';
  private deathSpin = 1;
  private deathY0 = 0;
  /** >0: bursting out of a wall crack (summoned), ms left. */
  private burstLeft = 0;
  private burstY0 = 0;
  // flyer
  private baseX = 0;
  private hoverH = 0;
  private tumbleLeft = 0;
  private tumbleDir = 1;
  // shield
  private raise = 0;
  private raisedCue = false;
  // hit feedback
  private flashLeft = 0;
  private hitPoseLeft = 0;
  private squash = 0;
  private kbX = 0;
  private kbY = 0;
  // hp bar
  private shownHp = 0;
  private trailHp = 0;
  private trailWait = 0;
  private barOn = false;
  // lunge
  private lx0 = 0;
  private ly0 = 0;
  private lx1 = 0;
  private ly1 = 0;
  private dashing = false;
  // powers & surprises
  /** The rare golden imp (runs across, never attacks). */
  golden = false;
  private goldDir = 1;
  /** Panicked at the player's combo: runs back up and away. */
  fleeing = false;
  private stunLeft = 0;
  private pushLeft = 0;
  private pushV = 0;
  private slowLeft = 0;
  private slowMul = 1;

  constructor(scene: Phaser.Scene, private readonly hooks: EnemyHooks) {
    this.img = Art.image(scene, 0, 0, ENEMIES.imp.poses.walk[0]).setVisible(false);
    this.glint = scene.add.image(0, 0, 'fx_star').setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0b0).setVisible(false);
    this.shadow = new Shadow(scene, ENEMIES.imp.shadow, ENEMIES.imp.scale).setVisible(false);
    const h = FEEL.enemy.hpBar.h;
    this.hpBack = scene.add.rectangle(0, 0, 10, h + 6, COLORS.hpBack).setStrokeStyle(3, 0x000000, 0.8).setDepth(DEPTH.hpBars);
    this.hpTrail = scene.add.rectangle(0, 0, 10, h, COLORS.hpGhost).setOrigin(0, 0.5).setDepth(DEPTH.hpBars + 0.1);
    this.hpFill = scene.add.rectangle(0, 0, 10, h, COLORS.hpRed).setOrigin(0, 0.5).setDepth(DEPTH.hpBars + 0.2);
    this.setBar(false);
  }

  /** In use (including the death animation). */
  get active(): boolean {
    return this.state !== State.Off;
  }

  /** Still a threat: counts toward the wave. */
  get alive(): boolean {
    return this.state === State.Spawning || this.state === State.Walking || this.state === State.Lunging;
  }

  get hittable(): boolean {
    const E = FEEL.enemy;
    switch (this.state) {
      case State.Walking: return true;
      case State.Spawning: return this.t > E.spawn.delayMs + E.spawn.popMs * 0.5;
      // The wind-up before the lunge is the last chance to shoot it.
      case State.Lunging: return !this.dashing;
      default: return false;
    }
  }
  get hitX(): number {
    return this.ax + this.def.hitbox.x;
  }
  get hitY(): number {
    return this.ay + this.def.hitbox.y;
  }
  get hitR(): number {
    return this.def.hitbox.r;
  }
  get color(): number {
    return this.def.color;
  }
  /** Where smoke and effects centre on the body. */
  get bodyX(): number {
    return this.hitX;
  }
  get bodyY(): number {
    return this.hitY;
  }
  /** Shield disc centre (shield-bearers). */
  get shieldX(): number {
    return this.ax + SHIELD_DISC.x;
  }
  get shieldY(): number {
    return this.ay + SHIELD_DISC.y;
  }

  blocks(_dirX: number, dirY: number, _crit = false): boolean {
    // Shield-bearers face the hero: anything arriving head-on hits the shield.
    return this.type === 'shield' && -dirY > Math.cos(BALANCE.enemies.shield.frontalDeg * DEG);
  }

  /**
   * Starts a new life. `burstFromY` (summoned by the boss): it leaps out of a crack in the wall at
   * that height instead of popping out of smoke at the top edge.
   */
  spawn(type: EnemyType, x: number, hpScale: number, burstFromY?: number, opts?: SpawnOptions): void {
    const E = FEEL.enemy;
    this.golden = !!opts?.golden;
    this.fleeing = false;
    this.stunLeft = this.pushLeft = this.slowLeft = 0;
    this.type = type;
    this.def = ENEMIES[type];
    this.maxHp = this.hp = this.shownHp = this.trailHp = Math.round(BALANCE.enemies[type].hp * hpScale);
    this.x = x;
    this.y = ARENA.spawnY;
    this.speed = BALANCE.enemies[type].speed * (1 + (Math.random() * 2 - 1) * E.walk.speedJitter);
    this.stepPhase = Math.random() * 2;
    this.lastStep = Math.floor(this.stepPhase);
    this.seed = Math.random() * 1000;
    this.state = State.Spawning;
    this.t = this.life = 0;
    this.popMul = 0;
    this.pauseLeft = this.tumbleLeft = this.flashLeft = this.hitPoseLeft = this.squash = 0;
    this.burstLeft = 0;
    if (burstFromY !== undefined) {
      this.burstLeft = FEEL.boss.summon.burstMs;
      this.burstY0 = burstFromY;
      this.y = burstFromY;
    }
    this.kbX = this.kbY = this.raise = 0;
    this.raisedCue = this.dashing = false;
    if (this.golden) {
      const G = BALANCE.surprises.goldenImp;
      this.maxHp = this.hp = this.shownHp = this.trailHp = G.hp;
      this.speed = G.speed;
      this.goldDir = x < (ARENA.walls.left + ARENA.walls.right) / 2 ? 1 : -1;
      if (burstFromY !== undefined) this.burstLeft = 0;
    }
    if (type === 'flyer') {
      const F = FEEL.flyer;
      const m = BALANCE.waves.sideMargin + F.zigPx;
      this.baseX = clamp(x, ARENA.walls.left + m, ARENA.walls.right - m);
      this.hoverH = F.hoverPx;
    }
    this.ax = this.x;
    this.ay = type === 'flyer' ? this.y - FEEL.flyer.hoverPx : this.y;
    this.shadow.configure(this.def.shadow, this.def.scale).setVisible(false);
    Art.setPose(this.img, this.def.poses.walk[0]);
    this.img.clearTint().setAlpha(1).setRotation(0).setVisible(false);
    this.glint.setVisible(false);
    this.setBar(false);
    this.hooks.spawned(this);
  }

  receiveArrow(hit: ArrowHit): HitOutcome {
    if (!this.hittable) return 'hit';
    const E = FEEL.enemy;
    const kb = E.knockbackPx * (hit.crit ? 1.8 : 1);

    if (this.blocks(hit.dirX, hit.dirY)) {
      this.raise = 1;
      this.kbX += hit.dirX * kb * 0.4;
      this.kbY += hit.dirY * kb * 0.4;
      this.squash = 0.5;
      return 'blocked';
    }

    this.hp = Math.max(0, this.hp - hit.damage);
    this.flashLeft = E.hitFlashMs;
    this.hitPoseLeft = E.hitPoseMs;
    this.squash = 1;
    this.trailWait = E.hpBar.trailDelayMs;
    this.setBar(true);
    this.kbX += hit.dirX * kb;
    this.kbY += hit.dirY * kb;
    if (this.type === 'flyer') {
      this.tumbleLeft = FEEL.flyer.tumble.ms;
      this.tumbleDir = hit.dirX >= 0 ? 1 : -1;
    }
    if (this.hp > 0) return 'hit';
    this.die(DEATHS[Math.floor(Math.random() * DEATHS.length)], hit.dirX);
    return 'kill';
  }

  /**
   * The Rostami quake: knocked back up the arena and dazed for `ms` (a lunge that hasn't struck yet
   * is broken off).
   */
  stagger(ms: number, pushPx: number): void {
    if (!this.alive) return;
    if (this.state === State.Lunging && !this.dashing) this.enter(State.Walking);
    if (this.state === State.Lunging) return;
    this.stunLeft = Math.max(this.stunLeft, ms);
    this.pushLeft = 260;
    this.pushV = pushPx / 0.26;
    this.squash = 1;
  }

  /** Under the Simorgh's wings: walks `mul` as fast for `ms`. */
  slow(ms: number, mul: number): void {
    if (!this.alive) return;
    this.slowLeft = Math.max(this.slowLeft, ms);
    this.slowMul = mul;
  }

  /** Sees the carnage and runs for it (imps only, before they get close). */
  flee(): boolean {
    if (this.type !== 'imp' || this.golden || this.fleeing || !this.alive || this.y > ARENA.attackY - 400) return false;
    this.fleeing = true;
    this.pauseLeft = 0;
    this.squash = 1;
    return true;
  }

  /** Walking out of the arena alive. */
  private escape(): void {
    this.hooks.escaped?.(this);
    this.hide();
  }

  /** Swept away by the finisher's shockwave: a golden dissolve. */
  vanish(): void {
    if (!this.alive) return;
    this.die('gold', 0);
  }

  private die(kind: DeathKind, dirX: number): void {
    this.state = State.Dying;
    this.t = 0;
    this.death = kind;
    this.deathSpin = dirX === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dirX);
    this.deathY0 = this.img.y;
    this.setBar(false);
    this.glint.setVisible(false);
  }

  update(dt: number, world: EnemyWorld): void {
    if (this.state === State.Off) return;
    const E = FEEL.enemy;
    this.t += dt;
    this.life += dt;
    if (this.flashLeft > 0) this.flashLeft -= dt;
    if (this.hitPoseLeft > 0) this.hitPoseLeft -= dt;
    if (this.tumbleLeft > 0) this.tumbleLeft -= dt;
    this.squash = Math.max(0, this.squash - dt / E.squashMs);
    const decay = Math.exp(-dt / E.knockbackDecayMs);
    this.kbX *= decay;
    this.kbY *= decay;

    switch (this.state) {
      case State.Spawning: {
        const S = E.spawn;
        if (this.burstLeft > 0) {
          this.updateBurst(dt);
          break;
        }
        if (this.t < S.delayMs) return;
        const k = (this.t - S.delayMs) / S.popMs;
        this.popMul = k >= 1 ? 1 : pop(k, S.overshoot);
        if (k >= 1) this.enter(State.Walking);
        this.img.setVisible(true);
        this.shadow.setVisible(true);
        break;
      }
      case State.Walking:
        if (this.pushLeft > 0) {
          this.pushLeft -= dt;
          this.y = Math.max(ARENA.spawnY, this.y - (this.pushV * dt) / 1000);
        }
        if (this.slowLeft > 0) this.slowLeft -= dt;
        if (this.stunLeft > 0) this.stunLeft -= dt;
        else this.walk(this.slowLeft > 0 ? dt * this.slowMul : dt, world);
        if ((this.state as State) === State.Off) return;
        if (this.y >= ARENA.attackY && !this.golden) this.startLunge(world);
        break;
      case State.Lunging:
        if (this.updateLunge()) return;
        break;
      case State.Dying:
        this.updateDeath();
        return;
    }
    this.render();
    this.updateBar(dt);
  }

  /** Summoned: leaps out of the wall crack in an arc and lands running. */
  private updateBurst(dt: number): void {
    const M = FEEL.boss.summon;
    this.burstLeft -= dt;
    const k = 1 - Math.max(0, this.burstLeft) / M.burstMs;
    this.popMul = Math.min(1, 0.4 + k * 1.2);
    this.y = this.burstY0 + 50 * k;
    this.img.setVisible(true);
    this.shadow.setVisible(true);
    if (this.burstLeft <= 0) this.enter(State.Walking);
  }

  // ---------------------------------------------------------------- movement

  private walk(dt: number, world: EnemyWorld): void {
    const s = dt / 1000;
    if (this.golden) {
      // Dashes across, glittering, and is gone out the far side.
      this.x += this.goldDir * this.speed * s;
      this.stepPhase += (this.speed * s) / 26;
      if (this.x < ARENA.walls.left - 60 || this.x > ARENA.walls.right + 60) this.escape();
      return;
    }
    if (this.fleeing) {
      // Panicked: back up the arena twice as fast, jittering.
      this.y -= this.speed * 2.4 * s;
      this.stepPhase += (this.speed * 2.4 * s) / 20;
      this.x += Math.sin(this.life / 40) * 60 * s;
      if (this.y < ARENA.spawnY - 40) this.escape();
      return;
    }
    if (this.type === 'flyer') {
      const F = FEEL.flyer;
      this.y += this.speed * s;
      this.x = this.baseX + Math.sin((this.life / F.zigPeriodMs) * TAU + this.seed) * F.zigPx;
      this.stepPhase += dt / F.flapMs;
      return;
    }

    if (this.type === 'imp') {
      const I = FEEL.imp;
      if (this.pauseLeft > 0) {
        this.pauseLeft -= dt;
        if (!this.tauntDone && !this.scratching) {
          this.tauntDone = true;
          this.hooks.taunt(this);
        }
        return;
      }
      if (this.y < ARENA.attackY - 220 && Math.random() < I.pause.chancePerSec * s) {
        // Personality: either a taunting hop, or a puzzled head scratch.
        this.scratching = Math.random() < 0.5;
        this.pauseLeft = this.pauseMs = this.scratching ? I.scratch.ms : I.pause.ms;
        this.tauntDone = false;
      }
      this.move(this.speed * s, I.stridePx);
      // Slow sideways drift.
      this.x += Math.cos((this.life / I.driftPeriodMs) * TAU + this.seed) * ((I.driftPx * TAU) / I.driftPeriodMs) * dt;
    } else {
      // Shield-bearer: lurching heavy steps, fastest mid-stride.
      const S = FEEL.shield;
      if (this.pauseLeft > 0) {
        // Stops to bang the shield, twice.
        this.pauseLeft -= dt;
        const k = 1 - this.pauseLeft / this.pauseMs;
        const due = Math.floor(k * (S.pause.bangs + 0.5));
        if (due > this.bangs && this.bangs < S.pause.bangs) {
          this.bangs++;
          this.squash = 0.6;
          this.hooks.bang(this);
        }
        this.updateRaise(dt, world);
        return;
      }
      if (this.y < ARENA.attackY - 260 && this.raise < 0.1 && Math.random() < S.pause.chancePerSec * s) {
        this.pauseLeft = this.pauseMs = S.pause.ms;
        this.bangs = 0;
      }
      const ph = this.stepPhase % 1;
      const surge = 0.55 + 0.9 * Math.sin(ph * Math.PI) ** 2;
      this.move(this.speed * surge * s, S.stridePx);
      const step = Math.floor(this.stepPhase);
      if (step !== this.lastStep) {
        this.lastStep = step;
        this.hooks.step(this);
      }
      this.updateRaise(dt, world);
    }
    this.avoidPillars(s);
    const m = BALANCE.waves.sideMargin * 0.6;
    this.x = clamp(this.x, ARENA.walls.left + m, ARENA.walls.right - m);
  }

  private move(dy: number, stride: number): void {
    this.y += dy;
    this.stepPhase += dy / stride;
  }

  /** Walkers step around pillar bases instead of through them. */
  private avoidPillars(s: number): void {
    const A = ARENA.pillarAvoid;
    for (const p of ARENA.pillars) {
      const dy = p.y - this.y;
      if (dy < -20 || dy > A.ahead) continue;
      const dx = this.x - p.x;
      if (Math.abs(dx) >= A.radius) continue;
      const side = dx !== 0 ? Math.sign(dx) : this.seed > 500 ? 1 : -1;
      this.x += side * (A.radius - Math.abs(dx)) * 4 * s;
    }
  }

  private updateRaise(dt: number, world: EnemyWorld): void {
    const R = FEEL.shield.raise;
    const aimed = world.aiming && rayCircle(world.aimX, world.aimY, world.aimDX, world.aimDY, 3000, this.hitX, this.hitY, this.hitR + R.marginPx) >= 0;
    const target = aimed ? 1 : 0;
    this.raise += (target - this.raise) * Math.min(1, dt / R.easeMs);
    if (this.raise > 0.6 && !this.raisedCue) {
      this.raisedCue = true;
      this.hooks.shieldRaised(this);
    } else if (this.raise < 0.2) {
      this.raisedCue = false;
    }
  }

  // ---------------------------------------------------------------- lunge / death

  private startLunge(world: EnemyWorld): void {
    this.enter(State.Lunging);
    this.dashing = false;
    this.lx0 = this.ax;
    this.ly0 = this.ay;
    this.lx1 = world.heroX;
    this.ly1 = world.heroY;
  }

  /** Returns true when the enemy is gone. */
  private updateLunge(): boolean {
    const L = FEEL.enemy.lunge;
    if (this.t < L.windupMs) return false;
    if (!this.dashing) {
      this.dashing = true;
      this.setBar(false);
      this.glint.setVisible(false);
      this.hooks.lungeStart(this);
    }
    if (this.t >= L.windupMs + L.dashMs) {
      this.hooks.reachedHero(this);
      this.hide();
      return true;
    }
    return false;
  }

  private updateDeath(): void {
    const D = FEEL.enemy.death;
    const ms = this.death === 'crumble' ? D.crumbleMs : this.death === 'gold' ? FEEL.enemy.goldMs : D.ms;
    const k = Math.min(1, this.t / ms);
    const base = this.def.scale;
    Art.setPose(this.img, this.def.poses.hit);
    switch (this.death) {
      case 'pop': {
        // Swell, then shrink away.
        if (k < 0.25) this.img.setTintFill(0xffffff);
        else this.img.setTint(0xc9a0ff);
        const p = k < 0.2 ? 1 + (D.pop - 1) * (k / 0.2) : D.pop * (1 - (k - 0.2) / 0.8);
        this.img.setScale(base * Math.max(0.01, p)).setAlpha(1 - k * k);
        break;
      }
      case 'spin': {
        // Whirls into the smoke.
        if (k < 0.2) this.img.setTintFill(0xffffff);
        else this.img.setTint(0xb07ae0);
        const e = k * k;
        this.img.setRotation(this.deathSpin * D.spinTurns * TAU * e).setScale(base * (1 - 0.9 * e)).setAlpha(1 - e);
        break;
      }
      case 'crumble': {
        // Squashes flat and sinks into the ground.
        if (k < 0.15) this.img.setTintFill(0xffffff);
        else this.img.setTint(0x9a80c0);
        const e = k < 0.3 ? k / 0.3 : 1;
        this.img.setScale(base * (1 + 0.35 * e), base * Math.max(0.02, 1 - 0.95 * k)).setAlpha(1 - Math.max(0, (k - 0.5) / 0.5));
        break;
      }
      case 'gold': {
        // Turns to light and rises.
        this.img.setTintFill(k < 0.5 ? 0xfff2c0 : 0xffd24a).setScale(base * (1 + 0.2 * k), base * (1 + 0.5 * k))
          .setAlpha(1 - k).setY(this.deathY0 - 70 * k);
        break;
      }
    }
    this.shadow.place(this.x, this.y, Math.max(0.01, 1 - k), 1 - k);
    if (k >= 1) this.hide();
  }

  private enter(state: State): void {
    this.state = state;
    this.t = 0;
  }

  private hide(): void {
    this.state = State.Off;
    this.img.setVisible(false);
    this.glint.setVisible(false);
    this.shadow.setVisible(false);
    this.setBar(false);
  }

  // ---------------------------------------------------------------- drawing

  private render(): void {
    const E = FEEL.enemy;
    const def = this.def;
    const walk = def.poses.walk;
    let pose = walk[Math.floor(this.stepPhase) % walk.length];
    let bob = 0;
    let tilt = Math.sin(this.stepPhase * Math.PI) * E.walk.tiltDeg * DEG;
    let lift = 0;
    let scaleX = 1;
    let scaleY = 1;
    const sq = Math.sin(this.squash * Math.PI) * E.squash;

    if (this.type === 'flyer') {
      const F = FEEL.flyer;
      let drop = 0;
      tilt = Math.sin((this.life / F.zigPeriodMs) * TAU + this.seed + 1.2) * F.bankDeg * DEG;
      if (this.tumbleLeft > 0) {
        const k = 1 - this.tumbleLeft / F.tumble.ms;
        tilt += this.tumbleDir * F.tumble.turns * TAU * Math.sin(k * Math.PI);
        drop = F.tumble.dropPx * Math.sin(k * Math.PI);
        pose = def.poses.hit;
      }
      const h = this.hoverH + Math.sin((this.life / F.bobMs) * TAU + this.seed) * F.bobPx - drop;
      this.ax = this.x + this.kbX;
      this.ay = this.y - h + this.kbY;
      const hk = clamp(h / F.hoverPx, 0, 1.2);
      this.shadow.place(this.x + this.kbX, this.y, 1 - (1 - F.shadowMinScale) * hk, 1 - 0.45 * hk);
      this.img.setDepth(AIR_DEPTH + this.y * 0.01);
    } else {
      if (this.type === 'imp') {
        const I = FEEL.imp;
        bob = Math.abs(Math.sin(this.stepPhase * Math.PI)) * I.bobPx;
        if (this.pauseLeft > 0 && this.scratching) {
          // Head scratch: a fidgety wiggle, leaning into it, then settling.
          const k = 1 - this.pauseLeft / this.pauseMs;
          const env = Math.sin(k * Math.PI);
          tilt = (I.scratch.wiggleDeg * Math.sin((this.t / 1000) * TAU * I.scratch.wiggleHz) + 7 * env) * DEG;
          bob = 2 * env;
          scaleY -= 0.04 * env;
        } else if (this.pauseLeft > 0) {
          // Taunt: little hops, flicking between poses.
          const k = 1 - this.pauseLeft / this.pauseMs;
          bob = Math.abs(Math.sin(k * Math.PI * I.pause.hops)) * I.pause.hopPx;
          pose = walk[Math.floor(this.t / I.pause.flickMs) % walk.length];
          tilt = Math.sin(this.t / 70) * I.pause.tiltDeg * DEG;
        }
      } else {
        const S = FEEL.shield;
        bob = Math.abs(Math.sin(this.stepPhase * Math.PI)) * S.bobPx;
        tilt *= 0.6;
        lift = this.raise * S.raise.liftPx;
        scaleY += this.raise * S.raise.scale;
        if (this.pauseLeft > 0) {
          // Banging the shield: brace, rise, bring it down.
          const k = 1 - this.pauseLeft / this.pauseMs;
          lift += 8 * Math.abs(Math.sin(k * Math.PI * (S.pause.bangs + 0.5)));
          tilt = 0;
        }
      }
      this.ax = this.x + this.kbX;
      this.ay = this.y + this.kbY;
      this.shadow.place(this.ax, this.ay, 1 + sq * 0.4 - bob / 80);
      this.img.setDepth(worldDepth(this.y));
    }

    if (this.hitPoseLeft > 0) pose = def.poses.hit;
    if (this.stunLeft > 0) {
      // Dazed by the quake: a slow woozy sway.
      tilt = Math.sin(this.t / 90) * 0.18;
      bob = 0;
    }
    if (this.fleeing) tilt = Math.sin(this.life / 45) * 0.2;
    if (this.burstLeft > 0) {
      // Leaping out of the wall: an arc, tumbling forward.
      const k = 1 - this.burstLeft / FEEL.boss.summon.burstMs;
      bob = FEEL.boss.summon.burstLeapPx * Math.sin(k * Math.PI);
      tilt = (1 - k) * 0.6 * (this.seed > 500 ? 1 : -1);
    }

    // Lunge: crouch, then dash at the hero growing bigger.
    let ox = this.ax;
    let oy = this.ay - bob - lift;
    if (this.state === State.Lunging) {
      const L = FEEL.enemy.lunge;
      if (!this.dashing) {
        const k = this.t / L.windupMs;
        scaleY -= L.squash * Math.sin(k * Math.PI * 0.5);
        scaleX += L.squash * 0.6 * Math.sin(k * Math.PI * 0.5);
        oy -= L.crouchPx * k;
      } else {
        const k = Math.min(1, (this.t - L.windupMs) / L.dashMs);
        const e = k * k;
        ox = this.lx0 + (this.lx1 - this.lx0) * e;
        oy = this.ly0 + (this.ly1 - this.ly0) * e;
        scaleX *= 1 + 0.3 * k;
        scaleY *= 1 + 0.3 * k;
        this.img.setDepth(worldDepth(Math.max(this.y, ARENA.hero.y) + 1));
        this.shadow.place(ox, oy + 20, 1 - 0.5 * k, 1 - k);
      }
    }

    Art.setPose(this.img, pose);
    if (this.flashLeft > 0) this.img.setTintFill(0xffffff);
    else if (this.golden) this.img.setTint(0xffe27a, 0xffe27a, 0xffb020, 0xffb020);
    else if (this.slowLeft > 0) this.img.setTint(0xb0fff0);
    else this.img.clearTint();
    const s = def.scale * this.popMul;
    this.img.setPosition(ox, oy).setScale(s * (scaleX + sq), s * (scaleY - sq)).setRotation(tilt);

    if (this.type === 'shield' && this.raise > 0.05 && this.state !== State.Lunging) {
      const g = this.raise * (0.55 + 0.45 * Math.sin(this.life / 70));
      this.glint.setVisible(true).setPosition(this.shieldX, this.shieldY - lift).setAlpha(g)
        .setScale(0.7 + 0.5 * this.raise).setRotation(this.life / 300).setDepth(this.img.depth + 0.1);
    } else if (this.glint.visible) {
      this.glint.setVisible(false);
    }
  }

  private updateBar(dt: number): void {
    if (!this.barOn) return;
    const B = FEEL.enemy.hpBar;
    this.shownHp += (this.hp - this.shownHp) * Math.min(1, dt / B.drainMs);
    if (this.trailWait > 0) this.trailWait -= dt;
    else this.trailHp += (this.shownHp - this.trailHp) * Math.min(1, dt / B.trailDrainMs);
    const w = this.def.hpBar.w;
    const bx = this.ax;
    const by = (this.type === 'flyer' ? this.ay : this.y + this.kbY) + this.def.hpBar.y;
    this.hpBack.setPosition(bx, by);
    this.hpTrail.setPosition(bx - w / 2, by).setSize(Math.max(0, (w * this.trailHp) / this.maxHp), B.h);
    this.hpFill.setPosition(bx - w / 2, by).setSize(Math.max(0, (w * this.shownHp) / this.maxHp), B.h);
  }

  private setBar(on: boolean): void {
    this.barOn = on;
    this.hpBack.setVisible(on).setSize(this.def.hpBar.w + 6, FEEL.enemy.hpBar.h + 6);
    this.hpTrail.setVisible(on);
    this.hpFill.setVisible(on);
  }
}
