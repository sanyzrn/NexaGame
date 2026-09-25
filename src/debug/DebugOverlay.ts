import Phaser from 'phaser';
import { Art } from '../assets/Art';
import { BALANCE } from '../config/balance';
import { DEPTH } from '../config/display';
import { services } from '../services';

export interface DebugSource {
  walls: { left: number; right: number; top: number; bottom: number };
  /** Horizontal guide lines (spawn line, attack line…). */
  lines: readonly { y: number; color: number }[];
  pillars: readonly { x: number; y: number; w: number; h: number }[];
  targets: readonly { hittable: boolean; hitX: number; hitY: number; hitR: number }[];
  hero: { x: number; y: number; r: number; bowX: number; bowY: number };
  arrows(fn: (x: number, y: number) => void): void;
  status(): string;
}

/**
 * Toggle with the ` key (or D) on desktop, or a 3-finger tap on a phone. Start with ?debug=1.
 * Shows FPS, charge state, hitboxes/collision, particle counts and the missing (placeholder) assets,
 * whose name labels are only painted while the overlay is on (see `onToggle`).
 */
export class DebugOverlay {
  private visible = new URLSearchParams(location.search).has('debug');
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private textTimer = 0;
  private lastToggle = 0;
  /** Called with the new state whenever the overlay is toggled (and once when it is assigned). */
  private toggleCb: ((on: boolean) => void) | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly src: DebugSource) {
    this.gfx = scene.add.graphics().setDepth(DEPTH.debug);
    this.text = scene.add.text(16, 150, '', {
      fontFamily: 'monospace', fontSize: '22px', color: '#aef7ff', backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 10, y: 8 }, wordWrap: { width: 760 },
    }).setDepth(DEPTH.debug + 1);
    this.apply();

    const kb = scene.input.keyboard;
    kb?.on('keydown-BACKTICK', () => this.toggle());
    kb?.on('keydown-D', () => this.toggle());
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      const down = scene.input.manager.pointers.filter((p) => p.isDown).length;
      if (down >= 3) this.toggle();
    });
  }

  get enabled(): boolean {
    return this.visible;
  }

  set onToggle(cb: (on: boolean) => void) {
    this.toggleCb = cb;
    cb(this.visible);
  }

  toggle(): void {
    const now = performance.now();
    if (now - this.lastToggle < 400) return;
    this.lastToggle = now;
    this.visible = !this.visible;
    this.apply();
    this.toggleCb?.(this.visible);
  }

  update(realMs: number): void {
    if (!this.visible) return;
    const g = this.gfx.clear();
    const s = this.src;
    const w = s.walls;

    g.lineStyle(4, 0x00e5ff, 0.9).lineBetween(w.left, w.top, w.left, w.bottom).lineBetween(w.right, w.top, w.right, w.bottom);
    g.lineStyle(4, 0xff3b3b, 0.9).lineBetween(w.left, w.top, w.right, w.top);
    for (const l of s.lines) g.lineStyle(3, l.color, 0.7).lineBetween(w.left, l.y, w.right, l.y);
    g.lineStyle(3, 0xffe600, 1);
    for (const p of s.pillars) g.strokeRect(p.x, p.y, p.w, p.h);
    for (const t of s.targets) {
      g.lineStyle(3, t.hittable ? 0xff4df0 : 0x666666, 1).strokeCircle(t.hitX, t.hitY, t.hitR);
      g.lineStyle(1, 0xff4df0, 0.5).strokeCircle(t.hitX, t.hitY, t.hitR + BALANCE.arrow.radius);
    }
    g.lineStyle(3, 0x4dff88, 1).strokeCircle(s.hero.x, s.hero.y, s.hero.r);
    g.lineStyle(3, 0xffffff, 1)
      .lineBetween(s.hero.bowX - 16, s.hero.bowY, s.hero.bowX + 16, s.hero.bowY)
      .lineBetween(s.hero.bowX, s.hero.bowY - 16, s.hero.bowX, s.hero.bowY + 16);
    g.fillStyle(0xff9900, 1);
    s.arrows((x, y) => g.fillCircle(x, y, BALANCE.arrow.radius));

    this.textTimer -= realMs;
    if (this.textTimer <= 0) {
      this.textTimer = 250;
      const game = this.scene.game;
      const renderer = game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas';
      const tg = services.telegram;
      this.text.setText([
        `FPS ${game.loop.actualFps.toFixed(0)}  ${renderer}  webp:${services.caps.webp ? 'y' : 'n'}`,
        `tg: ${tg.platform} v${tg.version}`,
        s.status(),
        `missing assets (${Art.missing.length}): ${Art.missing.join(', ') || 'none'}`,
      ]);
    }
  }

  private apply(): void {
    this.gfx.setVisible(this.visible).clear();
    this.text.setVisible(this.visible);
  }
}
