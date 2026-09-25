import Phaser from 'phaser';
import { CALLIGRAPHY_FONT, DESIGN_W, FONT_FAMILY } from '../config/display';
import { FEEL } from '../config/feel';
import { services } from '../services';
import type { GroupMember } from '../services/GameService';
import { avatarColor, avatarTex } from '../ui/avatar';
import { Button } from '../ui/Button';
import { dividerTex, gradientText, groupBannerTex, shineTex, speakerTex } from '../ui/kit';
import { faNum } from '../utils/fa';
import type { GameScene } from './GameScene';

const LOGO_Y = 540;
const BUTTON_Y = 1330;

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

  constructor() {
    super('Title');
  }

  create(): void {
    this.started = false;
    this.t = 0;
    this.layer = [];
    const ins = services.safeArea.designInsets(this.scale.canvasBounds, DESIGN_W, 1920);
    const top = Math.round(ins.top);
    this.buildLogo();
    this.buildButton();
    this.buildSound(top);
    void this.buildChip(top);
    void this.buildBest();
    this.input.keyboard?.on('keydown-ENTER', () => this.start());
    this.input.keyboard?.on('keydown-SPACE', () => this.start());
  }

  update(_t: number, delta: number): void {
    this.t += Math.min(delta, 50);
    if (this.started) return;
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
    if (!this.sys.isActive() || this.started || p.bestScore <= 0) return;
    const t = this.add.text(DESIGN_W / 2, BUTTON_Y + 150, `رکورد تو: ${faNum(p.bestScore)}`, {
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
    chip.setInteractive(new Phaser.Geom.Rectangle(-w, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
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
    if (this.started) return;
    this.started = true;
    services.audio.unlock();
    services.audio.play('battle');
    services.haptics.play('heavy');
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
