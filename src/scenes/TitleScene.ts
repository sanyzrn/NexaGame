import Phaser from 'phaser';
import { CALLIGRAPHY_FONT, DESIGN_W, FONT_FAMILY } from '../config/display';
import { FEEL } from '../config/feel';
import { SCHOOLS, type School } from '../config/team';
import { loadEraArt } from '../assets/eraSkins';
import { ERAS } from '../data/eras';
import { pickOmen } from '../data/omens';
import { currentIndex, selectEra, unlockedIndex } from '../systems/eraProgress';
import { DIFFICULTIES } from '../data/difficulty';
import { readStartParam } from '../services/links';
import { services } from '../services';
import type { GroupMember } from '../services/GameService';
import { avatarColor, avatarTex } from '../ui/avatar';
import { Button } from '../ui/Button';
import { dividerTex, gradientText, groupBannerTex, panelTex, parchmentTex, schoolEmblemTex, shineTex, speakerTex } from '../ui/kit';
import { faNum } from '../utils/fa';
import type { GameScene } from './GameScene';

const LOGO_Y = 500;
const OMEN_Y = 872;
const SCHOOL_Y = 1100;
const BUTTON_Y = 1430;
const INFO_Y = BUTTON_Y + 128;
const MENU_Y = BUTTON_Y + 252;
const BEST_Y = BUTTON_Y + 370;

/** What each school's power does, in a line (the picker explains why a group needs all three). */
const SCHOOL_LINES: Record<School, string> = {
  rostami: '«خشم رستم»: زمین را می‌لرزاند و زره دیو را می‌شکند',
  arashi: '«چشم عقاب»: سه تیر طلایی، بی‌خطا بر نقطه‌ضعف‌ها',
  simorghi: '«بال سیمرغ»: جان می‌بخشد و زنجیرهٔ لشکر را بالا می‌برد',
};

/**
 * Title overlay. The world behind it is the real arena, held at dusk by the Game scene (camera up
 * high, embers, braziers and banners alive, the White Div a silhouette with glowing eyes). Here: the
 * name «درفش» and «نبرد پهلوانان» in live fonts with a gold shine sweeping across, a big pulsing
 * «نبرد!» button, a sound toggle, and the group chip with the members' avatars. On «نبرد!» the UI
 * lifts away and the Game's camera flies down into the arena, and the run starts.
 */
export class TitleScene extends Phaser.Scene {
  private started = false;
  private t = 0;
  private logo!: Phaser.GameObjects.Container;
  private layer: Phaser.GameObjects.GameObject[] = [];
  private schoolCards: { school: School; c: Phaser.GameObjects.Container; ring: Phaser.GameObjects.Image }[] = [];
  private schoolLine!: Phaser.GameObjects.Text;
  private eyeZone: Phaser.GameObjects.Arc | null = null;
  private eyeTaps = 0;
  private eyeWoke = false;
  private readonly eyeP = { x: 0, y: 0 };

  constructor() {
    super('Title');
  }

  create(): void {
    this.started = false;
    this.t = 0;
    this.layer = [];
    const ins = services.safeArea.designInsets(this.scale.canvasBounds, DESIGN_W, 1920);
    const top = Math.round(ins.top);
    this.schoolCards = [];
    this.eyeTaps = 0;
    this.eyeWoke = false;
    this.buildLogo();
    this.buildSchools();
    this.buildButton();
    this.buildInvite();
    this.buildMenu();
    this.buildOmen();
    this.buildEyes();
    this.buildSound(top);
    void this.buildChip(top);
    void this.buildBest();
    this.input.keyboard?.on('keydown-ENTER', () => this.start());
    this.input.keyboard?.on('keydown-SPACE', () => this.start());
  }

  update(_t: number, delta: number): void {
    this.t += Math.min(delta, 50);
    if (this.started) return;
    // The secret's hit zone follows the Div's eyes as the camera drifts.
    if (this.eyeZone) {
      const game = this.scene.get('Game') as GameScene;
      if (game.titleEyesOnScreen(this.eyeP)) this.eyeZone.setPosition(this.eyeP.x, this.eyeP.y);
    }
    // Parallax against the camera's slow drift: the logo floats a touch the other way.
    const F = FEEL.title;
    const phase = (this.t / F.driftMs) * Math.PI * 2;
    this.logo.x = DESIGN_W / 2 - Math.sin(phase) * F.driftPx * 0.4;
    this.logo.y = LOGO_Y + Math.sin(phase * 1.7) * 6;
  }

  // ---------------------------------------------------------------- logo

  private buildLogo(): void {
    const F = FEEL.title;
    const glow = this.add.image(0, 10, 'fx_glow').setTint(0xffb040).setBlendMode(Phaser.BlendModes.ADD).setScale(9, 5).setAlpha(0.35);
    this.tweens.add({ targets: glow, alpha: 0.55, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const style = { fontFamily: FONT_FAMILY, fontSize: '230px', fontStyle: '900', rtl: true, padding: { top: 30, bottom: 30, left: 20, right: 20 } };
    const name = gradientText(this.add.text(0, 0, 'درفش', { ...style, stroke: '#3a1804', strokeThickness: 14 }).setOrigin(0.5),
      ['#fffbe0', '#ffe07a', '#e8a030', '#fff0b0']);
    const top = this.add.image(0, -150, dividerTex(this, 620)).setScale(0, 1);
    const bottom = this.add.image(0, 150, dividerTex(this, 620)).setScale(0, 1);
    const banner = this.add.image(0, -250, groupBannerTex(this)).setOrigin(0.15, 0.85).setScale(0.8).setAlpha(0);
    const sub = gradientText(this.add.text(0, 235, 'نبرد پهلوانان', {
      fontFamily: FONT_FAMILY, fontSize: '70px', fontStyle: '900', rtl: true, stroke: '#2a1204', strokeThickness: 8,
      padding: { top: 30, bottom: 44, left: 20, right: 20 },
    }).setOrigin(0.5).setAlpha(0), ['#fff4e0', '#f6d8a0', '#d89a50']);
    const parts: Phaser.GameObjects.GameObject[] = [glow, top, bottom, banner, name, sub];

    // The gold shine: a white copy of the name, revealed only under a moving bar (WebGL masks).
    if (this.game.renderer.type === Phaser.WEBGL) {
      const shine = this.add.text(0, 0, 'درفش', { ...style, color: '#ffffff' }).setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85);
      const bar = this.make.image({ key: shineTex(this), x: -800, y: LOGO_Y }, false).setDisplaySize(170, 520).setAngle(20);
      shine.setMask(bar.createBitmapMask());
      parts.push(shine);
      const sweep = () => {
        bar.x = DESIGN_W / 2 - 700;
        this.tweens.add({ targets: bar, x: DESIGN_W / 2 + 700, duration: 1300, ease: 'Sine.easeInOut', onUpdate: () => { bar.y = this.logo.y; } });
      };
      this.time.addEvent({ delay: F.shineEveryMs, loop: true, callback: sweep, startAt: F.shineEveryMs - 1400 });
    }
    this.logo = this.add.container(DESIGN_W / 2, LOGO_Y, parts).setAlpha(0).setScale(1.25);
    this.layer.push(this.logo);

    // Entrance: the name lands, the rules unfurl, the subtitle rises, the banner is planted.
    this.tweens.add({ targets: this.logo, alpha: 1, scale: 1, duration: 900, ease: 'Back.easeOut', delay: 150 });
    this.tweens.add({ targets: [top, bottom], scaleX: 1, duration: 700, delay: 650, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: sub, alpha: 1, y: { from: 270, to: 235 }, duration: 700, delay: 800, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: banner, alpha: 1, y: { from: -300, to: -250 }, duration: 600, delay: 1000, ease: 'Back.easeOut' });
    this.tweens.add({ targets: banner, angle: { from: -3, to: 3 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // The calligraphic subtitle once Nastaliq has loaded (it streams in after boot).
    document.fonts?.load(`700 70px Nastaliq`, 'نبرد پهلوانان').then(() => {
      if (!sub.scene) return;
      sub.setFontFamily(CALLIGRAPHY_FONT).setFontStyle('normal').setFontSize(84);
      gradientText(sub, ['#fff4e0', '#f6d8a0', '#d89a50']);
    }).catch(() => undefined);
  }

  // ---------------------------------------------------------------- the school picker

  /**
   * Three medallions: رستمی، آرشی، سیمرغی. The chosen one is lifted, ringed in gold and its power
   * is described underneath; the choice is saved and decides the power orb's power in the fight.
   */
  private buildSchools(): void {
    const order: School[] = ['rostami', 'arashi', 'simorghi'];
    const caption = this.add.text(DESIGN_W / 2, SCHOOL_Y - 130, 'مکتب پهلوانی‌ات را برگزین', {
      fontFamily: FONT_FAMILY, fontSize: '32px', fontStyle: '900', color: '#ffe8b0', rtl: true, stroke: '#2a1204', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);
    this.layer.push(caption);
    this.tweens.add({ targets: caption, alpha: 1, duration: 500, delay: 1200 });
    order.forEach((school, i) => {
      const x = DESIGN_W / 2 + (1 - i) * 250; // right to left
      const ring = this.add.image(0, 0, 'fx_ring').setTint(0xffd24a).setBlendMode(Phaser.BlendModes.ADD).setScale(1.3).setAlpha(0);
      const emblem = this.add.image(0, 0, schoolEmblemTex(this, school)).setScale(0.85);
      const name = this.add.text(0, 86, SCHOOLS[school].name, {
        fontFamily: FONT_FAMILY, fontSize: '32px', fontStyle: '900', color: '#fff0c8', rtl: true, stroke: '#1a0e04', strokeThickness: 6,
      }).setOrigin(0.5);
      // Container hit shapes are measured from its top-left corner: size + default rectangle = centred.
      const c = this.add.container(x, SCHOOL_Y + 20, [ring, emblem, name]).setSize(200, 250).setAlpha(0).setScale(0.6);
      ring.setY(-20);
      emblem.setY(-20);
      name.setY(66);
      c.setInteractive({ useHandCursor: true });
      c.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.pickSchool(school, true));
      this.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 500, delay: 1250 + i * 90, ease: 'Back.easeOut' });
      this.schoolCards.push({ school, c, ring });
      this.layer.push(c);
    });
    this.schoolLine = this.add.text(DESIGN_W / 2, SCHOOL_Y + 160, '', {
      fontFamily: FONT_FAMILY, fontSize: '28px', fontStyle: '900', color: '#f6e7c8', rtl: true, stroke: '#1a0e04', strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0);
    this.layer.push(this.schoolLine);
    this.time.delayedCall(1500, () => this.pickSchool(services.settings.school, false));
  }

  private pickSchool(school: School, byTap: boolean): void {
    if (this.started) return;
    services.settings.setSchool(school);
    for (const card of this.schoolCards) {
      const on = card.school === school;
      this.tweens.killTweensOf([card.c, card.ring]);
      this.tweens.add({ targets: card.c, scale: on ? 1.12 : 0.9, alpha: on ? 1 : 0.7, y: SCHOOL_Y + 20 - (on ? 14 : 0), duration: 260, ease: 'Back.easeOut' });
      card.ring.setAlpha(on ? 0.9 : 0);
      if (on) this.tweens.add({ targets: card.ring, alpha: { from: 0.9, to: 0.45 }, duration: 900, yoyo: true, repeat: -1 });
    }
    this.schoolLine.setText(SCHOOL_LINES[school]).setAlpha(0);
    if (this.schoolLine.width > DESIGN_W - 80) this.schoolLine.setScale((DESIGN_W - 80) / this.schoolLine.width);
    else this.schoolLine.setScale(1);
    this.tweens.add({ targets: this.schoolLine, alpha: 1, duration: 260 });
    if (byTap) {
      services.audio.unlock();
      services.audio.play(school === 'rostami' ? 'drum' : school === 'arashi' ? 'golden' : 'featherChime');
      services.haptics.play('light');
    }
  }

  // ---------------------------------------------------------------- a friend sent you here

  /** فال لشکر — the day's omen, shared by every player: a small parchment note under the logo. */
  private buildOmen(): void {
    const omen = pickOmen(new Date(), new URLSearchParams(window.location.search).get('omen'));
    if (!omen) return;
    const t = this.add.text(0, -12, `فال لشکر امروز: ${omen.name}`, {
      fontFamily: FONT_FAMILY, fontSize: '30px', fontStyle: '900', color: '#1e5a6a', rtl: true,
    }).setOrigin(0.5);
    const s = this.add.text(0, 26, omen.line, {
      fontFamily: FONT_FAMILY, fontSize: '24px', fontStyle: '700', color: '#6a5432', rtl: true,
    }).setOrigin(0.5);
    const w = Math.min(920, Math.max(t.width, s.width) + 110);
    if (t.width > w - 90) t.setScale((w - 90) / t.width);
    if (s.width > w - 90) s.setScale((w - 90) / s.width);
    const c = this.add.container(DESIGN_W / 2, OMEN_Y, [this.add.image(0, 0, parchmentTex(this, w, 104)), t, s]).setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, y: { from: OMEN_Y - 30, to: OMEN_Y }, duration: 600, delay: 1450, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, angle: { from: -1, to: 1 }, duration: 2000, yoyo: true, repeat: -1, delay: 2050, ease: 'Sine.easeInOut' });
    this.layer.push(c);
  }

  /** Opened from a challenge or an invite: a parchment ribbon says who, and what to beat. */
  private buildInvite(): void {
    const p = readStartParam(services.telegram.startParam);
    if (!p) return;
    const text = p.kind === 'challenge'
      ? `${p.name} تو را به چالش کشید: رکوردش ${faNum(p.score)}`
      : `${p.from} تو را به لشکر فراخواند!`;
    const t = this.add.text(0, 0, text, { fontFamily: FONT_FAMILY, fontSize: '32px', fontStyle: '900', color: '#3a1a08', rtl: true }).setOrigin(0.5);
    const w = Math.min(980, Math.round(t.width) + 110);
    if (t.width > w - 90) t.setScale((w - 90) / t.width);
    const c = this.add.container(DESIGN_W / 2, BEST_Y, [this.add.image(0, 0, parchmentTex(this, w, 96)), t]).setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, y: { from: BEST_Y + 50, to: BEST_Y }, duration: 600, delay: 1700, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, angle: { from: -1.2, to: 1.2 }, duration: 1600, yoyo: true, repeat: -1, delay: 2300, ease: 'Sine.easeInOut' });
    this.layer.push(c);
  }

  // ---------------------------------------------------------------- the menu

  /**
   * Under «نبرد!»: one line saying where and how hard (era · year · difficulty), then two menu
   * buttons — «زمان‌ها» opens the era wall (EraSelectScene), «سختی» the difficulty picker. Either
   * choice rebuilds the arena behind the title, so the world always matches what was picked.
   */
  private buildMenu(): void {
    const era = ERAS[currentIndex()];
    const diff = services.settings.difficulty;
    const info = this.add.text(DESIGN_W / 2, INFO_Y, `عصر ${era.name} · ${era.year} · سختی: ${diff.name}`, {
      fontFamily: FONT_FAMILY, fontSize: '30px', fontStyle: '900', color: '#ffe8b0', rtl: true, stroke: '#1a0e04', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);
    if (info.width > DESIGN_W - 80) info.setScale((DESIGN_W - 80) / info.width);
    const eras = new Button(this, DESIGN_W / 2 + 232, MENU_Y, 440, 116, '⏳ زمان‌ها', () => this.openEras(), 'lapis');
    const hard = new Button(this, DESIGN_W / 2 - 232, MENU_Y, 440, 116, `⚔ ${diff.name}`, () => this.openDifficulty(), 'red');
    const items: Phaser.GameObjects.GameObject[] = [info, eras, hard];
    // A newly opened era: the button glows with a «جدید» tag until the player visits the wall.
    if (unlockedIndex() > currentIndex() && ERAS[unlockedIndex()]?.playable) {
      const tag = this.add.text(DESIGN_W / 2 + 400, MENU_Y - 58, 'جدید!', {
        fontFamily: FONT_FAMILY, fontSize: '26px', fontStyle: '900', color: '#3a1a04', rtl: true,
        backgroundColor: '#ffd24a', padding: { left: 14, right: 14, top: 4, bottom: 6 },
      }).setOrigin(0.5).setAngle(-8);
      this.tweens.add({ targets: tag, scale: 1.15, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: eras, scale: 1.05, duration: 600, yoyo: true, repeat: -1, delay: 1800, ease: 'Sine.easeInOut' });
      items.push(tag);
    }
    items.forEach((o, i) => {
      const t = o as Phaser.GameObjects.Components.Alpha & Phaser.GameObjects.GameObject;
      t.setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 450, delay: 1300 + i * 80 });
      this.layer.push(o);
    });
  }

  private openEras(): void {
    if (this.started) return;
    services.audio.unlock();
    services.audio.play('ui');
    this.setUiVisible(false);
    this.scene.launch('Eras', {
      onPick: (index: number) => this.switchEra(index),
      onClose: () => this.setUiVisible(true),
    });
  }

  /** The difficulty picker: four medallion rows on a parchment-rimmed panel over a dim veil. */
  private openDifficulty(): void {
    if (this.started) return;
    services.audio.unlock();
    services.audio.play('ui');
    const cx = DESIGN_W / 2;
    const cy = 980;
    const current = services.settings.difficulty.id;
    const veil = this.add.rectangle(0, 0, DESIGN_W, 1920, 0x04060f, 0.7).setOrigin(0).setInteractive();
    const panel = this.add.image(cx, cy, panelTex(this, 900, 1040));
    const title = gradientText(this.add.text(cx, cy - 420, 'درجهٔ سختی', {
      fontFamily: FONT_FAMILY, fontSize: '64px', fontStyle: '900', rtl: true, stroke: '#2a1204', strokeThickness: 8,
    }).setOrigin(0.5));
    const parts: Phaser.GameObjects.GameObject[] = [veil, panel, title];
    const close = () => {
      this.tweens.add({ targets: parts, alpha: 0, duration: 160, onComplete: () => parts.forEach((p) => p.destroy()) });
    };
    veil.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, close);
    DIFFICULTIES.forEach((d, i) => {
      const y = cy - 270 + i * 190;
      const on = d.id === current;
      const g = this.add.graphics();
      g.fillStyle(on ? 0x243056 : 0x141c38, 1).fillRoundedRect(cx - 390, y - 78, 780, 156, 36);
      g.lineStyle(on ? 6 : 3, on ? 0xffd24a : 0x5a6488, 1).strokeRoundedRect(cx - 390, y - 78, 780, 156, 36);
      g.fillStyle(d.color, 1).fillCircle(cx + 310, y, 46);
      const hearts = this.add.text(cx + 310, y, faNum(d.hearts), { fontFamily: FONT_FAMILY, fontSize: '40px', fontStyle: '900', color: '#ffffff' }).setOrigin(0.5);
      const heartTag = this.add.text(cx + 310, y + 60, 'جان', { fontFamily: FONT_FAMILY, fontSize: '20px', fontStyle: '900', color: '#b9c3e6', rtl: true }).setOrigin(0.5);
      const name = this.add.text(cx + 230, y - 26, `${d.name}${on ? '  ✓' : ''}`, {
        fontFamily: FONT_FAMILY, fontSize: '46px', fontStyle: '900', color: on ? '#ffe07a' : '#fff0c8', rtl: true,
      }).setOrigin(1, 0.5);
      const line = this.add.text(cx + 230, y + 30, d.line, { fontFamily: FONT_FAMILY, fontSize: '26px', fontStyle: '700', color: '#b9c3e6', rtl: true }).setOrigin(1, 0.5);
      if (line.width > 580) line.setScale(580 / line.width);
      const hit = this.add.zone(cx, y, 780, 156).setInteractive({ useHandCursor: true });
      hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        services.haptics.play('tick');
        if (d.id === current) {
          close();
          return;
        }
        services.settings.setDifficulty(d.id);
        this.rebuild();
      });
      parts.push(g, hearts, heartTag, name, line, hit);
    });
    parts.forEach((p) => {
      const o = p as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Alpha & Phaser.GameObjects.Components.Depth;
      o.setDepth(50).setAlpha(0);
      this.tweens.add({ targets: o, alpha: 1, duration: 200 });
    });
  }

  private setUiVisible(on: boolean): void {
    for (const o of this.layer) (o as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible).setVisible(on);
    this.eyeZone?.setVisible(on);
  }

  /** Rebuilds the arena behind the title in the chosen era's skin. */
  private switchEra(index: number): void {
    if (!selectEra(index)) return;
    this.rebuild(loadEraArt(this, ERAS[index]));
  }

  /** The world behind the title is rebuilt for a new era or difficulty (fetching art first). */
  private rebuild(art: Promise<boolean> = Promise.resolve(true)): void {
    if (this.started) return;
    this.started = true;
    services.audio.play('whoosh');
    this.cameras.main.fadeOut(260, 6, 8, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      void art.then(() => {
        this.scene.stop('Hud');
        this.scene.start('Game', { title: true });
      });
    });
  }

  // ---------------------------------------------------------------- the secret

  /** Hidden: tap the White Div's glowing eyes three times and he wakes. */
  private buildEyes(): void {
    if (!FEEL.surprises.divEyes.enabled) return;
    this.eyeZone = this.add.circle(0, 0, 70, 0xffffff, 0).setInteractive();
    this.eyeZone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      if (this.started || this.eyeWoke) return;
      const game = this.scene.get('Game') as GameScene;
      this.eyeTaps++;
      const wake = this.eyeTaps >= FEEL.surprises.divEyes.taps;
      game.pokeTitleEyes(wake);
      services.haptics.play(wake ? 'heavy' : 'light');
      if (!wake) return;
      this.eyeWoke = true;
      this.tweens.add({ targets: this.logo, alpha: 0.25, duration: 300, yoyo: true, hold: 3200 });
      const line = gradientText(this.add.text(DESIGN_W / 2, LOGO_Y + 10, `کیست که خواب ${ERAS[currentIndex()].bossName} را آشفت؟`, {
        fontFamily: CALLIGRAPHY_FONT, fontSize: '64px', rtl: true, stroke: '#1a0404', strokeThickness: 6,
        padding: { top: 30, bottom: 44, left: 20, right: 20 },
      }).setOrigin(0.5).setAlpha(0).setScale(0.7), ['#ffe0d0', '#ff8a6a', '#b0201a']);
      this.tweens.add({ targets: line, alpha: 1, scale: 1, duration: 500, delay: 250, ease: 'Back.easeOut' });
      this.tweens.add({ targets: line, alpha: 0, y: LOGO_Y - 30, duration: 700, delay: 3200, onComplete: () => line.destroy() });
      this.tweens.add({ targets: this.logo, x: `+=${14}`, duration: 50, yoyo: true, repeat: 5 });
    });
  }

  // ---------------------------------------------------------------- «نبرد!»

  private buildButton(): void {
    const ring = this.add.image(DESIGN_W / 2, BUTTON_Y, 'fx_ring').setTint(0xffd24a).setBlendMode(Phaser.BlendModes.ADD).setScale(3.6, 1.6).setAlpha(0);
    const halo = this.add.image(DESIGN_W / 2, BUTTON_Y, 'fx_glow').setTint(0xffa030).setBlendMode(Phaser.BlendModes.ADD).setScale(9, 3.4).setAlpha(0.3);
    const btn = new Button(this, DESIGN_W / 2, BUTTON_Y, 600, 176, 'نبرد!', () => this.start(), 'gold');
    btn.setScale(0).setAlpha(0);
    this.tweens.add({ targets: btn, scale: 1, alpha: 1, duration: 600, delay: 1100, ease: 'Back.easeOut' });
    // Idle pulse, and a ring that breathes out of it.
    this.tweens.add({ targets: btn, scale: 1.06, duration: FEEL.title.buttonPulseMs / 2, yoyo: true, repeat: -1, delay: 1800, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: ring, scaleX: 4.6, scaleY: 2.2, alpha: { from: 0.6, to: 0 }, duration: FEEL.title.buttonPulseMs, repeat: -1, delay: 1800, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: halo, alpha: 0.5, duration: FEEL.title.buttonPulseMs / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.layer.push(ring, halo, btn);
  }

  private async buildBest(): Promise<void> {
    const p = await services.game.getProfile();
    // The invite ribbon (opened from a friend's link) takes this spot when there is one.
    if (!this.sys.isActive() || this.started || p.bestScore <= 0 || readStartParam(services.telegram.startParam)) return;
    const t = this.add.text(DESIGN_W / 2, BEST_Y, `رکورد تو: ${faNum(p.bestScore)}`, {
      fontFamily: FONT_FAMILY, fontSize: '34px', fontStyle: '900', color: '#ffe8b0', rtl: true, stroke: '#2a1204', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 500, delay: 1400 });
    this.layer.push(t);
  }

  // ---------------------------------------------------------------- corner buttons

  private buildSound(top: number): void {
    const b = this.add.image(90, 90 + top, speakerTex(this, !services.audio.muted)).setInteractive({ useHandCursor: true }).setAlpha(0);
    this.tweens.add({ targets: b, alpha: 1, duration: 400, delay: 1300 });
    b.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      services.audio.unlock();
      services.audio.setMuted(!services.audio.muted);
      services.audio.play('ui');
      services.haptics.play('tick');
      b.setTexture(speakerTex(this, !services.audio.muted));
      this.tweens.add({ targets: b, scale: { from: 1.25, to: 1 }, duration: 260, ease: 'Back.easeOut' });
    });
    this.layer.push(b);
  }

  /** The group chip: a gold-rimmed pill with the members' avatars overlapping and the group's name. */
  private async buildChip(top: number): Promise<void> {
    const g = await services.game.getGroup();
    if (!this.sys.isActive() || this.started) return;
    const members: GroupMember[] = g.members;
    const n = Math.min(5, members.length);
    const nameT = this.add.text(0, -14, g.name, {
      fontFamily: FONT_FAMILY, fontSize: '32px', fontStyle: '900', color: '#fff0c8', rtl: true,
    }).setOrigin(1, 0.5);
    const countT = this.add.text(0, 22, `${faNum(members.length)} هم‌رزم`, {
      fontFamily: FONT_FAMILY, fontSize: '22px', fontStyle: '900', color: '#b9c3e6', rtl: true,
    }).setOrigin(1, 0.5);
    const avW = 44 + (n - 1) * 34;
    const w = Math.max(nameT.width, countT.width) + avW + 70;
    const h = 96;
    const bg = this.add.graphics();
    bg.fillStyle(0x101834, 0.88).fillRoundedRect(-w, -h / 2, w, h, h / 2);
    bg.lineStyle(4, 0xf3c65a, 1).strokeRoundedRect(-w, -h / 2, w, h, h / 2);
    nameT.setX(-28);
    countT.setX(-28);
    const avatars = members.slice(0, n).map((m, i) => {
      const x = -w + 44 + i * 34;
      return this.add.image(x, 0, avatarTex(this, m)).setDisplaySize(60, 60).setData('c', avatarColor(m));
    });
    const chip = this.add.container(DESIGN_W - 36, 92 + top, [bg, ...avatars.reverse(), nameT, countT]).setSize(w, h).setAlpha(0);
    // The chip is drawn leftward from its anchor; hit shapes are measured from the container's top-left.
    chip.setInteractive(new Phaser.Geom.Rectangle(-w / 2, 0, w, h), Phaser.Geom.Rectangle.Contains);
    this.tweens.add({ targets: chip, alpha: 1, x: { from: DESIGN_W + 200, to: DESIGN_W - 36 }, duration: 600, delay: 1300, ease: 'Back.easeOut' });
    // Tap: the members hop one by one, like a roll call.
    chip.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      services.audio.play('toast');
      services.haptics.play('tick');
      avatars.slice().reverse().forEach((a, i) => {
        this.tweens.add({ targets: a, y: -22, duration: 150, delay: i * 70, yoyo: true, ease: 'Quad.easeOut' });
      });
    });
    this.layer.push(chip);
  }

  // ---------------------------------------------------------------- start

  private start(): void {
    if (this.started || this.scene.isActive('Eras')) return;
    this.started = true;
    services.audio.unlock();
    services.audio.play('battle');
    services.haptics.play('heavy');
    this.eyeZone?.disableInteractive();
    const game = this.scene.get('Game') as GameScene;
    // The UI lifts away (faster than the world: parallax) while the camera dives.
    this.tweens.add({ targets: this.logo, y: this.logo.y - 420, alpha: 0, scale: 1.15, duration: 700, ease: 'Cubic.easeIn' });
    for (const o of this.layer) {
      if (o === this.logo) continue;
      this.tweens.add({ targets: o, alpha: 0, y: `+=${120}`, duration: 420, ease: 'Cubic.easeIn' });
    }
    game.beginPlay();
    this.time.delayedCall(FEEL.title.pushMs + FEEL.title.flyMs, () => this.scene.stop());
  }
}
