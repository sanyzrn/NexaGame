import Phaser from 'phaser';
import { COLORS, FONT_FAMILY } from '../config/display';
import { parchmentTex } from './kit';

const W = 700;
const H = 128;

/**
 * One-time tutorial: a small parchment banner just above the hero platform. It lives in the world
 * under the characters (enemies walk over it rather than hide behind it) and leaves for good after
 * the first arrow that hits.
 */
export class TutorialBanner {
  private readonly c: Phaser.GameObjects.Container;
  private done = false;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number, depth: number) {
    const paper = scene.add.image(0, 0, parchmentTex(scene, W, H));
    // One Text per line: Phaser right-aligns multi-line RTL text.
    const line = (dy: number, s: string, size: number) => scene.add.text(0, dy, s, {
      fontFamily: FONT_FAMILY, fontSize: `${size}px`, fontStyle: '900', color: COLORS.inkCss, rtl: true,
    }).setOrigin(0.5);
    const a = line(-22, 'انگشتت را به سمت هدف بکش', 34);
    const b = line(24, 'در درخشش طلایی رها کن!', 34).setColor('#8a4a06');
    this.c = scene.add.container(x, y, [paper, a, b]).setDepth(depth).setAlpha(0).setScale(0.85);
    scene.tweens.add({ targets: this.c, alpha: 1, scale: 1, duration: 420, delay: 500, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: this.c, y: y - 8, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 900 });
  }

  dismiss(): void {
    if (this.done) return;
    this.done = true;
    const c = this.c;
    this.scene.tweens.killTweensOf(c);
    this.scene.tweens.add({ targets: c, alpha: 0, y: c.y + 30, scale: 0.9, duration: 450, ease: 'Cubic.easeIn', onComplete: () => c.destroy() });
  }
}
