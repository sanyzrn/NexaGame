import Phaser from 'phaser';
import { Art } from '../assets/Art';
import { setPlaceholderLabels } from '../assets/placeholders';
import { BALANCE } from '../config/balance';
import { DEPTH, DESIGN_H, DESIGN_W } from '../config/display';
import { FEEL } from '../config/feel';
import { ARENA } from '../data/arena';
import { HERO, PILLAR } from '../data/entities';
import { FINISHERS } from '../data/finishers';
import { DebugOverlay } from '../debug/DebugOverlay';
import { Boss } from '../entities/Boss';
import { Decor } from '../entities/Decor';
import type { Enemy, EnemyHooks, EnemyWorld } from '../entities/Enemy';
import { Hero } from '../entities/Hero';
import { Atmosphere } from '../render/Atmosphere';
import { services } from '../services';
import { AimSystem } from '../systems/AimSystem';
import { AimView } from '../systems/AimView';
import { ArenaCollider } from '../systems/ArenaCollider';
import { shotFor } from '../systems/charge';
import { FX } from '../systems/FX';
import { ProjectileSystem, type ArrowEndEvent, type HitEvent, type Point, type Target } from '../systems/ProjectileSystem';
import { Simorgh } from '../systems/Simorgh';
import { TeamFinisher } from '../systems/TeamFinisher';
import { TimeCtl } from '../systems/TimeCtl';
import { Volley } from '../systems/Volley';
import { Powers } from '../systems/Powers';
import { PowerMeter } from '../systems/powerMeter';
import { Surprises } from '../systems/Surprises';
import { readStartParam } from '../services/links';
import { WaveSystem, type WaveInfo } from '../systems/WaveSystem';
import { DamageNumbers } from '../ui/DamageNumbers';
import { Tutorial } from '../systems/Tutorial';
import { finalize, epicLineFor, type RunStats } from '../systems/score';
import { avatarColor, avatarTex } from '../ui/avatar';
import { vGradientTex } from '../ui/kit';
import { easeInCubic, easeInOutSine } from '../utils/ease';
import { faDigits } from '../utils/fa';
import type { TeamGate } from '../ui/TeamToasts';
import type { HudScene } from './HudScene';
import type { ResultData } from './ResultScene';

/** The raised top line during the boss fight: arrows fly past the wall to him (and fade in the sky). */
const FIGHT_TOP = 40;

interface Flight {
  t: number;
  ms: number;
  full: boolean;
  x0: number;
  y0: number;
  arrow: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  beam: Phaser.GameObjects.Image;
  carry: number;
  lastX: number;
  lastY: number;
}

/**
 * Three waves, then the White Div rises and fights (barrier, stun, summons), ending with the team
 * finisher, the Arrow of Arash. The group fights along: every hit feeds the group Div (HUD), a
 * teammate revives the hero once (rescue), and the teammates' volley answers a crowded arena.
 * Systems are independent; this scene builds them, wires their signals into sound, effects, camera
 * and HUD, and implements the enemies' hooks.
 */
export class GameScene extends Phaser.Scene implements EnemyHooks {
  private timeCtl!: TimeCtl;
  private fx!: FX;
  private atmosphere!: Atmosphere;
  private decor!: Decor;
  private boss!: Boss;
  private simorgh!: Simorgh;
  private aim!: AimSystem;
  private aimView!: AimView;
  private hero!: Hero;
  private waves!: WaveSystem;
  private collider!: ArenaCollider;
  private projectiles!: ProjectileSystem;
  private numbers!: DamageNumbers;
  private debug!: DebugOverlay;
  private hud!: HudScene;
  private tutorial: Tutorial | null = null;
  /** 'title': held at dusk behind the title screen; 'flying': the camera dives in; 'play'. */
  private mode: 'title' | 'flying' | 'play' = 'play';
  private dusk: Phaser.GameObjects.Image | null = null;
  private embers: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  /** The Div's eyes, glowing through the title's dusk. */
  private titleEyes: Phaser.GameObjects.Image[] = [];
  private titleT = 0;
  private readonly camK = { k: 0 };
  // Run stats for the Result screen.
  private shots = 0;
  private goldenShots = 0;
  private damageDealt = 0;
  private heartsLost = 0;
  private reachedBoss = false;
  private ended = false;
  // Powers & surprises (M5.5)
  private powers!: Powers;
  private surprises!: Surprises;
  private readonly meter = new PowerMeter();
  private powersUsed = 0;
  private goldenStreak = 0;
  private goldenImpDone = false;
  private homaAt = -1;
  private homaBlessed = false;
  /** startRun waits for the HUD (it is relaunched a frame after this scene starts). */
  private pendingStart = false;
  private finisher: TeamFinisher | null = null;
  private flight: Flight | null = null;
  private volley!: Volley;
  private volleyCount = 0;
  private volleyCooldown = 0;
  private runMs = 0;
  private rescueUsed = false;
  private rescuing = false;
  private readonly targets: Target[] = [];
  private readonly world: EnemyWorld = { heroX: 0, heroY: 0, aiming: false, aimX: 0, aimY: 0, aimDX: 0, aimDY: -1 };
  private readonly tmp: Point = { x: 0, y: 0 };
  private hearts = 0;
  private combo = 0;
  private bestCombo = 0;
  private kills = 0;
  private bossDamage = 0;
  private defeated = false;
  private won = false;
  private simorghDone = false;
  private lastShot = '-';
  private wasGolden = false;

  constructor() {
    super('Game');
  }

  create(data?: { title?: boolean }): void {
    const { audio, haptics } = services;
    this.mode = data?.title ? 'title' : 'play';
    this.tutorial = null;
    this.dusk = null;
    this.embers = [];
    this.titleEyes = [];
    this.titleT = 0;
    this.shots = this.goldenShots = this.damageDealt = this.heartsLost = 0;
    this.reachedBoss = this.ended = false;
    this.meter.value = 0;
    this.powersUsed = this.goldenStreak = 0;
    this.goldenImpDone = this.homaBlessed = this.pendingStart = false;
    this.homaAt = -1;
    this.hearts = BALANCE.hero.hearts;
    this.combo = this.bestCombo = this.kills = this.bossDamage = 0;
    this.defeated = this.won = this.simorghDone = false;
    this.finisher = null;
    this.flight = null;
    this.volleyCount = this.volleyCooldown = this.runMs = 0;
    this.rescueUsed = this.rescuing = false;

    this.timeCtl = new TimeCtl(this);
    // Camera moves (intro push-in, the finisher's flight) never show past the arena's edges.
    this.cameras.main.setBounds(0, 0, DESIGN_W, DESIGN_H);
    const fx = (this.fx = new FX(this, this.timeCtl));
    this.atmosphere = new Atmosphere(this, this.timeCtl);
    this.boss = new Boss(this, this.timeCtl);
    this.decor = new Decor(this, this.timeCtl, ARENA.decor, ARENA.pillars);
    this.collider = new ArenaCollider(ARENA.walls, ARENA.pillars.map((p) => ({
      x: p.x + PILLAR.collision.x, y: p.y + PILLAR.collision.y, w: PILLAR.collision.w, h: PILLAR.collision.h,
    })));

    this.hero = new Hero(this, ARENA.hero.x, ARENA.hero.y, fx);
    const launch = { x: this.hero.bowX, y: this.hero.bowY };
    this.world.heroX = this.hero.x + HERO.hitbox.x;
    this.world.heroY = this.hero.y + HERO.hitbox.y;
    this.world.aimX = launch.x;
    this.world.aimY = launch.y;

    this.waves = new WaveSystem(this, this);
    this.numbers = new DamageNumbers(this);
    this.projectiles = new ProjectileSystem(this, this.collider, () => this.allTargets(), fx);
    this.volley = new Volley(this, {
      enemies: () => this.waves.enemies,
      onHit: (e, archer, damage, outcome, x, y) => {
        fx.hitSparks(x, y, false, archer.color);
        fx.shake('hit');
        services.audio.play('hit');
        if (outcome === 'blocked') return;
        this.hud.allyDamage(archer.member, damage);
        if (outcome === 'kill') {
          fx.swirl(e.bodyX, e.bodyY, FEEL.particles.deathSmoke, 30);
          fx.sparkles(e.bodyX, e.bodyY);
          services.audio.play('kill');
        }
      },
      onMiss: (x, y) => fx.absorb(x, y),
    });
    this.surprises = new Surprises(this, {
      fx, hero: this.hero, timeCtl: this.timeCtl,
      onHomaBlessing: () => this.homaBlessing(),
    });

    this.scene.launch('Hud', { hidden: this.mode === 'title' });
    const hud = (this.hud = this.scene.get('Hud') as HudScene);
    this.powers = new Powers(this, {
      fx, timeCtl: this.timeCtl, atmosphere: this.atmosphere, hero: this.hero, boss: this.boss, decor: this.decor,
      projectiles: this.projectiles,
      enemies: () => this.waves.enemies,
      setAim: (on) => {
        if (!on) this.aim.cancel();
        this.aim.enabled = on && this.canAim();
      },
      onEnemyHit: (e, damage, outcome) => this.powerHitEnemy(e, damage, outcome),
      onBossHit: (damage, x, y) => {
        this.bossDamage += damage;
        this.damageDealt += damage;
        this.hud.setBossHp(this.boss.brain.hpPct);
        this.numbers.spawn(x, y - 40, damage, true);
        this.feedGroup(x, y, damage, true, false);
      },
      heal: (n) => {
        const before = this.hearts;
        this.hearts = Math.min(BALANCE.hero.hearts, this.hearts + n);
        if (this.hearts !== before) this.hud.setHearts(this.hearts);
      },
      raiseChain: () => this.hud.group?.raiseChain(),
    });
    this.aim = new AimSystem(this, launch, (p) => hud.isPointerOverUi(p));
    this.aimView = new AimView(this, this.aim, this.collider, launch, () => this.allTargets());

    this.simorgh = new Simorgh(this, this.timeCtl, {
      bow: () => launch,
      onGust: (ms) => {
        this.decor.gust(this, ms);
        this.atmosphere.gust(ms);
      },
      onFeatherLanded: (x, y) => {
        this.hero.setFeather(true);
        this.aimView.guided = true;
        fx.goldenBurst(x, y);
        haptics.play('medium');
      },
    });

    // Audio must be unlocked from a gesture.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => audio.unlock());
    this.input.on(Phaser.Input.Events.POINTER_UP, () => audio.unlock());

    // ---- aim & arrows ----
    this.aim.onStart.add(() => audio.startDraw());
    this.aim.onCancel.add(() => {
      audio.stopDraw();
      audio.stopHum();
    });
    this.aim.onGoldenOpen.add(() => {
      audio.play('golden');
      audio.startHum(BALANCE.bow.goldenMs);
      if (FEEL.goldenHaptic) haptics.play('tick');
      fx.goldenBurst(launch.x, launch.y);
    });
    this.aim.onFire.add((e) => {
      audio.stopDraw();
      audio.stopHum();
      audio.play('release', e.charge);
      haptics.play('light');
      this.shots++;
      if (e.shot.crit || this.hero.feathered) this.goldenShots++;
      this.trackGoldenStreak(e.shot.crit);
      if (this.hero.feathered) {
        // The Simorgh's feather: a guided golden arrow, straight for the gem.
        const shot = shotFor({ charge: 1, phase: 'golden' });
        this.hero.release(true);
        this.aimView.guided = false;
        this.projectiles.fire(launch.x, launch.y, e.dirX, e.dirY, shot, {
          feather: true,
          homing: () => (this.boss.brain.fighting ? this.boss.gemPoint(this.tmp) : null),
        });
        audio.play('featherChime');
      } else {
        this.hero.release(e.shot.crit);
        this.projectiles.fire(launch.x, launch.y, e.dirX, e.dirY, e.shot, { flame: this.hero.flaming });
      }
      this.lastShot = `${e.shot.damage}${e.shot.crit ? ' CRIT' : ''} @${Math.round(e.charge * 100)}%`;
    });
    this.projectiles.onHit.add((e) => this.onArrowHit(e));
    this.projectiles.onBounce.add((e) => {
      fx.bounce(e.x, e.y);
      audio.play('bounce');
    });
    this.projectiles.onEnd.add((e) => this.onArrowEnd(e));

    // ---- waves & boss ----
    this.waves.onWaveStart.add((w) => {
      this.announceWave(w);
      this.maybeGoldenImp();
    });
    this.waves.onAllCleared.add(() => this.time.delayedCall(1200, () => this.startBossIntro()));
    this.wireBoss();

    this.events.on(Phaser.Scenes.Events.PAUSE, () => {
      this.aim.cancel();
      audio.stopDraw();
      audio.stopHum();
    });

    this.buildDebug(this.collider.pillars, launch);
    if (this.mode === 'title') this.enterTitle();
    else {
      this.cameras.main.fadeIn(450, 10, 6, 20);
      this.pendingStart = true;
    }
  }

  // ---------------------------------------------------------------- title & the flight in

  /** Behind the title screen: dusk, embers, the camera up high, the Div a glowing-eyed silhouette. */
  private enterTitle(): void {
    const F = FEEL.title;
    const D = F.dusk;
    this.aim.enabled = false;
    this.dusk = this.add.image(-40, -40, vGradientTex(this, 'ui_grad_title_dusk', D.top, D.mid, D.bottom))
      .setOrigin(0).setDisplaySize(DESIGN_W + 80, DESIGN_H + 80).setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY).setDepth(DEPTH.grade + 2.5).setAlpha(D.alpha);
    this.atmosphere.darken(D.darken, 10);
    this.boss.silhouette = 1;
    this.titleEyes = this.boss.eyeGlows.map(() => this.add.image(0, 0, 'fx_glow').setTint(0xff4a1a)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.grade + 3).setScale(0.9));
    // Two ember layers at different depths (scroll factors), for parallax against the drift.
    const ember = (scale: number, scroll: number, alpha: number, depth: number, rate: number) => {
      const e = this.add.particles(0, 0, 'fx_spark', {
        x: { min: 40, max: DESIGN_W - 40 }, y: { min: DESIGN_H * 0.6, max: DESIGN_H + 40 },
        lifespan: { min: F.embers.lifeMs[0], max: F.embers.lifeMs[1] },
        speedY: { min: -120, max: -50 }, speedX: { min: -25, max: 35 },
        scale: { start: scale, end: 0 }, alpha: { start: alpha, end: 0 },
        tint: [0xff8a2a, 0xffc04a, 0xff5a1a], blendMode: 'ADD',
        frequency: 1000 / services.settings.count(rate), maxParticles: 60,
      }).setScrollFactor(scroll).setDepth(depth);
      e.fastForward(3000);
      this.embers.push(e);
    };
    ember(0.9, 1.25, 1, DEPTH.motes + 1, F.embers.perSec);
    ember(0.5, 0.8, 0.7, DEPTH.grade - 1, F.embers.perSec * 0.7);
    this.placeTitleCamera(0);
    this.scene.launch('Title');
  }

  private placeTitleCamera(drift: number): void {
    const cam = this.cameras.main;
    cam.setZoom(FEEL.title.camZoom);
    cam.centerOn(DESIGN_W / 2 + drift, FEEL.title.focusY);
  }

  /** Title secret: where the Div's glowing eyes are on screen (null once the title is over). */
  titleEyesOnScreen(out: { x: number; y: number }): boolean {
    if (this.mode !== 'title' || !this.titleEyes.length) return false;
    let x = 0;
    let y = 0;
    for (const e of this.titleEyes) {
      x += e.x;
      y += e.y;
    }
    const n = this.titleEyes.length;
    const p = this.toScreen(x / n, y / n);
    out.x = p.x;
    out.y = p.y;
    return true;
  }

  /** Title secret: a tap on the eyes makes them flare; the last one wakes him with a roar. */
  pokeTitleEyes(wake: boolean): void {
    for (const e of this.titleEyes) this.tweens.add({ targets: e, scale: { from: wake ? 2.6 : 1.7, to: 0.9 }, duration: wake ? 900 : 380, ease: 'Cubic.easeOut' });
    if (!wake) {
      services.audio.play('growl');
      return;
    }
    this.boss.poke();
    this.atmosphere.shockwave(0.6, 500);
    this.decor.gust(this, 1200);
    this.atmosphere.gust(1200);
    for (const e of this.embers) e.explode(services.settings.count(20), DESIGN_W / 2, FEEL.title.focusY - 300);
    services.haptics.play('heavy');
  }

  /** «نبرد!»: a short push toward the wall, then the camera sweeps down into the arena. */
  beginPlay(): void {
    if (this.mode !== 'title') return;
    this.mode = 'flying';
    const F = FEEL.title;
    const cam = this.cameras.main;
    const x0 = cam.midPoint.x;
    const y0 = cam.midPoint.y;
    const z0 = cam.zoom;
    services.audio.play('whoosh');
    this.camK.k = 0;
    this.tweens.add({
      targets: this.camK, k: 1, duration: F.pushMs, ease: 'Sine.easeIn',
      onUpdate: () => {
        const k = this.camK.k;
        cam.setZoom(z0 + (F.pushZoom - z0) * k);
        cam.centerOn(x0 + (DESIGN_W / 2 - x0) * k, y0 - 50 * k);
      },
      onComplete: () => {
        const z1 = cam.zoom;
        const y1 = cam.midPoint.y;
        this.camK.k = 0;
        this.tweens.add({
          targets: this.camK, k: 1, duration: F.flyMs, ease: 'Cubic.easeInOut',
          onUpdate: () => {
            const k = this.camK.k;
            cam.setZoom(z1 + (1 - z1) * k);
            cam.centerOn(DESIGN_W / 2, y1 + (DESIGN_H / 2 - y1) * k);
          },
          onComplete: () => {
            cam.setZoom(1).centerOn(DESIGN_W / 2, DESIGN_H / 2);
            this.mode = 'play';
            this.pendingStart = true;
          },
        });
      },
    });
    // The dusk lifts and the Div steps out of shadow as we arrive; the HUD fades in at the end.
    if (this.dusk) this.tweens.add({ targets: this.dusk, alpha: 0, duration: F.pushMs + F.flyMs, ease: 'Sine.easeInOut' });
    this.atmosphere.darken(0, F.pushMs + F.flyMs);
    this.tweens.add({
      targets: this.boss, silhouette: 0, duration: F.flyMs, delay: F.pushMs,
      onComplete: () => {
        for (const e of this.titleEyes) e.destroy();
        this.titleEyes = [];
      },
    });
    for (const e of this.embers) e.stop();
    this.time.delayedCall(F.pushMs + F.flyMs * 0.55, () => this.hud.reveal(F.flyMs * 0.45));
  }

  /** The run proper: the tutorial first (first play), then the waves. */
  private startRun(): void {
    this.aim.enabled = true;
    // Rare: the Homa may glide over this run.
    if (FEEL.surprises.homa.enabled && Math.random() < BALANCE.surprises.homa.chancePerRun) this.homaAt = BALANCE.surprises.homa.afterMs;
    if (services.settings.tutorialDone) {
      this.waves.start();
      return;
    }
    this.tutorial = new Tutorial(this, {
      bow: { x: this.hero.bowX, y: this.hero.bowY },
      aim: this.aim,
      collider: this.collider,
      spawnShield: (x, y) => this.waves.spawnOne('shield', x, y),
      showSkip: (cb) => this.hud.showSkip(cb),
      hideSkip: () => this.hud.hideSkip(),
      onDone: () => {
        this.tutorial = null;
        this.waves.start();
      },
    });
  }

  update(_time: number, delta: number): void {
    const realMs = Math.min(delta, 50);
    const dt = this.timeCtl.update(realMs);

    if (this.mode === 'title') {
      // A slow drift of the camera over the dusk arena.
      this.titleT += realMs;
      this.placeTitleCamera(Math.sin((this.titleT / FEEL.title.driftMs) * Math.PI * 2) * FEEL.title.driftPx);
    }
    if (this.titleEyes.length) {
      const glow = 0.55 + 0.35 * Math.sin(this.titleT / 700);
      this.titleEyes.forEach((e, i) => {
        const src = this.boss.eyeGlows[i];
        e.setPosition(src.x, src.y).setAlpha(glow * this.boss.silhouette);
      });
    }
    if (this.pendingStart && this.hud.ready) {
      this.pendingStart = false;
      this.startRun();
    }
    const aim = this.aim;
    aim.update(realMs);
    this.tutorial?.update(realMs);
    this.powers.update(realMs);
    this.surprises.update(realMs);
    // The golden imp sheds glitter as it runs.
    for (const e of this.waves.enemies) if (e.golden && e.alive && Math.random() < 0.6) this.fx.sparkleAt(e.bodyX, e.bodyY, 50);
    if (this.homaAt > 0 && this.runMs >= this.homaAt && this.teamGate() !== 'blocked') {
      this.homaAt = -1;
      this.surprises.flyHoma();
    }
    const golden = aim.charging && aim.state.phase === 'golden';
    if (this.wasGolden && !golden) services.audio.stopHum();
    this.wasGolden = golden;
    if (aim.charging) services.audio.updateDraw(aim.state.charge, golden);
    this.world.aiming = aim.aiming;
    this.world.aimDX = aim.dirX;
    this.world.aimDY = aim.dirY;

    this.atmosphere.update(realMs);
    this.decor.update(dt);
    this.boss.update(dt);
    this.simorgh.update(dt);
    this.hero.update(realMs, aim);
    this.projectiles.update(dt);
    this.volley.update(dt);
    this.runMs += dt;
    this.maybeVolley(dt);
    this.waves.update(dt, this.world);
    this.numbers.update(dt);
    if (this.flight) this.updateFlight(realMs);
    this.fx.update(realMs);
    this.aimView.update(realMs);
    this.debug.update(realMs);
  }

  private allTargets(): readonly Target[] {
    const e = this.waves.enemies;
    if (this.targets.length !== e.length + 2) {
      this.targets.length = 0;
      this.targets.push(...e, this.boss.barrierTarget, this.boss.target);
    }
    return this.targets;
  }

  // ---------------------------------------------------------------- boss

  private startBossIntro(): void {
    if (this.defeated) return;
    this.reachedBoss = true;
    const I = FEEL.boss.intro;
    const cam = this.cameras.main;
    const { audio } = services;
    this.aim.cancel();
    this.aim.enabled = false;
    this.atmosphere.darken(I.darken, 600);
    for (const at of I.drumsAtMs) {
      this.time.delayedCall(at, () => {
        audio.play('drum');
        this.cameras.main.shake(120, 0.002);
      });
    }
    cam.zoomTo(I.zoom, I.pushMs, 'Sine.easeInOut');
    cam.pan(DESIGN_W / 2, I.focusY, I.pushMs, 'Sine.easeInOut');
    this.boss.startIntro();
    // After the first time, a tap skips it.
    if (services.settings.bossIntroSeen) {
      this.input.once(Phaser.Input.Events.POINTER_DOWN, () => this.boss.skipIntro());
    }
  }

  private wireBoss(): void {
    const { audio, haptics } = services;
    const fx = this.fx;
    const boss = this.boss;
    const I = FEEL.boss.intro;

    boss.onGrowl.add(() => {
      audio.play('growl');
      fx.shake('growl');
    });
    boss.onSlam.add(({ x, y, power }) => {
      // Weight: the bigger the hit, the longer the freeze and the harder the shake.
      const s = I.slamShake;
      this.cameras.main.shake(s.ms * (0.5 + 0.5 * power), s.intensity * power, true);
      this.timeCtl.hitStop(I.slamHitStopMs * power);
      audio.play('slam', power);
      haptics.play('heavy');
      for (let i = -1; i <= 1; i += 2) {
        fx.dustBurst(x + i * 110, y, Math.round(I.dust * power));
        fx.debris(x + i * 110, y - 20, Math.round(I.debris * power * 0.5));
      }
    });
    boss.onRoar.add(({ x, y }) => {
      audio.play('growl');
      audio.play('shockwave');
      this.cameras.main.shake(I.roarShake.ms, I.roarShake.intensity, true);
      this.atmosphere.shockwave(1, 700);
      fx.ring(x, y, 0xfff0d0, 0.5, 9, 700);
      fx.ring(x, y, 0xffb070, 0.3, 6, 900);
    });
    boss.onIntroBar.add(() => {
      this.hud.showBossBar('دیو سپید');
      this.hud.setBossHp(1);
    });
    boss.onIntroDone.add(() => {
      const cam = this.cameras.main;
      cam.zoomTo(1, I.returnMs, 'Sine.easeInOut');
      cam.pan(DESIGN_W / 2, DESIGN_H / 2, I.returnMs, 'Sine.easeInOut');
      this.atmosphere.darken(0, I.returnMs);
      this.collider.setTop(FIGHT_TOP);
      this.aim.enabled = !this.defeated;
      services.settings.markBossIntroSeen();
    });
    boss.onSummonStart.add(() => audio.play('summon'));
    boss.onSummon.add((n) => this.waves.summon(n, ARENA.summonPoints));
    boss.onBarrier.add(({ kind, x, y }) => {
      if (kind === 'form') {
        audio.play('barrierUp');
        this.hud.setBossArmor(true);
        fx.ring(x, y, FEEL.boss.armor.color, 0.4, 3.2, 600);
        this.cameras.main.shake(260, 0.004, true);
        // Surprise: the Simorgh answers the barrier, once.
        if (FEEL.simorgh.enabled && !this.simorghDone) {
          this.simorghDone = true;
          this.time.delayedCall(FEEL.simorgh.delayMs, () => {
            if (!this.defeated && this.boss.brain.fighting) this.simorgh.fly();
          });
        }
      } else if (kind === 'break') {
        audio.play('barrierBreak');
        this.hud.setBossArmor(false);
        fx.ring(x, y, 0xfff0b0, 0.6, 4, 500);
        this.cameras.main.shake(300, 0.008, true);
        haptics.play('heavy');
      }
    });
    boss.onStun.add((on) => {
      if (on) {
        audio.play('stun');
        this.timeCtl.hitStop(140);
        fx.critFlash();
      }
    });
    boss.onStumble.add(({ x, y }) => {
      audio.play('slam', 0.35);
      fx.dustBurst(x, y + 10, 10);
      fx.shake('step');
    });
    boss.onLowHp.add(() => audio.play('growl'));
    boss.onFinisher.add(() => this.startFinisher());
  }

  // ---------------------------------------------------------------- arrows

  private onArrowHit(e: HitEvent): void {
    const { audio, haptics } = services;
    const fx = this.fx;
    const boss = this.boss;

    if (e.target === boss.barrierTarget) {
      if (e.outcome === 'blocked') {
        // Uncharged arrows bounce off the ward.
        fx.clang(e.x, e.y);
        fx.shake('hit');
        audio.play('clang');
        haptics.play('light');
      } else {
        audio.play('barrierChip');
        fx.hitSparks(e.x, e.y, true, FEEL.boss.armor.color);
      }
      return;
    }

    if (e.target === boss.target) {
      if (e.outcome === 'blocked') {
        fx.clang(e.x, e.y);
        audio.play('clang');
        return;
      }
      this.bossDamage += e.damage;
      this.damageDealt += e.damage;
      this.hud.setBossHp(boss.brain.hpPct);
      this.feedGroup(e.x, e.y, e.damage, e.crit, false);
      if (e.crit) this.gainPower('golden', e.x, e.y);
      this.setCombo(this.combo + 1);
      const gem = boss.gemHit;
      const big = gem && e.crit;
      this.numbers.spawn(e.x, e.y - 40, e.damage, e.crit || gem);
      fx.hitSparks(e.x, e.y, e.crit, gem ? 0xff4a2a : 0xfff0d0);
      audio.play('bossHit', big ? 1.4 : 1);
      if (big) {
        const R = FEEL.boss.recoil;
        this.timeCtl.hitStop(R.hitStopMs);
        this.cameras.main.shake(R.shake.ms, R.shake.intensity, true);
        fx.critFlash();
        audio.play('crit');
        haptics.play('heavy');
      } else if (e.crit) {
        fx.hitStop();
        fx.shake('crit');
        audio.play('crit');
        haptics.play('medium');
      } else {
        fx.shake('hit');
      }
      return;
    }

    const t = e.target as Enemy;
    if (e.outcome === 'blocked') {
      fx.clang(t.shieldX, t.shieldY);
      fx.shake('hit');
      audio.play('clang');
      haptics.play('light');
      return;
    }
    if (e.outcome === 'pass') return;

    this.numbers.spawn(t.hitX, t.hitY - t.hitR - 20, e.damage, e.crit);
    this.damageDealt += e.damage;
    fx.hitSparks(e.x, e.y, e.crit, t.color);
    this.feedGroup(e.x, e.y, e.damage, e.crit, e.outcome === 'kill');
    if (e.crit) this.gainPower('golden', e.x, e.y);
    if (e.outcome === 'kill') {
      this.gainPower('kill', e.x, e.y);
      if (t.golden) this.goldenImpCaught(t);
    }
    this.setCombo(this.combo + 1);
    if (e.crit) {
      fx.hitStop();
      fx.shake('crit');
      fx.critFlash();
      audio.play('crit');
      haptics.play('medium');
    } else {
      fx.shake('hit');
      audio.play('hit');
    }
    if (e.outcome === 'kill') {
      this.kills++;
      fx.swirl(t.bodyX, t.bodyY, FEEL.particles.deathSmoke, 30);
      fx.sparkles(t.bodyX, t.bodyY);
      fx.coinBurst(t.bodyX, t.bodyY, this.combo);
      fx.shake('kill');
      audio.play('kill');
      haptics.play('heavy');
    }
  }

  /** The player's damage flows to the group Div as a gold stream from the hit point. */
  private feedGroup(x: number, y: number, damage: number, crit: boolean, kill: boolean, motes = 0): void {
    const p = this.toScreen(x, y);
    this.hud.playerDamage(p.x, p.y, damage, crit, kill, motes);
  }

  /** World → HUD (screen) px, through the camera's zoom and scroll. */
  private toScreen(x: number, y: number): Point {
    const cam = this.cameras.main;
    return { x: (x - cam.worldView.x) * cam.zoom, y: (y - cam.worldView.y) * cam.zoom };
  }

  private onArrowEnd(e: ArrowEndEvent): void {
    if ((e.kind === 'top' && e.y >= ARENA.walls.top - 20) || e.kind === 'pillar' || e.kind === 'wall') {
      this.fx.absorb(e.x, e.y);
      services.audio.play('absorb');
    }
    // An arrow that hit nothing breaks the streak.
    if (e.hits === 0) this.setCombo(0);
    else if (this.surprises.trickShot(e.kills, e.bounces, e.x, e.y)) this.gainPower('trickShot', e.x, e.y);
  }

  private setCombo(n: number): void {
    if (n > this.combo && this.meter.combo(n) > 0) this.hud.powerSpark(this.hero.bowX, this.hero.bowY);
    this.combo = n;
    this.bestCombo = Math.max(this.bestCombo, n);
    this.hud.setCombo(n);
  }

  // ---------------------------------------------------------------- the Arrow of Arash

  private startFinisher(): void {
    if (this.defeated || this.won || this.finisher) return;
    const F = FEEL.finisher;
    const { audio } = services;
    this.aim.cancel();
    this.aim.enabled = false;
    audio.stopDraw();
    audio.stopHum();
    // The world holds its breath: slow, grey, darker. The boss strains mid-roar.
    this.timeCtl.slowMo(F.slowMo, 1e9);
    this.atmosphere.desaturate(F.desaturate, 700);
    this.atmosphere.darken(F.darken, 700);
    audio.play('drum', 0.8);
    const cam = this.cameras.main;
    cam.zoomTo(1, 300);
    cam.pan(DESIGN_W / 2, DESIGN_H / 2, 300);

    this.hud.dismissToasts();
    this.finisher = new TeamFinisher(this.hud, FINISHERS.arash, this.hud.finisherMembers(), {
      ringCenter: () => ({ x: this.hero.x, y: this.hero.y - F.ringLift }),
      onProgress: (k) => this.hero.setBlazing(k * 0.5),
      onReady: () => {
        this.hero.setBlazing(1);
        audio.startChoir();
        this.fx.goldenBurst(this.hero.bowX, this.hero.bowY);
        this.cameras.main.shake(300, 0.003, true);
      },
      onRelease: (full) => {
        const fin = this.finisher;
        this.time.delayedCall(420, () => fin?.destroy());
        this.finisher = null;
        this.launchFinisherArrow(full);
      },
    });
  }

  private launchFinisherArrow(full: boolean): void {
    const F = FEEL.finisher;
    const { audio, haptics } = services;
    this.hero.releaseBlazing();
    audio.stopChoir(0.8);
    audio.play('arrowLaunch');
    haptics.play('heavy');
    const x0 = this.hero.bowX;
    const y0 = this.hero.bowY;
    const scale = BALANCE.arrow.scale * (full ? F.arrowScale : 1.2);
    const arrow = this.add.image(x0, y0, 'arrow').setScale(scale).setTint(0xfff0b0).setDepth(DEPTH.arrows + 2);
    const glow = this.add.image(x0, y0, 'fx_glow').setTint(0xffd24a).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.arrows + 1).setScale(full ? 3 : 1.6);
    const beam = this.add.image(x0, y0, 'fx_beam').setOrigin(0.5, 1).setTint(0xffd878).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.arrows).setAlpha(full ? 0.9 : 0.5);
    if (full && this.atmosphere.fxAllowed) arrow.preFX?.addGlow(0xffe070, 6, 0, false, 0.1, 16);
    this.flight = { t: 0, ms: full ? F.flightMs : F.earlyFlightMs, full, x0, y0, arrow, glow, beam, carry: 0, lastX: x0, lastY: y0 };
    // Colour flows back into the world behind the arrow.
    this.atmosphere.desaturate(0, full ? F.flightMs : 300);
    this.atmosphere.darken(full ? 0.1 : 0, 600);
  }

  private updateFlight(realMs: number): void {
    const f = this.flight!;
    const F = FEEL.finisher;
    f.t += realMs;
    const k = Math.min(1, f.t / f.ms);
    const target = this.boss.gemPoint(this.tmp);
    // Slow start, then it gathers speed (slow motion for the world, not for the arrow's resolve).
    const e = f.full ? easeInCubic(k) * 0.7 + k * 0.3 : easeInOutSine(k);
    const x = f.x0 + (target.x - f.x0) * e;
    const y = f.y0 + (target.y - f.y0) * e;
    const rot = Math.atan2(target.y - f.y0, target.x - f.x0);
    f.arrow.setPosition(x, y).setRotation(rot);
    f.glow.setPosition(x, y).setScale((f.full ? 3 : 1.6) + Math.sin(f.t / 40) * 0.3);
    const len = Math.hypot(x - f.x0, y - f.y0);
    f.beam.setPosition(x, y).setRotation(rot + Math.PI / 2).setDisplaySize(f.full ? 110 : 40, Math.max(1, len));
    f.carry = this.fx.trail(f.lastX, f.lastY, x, y, true, f.carry);
    f.lastX = x;
    f.lastY = y;
    if (f.full) {
      // The camera rides with the arrow.
      const cam = this.cameras.main;
      cam.setZoom(1 + (F.camZoom - 1) * Math.sin(Math.min(1, k * 1.2) * Math.PI * 0.5));
      cam.centerOn(DESIGN_W / 2, DESIGN_H / 2 + (y - DESIGN_H / 2) * 0.8);
    }
    if (k >= 1) this.finisherImpact(f);
  }

  private finisherImpact(f: Flight): void {
    const F = FEEL.finisher;
    const { audio, haptics } = services;
    const fx = this.fx;
    this.flight = null;
    f.arrow.destroy();
    f.glow.destroy();
    this.tweens.add({ targets: f.beam, alpha: 0, duration: 500, onComplete: () => f.beam.destroy() });
    const gem = this.boss.gemPoint({ x: 0, y: 0 });

    const hpBefore = this.boss.brain.hp;
    if (!f.full) {
      // Too early: it wounds him, but the fight goes on and the moment will come again.
      this.boss.finisherResult(false);
      const wound = hpBefore - this.boss.brain.hp;
      this.bossDamage += wound;
      this.damageDealt += wound;
      this.feedGroup(gem.x, gem.y, wound, true, false, FEEL.stream.critMotes * 2);
      this.hud.setBossHp(this.boss.brain.hpPct);
      this.timeCtl.slowMo(1, 0);
      fx.critFlash();
      fx.hitSparks(gem.x, gem.y, true, 0xffd24a);
      audio.play('bossHit', 1.5);
      this.cameras.main.shake(300, 0.01, true);
      this.atmosphere.darken(0, 400);
      this.aim.enabled = !this.defeated;
      return;
    }

    // Full: time stops for a beat in a white flash, then he breaks into light.
    this.won = true;
    this.boss.finisherResult(true);
    // The whole group's arrow: its blow pours into the group bar as a river of gold.
    this.bossDamage += hpBefore;
    this.damageDealt += hpBefore;
    this.feedGroup(gem.x, gem.y, hpBefore, true, true, 24);
    this.hud.setBossHp(0);
    this.timeCtl.hitStop(F.freezeMs);
    fx.flashTo(F.flash.alpha, F.flash.ms);
    haptics.play('heavy');
    audio.play('crit');
    this.time.delayedCall(F.freezeMs, () => {
      this.timeCtl.slowMo(1, 0);
      this.boss.shatter();
      audio.play('shatter');
      audio.play('shockwave', 1.4);
      this.atmosphere.shockwave(2, F.shockwaveMs);
      fx.ring(gem.x, gem.y, 0xffffff, 0.5, 30, F.shockwaveMs);
      fx.ring(gem.x, gem.y, 0xffd24a, 0.3, 22, F.shockwaveMs * 1.2);
      for (let i = 0; i < 4; i++) {
        fx.sparkles(gem.x, gem.y);
        fx.coinBurst(gem.x + (i - 1.5) * 60, gem.y, 12);
      }
      this.cameras.main.shake(700, 0.012, true);
      this.waves.clearAll(gem.x, gem.y, 1.6);
      this.atmosphere.flood(F.floodMs);
      this.boss.healWall(F.floodMs);
      this.hud.hideBossBar();
      this.hud.clearCombo();
      const cam = this.cameras.main;
      cam.zoomTo(1, 1200, 'Sine.easeInOut');
      cam.pan(DESIGN_W / 2, DESIGN_H / 2, 1200, 'Sine.easeInOut');
    });
    this.time.delayedCall(F.freezeMs + F.victoryTitleAtMs, () => {
      this.hud.bigTitle('پیروزی لشکر!');
      audio.play('victory');
    });
    this.time.delayedCall(F.freezeMs + F.panelAtMs, () => {
      void this.finishRun(true);
    });
  }

  // ---------------------------------------------------------------- waves

  private announceWave(w: WaveInfo): void {
    const n = w.index + 1;
    this.hud.showToast(`موج ${faDigits(String(n))}`, `از ${faDigits(String(w.total))} موج`);
    services.audio.play('wave');
  }

  // ---------------------------------------------------------------- enemy hooks

  spawned(e: Enemy): void {
    this.fx.swirl(e.bodyX, e.bodyY, FEEL.particles.spawnSmoke, 34);
    services.audio.play('spawn');
    // Surprise: at a big combo, a fresh imp may take one look at the carnage and run.
    const F = BALANCE.surprises.fleeing;
    if (FEEL.surprises.fleeing.enabled && e.type === 'imp' && !e.golden && this.combo >= F.combo && Math.random() < F.chance) {
      this.time.delayedCall(1100, () => {
        if (e.flee()) this.surprises.alarm(e);
      });
    }
  }

  step(e: Enemy): void {
    this.fx.stepDust(e.x, e.y);
    this.fx.shake('step');
    services.audio.play('step', 0.6);
  }

  escaped(e: Enemy): void {
    if (e.golden) this.surprises.call('از دستت در رفت!', DESIGN_W / 2, FEEL.surprises.goldenImp.y - 120, ['#fff4e0', '#ffd0a0', '#c07030'], 46);
  }

  taunt(): void {
    services.audio.play('taunt');
  }

  bang(e: Enemy): void {
    this.fx.clang(e.shieldX, e.shieldY);
    services.audio.play('bang');
  }

  shieldRaised(): void {
    services.audio.play('raise');
  }

  lungeStart(): void {
    services.audio.play('lunge');
  }

  reachedHero(): void {
    this.fx.swirl(this.world.heroX, this.world.heroY, FEEL.particles.lungeSmoke, 50);
    this.damageHero();
  }

  // ---------------------------------------------------------------- hero damage

  private damageHero(): void {
    if (this.defeated || this.won || this.hero.invulnerable || this.finisher || this.flight || this.rescuing) return;
    if (this.hero.consumeWard()) {
      // The Simorgh's ward turns the blow away.
      services.audio.play('barrierBreak');
      services.haptics.play('medium');
      this.fx.shake('hit');
      return;
    }
    if (this.tutorial) {
      // Learning is free: a lunge during the tutorial only staggers the hero.
      this.hero.hurt();
      this.fx.shake('hit');
      services.audio.play('hurt');
      return;
    }
    const { audio, haptics } = services;
    this.hero.hurt();
    this.fx.shake('hurt');
    audio.play('hurt');
    haptics.play('heavy');
    this.hearts--;
    this.heartsLost++;
    this.hud.setHearts(this.hearts);
    this.setCombo(0);
    if (this.hearts <= 0 && !this.startRescue()) this.lose();
  }

  // ---------------------------------------------------------------- یاری هم‌رزم (rescue)

  /** The first time the last heart goes: a teammate's spirit comes to revive the hero. */
  private startRescue(): boolean {
    if (!FEEL.rescue.enabled || this.rescueUsed) return false;
    const pos = this.toScreen(this.hero.x, this.hero.y - 60);
    if (!this.hud.startRescue(pos, () => this.revive(), () => this.rescueDone())) return false;
    this.rescueUsed = true;
    this.rescuing = true;
    this.aim.cancel();
    this.aim.enabled = false;
    services.audio.stopDraw();
    services.audio.stopHum();
    this.timeCtl.slowMo(FEEL.rescue.slowMo, 1e9);
    this.atmosphere.desaturate(0.55, 400);
    return true;
  }

  private revive(): void {
    const R = BALANCE.rescue;
    const fx = this.fx;
    const x = this.hero.x;
    const y = this.hero.y - 120;
    this.hearts = R.hearts;
    this.hud.setHearts(this.hearts);
    this.hero.revive(R.shieldMs);
    this.timeCtl.slowMo(1, 0);
    this.atmosphere.desaturate(0, 600);
    this.atmosphere.shockwave(1, 700);
    fx.flashTo(0.3, 400);
    fx.ring(x, y, 0xffd24a, 0.4, 9, 800);
    fx.ring(x, y, 0xffffff, 0.3, 6, 600);
    fx.sparkles(x, y);
    fx.coinBurst(x, y, 6);
    this.waves.clearNear(this.hero.x, this.hero.y, R.clearRadius, FEEL.rescue.shockPxPerMs);
    this.cameras.main.shake(300, 0.006, true);
    services.audio.play('shockwave', 0.8);
    services.haptics.play('heavy');
  }

  private rescueDone(): void {
    this.rescuing = false;
    this.aim.enabled = this.canAim();
  }

  /** Whether the player may aim right now (no cutscene, finisher, rescue or power in the way). */
  private canAim(): boolean {
    const st = this.boss.brain.state;
    return this.mode === 'play' && !this.defeated && !this.won && !this.finisher && !this.flight && !this.rescuing &&
      st !== 'intro' && st !== 'finisher';
  }

  // ---------------------------------------------------------------- school powers

  /** The power meter, for the HUD's orb. */
  get powerValue(): number {
    return this.meter.value;
  }

  /** The orb shows in play, once the tutorial is over. */
  get powerAvailable(): boolean {
    return this.mode === 'play' && !this.tutorial && !this.ended;
  }

  /** The orb was tapped. */
  castPower(): boolean {
    if (!this.powerAvailable || !this.canAim() || !this.meter.full) return false;
    const school = services.settings.school;
    if (!this.powers.canCast(school)) {
      this.surprises.call('هدفی نیست…', this.hero.bowX, this.hero.bowY - 260, ['#ffffff', '#d8e0ff', '#8090c0'], 44);
      return false;
    }
    this.meter.spend();
    this.powersUsed++;
    return this.powers.cast(school);
  }

  private gainPower(kind: 'golden' | 'kill' | 'trickShot', x: number, y: number): void {
    if (!this.powerAvailable) return;
    if (this.meter.add(kind) <= 0) return;
    const p = this.toScreen(x, y);
    this.hud.powerSpark(p.x, p.y);
  }

  /** A quake strike on an enemy: effects and the group feed (no combo: it isn't an arrow). */
  private powerHitEnemy(e: Enemy, damage: number, outcome: string): void {
    if (outcome === 'blocked' || outcome === 'pass') return;
    this.damageDealt += damage;
    this.numbers.spawn(e.hitX, e.hitY - e.hitR - 20, damage, false);
    this.fx.hitSparks(e.hitX, e.hitY, false, e.color);
    this.feedGroup(e.hitX, e.hitY, damage, false, outcome === 'kill');
    if (outcome === 'kill') {
      this.kills++;
      this.fx.swirl(e.bodyX, e.bodyY, FEEL.particles.deathSmoke, 30);
      this.fx.sparkles(e.bodyX, e.bodyY);
      services.audio.play('kill');
    }
  }

  // ---------------------------------------------------------------- surprises

  private trackGoldenStreak(crit: boolean): void {
    if (!crit) {
      this.goldenStreak = 0;
      return;
    }
    this.goldenStreak++;
    const F = BALANCE.surprises.flameBow;
    if (FEEL.surprises.flameBow.enabled && this.goldenStreak >= F.goldenStreak && !this.hero.flaming) {
      this.goldenStreak = 0;
      this.hero.flameBow(F.ms);
      this.surprises.flameBow();
    }
  }

  /** Rare: once a run at most, a golden imp dashes across during a wave. */
  private maybeGoldenImp(force = false): void {
    if (!FEEL.surprises.goldenImp.enabled || this.goldenImpDone || this.tutorial) return;
    if (!force && Math.random() >= BALANCE.surprises.goldenImp.chancePerWave) return;
    this.goldenImpDone = true;
    this.time.delayedCall(force ? 200 : 2500 + Math.random() * 3000, () => {
      if (this.defeated || this.won || this.mode !== 'play') return;
      const left = Math.random() < 0.5;
      const x = left ? ARENA.walls.left + 30 : ARENA.walls.right - 30;
      this.waves.spawnOne('imp', x, FEEL.surprises.goldenImp.y, { golden: true });
      this.surprises.call('دیو زرین!', DESIGN_W / 2, FEEL.surprises.goldenImp.y - 180, ['#fffbe0', '#ffd24a', '#c08010'], 64);
      services.audio.play('golden');
    });
  }

  private goldenImpCaught(e: Enemy): void {
    const G = BALANCE.surprises.goldenImp;
    const fx = this.fx;
    for (let i = 0; i < 3; i++) fx.coinBurst(e.bodyX + (i - 1) * 40, e.bodyY, 14);
    fx.sparkles(e.bodyX, e.bodyY);
    fx.goldenBurst(e.bodyX, e.bodyY);
    this.meter.fill();
    this.feedGroup(e.bodyX, e.bodyY, G.groupBonus, true, true, FEEL.surprises.goldenImp.coins);
    this.surprises.proclaim('دیو زرین به دام افتاد!');
    services.audio.play('victory');
    services.haptics.play('heavy');
  }

  private homaBlessing(): void {
    this.homaBlessed = true;
    this.meter.fill();
    this.hero.revive(FEEL.surprises.homa.auraMs * 0.35);
    this.surprises.proclaim('سایهٔ هما بر سرت افتاد!');
    services.audio.play('heartFill');
    services.haptics.play('heavy');
    const p = this.toScreen(this.hero.x, this.hero.y - 150);
    this.hud.powerSpark(p.x, p.y);
  }

  // ---------------------------------------------------------------- team moments

  /**
   * When teammate moments may interrupt (HUD toasts): never in the golden window or at full draw
   * (a pulse may open any moment), cutscenes, the finisher, the rescue or the volley; only after a
   * wait while aiming or with enemies close to the hero; otherwise now.
   */
  teamGate(): TeamGate {
    if (this.mode !== 'play' || this.tutorial?.quiet || this.powers.active || this.surprises.homaFlying) return 'blocked';
    if (this.defeated || this.won || this.finisher || this.flight || this.rescuing || this.volley.active) return 'blocked';
    const st = this.boss.brain.state;
    if (st === 'intro' || st === 'finisher') return 'blocked';
    const a = this.aim;
    if (a.charging && (a.state.phase === 'golden' || a.state.charge >= 1)) return 'blocked';
    if (a.charging) return 'busy';
    for (const e of this.waves.enemies) if (e.alive && e.y > ARENA.attackY - 260) return 'busy';
    return 'calm';
  }

  /** Surprise: the teammates' volley answers a crowded arena (see FEEL.volley). */
  private maybeVolley(dt: number): void {
    const V = FEEL.volley;
    if (!V.enabled || this.volleyCount >= V.maxPerRun || this.volley.active || this.tutorial || this.mode !== 'play') return;
    if (this.volleyCooldown > 0) this.volleyCooldown -= dt;
    if (this.runMs < V.firstAfterMs || this.volleyCooldown > 0 || this.teamGate() === 'blocked') return;
    let near = 0;
    let closing = false;
    for (const e of this.waves.enemies) {
      if (!e.alive) continue;
      if (e.y > V.dangerY) near++;
      if (e.y > V.lastHeartY) closing = true;
    }
    if (near < V.dangerCount && !(this.hearts === 1 && closing)) return;
    if (!this.volley.start(this.hud.volleyArchers())) return;
    this.volleyCount++;
    this.volleyCooldown = V.cooldownMs;
  }

  private lose(): void {
    this.defeated = true;
    this.waves.stop();
    this.aim.cancel();
    this.aim.enabled = false;
    services.audio.stopDraw();
    services.audio.stopHum();
    this.timeCtl.slowMo(0.3, 900);
    this.time.delayedCall(800, () => {
      void this.finishRun(false);
    });
  }

  // ---------------------------------------------------------------- the end of the run

  /** Gathers the run, reports it, and hands the screen to the Result scene. */
  private async finishRun(won: boolean): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    this.hud.endRun();
    const group = this.hud.group;
    const stats: RunStats = finalize({
      won,
      kills: this.kills,
      shots: this.shots,
      goldenShots: this.goldenShots,
      bestCombo: this.bestCombo,
      damageDealt: this.damageDealt,
      groupDamage: this.hud.groupDamage,
      heartsLost: this.heartsLost,
      heartsLeft: Math.max(0, this.hearts),
      rescued: this.rescueUsed,
      reachedBoss: this.reachedBoss,
    });
    let isNewBest = false;
    try {
      const res = await services.game.submitRun({
        score: stats.score, bestCombo: stats.bestCombo, crits: stats.goldenShots, shots: stats.shots, kills: stats.kills,
        damage: stats.groupDamage, stars: stats.stars, durationMs: Math.round(this.runMs), won,
      });
      isNewBest = res.isNewBest;
    } catch (err) {
      console.warn('[run] submit failed', err);
    }
    const members = (group?.members ?? []).map((m) => ({ name: m.name, color: avatarColor(m), avatar: avatarTex(this, m) }));
    const data: ResultData = {
      stats,
      heroName: services.telegram.userFirstName ?? 'پهلوان',
      groupName: group?.name ?? 'لشکر',
      groupHp: group?.hp ?? 0,
      groupHpMax: group?.hpMax ?? 1,
      members,
      isNewBest,
      epicLine: epicLineFor(stats),
      school: services.settings.school,
      homa: this.homaBlessed,
      challenge: (() => {
        const p = readStartParam(services.telegram.startParam);
        return p?.kind === 'challenge' ? { name: p.name, score: p.score } : null;
      })(),
    };
    this.scene.launch('Result', data);
  }

  // ---------------------------------------------------------------- debug

  private buildDebug(pillars: ArenaCollider['pillars'], launch: { x: number; y: number }): void {
    this.debug = new DebugOverlay(this, {
      walls: this.collider.walls,
      lines: [{ y: ARENA.spawnY, color: 0xb35cd1 }, { y: ARENA.attackY, color: 0xff7a1c }],
      pillars,
      targets: this.targetsForDebug(),
      hero: { x: this.world.heroX, y: this.world.heroY, r: HERO.hitbox.r, bowX: launch.x, bowY: launch.y },
      arrows: (fn) => this.projectiles.forEachActive(fn),
      status: () => {
        const a = this.aim;
        const w = this.waves.info;
        const b = this.boss.brain;
        const phase = a.charging ? a.state.phase : a.cooldownLeft > 0 ? 'cooldown' : 'idle';
        return `charge ${(a.state.charge * 100).toFixed(0)}% ${phase}  held ${a.heldMs.toFixed(0)}ms\n` +
          `last shot: ${this.lastShot}  arrows: ${this.projectiles.activeCount}  timeScale: ${this.timeCtl.scale}\n` +
          `wave ${w.index + 1}/${w.total}  enemies ${this.waves.aliveCount} (+${this.waves.pending})  ` +
          `hearts ${this.hearts}  combo ${this.combo} (best ${this.bestCombo})\n` +
          `BOSS ${b.state.toUpperCase()}  hp ${b.hp}/${b.maxHp} (${(b.hpPct * 100).toFixed(0)}%)` +
          `${b.stunLeft > 0 ? `  stun ${(b.stunLeft / 1000).toFixed(1)}s` : ''}${b.retryLeft > 0 ? `  retry ${(b.retryLeft / 1000).toFixed(1)}s` : ''}\n` +
          `particles: ${this.fx.aliveCount} alive / ${this.fx.budget} budget  effects: ${services.settings.reducedEffects ? 'light' : 'full'}\n` +
          `power ${(this.meter.value * 100).toFixed(0)}% (${services.settings.school})  streak ${this.goldenStreak}\n` +
          'H: hurt  B: boss now  N: boss -15%  P: power full  G: golden imp  J: Homa  K: flame bow';
      },
    });
    this.debug.onToggle = (on) => setPlaceholderLabels(this, Art.missing, on);
    const kb = this.input.keyboard;
    kb?.on('keydown-H', () => {
      if (this.debug.enabled) this.damageHero();
    });
    kb?.on('keydown-B', () => {
      if (!this.debug.enabled || this.boss.brain.state !== 'hidden') return;
      this.waves.stop();
      for (const e of this.waves.enemies) e.vanish();
      this.startBossIntro();
    });
    kb?.on('keydown-P', () => {
      if (this.debug.enabled) this.meter.fill();
    });
    kb?.on('keydown-G', () => {
      if (!this.debug.enabled) return;
      this.goldenImpDone = false;
      this.maybeGoldenImp(true);
    });
    kb?.on('keydown-J', () => {
      if (this.debug.enabled) this.surprises.flyHoma();
    });
    kb?.on('keydown-K', () => {
      if (this.debug.enabled) {
        this.hero.flameBow(BALANCE.surprises.flameBow.ms);
        this.surprises.flameBow();
      }
    });
    kb?.on('keydown-N', () => {
      if (!this.debug.enabled || !this.boss.brain.fighting) return;
      this.boss.brain.hit({ damage: Math.round(this.boss.brain.maxHp * 0.15), crit: true, gem: false });
      this.hud.setBossHp(this.boss.brain.hpPct);
    });
    // Three fingers toggle the debug overlay; don't let them start a shot.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.input.manager.pointers.filter((p) => p.isDown).length >= 3) this.aim.cancel();
    });
  }

  /** Live view of every target's hit circle for the overlay (the array is kept up to date). */
  private targetsForDebug(): readonly Target[] {
    return this.allTargets();
  }
}
