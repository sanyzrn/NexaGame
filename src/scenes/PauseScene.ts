import Phaser from 'phaser';
import { DESIGN_H, DESIGN_W, FONT_FAMILY } from '../config/display';
import { services } from '../services';
import { currentEra } from '../systems/eraProgress';
import { Button, Toggle } from '../ui/Button';
import { dimTex, dividerTex, gradientText, lachakTex, panelTex, ribbonTex, shamsehTex } from '../ui/kit';

const W = 720;
const H = 1040;

/**
 * Pause menu, as its own scene on top of everything: while it is open the Game and Hud scenes are
 * paused (updates, tweens, timers, particles, the simulated teammates) and the audio context is
 * held mid-note, so the world is truly frozen. Where and how hard (era · difficulty), resume,
 * sound, light effects, restart, and back to the main menu. Styled as an
 * illuminated page: a gilded shamseh crowning the panel, lachak corner pieces, eslimi dividers.
 */
export class PauseScene extends Phaser.Scene {
  private closing = false;
  private dim!: Phaser.GameObjects.Image;
  private panel!: Phaser.GameObjects.Container;

  constructor() {
    super('Pause');
  }

  create(): void {
    this.closing = false;
    this.scene.pause('Game');
    this.scene.pause('Hud');
    services.audio.play('pause');
    services.audio.stopDraw();
    services.audio.stopHum();
    services.audio.hold(true);

    const dim = this.add.image(0, 0, dimTex(this)).setOrigin(0).setDisplaySize(DESIGN_W, DESIGN_H).setInteractive().setAlpha(0);
    const shamseh = this.add.image(0, -H / 2 - 84, shamsehTex(this, 92));
    const title = gradientText(this.add.text(0, -H / 2 - 4, 'مکث', {
      fontFamily: FONT_FAMILY, fontSize: '70px', fontStyle: '900', rtl: true,
    }).setOrigin(0.5), ['#fff4e0', '#ffe2a8', '#f0b460']);
    // Lachaks are drawn for the top-left corner: mirrored into each corner (origin at the corner).
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) =>
      this.add.image(sx * (W / 2 - 22), sy * (H / 2 - 22), lachakTex(this, 110)).setOrigin(0).setScale(-sx, -sy).setAlpha(0.9));

    const era = currentEra();
    const info = this.add.text(0, -H / 2 + 112, `عصر ${era.name} · سختی: ${services.settings.difficulty.name}`, {
      fontFamily: FONT_FAMILY, fontSize: '30px', fontStyle: '900', color: '#b9c3e6', rtl: true,
    }).setOrigin(0.5);
    const resume = new Button(this, 0, -H / 2 + 236, 540, 136, 'ادامه', () => this.close(), 'gold');
    const sound = new Toggle(this, 0, -50, 560, 'صدا', !services.audio.muted, (on) => services.audio.setMuted(!on));
    const light = new Toggle(this, 0, 80, 560, 'جلوه‌های سبک', services.settings.reducedEffects,
      (on) => services.settings.setReducedEffects(on), 'برای گوشی‌های ضعیف‌تر');
    const restart = new Button(this, 150, H / 2 - 150, 290, 116, 'شروع دوباره', () => this.restart(), 'lapis');
    const menu = new Button(this, -150, H / 2 - 150, 290, 116, 'منوی اصلی', () => this.toMenu(), 'red');

    const panel = this.add.container(DESIGN_W / 2, DESIGN_H / 2, [
      shamseh,
      this.add.image(0, 0, panelTex(this, W, H)),
      ...corners,
      this.add.image(0, -H / 2 + 8, ribbonTex(this, 440, 124, 'red')),
      title,
      info,
      resume,
      this.add.image(0, -150, dividerTex(this, 540)),
      sound,
      light,
      this.add.image(0, 200, dividerTex(this, 540)),
      restart,
      menu,
    ]).setAlpha(0).setScale(0.85);

    this.tweens.add({ targets: dim, alpha: 1, duration: 220 });
    this.tweens.add({ targets: panel, alpha: 1, scale: 1, duration: 320, ease: 'Back.easeOut' });
    shamseh.setScale(0.4).setAngle(-40);
    this.tweens.add({ targets: shamseh, scale: 1, angle: 0, duration: 620, delay: 80, ease: 'Back.easeOut' });
    // The medallion turns, very slowly, while the game waits.
    this.tweens.add({ targets: shamseh, angle: 360, duration: 60000, delay: 700, repeat: -1 });
    this.input.keyboard?.on('keydown-ESC', () => this.close());

    // Telegram's own back button resumes, as players expect inside Telegram.
    const offBack = services.telegram.backButton(() => this.close());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offBack();
      services.audio.hold(false);
    });
    this.dim = dim;
    this.panel = panel;
  }

  private close(): void {
    if (this.closing) return;
    this.closing = true;
    this.tweens.add({ targets: this.dim, alpha: 0, duration: 180 });
    this.tweens.add({
      targets: this.panel, alpha: 0, scale: 0.9, duration: 180, ease: 'Cubic.easeIn',
      onComplete: () => {
        services.audio.hold(false);
        this.scene.resume('Game');
        this.scene.resume('Hud');
        this.scene.stop();
      },
    });
  }

  private restart(): void {
    if (this.closing) return;
    this.closing = true;
    services.audio.hold(false);
    services.audio.stopChoir(0.1);
    this.scene.stop('Hud');
    // `title: false` matters: `scene.start` with no data reuses the previous launch data, and a
    // run restarted from the first boot would otherwise land back on the title screen.
    this.scene.start('Game', { title: false });
  }

  /** Leaves the run for the title (era, difficulty and school can be changed there). */
  private toMenu(): void {
    if (this.closing) return;
    this.closing = true;
    services.audio.hold(false);
    services.audio.stopChoir(0.1);
    this.scene.stop('Hud');
    this.scene.start('Game', { title: true });
  }
}
