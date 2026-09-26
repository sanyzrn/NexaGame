import Phaser from 'phaser';
import { ERAS, type EraDef } from '../data/eras';
import { selectEra } from '../systems/eraProgress';
import { DESIGN_H, DESIGN_W, FONT_FAMILY } from '../config/display';
import { FEEL } from '../config/feel';
import type { School } from '../config/team';
import { PERFECT_CHEER } from '../data/lines';
import { services } from '../services';
import { shareTicket } from '../services/Share';
import { isPerfect, reactionsFor, type RunStats } from '../systems/score';
import { Button } from '../ui/Button';
import { GroupBar } from '../ui/GroupBar';
import type { HeroCardData } from '../ui/HeroCard';
import {
  UI, bubbleTex, dividerTex, gradientText, groupBannerTex, panelTex, parchmentTex, raysTex, ribbonTex, starTex, vGradientTex,
} from '../ui/kit';
import { faNum, faPercent } from '../utils/fa';

export interface ResultMember {
  name: string;
  color: number;
  avatar: string;
}

export interface ResultData {
  stats: RunStats;
  heroName: string;
  groupName: string;
  groupHp: number;
  groupHpMax: number;
  members: ResultMember[];
  isNewBest: boolean;
  epicLine: string;
  school: School;
  /** The Homa's shadow fell on the hero this run. */
  homa: boolean;
  /** The day's omen (shared by the whole group), if there was one. */
  omen: { name: string; line: string } | null;
  /** The run's best moment («لحظهٔ برتر»), told back on the card and the share text. */
  moment: string | null;
  /** Opened from a friend's challenge link: their name and score to beat. */
  challenge: { name: string; score: number } | null;
  /** The era this run was fought in. */
  era: EraDef;
  /** A victory opened this next era (playable): the time jump can go there. */
  nextEra: EraDef | null;
}

const PW = 960;
const PH = 1500;
/** Panel centre when at rest. */
const PY = 1110;

/**
 * After the run. Victory: golden light floods in with slow god-rays, then the panel slides up.
 * Defeat: a dignified dusk, with words that point forward. Then, one by one: the stats count up
 * with ticks, the stars stamp down with sparkles, the group Div bar drains by the player's share
 * («سهم تو از پیروزی لشکر»), and teammates reply in chat bubbles (the surprise). Tap anywhere to
 * hurry it along. Buttons: play again, the Hero Card, invite a friend.
 */
export class ResultScene extends Phaser.Scene {
  private d!: ResultData;
  private panel!: Phaser.GameObjects.Container;
  private groupBar: GroupBar | null = null;
  private sparkle!: Phaser.GameObjects.Particles.ParticleEmitter;
  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fast = false;
  private leaving = false;
  private note: Phaser.GameObjects.Container | null = null;
  private subText!: Phaser.GameObjects.Text;

  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    this.d = data;
    this.fast = this.leaving = false;
    this.groupBar = null;
    this.note = null;
    const won = data.stats.won;
    this.backdrop(won);

    this.sparkle = this.add.particles(0, 0, 'fx_star', {
      emitting: false, lifespan: { min: 380, max: 700 }, speed: { min: 80, max: 300 }, scale: { start: 0.45, end: 0 },
      rotate: { min: 0, max: 180 }, alpha: { start: 1, end: 0 }, tint: [0xffd24a, 0xfff2b0, 0xffffff], blendMode: 'ADD', maxParticles: 80,
    }).setDepth(30);
    this.confetti = this.add.particles(0, 0, 'fx_spark', {
      emitting: false, lifespan: { min: 1600, max: 2600 }, speedX: { min: -380, max: 380 }, speedY: { min: -900, max: -380 },
      gravityY: 900, rotate: { min: 0, max: 360 }, scaleX: { min: 0.5, max: 1 }, scaleY: 0.35,
      tint: [0xe0483a, 0xffd24a, 0x3cc4b4, 0x4a8fe6, 0xffffff], maxParticles: FEEL.reactions.confetti,
    }).setDepth(40);

    this.panel = this.add.container(0, DESIGN_H).setDepth(10);
    this.buildPanel(won);
    // Tap anywhere to hurry the sequence along.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.fast = true;
    });
    void this.run(won);
  }

  update(_t: number, delta: number): void {
    this.groupBar?.update(Math.min(delta, 50));
  }

  // ---------------------------------------------------------------- sequence

  private async run(won: boolean): Promise<void> {
    const R = FEEL.result;
    await this.wait(won ? R.floodMs * 0.6 : R.floodMs * 0.4);
    services.audio.play('whoosh');
    await this.tweenP({ targets: this.panel, y: 0, duration: this.fast ? 200 : R.panelMs, ease: 'Back.easeOut', easeParams: [0.9] });
    await this.countRows();
    await this.stamps();
    await this.groupMoment();
    this.showButtons();
    if (FEEL.reactions.enabled) await this.reactions();
  }

  private wait(ms: number): Promise<void> {
    if (this.fast || ms <= 0) return Promise.resolve();
    return new Promise((r) => this.time.delayedCall(ms, r));
  }

  private tweenP(cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((r) => this.tweens.add({ ...cfg, onComplete: () => r() }));
  }

  // ---------------------------------------------------------------- backdrop & panel

  private backdrop(won: boolean): void {
    const R = FEEL.result;
    if (won) {
      // Light floods the scene: a warm wash, and god-rays turning slowly behind the panel.
      const wash = this.add.image(0, 0, vGradientTex(this, 'ui_grad_victory', '#fff4d0', '#ffd27a', '#7a4a10'))
        .setOrigin(0).setDisplaySize(DESIGN_W, DESIGN_H).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      this.tweens.add({ targets: wash, alpha: { from: 0, to: 0.55 }, duration: R.floodMs * 0.4, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: wash, alpha: 0.28, duration: R.floodMs, delay: R.floodMs * 0.4 });
      const rays = this.add.image(DESIGN_W / 2, 420, raysTex(this)).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setAlpha(0);
      this.tweens.add({ targets: rays, alpha: 0.85, scale: 4.2, duration: R.floodMs * 1.4, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: rays, angle: 360, duration: 60000, repeat: -1 });
    } else {
      // Dusk: the sky cools to violet and ember, gently.
      const dusk = this.add.image(0, 0, vGradientTex(this, 'ui_grad_dusk', '#2a2050', '#8a4a5a', '#140c1c'))
        .setOrigin(0).setDisplaySize(DESIGN_W, DESIGN_H).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(0);
      this.tweens.add({ targets: dusk, alpha: 1, duration: R.floodMs * 1.2, ease: 'Sine.easeInOut' });
      const shade = this.add.rectangle(0, 0, DESIGN_W, DESIGN_H, 0x0a0614, 1).setOrigin(0).setAlpha(0);
      this.tweens.add({ targets: shade, alpha: 0.35, duration: R.floodMs * 1.2 });
      services.audio.play('dusk');
    }
  }

  private buildPanel(won: boolean): void {
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.panel.add(o);
      return o;
    };
    const cx = DESIGN_W / 2;
    const top = PY - PH / 2;
    add(this.add.image(cx, PY, panelTex(this, PW, PH)));
    add(this.add.image(cx, top + 10, ribbonTex(this, 620, 140, won ? 'gold' : 'red')));
    add(gradientText(this.add.text(cx, top + 2, won ? 'پیروزی لشکر!' : 'پایان نبرد', {
      fontFamily: FONT_FAMILY, fontSize: '66px', fontStyle: '900', rtl: true,
    }).setOrigin(0.5), won ? ['#5a2a04', '#3a1a02', '#2a1002'] : ['#fff4e0', '#ffd0a0', '#f0a060']));
    const sub = won ? `${this.d.era.bossName} در برابر لشکر زانو زد.` : 'دیو هنوز ایستاده؛ لشکر به تیرهای تو امید دارد.';
    this.subText = add(this.add.text(cx, top + 100, sub, {
      fontFamily: FONT_FAMILY, fontSize: '32px', color: '#f3dca0', rtl: true,
    }).setOrigin(0.5));
    // لحظهٔ برتر — the run's one moment worth telling.
    if (this.d.moment) {
      add(gradientText(this.add.text(cx, top + 148, `لحظهٔ برتر: ${this.d.moment}`, {
        fontFamily: FONT_FAMILY, fontSize: '27px', fontStyle: '700', rtl: true, color: '#ffd9a0',
      }).setOrigin(0.5), ['#fff0c8', '#ffd27a', '#b07018']));
    }
    // فال لشکر — the day's shared omen.
    if (this.d.omen) {
      const chip = add(this.add.text(cx, top + 344, `فال امروز: ${this.d.omen.name}`, {
        fontFamily: FONT_FAMILY, fontSize: '26px', fontStyle: '900', rtl: true,
      }).setOrigin(0.5));
      chip.setColor('#8fe8ff');
    }

    // Star sockets (the stars stamp into them later).
    for (let i = 0; i < 3; i++) {
      add(this.add.image(cx + (i - 1) * 150, top + 215 + (i === 1 ? -14 : 0), starTex(this, false)).setScale(0.62).setName(`socket${i}`));
    }
    add(this.add.image(cx, top + 305, dividerTex(this, 640)));
  }

  // ---------------------------------------------------------------- stats

  private async countRows(): Promise<void> {
    const s = this.d.stats;
    const R = FEEL.result;
    const cx = DESIGN_W / 2;
    const rows: [string, number, (v: number) => string][] = [
      ['امتیاز', s.score, (v) => faNum(v)],
      ['بهترین پیاپی', s.bestCombo, (v) => `×${faNum(v)}`],
      ['ضربهٔ طلایی', s.goldenShots, (v) => faNum(v)],
      ['دقت طلایی', s.goldenPct, (v) => faPercent(v, 0)],
      ['آسیب به دیو لشکر', s.groupDamage, (v) => faNum(v)],
    ];
    const y0 = PY - PH / 2 + 380;
    for (let i = 0; i < rows.length; i++) {
      const [label, value, fmt] = rows[i];
      const y = y0 + i * 68;
      const stripe = this.add.rectangle(cx, y, PW - 120, 60, 0xffffff, i % 2 ? 0 : 0.05);
      const l = this.add.text(cx + PW / 2 - 90, y, label, {
        fontFamily: FONT_FAMILY, fontSize: '34px', fontStyle: '900', color: UI.parchment, rtl: true,
      }).setOrigin(1, 0.5);
      const v = gradientText(this.add.text(cx - PW / 2 + 90, y, fmt(0), {
        fontFamily: FONT_FAMILY, fontSize: '44px', fontStyle: '900',
      }).setOrigin(0, 0.5));
      for (const o of [stripe, l, v]) {
        o.setAlpha(0);
        this.panel.add(o);
      }
      this.tweens.add({ targets: [stripe, l, v], alpha: 1, duration: this.fast ? 0 : 200 });
      l.setX(l.x + 40);
      this.tweens.add({ targets: l, x: l.x - 40, duration: this.fast ? 0 : 260, ease: 'Cubic.easeOut' });
      await this.countUp(v, value, fmt, i === 0);
      if (i === 0 && this.d.isNewBest) this.newBest(v);
      if (i === 0 && this.d.challenge) this.challengeOutcome();
      await this.wait(R.rowGapMs);
    }
  }

  private countUp(t: Phaser.GameObjects.Text, value: number, fmt: (v: number) => string, big: boolean): Promise<void> {
    const R = FEEL.result;
    if (this.fast || value === 0) {
      t.setText(fmt(value));
      gradientText(t);
      services.audio.play('tick', 1);
      return Promise.resolve();
    }
    const c = { v: 0 };
    let lastTick = 0;
    return this.tweenP({
      targets: c, v: value, duration: R.countMs * (big ? 1.5 : 1), ease: 'Cubic.easeOut',
      onUpdate: (tw) => {
        const now = this.time.now;
        const shown = Number.isInteger(value) ? Math.round(c.v) : c.v;
        t.setText(fmt(this.fast ? value : shown));
        if (now - lastTick >= R.tickEveryMs) {
          lastTick = now;
          services.audio.play('tick', tw.progress);
        }
      },
    }).then(() => {
      t.setText(fmt(value));
      gradientText(t);
      this.tweens.add({ targets: t, scale: { from: 1.25, to: 1 }, duration: 220, ease: 'Back.easeOut' });
    });
  }

  /** Opened from a friend's challenge: did the score beat theirs? */
  private challengeOutcome(): void {
    const c = this.d.challenge!;
    const s = this.d.stats.score;
    const beat = s > c.score;
    const text = beat ? `از رکورد ${c.name} (${faNum(c.score)}) گذشتی! 🎉` : `تا رکورد ${c.name} ${faNum(c.score - s)} امتیاز مانده`;
    const t = this.subText;
    this.tweens.add({
      targets: t, alpha: 0, duration: 160, onComplete: () => {
        t.setText(text).setColor(beat ? '#ffe27a' : '#f3dca0').setFontStyle('900');
        if (t.width > PW - 80) t.setScale((PW - 80) / t.width);
        this.tweens.add({ targets: t, alpha: 1, scale: { from: t.scale * 1.3, to: t.scale }, duration: 320, ease: 'Back.easeOut' });
        if (beat) {
          services.audio.play('newBest');
          this.sparkle.explode(services.settings.count(16), t.x, t.y + this.panel.y);
        }
      },
    });
  }

  private newBest(anchor: Phaser.GameObjects.Text): void {
    const x = anchor.x + anchor.width + 110;
    const stamp = this.add.container(x, anchor.y, [
      this.add.rectangle(0, 0, 190, 58, 0xb3261e, 0.95).setStrokeStyle(4, 0xffe0b0),
      this.add.text(0, 0, 'رکورد تازه!', { fontFamily: FONT_FAMILY, fontSize: '30px', fontStyle: '900', color: '#fff4e0', rtl: true }).setOrigin(0.5),
    ]).setAngle(-10).setScale(2.4).setAlpha(0);
    this.panel.add(stamp);
    this.tweens.add({ targets: stamp, scale: 1, alpha: 1, duration: 260, ease: 'Cubic.easeIn', onComplete: () => {
      this.cameras.main.shake(140, 0.004);
      services.audio.play('newBest');
    } });
  }

  // ---------------------------------------------------------------- stars

  private async stamps(): Promise<void> {
    const n = this.d.stats.stars;
    for (let i = 0; i < n; i++) {
      await this.wait(i === 0 ? 120 : FEEL.result.starGapMs);
      const socket = this.panel.getByName(`socket${i}`) as Phaser.GameObjects.Image;
      const star = this.add.image(socket.x, socket.y, starTex(this, true)).setScale(1.9).setAlpha(0).setAngle(-25);
      this.panel.add(star);
      await this.tweenP({ targets: star, scale: 0.62, alpha: 1, angle: 0, duration: this.fast ? 60 : 240, ease: 'Cubic.easeIn' });
      this.tweens.add({ targets: star, scale: { from: 0.72, to: 0.62 }, duration: 260, ease: 'Back.easeOut' });
      this.sparkle.explode(services.settings.count(18), star.x, star.y + this.panel.y);
      this.cameras.main.shake(120, 0.003 + i * 0.002);
      services.audio.play('stamp', i / 2);
      services.haptics.play(i === 2 ? 'heavy' : 'medium');
    }
  }

  // ---------------------------------------------------------------- the group

  private async groupMoment(): Promise<void> {
    const d = this.d;
    const cx = DESIGN_W / 2;
    const y = PY - PH / 2 + 780;
    const label = this.add.text(cx, y - 36, `دیو لشکر «${d.groupName}»`, {
      fontFamily: FONT_FAMILY, fontSize: '28px', fontStyle: '900', color: '#b9c3e6', rtl: true,
    }).setOrigin(0.5).setAlpha(0);
    this.panel.add(label);
    const bar = new GroupBar(this, cx, y + 50, d.groupName);
    bar.root.setAlpha(0);
    this.panel.add(bar.root);
    this.groupBar = bar;
    const max = d.groupHpMax || 1;
    const after = d.groupHp / max;
    const before = Math.min(1, (d.groupHp + d.stats.groupDamage) / max);
    bar.snap(before);
    this.tweens.add({ targets: [label, bar.root], alpha: 1, duration: this.fast ? 0 : 300 });
    await this.wait(420);
    // The player's damage drains it: a gold run along the bar, then the chunk falls away.
    bar.setPct(after, true);
    bar.teamLanded(d.stats.groupDamage, 0xffd24a);
    services.audio.play('teamHit', 1.4);
    const edge = { x: 0, y: 0 };
    bar.edge(edge);
    this.sparkle.explode(services.settings.count(14), edge.x, edge.y + this.panel.y);

    const spent = Math.max(1, max - d.groupHp);
    const share = Math.min(1, d.stats.groupDamage / spent);
    const line = gradientText(this.add.text(cx, y + 140, `سهم تو از پیروزی لشکر: ${faPercent(0, 0)}`, {
      fontFamily: FONT_FAMILY, fontSize: '38px', fontStyle: '900', rtl: true, stroke: '#1a0e04', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0));
    this.panel.add(line);
    this.tweens.add({ targets: line, alpha: 1, duration: 200 });
    const c = { v: 0 };
    await this.tweenP({
      targets: c, v: share, duration: this.fast ? 0 : FEEL.result.groupDrainMs, ease: 'Cubic.easeOut',
      onUpdate: () => line.setText(`سهم تو از پیروزی لشکر: ${faPercent(c.v, 0)}`),
    });
    line.setText(`سهم تو از پیروزی لشکر: ${faPercent(share, 0)}`);
    gradientText(line);
    this.tweens.add({ targets: line, scale: { from: 1.2, to: 1 }, duration: 260, ease: 'Back.easeOut' });
  }

  // ---------------------------------------------------------------- surprise: teammates reply

  private async reactions(): Promise<void> {
    const R = FEEL.reactions;
    const d = this.d;
    const pool = d.members.slice();
    const perfect = isPerfect(d.stats);
    const lines = reactionsFor(d.stats, perfect ? 1 : R.count);
    const y0 = PY - PH / 2 + 1030;
    for (let i = 0; i < lines.length && pool.length; i++) {
      const m = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      await this.wait(i === 0 ? 300 : R.gapMs);
      await this.bubble(m, lines[i], y0 + i * 92);
    }
    if (perfect) {
      await this.wait(R.gapMs);
      await this.bubble({ name: d.groupName, color: 0xffd24a, avatar: groupBannerTex(this) }, PERFECT_CHEER, y0 + 92, true);
      this.confetti.explode(services.settings.count(R.confetti), DESIGN_W / 2, DESIGN_H * 0.55);
      services.audio.play('victory');
      services.haptics.play('heavy');
    }
  }

  /** A Telegram-style bubble: avatar on the right, "…" typing first, then the message pops in. */
  private async bubble(m: ResultMember, text: string, y: number, all = false): Promise<void> {
    const R = FEEL.reactions;
    const right = DESIGN_W / 2 + PW / 2 - 100;
    const avatar = this.add.image(right, y, m.avatar);
    // The group's cheer shows its banner (keep its proportions); members show their round avatar.
    if (all) avatar.setScale(76 / avatar.height);
    else avatar.setDisplaySize(72, 72);
    const ring = this.add.circle(right, y, 40, m.color, 0).setStrokeStyle(4, m.color);
    const bw = 640;
    const bh = 84;
    const bg = this.add.image(right - 58, y, bubbleTex(this, bw, bh)).setOrigin(1, 0.5);
    const name = this.add.text(right - 90, y - 22, all ? `همهٔ ${m.name}` : m.name, {
      fontFamily: FONT_FAMILY, fontSize: '24px', fontStyle: '900', color: `#${m.color.toString(16).padStart(6, '0')}`, rtl: true,
    }).setOrigin(1, 0.5);
    const dots = this.add.text(right - 90, y + 12, '•••', { fontFamily: FONT_FAMILY, fontSize: '30px', color: '#8a7a6a' }).setOrigin(1, 0.5);
    const msg = this.add.text(right - 90, y + 14, text, {
      fontFamily: FONT_FAMILY, fontSize: '28px', color: '#2a1a0e', rtl: true,
    }).setOrigin(1, 0.5).setVisible(false);
    if (msg.width > bw - 70) msg.setScale((bw - 70) / msg.width);
    const c = this.add.container(0, 0, [bg, ring, avatar, name, dots, msg]).setAlpha(0);
    this.panel.add(c);
    c.setX(60);
    this.tweens.add({ targets: c, alpha: 1, x: 0, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: dots, alpha: { from: 1, to: 0.3 }, duration: 260, yoyo: true, repeat: -1 });
    await this.wait(R.typingMs);
    this.tweens.killTweensOf(dots);
    dots.setVisible(false);
    msg.setVisible(true);
    this.tweens.add({ targets: msg, scale: { from: msg.scale * 0.6, to: msg.scale }, duration: 240, ease: 'Back.easeOut' });
    services.audio.play('bubble');
    // Tap the bubble: a heart floats back to them.
    bg.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      const h = this.add.text(right - 120 + (Math.random() - 0.5) * 60, y + this.panel.y, '❤️', { fontSize: '44px' }).setOrigin(0.5).setDepth(35);
      services.audio.play('bubble');
      services.haptics.play('tick');
      this.tweens.add({ targets: h, y: h.y - 160, x: h.x + (Math.random() - 0.5) * 80, alpha: 0, scale: 1.6, duration: 900, ease: 'Sine.easeOut', onComplete: () => h.destroy() });
    });
  }

  // ---------------------------------------------------------------- buttons

  private showButtons(): void {
    const cx = DESIGN_W / 2;
    const bottom = PY + PH / 2;
    const next = this.d.nextEra;
    const again = next
      ? new Button(this, cx + 120, bottom - 250, 540, 124, 'سفر در زمان ⏳', () => this.timeJump(next), 'gold')
      : new Button(this, cx + 120, bottom - 250, 540, 124, 'دوباره', () => this.playAgain(), 'gold');
    const menu = new Button(this, cx - 305, bottom - 250, 260, 124, 'منو', () => this.toMenu(), 'lapis');
    const card = new Button(this, cx + 205, bottom - 95, 390, 108, 'کارت افتخار', () => this.openCard(), 'lapis');
    const invite = new Button(this, cx - 205, bottom - 95, 390, 108, 'دعوت هم‌رزم', () => void this.invite(), 'red');
    [again, menu, card, invite].forEach((b, i) => {
      b.setAlpha(0).setScale(0.8);
      this.panel.add(b);
      this.tweens.add({ targets: b, alpha: 1, scale: 1, duration: 360, delay: i * 90, ease: 'Back.easeOut' });
    });
    this.tweens.add({ targets: again, scale: { from: 1, to: 1.04 }, duration: 900, yoyo: true, repeat: -1, delay: 800, ease: 'Sine.easeInOut' });
  }

  /** Back to the title: era, difficulty and school can be changed there. */
  private toMenu(): void {
    if (this.leaving) return;
    this.leaving = true;
    services.audio.play('ui');
    this.cameras.main.fadeOut(320, 10, 6, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop('Card');
      this.scene.stop('Hud');
      this.scene.start('Game', { title: true });
    });
  }

  private playAgain(): void {
    if (this.leaving) return;
    this.leaving = true;
    services.audio.play('whoosh');
    this.cameras.main.fadeOut(380, 10, 6, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop('Card');
      this.scene.stop('Hud');
      this.scene.start('Game', { title: false });
    });
  }

  /** The next era is open: the time-jump cinematic carries the Derafsh down the centuries. */
  private timeJump(next: EraDef): void {
    if (this.leaving) return;
    this.leaving = true;
    selectEra(ERAS.indexOf(next));
    services.audio.play('whoosh');
    this.cameras.main.fadeOut(380, 10, 6, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop('Card');
      this.scene.stop('Hud');
      this.scene.stop('Game');
      this.scene.start('TimeJump', { from: this.d.era, to: next });
    });
  }

  private openCard(): void {
    const d = this.d;
    const data: HeroCardData = {
      heroName: d.heroName,
      epicLine: d.epicLine,
      stars: d.stats.stars,
      score: d.stats.score,
      bestCombo: d.stats.bestCombo,
      goldenPct: d.stats.goldenPct,
      groupName: d.groupName,
      groupShare: Math.min(1, d.stats.groupDamage / Math.max(1, d.groupHpMax - d.groupHp)),
      avatars: d.members.map((m) => m.avatar),
      perfect: isPerfect(d.stats),
      school: d.school,
      homa: d.homa,
      omen: d.omen,
      moment: d.moment,
    };
    this.scene.launch('Card', { card: data, damage: d.stats.groupDamage });
  }

  private async invite(): Promise<void> {
    const ticket = await services.game.prepareInvite(this.d.groupName);
    const out = await shareTicket(ticket);
    if (out === 'copied') this.say('لینک دعوت کپی شد؛ برای هم‌رزمت بفرست!');
    else if (out === 'failed') this.say('اشتراک‌گذاری در این مرورگر ممکن نشد');
  }

  /** A small parchment note at the bottom that fades by itself. */
  private say(text: string): void {
    this.note?.destroy();
    const t = this.add.text(0, 0, text, { fontFamily: FONT_FAMILY, fontSize: '30px', fontStyle: '900', color: '#3a1a08', rtl: true }).setOrigin(0.5);
    const c = this.add.container(DESIGN_W / 2, DESIGN_H - 60, [this.add.image(0, 0, parchmentTex(this, Math.max(420, t.width + 80), 84)), t]).setDepth(50).setAlpha(0);
    this.note = c;
    this.tweens.add({ targets: c, alpha: 1, y: c.y - 20, duration: 240, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, duration: 400, delay: 2400, onComplete: () => c.destroy() });
  }
}
