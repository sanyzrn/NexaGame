import Phaser from 'phaser';
import { Art } from '../assets/Art';
import { DESIGN_W, FONT_FAMILY } from '../config/display';
import { FEEL } from '../config/feel';
import { UI, shineTex } from './kit';

export interface ToastItem {
  avatar: string;
  name: string;
  text: string;
  /** Name colour (the member's school). */
  accent: number;
  /** Called once the toast has slid in, with its avatar's scene position (sparks start there). */
  onShown?: (x: number, y: number) => void;
}

/**
 * When a toast may appear: 'blocked' = never (golden window, finisher, rescue, cutscenes),
 * 'busy' = only after waiting a while (aiming, enemies close), 'calm' = now.
 */
export type TeamGate = 'blocked' | 'busy' | 'calm';

/** Avatar socket and text area of ui_toast_frame, relative to its centre (640×160 box). */
const SOCKET = { x: 180, y: -5, r: 29 };
const TEXT_RIGHT = 138;
const TEXT_W = 318;

interface Toast {
  c: Phaser.GameObjects.Container;
  avatar: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
  text: Phaser.GameObjects.Text;
  shine: Phaser.GameObjects.Image;
  slot: number;
  busy: boolean;
  leaving: boolean;
  /** Bumped on every show, so a stale hold timer can't dismiss the next toast in this slot. */
  gen: number;
  /** Not delivered yet (the toast was dismissed before it finished sliding in). */
  pendingShown: (() => void) | null;
}

/**
 * Teammate toasts: slide in from the right with an ease-out-back (avatar in the frame's round socket,
 * name in the member's colour, what they did), hold, then slide back out. At most two on screen,
 * stacked; when the upper one leaves the lower one moves up. Pooled (three toasts).
 */
export class TeamToasts {
  private readonly pool: Toast[] = [];
  private busyWait = 0;
  private sinceLast = 1e9;

  constructor(private readonly scene: Phaser.Scene, depth: number, private readonly topInset: () => number) {
    const T = FEEL.toast;
    for (let i = 0; i < 3; i++) {
      const frame = Art.image(scene, 0, 0, 'ui_toast_frame');
      const ring = scene.add.image(SOCKET.x, SOCKET.y, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setScale(1.5).setAlpha(0.5);
      const avatar = scene.add.image(SOCKET.x, SOCKET.y, 'fx_glow').setDisplaySize(SOCKET.r * 2, SOCKET.r * 2);
      const name = scene.add.text(TEXT_RIGHT, -20, '', {
        fontFamily: FONT_FAMILY, fontSize: '30px', fontStyle: '900', rtl: true, stroke: '#0a1030', strokeThickness: 5,
      }).setOrigin(1, 0.5);
      const text = scene.add.text(TEXT_RIGHT, 20, '', {
        fontFamily: FONT_FAMILY, fontSize: '25px', color: UI.parchment, rtl: true,
      }).setOrigin(1, 0.5);
      const shine = scene.add.image(0, 0, shineTex(scene)).setDisplaySize(90, 110).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      const c = scene.add.container(0, 0, [frame, ring, avatar, shine, name, text]).setDepth(depth).setScale(T.scale).setVisible(false);
      this.pool.push({ c, avatar, ring, name, text, shine, slot: 0, busy: false, leaving: false, gen: 0, pendingShown: null });
    }
  }

  private get shown(): Toast[] {
    return this.pool.filter((t) => t.busy && !t.leaving);
  }

  /** Advances the wait; true when a new toast may appear now (`waiting`: something is queued). */
  ready(gate: TeamGate, ms: number, waiting: boolean): boolean {
    const T = FEEL.toast;
    this.sinceLast += ms;
    if (!waiting || gate === 'blocked') {
      if (!waiting) this.busyWait = 0;
      return false;
    }
    if (this.shown.length >= T.slotsY.length || this.sinceLast < T.gapMs) return false;
    if (gate === 'busy') {
      this.busyWait += ms;
      if (this.busyWait < T.busyPatienceMs) return false;
    }
    return this.pool.some((t) => !t.busy);
  }

  show(item: ToastItem): void {
    const T = FEEL.toast;
    const t = this.pool.find((q) => !q.busy);
    if (!t) return;
    this.busyWait = 0;
    this.sinceLast = 0;
    t.busy = true;
    t.leaving = false;
    const gen = ++t.gen;
    t.slot = this.shown.length - 1;
    t.avatar.setTexture(item.avatar).setDisplaySize(SOCKET.r * 2, SOCKET.r * 2);
    t.ring.setTint(item.accent);
    t.name.setText(item.name).setColor(`#${item.accent.toString(16).padStart(6, '0')}`);
    t.text.setText(item.text);
    for (const txt of [t.name, t.text]) txt.setScale(txt.width > TEXT_W ? TEXT_W / txt.width : 1);

    const s = T.scale;
    const x = T.rightX - 240 * s;
    const y = T.slotsY[t.slot] + this.topInset();
    this.scene.tweens.killTweensOf([t.c, t.shine, t.avatar]);
    t.c.setVisible(true).setPosition(DESIGN_W + 260 * s, y).setAlpha(1);
    t.shine.setX(-230).setAlpha(0);
    t.pendingShown = () => {
      t.pendingShown = null;
      item.onShown?.(x + SOCKET.x * s, t.c.y + SOCKET.y * s);
    };
    this.scene.tweens.add({ targets: t.c, x, duration: T.inMs, ease: 'Back.easeOut', onComplete: () => t.pendingShown?.() });
    // The avatar pops a beat after the frame arrives, then light sweeps across.
    this.scene.tweens.add({ targets: t.avatar, scale: { from: t.avatar.scale * 0.4, to: t.avatar.scale }, duration: 360, delay: T.inMs * 0.5, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: t.shine, x: 200, alpha: { from: 0.55, to: 0 }, duration: 620, delay: T.inMs * 0.6, ease: 'Sine.easeInOut' });
    this.scene.time.delayedCall(T.inMs + T.holdMs, () => {
      if (t.gen === gen) this.leave(t);
    });
  }

  /** Slides every toast out (a big moment is starting). */
  dismissAll(): void {
    for (const t of this.pool) if (t.busy && !t.leaving) this.leave(t, true);
  }

  /** Re-places the stack (safe-area change). */
  relayout(): void {
    for (const t of this.shown) t.c.setY(FEEL.toast.slotsY[t.slot] + this.topInset());
  }

  private leave(t: Toast, fast = false): void {
    if (!t.busy || t.leaving) return;
    const T = FEEL.toast;
    t.leaving = true;
    // Its effect (spark to the bar / chain) still has to happen.
    t.pendingShown?.();
    this.scene.tweens.killTweensOf(t.c);
    this.scene.tweens.add({
      targets: t.c, x: DESIGN_W + 260 * T.scale, alpha: 0.6, duration: fast ? T.outMs * 0.6 : T.outMs, ease: 'Cubic.easeIn',
      onComplete: () => {
        t.busy = t.leaving = false;
        t.c.setVisible(false);
      },
    });
    // Everyone below moves up a slot.
    for (const o of this.shown) {
      if (o.slot > t.slot) {
        o.slot--;
        this.scene.tweens.add({ targets: o.c, y: T.slotsY[o.slot] + this.topInset(), duration: 300, ease: 'Cubic.easeOut' });
      }
    }
  }
}

