import Phaser from 'phaser';
import { currentEra } from '../systems/eraProgress';
import { Art } from '../assets/Art';
import { MANIFEST_BY_KEY } from '../assets/manifest';
import { BALANCE } from '../config/balance';
import { DEPTH } from '../config/display';
import { FEEL } from '../config/feel';
import { ARENA } from '../data/arena';
import { BOSS, type BossPoseDef } from '../data/entities';
import { FINISHERS } from '../data/finishers';
import { BendSprite, type Point } from '../render/BendSprite';
import { services } from '../services';
import { BossBrain, type BossEvent } from '../systems/bossBrain';
import type { ArrowHit, HitOutcome, LockOn, Target } from '../systems/ProjectileSystem';
import type { TimeCtl } from '../systems/TimeCtl';
import { bump, easeInExpo, easeInOutSine, easeOutBack, easeOutCubic, Spring } from '../utils/ease';
import { Signal } from '../utils/Signal';

type Rect = { x: number; y: number; w: number; h: number };
type Action = 'none' | 'roar' | 'summon' | 'stumble' | 'shakeOff' | 'hurl';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const B = FEEL.boss;
const PLATES = B.armor.plates;

interface ActOffsets {
  y: number;
  shift: number;
  sway: number;
  rot: number;
  stretch: number;
  width: number;
  roar: boolean;
  /** Summoning energy at the hand, 0..1. */
  energy: number;
}

export interface BossPoint {
  x: number;
  y: number;
}

/**
 * The White Div (دیو سپید). BossBrain decides (hp, phases, stun, summons, finisher); this animates it.
 *
 * Motion is layered so nothing ever snaps: a base placement (lurking → fighting), one timed action at
 * a time (roar, summon, stumble, shake-off) with anticipation → action → follow-through, springs for
 * hit reactions (they overshoot and settle), and procedural idle (breathing with counter-squash, head
 * sway, cloth wobble, glints). Pose changes cross-fade.
 */
export class Boss {
  readonly brain = new BossBrain({ ...BALANCE.boss, hp: Math.round(BALANCE.boss.hp * currentEra().bossHpScale) }, FINISHERS.arash);
  /** Body + weak point, for arrows. */
  readonly target: Target;
  /** The golden barrier of the armor phase, for arrows. */
  readonly barrierTarget: Target;

  readonly onGrowl = new Signal();
  readonly onSlam = new Signal<{ x: number; y: number; power: number }>();
  readonly onRoar = new Signal<BossPoint>();
  readonly onIntroBar = new Signal();
  readonly onIntroDone = new Signal();
  readonly onSummonStart = new Signal();
  readonly onSummon = new Signal<number>();
  /** سنگ‌باران: he rips a chunk of wall and hurls it (GameScene launches the boulder). */
  readonly onBoulder = new Signal<{ x: number; y: number; fury: boolean }>();
  readonly onBarrier = new Signal<{ kind: 'form' | 'chip' | 'break'; x: number; y: number }>();
  readonly onStun = new Signal<boolean>();
  readonly onStumble = new Signal<BossPoint>();
  readonly onFinisher = new Signal();
  readonly onLowHp = new Signal();

  private readonly body: BendSprite;
  private readonly wallOcc: Phaser.GameObjects.Image[] = [];
  private readonly waistOcc: Phaser.GameObjects.Image[] = [];
  private readonly gemCore: Phaser.GameObjects.Image;
  private readonly gemHalo: Phaser.GameObjects.Image;
  private readonly eyes: Phaser.GameObjects.Image[];
  private readonly shine: Phaser.GameObjects.Image[] = [];
  private readonly stars: Phaser.GameObjects.Image[] = [];
  private readonly energy: Phaser.GameObjects.Image;
  private readonly inflow: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly embers: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly chips: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly cracksGlow: Phaser.GameObjects.Graphics;
  private readonly cracksDark: Phaser.GameObjects.Graphics;
  private readonly wallCracks: Phaser.GameObjects.Graphics;
  private readonly barrierGlow: Phaser.GameObjects.Image;
  private readonly barrierDome: Phaser.GameObjects.Image;
  private readonly plates: Phaser.GameObjects.Image[] = [];
  /** Per plate: 1 = whole, 0..1 = breaking (time left fraction), -1 = gone. */
  private readonly plateState: number[] = [];
  private readonly plateVel: number[] = [];

  private readonly p: Point = { x: 0, y: 0 };
  private readonly q: Point = { x: 0, y: 0 };
  private readonly lurk: { x: number; y: number; s: number };
  private readonly fight: { x: number; y: number; s: number };
  private readonly place = { x: 0, y: 0, s: 1 };
  private readonly lift = new Spring(B.spring.hz, B.spring.damping);
  private readonly tilt = new Spring(B.spring.hz, B.spring.damping);

  private t = Math.random() * 10000;
  private introT = -1;
  private introFlags = 0;
  private action: Action = 'none';
  private actionT = 0;
  private actionMs = 1;
  private actionFlags = 0;
  private actionDir = 1;
  private growlIn: number;
  private stumbleIn = 0;
  private shineIn = 2000;
  private shineT = -1;
  private shineSide = 0;
  private flashLeft = 0;
  private gemFlare = 0;
  private barrierK = 0;
  private barrierSpin = 0;
  private barrierUp = false;
  private cracks: number[][] = [];
  private nextCrackPct = 1 - B.cracks.everyPct;
  private crackAlpha = 1;
  private lastGem = false;
  private hidden = false;
  /** The eye glows (the title lifts copies of them above its dusk grade). */
  get eyeGlows(): readonly Phaser.GameObjects.Image[] {
    return this.eyes;
  }
  /** Title screen: 1 = a dark silhouette behind the wall (eyes and gem still glow), 0 = normal. */
  silhouette = 0;
  private strain = 0;

  constructor(private readonly scene: Phaser.Scene, time: TimeCtl) {
    const A = ARENA.boss;
    this.lurk = { x: A.x, y: A.lurk.y, s: A.lurk.scale };
    this.fight = { x: A.x, y: A.fight.y, s: A.fight.scale };
    Object.assign(this.place, this.lurk);

    this.body = new BendSprite(scene, this.place.x, this.place.y, BOSS.poses.idle, { rows: 12 });
    this.body.rope.setScale(this.place.s).setDepth(DEPTH.boss);

    const glow = (tint: number, depth = DEPTH.boss + 1) =>
      scene.add.image(0, 0, 'fx_glow').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
    this.gemHalo = glow(0xff3a12);
    this.gemCore = glow(0xffc0a0);
    this.eyes = BOSS.zones.boss_idle.eyes.map(() => glow(0xff4a1a));
    for (let i = 0; i < 3; i++) this.shine.push(scene.add.image(0, 0, 'fx_star').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.boss + 2).setVisible(false));
    for (let i = 0; i < B.stun.stars; i++) {
      this.stars.push(scene.add.image(0, 0, 'fx_star').setTint(0xffe27a).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.boss + 3).setVisible(false));
    }

    // Background slices redrawn over him: the wall.
    const bg = Art.ref('bg_arena_01');
    const occ = (r: Rect) => scene.add.image(0, 0, bg.texture, bg.frame).setOrigin(0).setCrop(r.x, r.y, r.w, r.h).setDepth(DEPTH.bossOccluder);
    for (const r of ARENA.bossOccluders.wall) this.wallOcc.push(occ(r));
    for (const r of ARENA.bossOccluders.waist) this.waistOcc.push(occ(r).setVisible(false));
    this.wallCracks = scene.add.graphics().setDepth(DEPTH.bossOccluder + 1);

    this.cracksGlow = scene.add.graphics().setDepth(DEPTH.boss + 1).setBlendMode(Phaser.BlendModes.ADD);
    this.cracksDark = scene.add.graphics().setDepth(DEPTH.boss + 1.5);

    // Summoning energy at the raised hand, fed by particles flowing in.
    this.energy = glow(0xb35cd1, DEPTH.boss + 4).setVisible(false);
    this.inflow = time.track(scene.add.particles(0, 0, 'fx_glow', {
      emitting: false, lifespan: 420, scale: { start: 0.35, end: 0.05 }, alpha: { start: 0, end: 1 },
      tint: [0xc77dff, 0x8a3ab8, 0xffffff], blendMode: 'ADD', maxParticles: 60,
    }).setDepth(DEPTH.boss + 4));
    this.embers = time.track(scene.add.particles(0, 0, 'fx_spark', {
      emitting: false, lifespan: { min: 900, max: 1500 }, speedY: { min: -70, max: -30 }, speedX: { min: -20, max: 20 },
      scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xff9a3a, 0xff5a1a, 0xffd166], blendMode: 'ADD', maxParticles: 40,
    }).setDepth(DEPTH.boss + 2));
    this.chips = time.track(scene.add.particles(0, 0, 'fx_spark', {
      emitting: false, lifespan: { min: 300, max: 600 }, speed: { min: 150, max: 420 }, scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [0xffe08a, 0xe8b04a, 0xffffff], blendMode: 'ADD', gravityY: 500, maxParticles: 80,
    }).setDepth(DEPTH.fx));

    // The barrier: bronze glow, a faint dome, and a hexagonal ward of carved plates.
    // In front of the wall slices too: the ward is between him and the arena.
    const wardDepth = DEPTH.bossOccluder + 2;
    this.barrierGlow = glow(B.armor.color, wardDepth).setAlpha(0).setVisible(false);
    this.barrierDome = scene.add.image(0, 0, 'fx_ring').setTint(B.armor.color).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(wardDepth).setAlpha(0).setVisible(false);
    const fxOn = FEEL.shaderFx && scene.game.renderer.type === Phaser.WEBGL;
    for (let i = 0; i < PLATES; i++) {
      const plate = scene.add.image(0, 0, 'fx_rune_plate').setDepth(wardDepth + 1).setVisible(false);
      if (fxOn) plate.preFX?.addGlow(0xffd27a, 3, 0, false, 0.1, 10);
      this.plates.push(plate);
      this.plateState.push(-1);
      this.plateVel.push(0);
    }
    const applyQuality = (reduced: boolean) => {
      for (const pl of this.plates) {
        if (pl.preFX) pl.preFX.setPadding(reduced ? 0 : 10);
        pl.preFX?.list.forEach((f) => { f.active = !reduced; });
      }
    };
    applyQuality(services.settings.reducedEffects);
    const off = services.settings.onReducedChange.add(({ on }) => applyQuality(on));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);

    // Lazy boss art (M6): the atlas usually lands while the title is up; re-apply the pose so the
    // rope swaps from the placeholder to the real texture without a snap (same anchor rules).
    const offArt = Art.onChange.add((key) => {
      if (MANIFEST_BY_KEY.get(key)?.atlas === 'boss') this.body.setPose(this.body.pose, true);
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, offArt);

    this.growlIn = Phaser.Math.Between(B.growlEveryMs[0], B.growlEveryMs[1]) * 0.5;

    const self = this;
    const scratch: Point = { x: 0, y: 0 };
    this.target = {
      id: 900001,
      color: 0xfff0d0,
      solid: true,
      get hittable() { return self.brain.fighting; },
      get hitX() { return self.zonePoint('body', scratch).x; },
      get hitY() { return self.zonePoint('body', scratch).y; },
      get hitR() { return self.zone.body.r * self.place.s; },
      blocks: (_dx: number, _dy: number, crit: boolean) => self.brain.armored && !crit,
      lockOn: (ox: number, oy: number, dx: number, dy: number, out: LockOn) => self.lockOn(ox, oy, dx, dy, out),
      receiveArrow: (hit: ArrowHit) => self.onArrow(hit),
    };
    this.barrierTarget = {
      id: 900002,
      color: B.armor.color,
      get hittable() { return self.barrierUp && self.barrierK > 0.8; },
      get hitX() { return self.zonePoint('body', scratch).x; },
      get hitY() { return self.zonePoint('body', scratch).y; },
      get hitR() { return B.armor.radius; },
      blocks: (_dx: number, _dy: number, crit: boolean) => !crit,
      passes: (crit: boolean) => crit,
      receiveArrow: (hit: ArrowHit) => self.onBarrierArrow(hit),
    };

    this.update(0);
  }

  // ---------------------------------------------------------------- public API

  get state(): string {
    return this.brain.state;
  }

  /** The last arrow went through the gem. */
  get gemHit(): boolean {
    return this.lastGem;
  }

  /** World position of the gem (the finisher's target). */
  gemPoint(out: Point): Point {
    return this.zonePoint('gem', out);
  }

  /** Chest centre in world px. */
  chestPoint(out: Point): Point {
    return this.zonePoint('body', out);
  }

  /** Rise from behind the wall: sink, rise, slam, roar (≈2.5 s). */
  startIntro(): void {
    if (this.brain.state !== 'hidden') return;
    this.brain.startIntro();
    this.introT = 0;
    this.introFlags = 0;
    this.action = 'none';
  }

  /** Jump to the end of the intro (tap to skip). */
  skipIntro(): void {
    if (this.introT < 0) return;
    this.introT = B.intro.endMs;
    this.setOccluders('waist');
    if (!(this.introFlags & 4)) this.onIntroBar.emit();
    this.introFlags = 0xff;
    this.finishIntro();
  }

  get inIntro(): boolean {
    return this.introT >= 0;
  }

  /** The team finisher landed (or fell short). */
  finisherResult(full: boolean): void {
    this.brain.finisherResult(full);
    if (!full) {
      this.recoil(1);
      this.strain = 0;
    }
  }

  /** Breaks into golden fragments. */
  shatter(): void {
    const S = B.shatter;
    const r = this.body.rope;
    const ref = Art.ref(this.body.pose);
    const frame = r.frame;
    const a = Art.anchor(this.body.pose);
    this.chestPoint(this.p);
    const cw = frame.realWidth / S.grid;
    const ch = frame.realHeight / S.grid;
    for (let gy = 0; gy < S.grid; gy++) {
      for (let gx = 0; gx < S.grid; gx++) {
        const img = this.scene.add.image(r.x, r.y, ref.texture, ref.frame).setOrigin(a.ox, a.oy)
          .setScale(r.scaleX, r.scaleY).setRotation(r.rotation).setDepth(DEPTH.fx - 2)
          .setCrop(gx * cw, gy * ch, cw, ch).setTintFill(0xfff2c0);
        // Crop centre in world px → direction away from the chest.
        const lx = ((gx + 0.5) * cw - a.ox * frame.realWidth) * r.scaleX;
        const ly = ((gy + 0.5) * ch - a.oy * frame.realHeight) * r.scaleY;
        const ang = Math.atan2(r.y + ly - this.p.y, r.x + lx - this.p.x) + Phaser.Math.FloatBetween(-0.3, 0.3);
        const dist = Phaser.Math.Between(S.flyPx[0], S.flyPx[1]);
        this.scene.tweens.add({
          targets: img,
          x: r.x + Math.cos(ang) * dist, y: r.y + Math.sin(ang) * dist + 120,
          angle: Phaser.Math.Between(-S.spinDeg, S.spinDeg), alpha: 0, scaleX: r.scaleX * 0.6, scaleY: r.scaleY * 0.6,
          duration: S.ms, ease: 'Cubic.easeOut', onComplete: () => img.destroy(),
        });
        this.scene.tweens.add({ targets: img, duration: 260, onComplete: () => img.clearTint().setTint(0xffe7a0) });
      }
    }
    this.hidden = true;
    this.body.setVisible(false);
    for (const o of [this.gemCore, this.gemHalo, ...this.eyes, ...this.stars, ...this.shine, this.energy]) o.setVisible(false);
    this.cracksDark.clear();
    this.cracksGlow.clear();
    this.dropBarrier(false);
    this.embers.stop();
  }

  /** Light floods back: the wall cracks fade. */
  healWall(ms: number): void {
    this.scene.tweens.add({ targets: this.wallCracks, alpha: 0, duration: ms });
  }

  // ---------------------------------------------------------------- update

  update(dt: number): void {
    this.t += dt;
    const brain = this.brain;
    brain.tick(dt);
    for (const e of brain.events) this.onBrainEvent(e);
    brain.events.length = 0;
    if (this.hidden) return;

    if (brain.state === 'hidden') this.updateLurk(dt);
    if (this.introT >= 0) this.updateIntro(dt);
    const act = this.updateAction(dt);
    this.lift.update(dt);
    this.tilt.update(dt);
    if (this.flashLeft > 0) this.flashLeft -= dt;
    if (this.gemFlare > 0) this.gemFlare = Math.max(0, this.gemFlare - dt / 500);
    if (brain.lowHp && brain.fighting && this.action === 'none') {
      this.stumbleIn -= dt;
      if (this.stumbleIn <= 0) this.startAction('stumble', B.lowHp.stumbleMs);
    }

    // Pose
    let pose: string = BOSS.poses.idle;
    if (brain.state === 'stunned') pose = BOSS.poses.stunned;
    else if (brain.state === 'finisher' || act.roar) pose = BOSS.poses.roar;
    this.body.setPose(pose, false, B.poseFadeMs);

    // Procedural idle + layers
    const I = B.idle;
    const breathMs = brain.lowHp ? I.lowHpBreathMs : I.breathMs;
    const breath = 0.5 + 0.5 * Math.sin((this.t / breathMs) * TAU);
    const stunned = brain.state === 'stunned';
    this.strain += ((brain.state === 'finisher' ? 1 : 0) - this.strain) * Math.min(1, dt / 200);
    const wobble = stunned ? Math.sin((this.t / 1000) * TAU * B.stun.wobbleHz) * B.stun.wobblePx : 0;
    const b = this.body;
    b.stretch = 1 + I.breathe * breath + act.stretch;
    b.endWidth = 1 - I.breathe * I.counterSquash * breath + act.width;
    b.endShift = I.bobPx * Math.sin((this.t / I.bobMs) * TAU + 1.3) + this.lift.x + act.shift;
    b.sway = I.headSwayPx * Math.sin((this.t / (I.bobMs * 1.37)) * TAU) + wobble + act.sway + this.strain * 3 * Math.sin(this.t / 22);
    b.wave = I.clothWave;
    b.wavePhase = this.t / 600;
    b.rope
      .setPosition(this.place.x, this.place.y + act.y)
      .setScale(this.place.s)
      .setRotation(I.tiltDeg * DEG * Math.sin((this.t / (I.bobMs * 1.9)) * TAU) + this.tilt.x + act.rot + (stunned ? wobble * 0.004 : 0));
    if (this.flashLeft > 0) b.setTint(0xffffff, true);
    else if (this.silhouette > 0) b.setTint(mixTint(0xffffff, FEEL.title.silhouetteTint, this.silhouette));
    else b.setTint(brain.fury ? B.fury.tint : 0xffffff);
    b.update(dt);

    this.updateGlows(breath, act.energy);
    this.updateCracks(dt, pose === BOSS.poses.idle);
    this.updateBarrier(dt);
    this.updateStars(stunned);
    this.updateShine(dt, pose === BOSS.poses.idle && brain.state !== 'hidden');
    if (brain.lowHp && brain.fighting && Math.random() < ((brain.fury ? B.fury.embersPerSec : B.lowHp.embersPerSec) * dt) / 1000) {
      const pt = BOSS.armor[Math.floor(Math.random() * BOSS.armor.length)];
      b.worldPoint(pt.x, pt.y, this.p);
      this.embers.emitParticleAt(this.p.x, this.p.y, services.settings.count(1));
    }
  }

  // ---------------------------------------------------------------- lurking & intro

  private updateLurk(dt: number): void {
    this.growlIn -= dt;
    if (this.growlIn <= 0 && this.action === 'none') {
      this.growlIn = Phaser.Math.Between(B.growlEveryMs[0], B.growlEveryMs[1]);
      this.startAction('roar', B.roarMs);
      this.onGrowl.emit();
    }
  }

  private updateIntro(dt: number): void {
    const I = B.intro;
    this.introT += dt;
    const t = this.introT;
    const slamLead = I.slamMs;
    const hover = 30;
    // sink (anticipation) → rise (ease-out-back) → hover → slam (accelerating drop)
    const sink = t < I.sinkMs ? easeInOutSine(t / I.sinkMs) : 1 - easeOutCubic((t - I.sinkMs) / I.riseMs);
    const rise = t < I.sinkMs ? 0 : easeOutBack((t - I.sinkMs) / I.riseMs, I.riseOvershoot);
    const drop = t < I.slamAtMs - slamLead ? 0 : easeInExpo((t - (I.slamAtMs - slamLead)) / slamLead);
    const L = this.lurk;
    const F = this.fight;
    this.place.x = F.x;
    this.place.s = L.s + (F.s - L.s) * Math.min(1, rise);
    this.place.y = L.y + (F.y - hover - L.y) * rise + I.sinkPx * sink + hover * drop;

    if (t >= I.slamAtMs && !(this.introFlags & 1)) {
      this.introFlags |= 1;
      // Impact: hands over the wall now, cracks, dust, a heavy spring bounce.
      this.setOccluders('waist');
      this.lift.x = I.slamDropPx;
      this.lift.v = 0;
      this.knuckleCracks(1.3);
      this.body.worldPoint(0, 0, this.p);
      this.onSlam.emit({ x: this.p.x, y: this.p.y + 10, power: 1 });
    }
    if (t >= I.roarAtMs && !(this.introFlags & 2)) {
      this.introFlags |= 2;
      this.startAction('roar', B.roarMs);
      this.chestPoint(this.p);
      this.onRoar.emit({ x: this.p.x, y: this.p.y });
    }
    if (t >= I.barAtMs && !(this.introFlags & 4)) {
      this.introFlags |= 4;
      this.onIntroBar.emit();
    }
    if (t >= I.endMs) this.finishIntro();
  }

  private finishIntro(): void {
    Object.assign(this.place, this.fight);
    this.introT = -1;
    this.brain.introDone();
    this.onIntroDone.emit();
  }

  private setOccluders(which: 'wall' | 'waist'): void {
    for (const o of this.wallOcc) o.setVisible(which === 'wall');
    for (const o of this.waistOcc) o.setVisible(which === 'waist');
  }

  // ---------------------------------------------------------------- brain events

  private onBrainEvent(e: BossEvent): void {
    switch (e) {
      case 'armor':
        this.startAction('roar', B.roarMs);
        this.raiseBarrier();
        break;
      case 'stun':
        this.dropBarrier(true);
        this.gemFlare = 1;
        this.onStun.emit(true);
        break;
      case 'recover':
        this.startAction('shakeOff', B.stun.shakeOffMs);
        this.raiseBarrier();
        this.onStun.emit(false);
        break;
      case 'lowHp':
        this.stumbleIn = Phaser.Math.Between(1500, 3000);
        this.onLowHp.emit();
        break;
      case 'summon':
        if (this.action === 'none' || this.action === 'roar') {
          this.startAction('summon', B.summon.chargeMs + B.summon.slamMs + 250);
          this.onSummonStart.emit();
        }
        break;
      case 'boulder':
        if (this.action === 'none' || this.action === 'roar') this.startAction('hurl', B.hurl.ms);
        break;
      case 'finisher':
        this.dropBarrier(false);
        this.action = 'none';
        this.energy.setVisible(false);
        this.onFinisher.emit();
        break;
      case 'dead':
        break;
    }
  }

  // ---------------------------------------------------------------- actions

  private startAction(a: Action, ms: number): void {
    this.action = a;
    this.actionT = 0;
    this.actionMs = ms;
    this.actionFlags = 0;
    this.actionDir = Math.random() < 0.5 ? -1 : 1;
  }

  private readonly act: ActOffsets = { y: 0, shift: 0, sway: 0, rot: 0, stretch: 0, width: 0, roar: false, energy: 0 };

  /** Offsets from the current action: anticipation → action → follow-through → settle. */
  private updateAction(dt: number): ActOffsets {
    const o = this.act;
    o.y = o.shift = o.sway = o.rot = o.stretch = o.width = o.energy = 0;
    o.roar = false;
    if (this.action === 'none') return o;
    this.actionT += dt;
    const t = this.actionT;
    const k = Math.min(1, t / this.actionMs);
    switch (this.action) {
      case 'roar': {
        o.roar = k < 0.85;
        const r = bump(k);
        o.shift = -14 * r;
        o.stretch = 0.035 * r;
        o.width = 0.02 * r;
        break;
      }
      case 'summon': {
        const S = B.summon;
        if (t < S.chargeMs) {
          // Raise a hand, gather purple energy.
          const c = t / S.chargeMs;
          o.roar = true;
          o.shift = -12 * easeOutCubic(c);
          o.energy = c;
          this.feedInflow(dt);
        } else {
          const s = (t - S.chargeMs) / S.slamMs;
          o.shift = -12 + 30 * easeInExpo(Math.min(1, s / 0.4));
          if (s >= 0.4 && !(this.actionFlags & 1)) {
            this.actionFlags |= 1;
            this.lift.x = 14;
            this.knuckleCracks(0.8);
            for (const pt of ARENA.summonPoints) this.wallCrack(pt.x, pt.y - 20, 0.8);
            this.body.worldPoint(0, 0, this.p);
            this.onSlam.emit({ x: this.p.x, y: this.p.y + 10, power: 0.6 });
          }
          if (s >= 0.6 && !(this.actionFlags & 2)) {
            this.actionFlags |= 2;
            const [lo, hi] = BALANCE.boss.summon.count;
            this.onSummon.emit(Phaser.Math.Between(lo, hi));
          }
        }
        break;
      }
      case 'stumble': {
        const L = B.lowHp;
        // Sudden buckle, then a heavy recovery that overshoots.
        const down = k < 0.25 ? easeOutCubic(k / 0.25) : 1 - easeOutBack((k - 0.25) / 0.75, 1.4);
        o.y = L.stumbleDropPx * down;
        o.rot = this.actionDir * L.stumbleTiltDeg * DEG * down;
        o.stretch = -0.03 * down;
        if (k >= 0.25 && !(this.actionFlags & 1)) {
          this.actionFlags |= 1;
          this.body.worldPoint(0, 0, this.p);
          this.onStumble.emit({ x: this.p.x, y: this.p.y });
        }
        break;
      }
      case 'shakeOff': {
        const S = B.stun;
        o.sway = S.shakeOffPx * Math.sin(k * Math.PI * 6) * (1 - k);
        o.rot = 0.02 * Math.sin(k * Math.PI * 6) * (1 - k);
        break;
      }
      case 'hurl': {
        const H = B.hurl;
        // Lean back (winding up), then a violent sweep forward as the rock leaves his hand.
        const wind = k < 0.55 ? easeOutCubic(k / 0.55) : 1 - easeInExpo((k - 0.55) / 0.45);
        const sweep = k < 0.55 ? 0 : easeInExpo((k - 0.55) / 0.45);
        o.shift = -H.leanPx * wind + H.sweepPx * sweep;
        o.rot = -0.03 * wind + 0.05 * sweep;
        o.stretch = 0.02 * wind - 0.03 * sweep;
        if (t >= H.atMs && !(this.actionFlags & 1)) {
          this.actionFlags |= 1;
          this.lift.x = 10;
          this.knuckleCracks(0.5);
          this.body.worldPoint(0, 0, this.p);
          this.onBoulder.emit({ x: this.p.x, y: this.p.y + 10, fury: this.brain.fury });
        }
        break;
      }
    }
    if (k >= 1) {
      if (this.action === 'stumble') this.stumbleIn = Phaser.Math.Between(B.lowHp.stumbleEveryMs[0], B.lowHp.stumbleEveryMs[1]);
      this.action = 'none';
    }
    return o;
  }

  private feedInflow(dt: number): void {
    const n = (B.summon.inflowPerSec * dt) / 1000;
    if (Math.random() > n % 1 && n < 1) return;
    this.handPoint(this.p);
    for (let i = services.settings.count(Math.max(1, Math.round(n))); i > 0; i--) {
      const a = Math.random() * TAU;
      const r = 90 + Math.random() * 70;
      const p = this.inflow.emitParticle(1, this.p.x + Math.cos(a) * r, this.p.y + Math.sin(a) * r);
      if (!p) break;
      // Flow into the hand over the particle's life.
      p.velocityX = (-Math.cos(a) * r) / 0.42;
      p.velocityY = (-Math.sin(a) * r) / 0.42;
    }
  }

  // ---------------------------------------------------------------- arrows

  private get zone(): BossPoseDef {
    return BOSS.zones[this.body.pose] ?? BOSS.zones.boss_idle;
  }

  private zonePoint(which: 'body' | 'gem', out: Point): Point {
    const c = this.zone[which];
    return this.body.worldPoint(c.x, c.y, out);
  }

  private handPoint(out: Point): Point {
    return this.body.worldPoint(BOSS.hand.x, BOSS.hand.y, out);
  }

  /** Does the ray from (ox, oy) along (dx, dy) pass through the gem? */
  private throughGem(ox: number, oy: number, dx: number, dy: number): boolean {
    this.zonePoint('gem', this.q);
    const r = this.zone.gem.r * this.place.s + BALANCE.arrow.radius;
    const t = Math.max(0, (this.q.x - ox) * dx + (this.q.y - oy) * dy);
    const px = ox + dx * t - this.q.x;
    const py = oy + dy * t - this.q.y;
    return px * px + py * py <= r * r;
  }

  private lockOn(ox: number, oy: number, dx: number, dy: number, out: LockOn): void {
    if (this.throughGem(ox, oy, dx, dy)) {
      this.zonePoint('gem', this.q);
      out.x = this.q.x;
      out.y = this.q.y;
      out.r = this.zone.gem.r * this.place.s;
      out.weak = true;
    }
  }

  /** Someone woke him (the title's secret): a roar from behind the wall. */
  poke(): void {
    if (this.action !== 'none') return;
    this.startAction('roar', B.roarMs);
    this.onGrowl.emit();
  }

  /** The Rostami quake reaches him (barrier shatters if up). Returns the damage he took. */
  quake(damage: number): number {
    if (!this.brain.fighting) return 0;
    this.brain.quake();
    for (const e of this.brain.events) this.onBrainEvent(e);
    this.brain.events.length = 0;
    const p = this.chestPoint(this.q);
    const hit: ArrowHit = { damage, crit: true, x: p.x, y: p.y, dirX: 1, dirY: 0, bounces: 0 };
    return this.onArrow(hit) === 'hit' ? hit.damage : 0;
  }

  private onArrow(hit: ArrowHit): HitOutcome {
    const gem = this.throughGem(hit.x, hit.y, hit.dirX, hit.dirY);
    const res = this.brain.hit({ damage: hit.damage, crit: hit.crit, gem });
    this.lastGem = gem;
    for (const e of this.brain.events) this.onBrainEvent(e);
    this.brain.events.length = 0;
    if (res.blocked) return 'blocked';
    // The event reports what he actually took (gem, stun multipliers).
    hit.damage = res.damage;
    if (gem && hit.crit) this.recoil(hit.dirX >= 0 ? 1 : -1);
    else this.flinch(hit.dirX >= 0 ? 1 : -1);
    while (this.brain.hpPct <= this.nextCrackPct && this.nextCrackPct > 0) {
      this.addCrack();
      this.nextCrackPct -= B.cracks.everyPct;
    }
    if (gem && hit.crit) this.addCrack();
    return 'hit';
  }

  private onBarrierArrow(hit: ArrowHit): HitOutcome {
    if (!hit.crit) {
      this.onBarrier.emit({ kind: 'chip', x: hit.x, y: hit.y });
      return 'blocked';
    }
    // A golden arrow breaks through: one plate of the ward goes.
    for (let i = 0; i < PLATES; i++) {
      const k = (i + Math.floor(this.barrierSpin / (TAU / PLATES))) % PLATES;
      if (this.plateState[k] === 1) {
        this.plateState[k] = 0.999;
        this.plateVel[k] = this.plates[k].rotation;
        this.chips.explode(services.settings.count(14), this.plates[k].x, this.plates[k].y);
        break;
      }
    }
    this.onBarrier.emit({ kind: 'chip', x: hit.x, y: hit.y });
    return 'pass';
  }

  private flinch(side: number): void {
    const F = B.flinch;
    this.lift.x -= F.liftPx;
    this.tilt.x += side * F.tiltDeg * DEG;
    this.flashLeft = F.flashMs;
  }

  private recoil(side: number): void {
    const R = B.recoil;
    this.lift.x -= R.liftPx;
    this.lift.v -= R.liftPx * 4;
    this.tilt.x += side * R.tiltDeg * DEG;
    this.flashLeft = B.flinch.flashMs * 1.5;
    this.gemFlare = 1;
  }

  // ---------------------------------------------------------------- glows

  private updateGlows(breath: number, energy: number): void {
    const I = B.idle;
    const s = this.place.s;
    const stunned = this.brain.state === 'stunned';
    const strain = this.strain;
    // Gem pulse follows the breath; flares on hits, blazes when stunned or straining.
    const pulse = Math.max(breath, this.gemFlare, strain);
    const boost = stunned ? B.stun.gemBoost : this.brain.fury ? B.fury.gemBoost : 1;
    this.zonePoint('gem', this.p);
    const base = (BOSS.gemGlowR * s) / 32;
    this.gemHalo.setPosition(this.p.x, this.p.y)
      .setScale(base * (I.gemScale[0] + (I.gemScale[1] - I.gemScale[0]) * pulse) * boost * (1 + this.gemFlare * (B.recoil.gemFlare - 1)))
      .setAlpha(I.gemAlpha[0] + (I.gemAlpha[1] - I.gemAlpha[0]) * pulse);
    this.gemCore.setPosition(this.p.x, this.p.y).setScale(base * 0.55 * boost).setAlpha(0.4 + 0.6 * pulse);

    const roar = this.body.pose === BOSS.poses.roar;
    const flicker = 0.5 + 0.5 * Math.sin(this.t / 97) * Math.sin(this.t / 61);
    const eyeA = stunned ? 0.25 : I.eyeAlpha[0] + (I.eyeAlpha[1] - I.eyeAlpha[0]) * Math.max(flicker, roar ? 1 : 0, strain);
    const eyes = this.zone.eyes;
    for (let i = 0; i < this.eyes.length; i++) {
      const e = eyes[i] ?? eyes[0];
      this.body.worldPoint(e.x, e.y, this.p);
      this.eyes[i].setPosition(this.p.x, this.p.y).setScale(((34 + strain * 20) * s) / 32).setAlpha(eyeA);
    }

    if (energy > 0) {
      this.handPoint(this.p);
      this.energy.setVisible(true).setPosition(this.p.x, this.p.y)
        .setScale(0.4 + 1.8 * easeOutCubic(energy) + 0.15 * Math.sin(this.t / 40)).setAlpha(0.5 + 0.5 * energy);
    } else if (this.energy.visible) {
      this.energy.setVisible(false);
    }
  }

  private updateShine(dt: number, allowed: boolean): void {
    const I = B.idle;
    if (this.shineT < 0) {
      this.shineIn -= dt;
      if (this.shineIn <= 0 && allowed) {
        this.shineT = 0;
        this.shineSide = Math.random() < 0.5 ? 0 : 1;
        this.shineIn = Phaser.Math.Between(I.shineEveryMs[0], I.shineEveryMs[1]);
      }
      return;
    }
    this.shineT += dt;
    const k = this.shineT / I.shineMs;
    const path = BOSS.shine[this.shineSide];
    for (let i = 0; i < this.shine.length; i++) {
      // Each glint travels a bit behind the previous one along the pad edge.
      const u = k * 1.4 - i * 0.18;
      const s = this.shine[i];
      if (u < 0 || u > 1 || !allowed) {
        s.setVisible(false);
        continue;
      }
      const seg = u * (path.length - 1);
      const j = Math.min(path.length - 2, Math.floor(seg));
      const f = seg - j;
      this.body.worldPoint(path[j].x + (path[j + 1].x - path[j].x) * f, path[j].y + (path[j + 1].y - path[j].y) * f, this.p);
      s.setVisible(true).setPosition(this.p.x, this.p.y).setScale((0.55 - i * 0.12) * bump(u) * (this.place.s / 0.3))
        .setRotation(this.t / 200).setAlpha(bump(u));
    }
    if (k >= 1.4 + this.shine.length * 0.18) this.shineT = -1;
  }

  private updateStars(stunned: boolean): void {
    if (!stunned) {
      if (this.stars[0].visible) for (const st of this.stars) st.setVisible(false);
      return;
    }
    const S = B.stun;
    const h = this.zone.head;
    this.body.worldPoint(h.x, h.y - 120, this.p);
    const n = this.stars.length;
    for (let i = 0; i < n; i++) {
      const a = (this.t / S.starSpinMs) * TAU + (i / n) * TAU;
      const front = Math.sin(a) > 0;
      this.stars[i].setVisible(true)
        .setPosition(this.p.x + Math.cos(a) * S.starOrbit.rx, this.p.y + Math.sin(a) * S.starOrbit.ry)
        .setScale(front ? 0.42 : 0.3).setAlpha(front ? 1 : 0.55).setRotation(this.t / 150)
        .setDepth(DEPTH.boss + (front ? 3 : 0.5));
    }
  }

  // ---------------------------------------------------------------- barrier

  private raiseBarrier(): void {
    this.barrierUp = true;
    this.barrierK = 0;
    for (let i = 0; i < PLATES; i++) {
      this.plateState[i] = 1;
      this.plates[i].setVisible(true).setAlpha(0);
    }
    this.barrierGlow.setVisible(true);
    this.barrierDome.setVisible(true);
    this.chestPoint(this.p);
    this.onBarrier.emit({ kind: 'form', x: this.p.x, y: this.p.y });
  }

  private dropBarrier(shatter: boolean): void {
    if (!this.barrierUp) return;
    this.barrierUp = false;
    for (let i = 0; i < PLATES; i++) {
      if (this.plateState[i] === 1) {
        this.plateState[i] = shatter ? 0.999 : -1;
        this.plateVel[i] = this.plates[i].rotation;
        if (shatter) this.chips.explode(services.settings.count(10), this.plates[i].x, this.plates[i].y);
        else this.plates[i].setVisible(false);
      }
    }
    if (shatter) {
      this.chestPoint(this.p);
      this.onBarrier.emit({ kind: 'break', x: this.p.x, y: this.p.y });
    }
  }

  private updateBarrier(dt: number): void {
    const A = B.armor;
    this.barrierK = this.barrierUp ? Math.min(1, this.barrierK + dt / A.formMs) : Math.max(0, this.barrierK - dt / 300);
    const k = this.barrierK;
    const visible = k > 0.001;
    this.chestPoint(this.p);
    const cx = this.p.x;
    const cy = this.p.y;
    if (visible) {
      const pulse = 0.5 + 0.5 * Math.sin((this.t / A.pulseMs) * TAU);
      const form = easeOutBack(k, 2);
      this.barrierGlow.setPosition(cx, cy).setScale((A.radius / 32) * 1.25 * form).setAlpha(A.glowAlpha * (0.7 + 0.3 * pulse) * k);
      this.barrierDome.setPosition(cx, cy).setScale((A.radius / 58) * form).setAlpha(0.55 * k * (0.8 + 0.2 * pulse));
    } else if (this.barrierGlow.visible) {
      this.barrierGlow.setVisible(false);
      this.barrierDome.setVisible(false);
    }
    this.barrierSpin += ((A.spinDegPerSec * DEG) * dt) / 1000;
    // Hexagonal ward: plates at the edge midpoints of a hexagon, spinning slowly.
    const apothem = A.radius * Math.cos(Math.PI / PLATES);
    for (let i = 0; i < PLATES; i++) {
      const st = this.plateState[i];
      const pl = this.plates[i];
      if (st < 0) continue;
      const a = this.barrierSpin + (i / PLATES) * TAU;
      if (st === 1) {
        const form = easeOutBack(Math.min(1, k * 1.2 - i * 0.03), 2);
        const r = apothem * (0.6 + 0.4 * form);
        pl.setPosition(cx + Math.cos(a) * r, cy + Math.sin(a) * r).setRotation(a + Math.PI / 2)
          .setScale((A.radius / 190) * form, (A.radius / 260) * form).setAlpha(Math.min(0.85, k * 1.5));
      } else {
        // Breaking: flies outward, spins, fades.
        const left = st - dt / A.chipMs;
        this.plateState[i] = left <= 0 ? -1 : left;
        const u = 1 - Math.max(0, left);
        const r = apothem + 140 * easeOutCubic(u);
        pl.setPosition(cx + Math.cos(a) * r, cy + Math.sin(a) * r + 90 * u * u)
          .setRotation(this.plateVel[i] + u * 3).setAlpha(1 - u);
        if (left <= 0) pl.setVisible(false);
      }
    }
  }

  // ---------------------------------------------------------------- cracks

  /** A branching crack starting on one of the armor plates (source-box px, idle pose). */
  private addCrack(): void {
    const C = B.cracks;
    if (this.cracks.length >= C.max) return;
    const start = BOSS.armor[this.cracks.length % BOSS.armor.length];
    const pts = [start.x, start.y];
    let a = Math.random() * TAU;
    let x = start.x;
    let y = start.y;
    const n = Phaser.Math.Between(C.segments[0], C.segments[1]);
    const body = BOSS.zones.boss_idle.body;
    const maxR = body.r * 0.95;
    for (let i = 0; i < n; i++) {
      a += Phaser.Math.FloatBetween(-0.7, 0.7);
      const len = Phaser.Math.Between(C.stepPx[0], C.stepPx[1]);
      let nx = x + Math.cos(a) * len;
      let ny = y + Math.sin(a) * len;
      // Stay on his body: turn back toward the chest when wandering out.
      if (Math.hypot(nx - body.x, ny - body.y) > maxR) {
        a = Math.atan2(body.y - y, body.x - x) + Phaser.Math.FloatBetween(-0.5, 0.5);
        nx = x + Math.cos(a) * len;
        ny = y + Math.sin(a) * len;
      }
      x = nx;
      y = ny;
      pts.push(x, y);
    }
    this.cracks.push(pts);
  }

  private updateCracks(dt: number, idlePose: boolean): void {
    this.crackAlpha += ((idlePose ? 1 : 0) - this.crackAlpha) * Math.min(1, dt / 120);
    const dark = this.cracksDark.clear();
    const glow = this.cracksGlow.clear();
    if (this.cracks.length === 0 || this.crackAlpha < 0.02) return;
    const low = this.brain.lowHp;
    const pulse = 0.6 + 0.4 * Math.sin(this.t / 180);
    for (const pts of this.cracks) {
      if (low) glow.lineStyle(7, 0xff3a1a, 0.55 * pulse * this.crackAlpha);
      dark.lineStyle(3, 0x2a0e06, 0.85 * this.crackAlpha);
      for (let i = 0; i < pts.length; i += 2) {
        this.body.worldPoint(pts[i], pts[i + 1], this.p);
        if (i === 0) {
          dark.beginPath().moveTo(this.p.x, this.p.y);
          if (low) glow.beginPath().moveTo(this.p.x, this.p.y);
        } else {
          dark.lineTo(this.p.x, this.p.y);
          if (low) glow.lineTo(this.p.x, this.p.y);
        }
      }
      dark.strokePath();
      if (low) glow.strokePath();
    }
  }

  /** Cracks in the wall where the knuckles hit it. */
  private knuckleCracks(size: number): void {
    for (const k of BOSS.knuckles) {
      this.body.worldPoint(k.x, k.y, this.p);
      this.wallCrack(this.p.x, this.p.y, size);
    }
  }

  private wallCrack(x: number, y: number, size: number): void {
    const g = this.wallCracks;
    for (let branch = 0; branch < 4; branch++) {
      let a = -Math.PI / 2 + Phaser.Math.FloatBetween(-1.4, 1.4);
      let cx = x;
      let cy = y;
      g.lineStyle(3, 0x2a1a0c, 0.75);
      g.beginPath().moveTo(cx, cy);
      for (let i = 0; i < 4; i++) {
        a += Phaser.Math.FloatBetween(-0.5, 0.5);
        const len = (8 + Math.random() * 14) * size;
        cx += Math.cos(a) * len;
        cy += Math.sin(a) * len * 0.6;
        g.lineTo(cx, cy);
      }
      g.strokePath();
    }
  }
}

/** Blends two 0xRRGGBB colours (k = 0 → a, 1 → b), rounded so tints don't change every frame. */
function mixTint(a: number, b: number, k: number): number {
  const q = Math.round(k * 32) / 32;
  const ch = (shift: number) => Math.round(((a >> shift) & 0xff) * (1 - q) + ((b >> shift) & 0xff) * q);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
