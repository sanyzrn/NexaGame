import Phaser from 'phaser';
import { FONT_FAMILY } from '../config/display';
import { services } from '../services';
import { buttonTex, toggleTex, type ButtonVariant } from './kit';

const LABEL_COLOR: Record<ButtonVariant, { fill: string; stroke: string }> = {
  gold: { fill: '#3a1c04', stroke: '#ffe9a8' },
  lapis: { fill: '#f6e7c8', stroke: '#0c1230' },
  red: { fill: '#fff1e0', stroke: '#4a0806' },
};

/** Bevelled pill button (code-drawn art, Persian label, RTL) that sinks when pressed. */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly up: string;
  private readonly down: string;
  private held = false;

  constructor(
    scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string, onClick: () => void,
    variant: ButtonVariant = 'gold',
  ) {
    super(scene, x, y);
    this.up = buttonTex(scene, w, h, variant);
    this.down = buttonTex(scene, w, h, variant, true);
    this.bg = scene.add.image(0, 0, this.up);
    const c = LABEL_COLOR[variant];
    this.label = scene.add.text(0, -4, text, {
      fontFamily: FONT_FAMILY, fontSize: `${Math.round(h * 0.4)}px`, fontStyle: '900', color: c.fill, rtl: true,
      stroke: c.stroke, strokeThickness: 3,
    }).setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setSize(w, h).setInteractive({ useHandCursor: true });

    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.press(true));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.press(false));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      if (!this.held) return;
      this.press(false);
      services.audio.unlock();
      services.audio.play('ui');
      services.haptics.play('tick');
      scene.tweens.add({ targets: this, scale: { from: 1.06, to: 1 }, duration: 180, ease: 'Back.easeOut' });
      onClick();
    });
    scene.add.existing(this);
  }

  setLabel(text: string): this {
    this.label.setText(text);
    return this;
  }

  private press(down: boolean): void {
    this.held = down;
    this.bg.setTexture(down ? this.down : this.up);
    this.label.setY(down ? 0 : -4);
    this.setScale(down ? 0.97 : 1);
  }
}

/** Settings row: label on the right (RTL), animated gold-knob switch on the left. */
export class Toggle extends Phaser.GameObjects.Container {
  private readonly track: Phaser.GameObjects.Image;
  private readonly knob: Phaser.GameObjects.Image;
  private readonly tex: { on: string; off: string; knob: string };

  constructor(
    scene: Phaser.Scene, x: number, y: number, w: number, text: string, private value: boolean,
    onChange: (on: boolean) => void, hint = '',
  ) {
    super(scene, x, y);
    this.tex = toggleTex(scene);
    const label = scene.add.text(w / 2, hint ? -14 : 0, text, {
      fontFamily: FONT_FAMILY, fontSize: '44px', fontStyle: '900', color: '#f6e7c8', rtl: true,
    }).setOrigin(1, 0.5);
    const parts: Phaser.GameObjects.GameObject[] = [label];
    if (hint) {
      parts.push(scene.add.text(w / 2, 28, hint, {
        fontFamily: FONT_FAMILY, fontSize: '26px', color: '#b9c3e6', rtl: true,
      }).setOrigin(1, 0.5));
    }
    this.track = scene.add.image(-w / 2 + 66, 0, value ? this.tex.on : this.tex.off);
    this.knob = scene.add.image(this.knobX(value), 0, this.tex.knob);
    parts.push(this.track, this.knob);
    this.add(parts);
    this.setSize(w, 96).setInteractive({ useHandCursor: true });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      services.audio.unlock();
      services.audio.play('ui');
      services.haptics.play('tick');
      this.set(!this.value);
      onChange(this.value);
    });
    scene.add.existing(this);
  }

  set(on: boolean): void {
    this.value = on;
    this.track.setTexture(on ? this.tex.on : this.tex.off);
    this.scene.tweens.add({ targets: this.knob, x: this.knobX(on), duration: 160, ease: 'Back.easeOut' });
  }

  /** RTL: "on" puts the knob on the left end. */
  private knobX(on: boolean): number {
    const cx = this.track.x;
    return on ? cx - 34 : cx + 34;
  }
}
