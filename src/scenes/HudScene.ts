import Phaser from 'phaser';
import { Art } from '../assets/Art';
import { CALLIGRAPHY_FONT, DESIGN_H, DESIGN_W, FONT_FAMILY } from '../config/display';
import { FEEL } from '../config/feel';
import { PLAYER_COLOR, type TeamMember } from '../config/team';
import { services } from '../services';
import type { GroupMember, GroupSession, TeamActivity } from '../services/GameService';
import type { VolleyArcher } from '../systems/Volley';
import { avatarColor, avatarTex } from '../ui/avatar';
import { Button } from '../ui/Button';
import { ChainBadge } from '../ui/ChainBadge';
import { ComboBadge } from '../ui/ComboBadge';
import { GoldStream } from '../ui/GoldStream';
import { BAR_INNER, GroupBar, PLATE_Y } from '../ui/GroupBar';
import { Hearts } from '../ui/Hearts';
import { PowerButton } from '../ui/PowerButton';
import { RescueSpirit } from '../ui/RescueSpirit';
import { SparkFlight } from '../ui/SparkFlight';
import { TeamToasts, type TeamGate } from '../ui/TeamToasts';
import { UI, bannerTex, barFillTex, gradientText, shineTex } from '../ui/kit';
import { faDigits, faMultiplier, faNum } from '../utils/fa';
import type { GameScene } from './GameScene';

/** Top row (design px, before the safe-area inset). */
const GROUP_BAR_Y = 70;
const PAUSE = { x: DESIGN_W - 84, y: 84 };
/** The White Div's own bar during the fight, under the group bar. */
const BOSS_BAR = { w: 520, y: 238 };
const TOAST_Y = 700;

/** HUD depths (this scene only). */
const Z = { stream: 12, top: 15, chain: 16, toast: 20, spark: 24, banner: 30, title: 70, rescue: 80, panel: 90 };

/**
 * HUD layer on top of Game. Owns the live group session (the simulated teammates) and all of the
 * team feel: the group Div bar, the gold stream from the player's hits, teammate toasts and their
 * sparks, the chain flame, the rescue spirit. Also hearts, the combo badge, wave banners, the boss
 * bar, big titles and the tutorial's skip button. Hidden on the title screen and revealed as the
 * camera flies in; hidden again when the Result screen takes over. The pause menu is its own scene
 * (PauseScene), which pauses this one too, so the teammates freeze with the world.
 */
export class HudScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private session: GroupSession | null = null;
  private joinToken = 0;
  private safeTop = 0;
  private safeBottom = 0;
  private pause!: Phaser.GameObjects.Image;
  private hearts!: Hearts;
  private combo!: ComboBadge;
  private groupBar!: GroupBar;
  private chain!: ChainBadge;
  private stream!: GoldStream;
  private sparks!: SparkFlight;
  private toasts!: TeamToasts;
  /** Group damage committed but not yet shown on the bar (sparks and motes still flying). */
  private inFlight = 0;
  /** Chain tier as shown (a teammate's raise shows when their spark lands). */
  private chainShown = 0;
  private chainSparks = 0;
  private rescue: RescueSpirit | null = null;
  private toast!: Phaser.GameObjects.Container;
  private toastBg!: Phaser.GameObjects.Image;
  private toastTitle!: Phaser.GameObjects.Text;
  private toastSub!: Phaser.GameObjects.Text;
  private toastShine!: Phaser.GameObjects.Image;
  /** The run is over (the Result screen owns the screen). */
  private ended = false;
  private skip: Button | null = null;
  /** Everything the player's hits sent to the group Div this run (chain applied). */
  private playerGroupDamage = 0;
  private bar: Phaser.GameObjects.Container | null = null;
  private barFill!: Phaser.GameObjects.Image;
  private barTrail!: Phaser.GameObjects.Image;
  private barArmor!: Phaser.GameObjects.Image;
  private barPct = 1;
  private barShown = 1;
  private barTrailPct = 1;
  private barTrailWait = 0;
  private barFlash = 0;
  private barArmorOn = false;
  private barT = 0;
  private offs: (() => void)[] = [];
  private power!: PowerButton;
  /** سه‌تیر charges: little gold arrows above the power orb. */
  private triple: Phaser.GameObjects.Container | null = null;
  private triplePips: Phaser.GameObjects.Image[] = [];
  private tripleLabel: Phaser.GameObjects.Text | null = null;
  /** Set at the end of create: the Game scene waits for it before starting the run. */
  ready = false;

  constructor() {
    super('Hud');
  }

  create(data?: { hidden?: boolean }): void {
    this.ready = false;
    this.gameScene = this.scene.get('Game') as GameScene;
    this.ended = false;
    this.skip = null;
    this.playerGroupDamage = 0;
    this.cameras.main.setAlpha(data?.hidden ? 0 : 1);
    this.bar = null;
    this.rescue = null;
    this.inFlight = this.chainShown = this.chainSparks = 0;

    const pause = (this.pause = Art.image(this, PAUSE.x, PAUSE.y, 'ui_btn_pause').setScale(0.6).setDepth(Z.top).setInteractive({ useHandCursor: true }));
    pause.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => pause.setScale(0.54));
    pause.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => pause.setScale(0.6));
    pause.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      pause.setScale(0.6);
      services.audio.play('ui');
      this.openMenu();
    });

    this.hearts = new Hearts(this, services.settings.difficulty.hearts, Z.top);
    this.groupBar = new GroupBar(this, DESIGN_W / 2, GROUP_BAR_Y, '');
    this.groupBar.root.setDepth(Z.top);
    this.chain = new ChainBadge(this, FEEL.chain.x, FEEL.chain.y, Z.chain);
    this.combo = new ComboBadge(this, FEEL.combo.x, FEEL.combo.y, Z.top);
    this.stream = new GoldStream(this, Z.stream, (out) => this.groupBar.edge(out), (payload) => this.streamLanded(payload));
    this.sparks = new SparkFlight(this, Z.spark);
    this.toasts = new TeamToasts(this, Z.toast, () => this.safeTop);
    this.power = new PowerButton(this, Z.top, services.settings.school, () => this.gameScene.castPower());
    this.power.root.setVisible(false);
    this.input.keyboard?.on('keydown-Q', () => this.power.fire());
    this.buildToast();
    this.buildTriple();

    // Safe areas: notches, and Telegram's own controls in fullscreen.
    const relayout = () => this.applySafeArea();
    this.offs.push(services.safeArea.onChange.add(relayout));
    this.scale.on(Phaser.Scale.Events.RESIZE, relayout);
    this.offs.push(() => this.scale.off(Phaser.Scale.Events.RESIZE, relayout));
    this.applySafeArea();

    // Leaving/minimising the app mid-run pauses it via GameScene.autoPause (main.ts wires
    // visibilitychange + Telegram's deactivated to it) — one path, race-guarded there.
    this.input.keyboard?.on('keydown-ESC', () => this.openMenu());

    this.joinGroup();
    this.ready = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.ready = false;
      this.offs.forEach((off) => off());
      this.offs = [];
      this.session?.close();
      this.session = null;
      this.joinToken++;
    });
  }

  /** Lets the Game scene ignore touches that land on HUD buttons. */
  isPointerOverUi(pointer: Phaser.Input.Pointer): boolean {
    if (!this.sys.isActive() || !this.pause) return false;
    return this.ended || this.cameras.main.alpha < 0.5 || this.input.hitTestPointer(pointer).length > 0;
  }

  // ---------------------------------------------------------------- the group

  private joinGroup(): void {
    const token = ++this.joinToken;
    this.session = null;
    services.game.joinGroup().then((s) => {
      if (token !== this.joinToken) {
        s.close();
        return;
      }
      this.session = s;
      this.groupBar.setName(s.name);
      this.groupBar.snap(s.hp / s.hpMax);
      this.chainShown = s.chain.tier;
      this.chain.setTier(this.chainShown, false);
    }).catch((err) => console.warn('[hud] group unavailable', err));
  }

  get group(): GroupSession | null {
    return this.session;
  }

  /** Everyone for the team finisher: the group, then the player (gold, last). */
  finisherMembers(): TeamMember[] {
    const player = services.telegram.userFirstName ?? 'تو';
    const members = (this.session?.members ?? []).map((m) => ({ name: m.name, color: avatarColor(m), avatar: avatarTex(this, m) }));
    return [...members, { name: player, color: PLAYER_COLOR, avatar: avatarTex(this, { id: 'player', name: player, color: PLAYER_COLOR }) }];
  }

  /** Teammates in the fight, for the volley. */
  volleyArchers(): VolleyArcher[] {
    return (this.session?.members ?? []).filter((m) => m.active)
      .map((m) => ({ member: m, name: m.name, color: avatarColor(m), avatar: avatarTex(this, m) }));
  }

  get groupName(): string {
    return this.session?.name ?? '';
  }

  /**
   * The player hurt something at (x, y) (HUD px): the group Div takes it (chain applied) as a gold
   * stream that flows up into the bar.
   */
  playerDamage(x: number, y: number, amount: number, crit: boolean, kill: boolean, motes = 0): void {
    const s = this.session;
    if (!s || amount <= 0) return;
    const S = FEEL.stream;
    const g = s.addPlayerDamage(amount, crit);
    this.inFlight += g;
    this.playerGroupDamage += g;
    if (s.chain.tier > 0) this.chain.fed();
    this.stream.launch(x, y, motes || (crit ? S.critMotes : S.motes) + (kill ? S.killBonus : 0), g);
  }

  /** A teammate's volley arrow struck: their damage lands on the bar at once. */
  allyDamage(member: GroupMember, amount: number): void {
    const s = this.session;
    if (!s) return;
    const g = s.addAllyDamage(member, amount);
    this.refreshBar(true);
    this.groupBar.teamLanded(g, avatarColor(member));
  }

  /**
   * یاری هم‌رزم: asks the group for help; if someone answers, their spirit flies in and `onRevive`
   * fires when it reaches the hero. Returns false when nobody can come.
   */
  startRescue(hero: { x: number; y: number }, onRevive: () => void, onDone: () => void): boolean {
    const member = this.session?.requestRescue() ?? null;
    if (!member) return false;
    this.toasts.dismissAll();
    this.hearts.setDepth(Z.rescue + 5);
    const from = { x: this.groupBar.root.x + FEEL.groupBar.width / 2 + 70, y: this.groupBar.root.y + 40 };
    this.rescue = new RescueSpirit(this, Z.rescue, from, hero,
      { name: member.name, avatar: avatarTex(this, member), color: avatarColor(member) }, {
        onRevive,
        onDone: () => {
          this.rescue = null;
          this.hearts.setDepth(Z.top);
          onDone();
        },
      });
    return true;
  }

  /** The power meter gained: a spark flies from (x, y) into the orb. */
  powerSpark(x: number, y: number): void {
    if (!this.power.root.visible) return;
    this.sparks.fly(x, y, 0xffd24a, (out) => {
      out.x = this.power.x;
      out.y = this.power.y;
    }, () => this.tweens.add({ targets: this.power.root, scale: { from: 1.12, to: 1 }, duration: 200, ease: 'Back.easeOut' }));
  }

  /** What the player's hits sent to the group Div this run. */
  get groupDamage(): number {
    return this.playerGroupDamage;
  }

  /** Fades the whole HUD in (the camera has flown into the arena). */
  reveal(ms: number): void {
    this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: ms, ease: 'Sine.easeOut' });
  }

  /** The run is over: toasts leave, the HUD fades, the Result screen takes over. */
  endRun(): void {
    this.ended = true;
    this.toasts.dismissAll();
    this.hideSkip();
    this.tweens.add({ targets: this.cameras.main, alpha: 0, duration: 500, delay: 200 });
  }

  /** The tutorial's «رد کردن» button, bottom left. */
  showSkip(onSkip: () => void): void {
    if (this.skip) return;
    const b = new Button(this, 150, DESIGN_H - 90 - this.safeBottom, 230, 84, 'رد کردن', () => {
      this.hideSkip();
      onSkip();
    }, 'lapis').setDepth(Z.top).setAlpha(0);
    this.tweens.add({ targets: b, alpha: 0.9, duration: 400, delay: 800 });
    this.skip = b;
  }

  hideSkip(): void {
    const b = this.skip;
    if (!b) return;
    this.skip = null;
    b.disableInteractive();
    this.tweens.add({ targets: b, alpha: 0, y: b.y + 40, duration: 260, onComplete: () => b.destroy() });
  }

  /** A big moment is starting: teammates' toasts step aside. */
  dismissToasts(): void {
    this.toasts.dismissAll();
  }

  private streamLanded(payload: number): void {
    if (payload > 0) {
      this.inFlight = Math.max(0, this.inFlight - payload);
      this.refreshBar(false);
    }
    this.groupBar.playerLanded(payload);
  }

  private refreshBar(chunk: boolean): void {
    const s = this.session;
    if (!s) return;
    this.groupBar.setPct((s.hp + this.inFlight) / s.hpMax, chunk);
  }

  private present(a: TeamActivity): void {
    const s = this.session!;
    const m = a.member;
    const color = avatarColor(m);
    let text = '';
    let onShown: ((x: number, y: number) => void) | undefined;
    switch (a.kind) {
      case 'damage': {
        const amount = a.amount;
        text = a.crit ? `ضربهٔ کاری! ${faNum(amount)} آسیب` : `${faNum(amount)} آسیب به دیو زد`;
        this.inFlight += amount;
        onShown = (x, y) => this.sparks.fly(x, y, color, (out) => this.groupBar.edge(out), () => {
          this.inFlight = Math.max(0, this.inFlight - amount);
          this.refreshBar(true);
          this.groupBar.teamLanded(amount, color);
          services.audio.play('teamHit', a.crit ? 1.4 : 1);
        });
        break;
      }
      case 'chain': {
        const mult = faMultiplier(s.chain.multiplier);
        text = !a.rose ? 'زنجیره را زنده نگه داشت' : a.tier === 1 ? `زنجیرهٔ درفش را برافروخت! ${mult}` : `زنجیره را داغ‌تر کرد! ${mult}`;
        this.chainSparks++;
        const tier = a.tier;
        onShown = (x, y) => this.sparks.fly(x, y, color, (out) => {
          out.x = this.chain.x;
          out.y = this.chain.y;
        }, () => {
          this.chainSparks--;
          // A drop may have happened meanwhile: never show more than the session has.
          const show = Math.min(tier, s.chain.tier);
          if (show > this.chainShown) {
            this.chainShown = show;
            this.chain.setTier(show);
          } else {
            this.chain.fed();
          }
        });
        break;
      }
      case 'join':
        text = 'به نبرد پیوست!';
        break;
      case 'rescue':
        text = 'به یاری‌ات آمد!';
        break;
    }
    this.toasts.show({ avatar: avatarTex(this, m), name: m.name, text, accent: color, onShown });
    services.audio.play('toast');
  }

  // ---------------------------------------------------------------- combo & hearts

  setCombo(n: number): void {
    this.combo.set(n);
  }

  /** Hides the combo badge without the break (victory). */
  clearCombo(): void {
    this.combo.clear();
  }

  setHearts(n: number, animate = true): void {
    this.hearts.set(n, animate);
  }

  // ---------------------------------------------------------------- سه‌تیر charges

  private buildTriple(): void {
    const B = FEEL.powers.button;
    const c = this.add.container(B.x, B.y - B.r - 40).setDepth(Z.top).setVisible(false);
    for (let i = 0; i < 3; i++) {
      const pip = this.add.image((i - 1) * 34, 0, 'arrow').setScale(0.16).setTint(0xffd24a).setRotation(-Math.PI / 2);
      c.add(pip);
      this.triplePips.push(pip);
    }
    this.tripleLabel = gradientText(this.add.text(0, 34, '', {
      fontFamily: FONT_FAMILY, fontSize: '30px', fontStyle: '900', rtl: true, stroke: '#1a0e04', strokeThickness: 4,
    }).setOrigin(0.5), ['#fff4c0', '#ffd24a', '#c98a24']);
    c.add(this.tripleLabel);
    this.triple = c;
  }

  /** Show the سه‌تیر charges (0 hides the row). */
  setTriple(n: number): void {
    const c = this.triple;
    if (!c) return;
    c.setVisible(n > 0);
    for (let i = 0; i < this.triplePips.length; i++) this.triplePips[i].setVisible(i < Math.min(3, n));
    this.tripleLabel?.setText(n > 3 ? `×${faDigits(String(n))}` : '');
    if (n > 0) {
      c.setScale(1.18);
      this.tweens.add({ targets: c, scale: 1, duration: 260, ease: 'Back.easeOut' });
    }
  }

  // ---------------------------------------------------------------- banners

  /** Announcement banner across the arena (waves, the boss waking). */
  showToast(title: string, sub = '', variant: 'gold' | 'red' = 'gold'): void {
    const t = this.toast;
    this.toastBg.setTexture(bannerTex(this, 900, 170, variant));
    this.toastTitle.setText(title);
    gradientText(this.toastTitle, variant === 'red' ? ['#fff0d8', '#ff8a6a', '#d23a2e'] : undefined);
    this.toastSub.setText(sub).setVisible(sub !== '');
    this.toastTitle.setY(sub ? -18 : 0);
    this.tweens.killTweensOf([t, this.toastShine]);
    t.setVisible(true).setAlpha(0).setY(TOAST_Y).setScale(0.6, 1);
    this.toastShine.setX(-520).setAlpha(0);
    this.tweens.chain({
      targets: t,
      tweens: [
        { alpha: 1, scaleX: 1, duration: 300, ease: 'Back.easeOut' },
        { alpha: 0, y: TOAST_Y - 24, duration: 360, delay: 1600, ease: 'Cubic.easeIn' },
      ],
      onComplete: () => t.setVisible(false),
    });
    this.tweens.add({ targets: this.toastShine, x: 520, alpha: { from: 0.7, to: 0 }, duration: 700, delay: 260, ease: 'Sine.easeInOut' });
  }

  // ---------------------------------------------------------------- boss bar

  /** The White Div's own health bar slides in with his name, under the group bar. */
  showBossBar(name: string): void {
    if (this.bar) return;
    const k = BOSS_BAR.w / 1024;
    const frame = Art.image(this, 0, 0, 'ui_bossbar_frame').setScale(k);
    const iw = BAR_INNER.w * k;
    const ih = BAR_INNER.h * k;
    const ix = BAR_INNER.x * k;
    const iy = BAR_INNER.y * k;
    this.barTrail = this.add.image(ix, iy, barFillTex(this, Math.round(iw), Math.round(ih), '#fff8e8', '#f0d8b0')).setOrigin(0, 0.5);
    this.barFill = this.add.image(ix, iy, barFillTex(this, Math.round(iw), Math.round(ih), '#ff6a4a', '#9a1410')).setOrigin(0, 0.5);
    this.barArmor = this.add.image(ix, iy, barFillTex(this, Math.round(iw), Math.round(ih), '#ffe9a0', '#c08a2a')).setOrigin(0, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    // Threshold marks: the barrier (50%) and the team finisher (10%).
    const marks = this.add.graphics();
    for (const [pct, col] of [[0.5, 0xe8b04a], [0.1, 0xfff0b0]] as const) {
      const x = ix + iw * pct;
      marks.fillStyle(col, 1).fillPoints([{ x, y: iy - ih / 2 - 5 }, { x: x + 5, y: iy }, { x, y: iy + ih / 2 + 5 }, { x: x - 5, y: iy }], true);
    }
    const label = gradientText(this.add.text(0, PLATE_Y * k, name, {
      fontFamily: FONT_FAMILY, fontSize: '24px', fontStyle: '900', rtl: true, stroke: '#1a0e04', strokeThickness: 4,
    }).setOrigin(0.5), ['#fff0e0', '#ffb090', '#e05a3a']);
    this.bar = this.add.container(DESIGN_W / 2, -140, [frame, this.barTrail, this.barFill, this.barArmor, marks, label]).setDepth(Z.top);
    this.barPct = this.barShown = this.barTrailPct = 1;
    this.layoutBar();
    this.tweens.add({ targets: this.bar, y: BOSS_BAR.y + this.safeTop, duration: 650, ease: 'Back.easeOut' });
  }

  setBossHp(pct: number): void {
    if (pct < this.barPct) {
      this.barTrailWait = FEEL.enemy.hpBar.trailDelayMs;
      this.barFlash = 1;
    }
    this.barPct = Math.max(0, pct);
  }

  /** Bronze sheen while the barrier is up. */
  setBossArmor(on: boolean): void {
    this.barArmorOn = on;
  }

  hideBossBar(): void {
    if (!this.bar) return;
    const b = this.bar;
    this.tweens.add({ targets: b, y: -140, alpha: 0, duration: 500, ease: 'Back.easeIn', onComplete: () => b.destroy() });
    this.bar = null;
  }

  private updateBossBar(dt: number): void {
    if (!this.bar) return;
    const B = FEEL.enemy.hpBar;
    this.barT += dt;
    this.barShown += (this.barPct - this.barShown) * Math.min(1, dt / B.drainMs);
    if (this.barTrailWait > 0) this.barTrailWait -= dt;
    else this.barTrailPct += (this.barShown - this.barTrailPct) * Math.min(1, dt / (B.trailDrainMs * 1.5));
    this.barFlash = Math.max(0, this.barFlash - dt / 150);
    const want = this.barArmorOn ? 0.55 + 0.25 * Math.sin(this.barT / 200) : 0;
    this.barArmor.setAlpha(this.barArmor.alpha + (want - this.barArmor.alpha) * Math.min(1, dt / 150));
    this.layoutBar();
    if (this.barFlash > 0.5) this.barFill.setTintFill(0xffffff);
    else this.barFill.clearTint();
  }

  private layoutBar(): void {
    const crop = (img: Phaser.GameObjects.Image, pct: number) => img.setCrop(0, 0, Math.max(0, img.width * pct), img.height);
    crop(this.barFill, this.barShown);
    crop(this.barTrail, this.barTrailPct);
    crop(this.barArmor, this.barShown);
  }

  // ---------------------------------------------------------------- update

  update(_time: number, delta: number): void {
    const ms = Math.min(delta, 50);
    const s = this.session;
    if (s) {
      s.tick(ms);
      const gate: TeamGate = this.rescue || this.ended ? 'blocked' : this.gameScene.teamGate();
      if (this.toasts.ready(gate, ms, s.pending > 0)) {
        const a = s.next();
        if (a) this.present(a);
      }
      // The flame goes down on its own (burn-out); a teammate's raise shows when their spark lands.
      if (s.chain.tier < this.chainShown || (s.chain.tier > this.chainShown && this.chainSparks === 0)) {
        this.chainShown = s.chain.tier;
        this.chain.setTier(this.chainShown);
      }
      this.chain.update(ms, s.chain.progress);
    }
    // The power orb: shown in play once the tutorial is over; follows the meter.
    const showPower = this.gameScene.powerAvailable && !this.ended;
    if (showPower !== this.power.root.visible) {
      this.power.root.setVisible(showPower);
      if (showPower) this.tweens.add({ targets: this.power.root, scale: { from: 0.3, to: 1 }, alpha: { from: 0, to: 1 }, duration: 420, ease: 'Back.easeOut' });
    }
    if (showPower) {
      // The school may have been picked on the title after this HUD was built.
      this.power.setSchool(services.settings.school);
      this.power.setValue(this.gameScene.powerValue);
      this.power.update(ms);
    }
    this.groupBar.update(ms);
    this.stream.update(ms);
    this.sparks.update(ms);
    this.combo.update(ms);
    this.updateBossBar(ms);
  }

  // ---------------------------------------------------------------- big titles & victory

  /** A big calligraphic title across the middle of the screen (fades by itself). */
  bigTitle(text: string, holdMs = 1600): void {
    const t = gradientText(this.add.text(DESIGN_W / 2, DESIGN_H * 0.36, text, {
      fontFamily: CALLIGRAPHY_FONT, fontSize: '130px', rtl: true, stroke: '#3a1a04', strokeThickness: 7,
      padding: { top: 50, bottom: 70, left: 30, right: 30 },
    }).setOrigin(0.5).setDepth(Z.title).setAlpha(0).setScale(0.6), ['#ffffff', '#ffe27a', '#d08a20']);
    if (FEEL.shaderFx && this.game.renderer.type === Phaser.WEBGL && !services.settings.reducedEffects) t.preFX?.addGlow(0xffd060, 5, 0, false, 0.1, 14);
    this.tweens.chain({
      targets: t,
      tweens: [
        { alpha: 1, scale: 1, duration: 700, ease: 'Back.easeOut' },
        { scale: 1.04, duration: holdMs, ease: 'Sine.easeInOut' },
        { alpha: 0, y: t.y - 40, duration: 500, ease: 'Cubic.easeIn' },
      ],
      onComplete: () => t.destroy(),
    });
  }

  // ---------------------------------------------------------------- building & layout

  private buildToast(): void {
    this.toastBg = this.add.image(0, 0, bannerTex(this, 900, 170, 'gold'));
    this.toastTitle = this.add.text(0, 0, '', {
      fontFamily: FONT_FAMILY, fontSize: '64px', fontStyle: '900', rtl: true, stroke: '#1a0e04', strokeThickness: 6,
    }).setOrigin(0.5);
    this.toastSub = this.add.text(0, 40, '', {
      fontFamily: FONT_FAMILY, fontSize: '30px', color: UI.parchment, rtl: true,
    }).setOrigin(0.5);
    this.toastShine = this.add.image(0, 0, shineTex(this)).setDisplaySize(160, 150).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.toast = this.add.container(DESIGN_W / 2, TOAST_Y, [this.toastBg, this.toastShine, this.toastTitle, this.toastSub])
      .setVisible(false).setDepth(Z.banner);
  }

  /** Moves the top row below any notch / Telegram controls that overlap the canvas. */
  private applySafeArea(): void {
    const ins = services.safeArea.designInsets(this.scale.canvasBounds, DESIGN_W, DESIGN_H);
    const top = Math.round(ins.top);
    const bottom = Math.round(ins.bottom);
    // Bottom row (power orb, skip): above a home bar.
    this.safeBottom = bottom;
    this.power?.root.setY(FEEL.powers.button.y - bottom);
    this.skip?.setY(DESIGN_H - 90 - bottom);
    if (top === this.safeTop && this.pause.y === PAUSE.y + top) return;
    this.safeTop = top;
    this.pause.setY(PAUSE.y + top);
    this.hearts.root.setY(top);
    this.groupBar.root.setY(GROUP_BAR_Y + top);
    this.chain.root.setY(FEEL.chain.y + top);
    this.combo.setBaseY(FEEL.combo.y + top);
    if (this.bar) this.bar.setY(BOSS_BAR.y + top);
    this.toasts.relayout();
  }

  private openMenu(): void {
    if (this.ended || this.cameras.main.alpha < 0.5 || this.scene.isActive('Pause') || !this.sys.isActive()) return;
    this.scene.launch('Pause');
  }
}
