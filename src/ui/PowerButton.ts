import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { FONT_FAMILY } from '../config/display';
import { FEEL } from '../config/feel';
import { SCHOOLS, type School } from '../config/team';
import { services } from '../services';
import { schoolEmblemTex } from './kit';

/**
 * The power orb (bottom left): the player's school emblem inside a ring that fills with the power
 * meter. Dim while filling; when full it glows in the power's colour, rays turn behind it, it breathes,
 * and «آماده!» shows. A deliberate TAP fires it (quick, and without sliding): a touch that turns into
 * a drag, or a long hold, does nothing, so it never fights the aim gesture. It sits inside the HUD, so
 * touches on it never start an aim either.
 */
export class PowerButton {
  readonly root: Phaser.GameObjects.Container;
  private readonly emblem: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly rays: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private shown = 0;
  private value = 0;
  private ready = false;
  private t = 0;
  private downAt = -1;
  private downX = 0;
  private downY = 0;
  private color = 0xffffff;

  constructor(private readonly scene: Phaser.Scene, depth: number, private school: School, private readonly onFire: () => void) {
    const B = FEEL.powers.button;
    this.glow = scene.add.image(0, 0, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setScale(4).setAlpha(0);
    this.rays = scene.add.image(0, 0, 'fx_star').setBlendMode(Phaser.BlendModes.ADD).setScale(3).setAlpha(0);
    this.ring = scene.add.graphics();
    this.emblem = scene.add.image(0, 0, schoolEmblemTex(scene, school)).setDisplaySize(B.r * 1.7, B.r * 1.7);
    this.label = scene.add.text(0, B.r + 22, 'آماده!', {
      fontFamily: FONT_FAMILY, fontSize: '28px', fontStyle: '900', color: '#fff4d0', rtl: true, stroke: '#2a1204', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);
    // Explains itself when tapped early; anchored at the orb's left edge so it stays on screen.
    this.hint = scene.add.text(-B.r + 4, -B.r - 34, '', {
      fontFamily: FONT_FAMILY, fontSize: '26px', fontStyle: '900', color: '#fff4d0', rtl: true, stroke: '#2a1204', strokeThickness: 6,
    }).setOrigin(0, 0.5).setAlpha(0);
    this.root = scene.add.container(B.x, B.y, [this.glow, this.rays, this.ring, this.emblem, this.label, this.hint]).setDepth(depth).setSize(B.r * 2, B.r * 2);
    // Container hit shapes are measured from its top-left corner (size 2r): the centre is (r, r).
    this.root.setInteractive(new Phaser.Geom.Circle(B.r, B.r, B.r + 10), Phaser.Geom.Circle.Contains);
    this.root.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      this.downAt = this.scene.time.now;
      this.downX = p.x;
      this.downY = p.y;
      if (this.ready) this.scene.tweens.add({ targets: this.emblem, scale: this.emblem.scale * 0.92, duration: 80, yoyo: true });
    });
    this.root.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (p: Phaser.Input.Pointer) => this.tryFire(p));
    this.setSchool(school);
  }

  setSchool(school: School): void {
    if (school === this.school && this.emblem.texture.key === schoolEmblemTex(this.scene, school)) return;
    this.school = school;
    const P = FEEL.powers[school];
    this.color = (P.palettes[FEEL.powers.skin] ?? P.palettes.default)[0];
    const B = FEEL.powers.button;
    this.emblem.setTexture(schoolEmblemTex(this.scene, school)).setDisplaySize(B.r * 1.7, B.r * 1.7);
    this.glow.setTint(this.color);
    this.rays.setTint(this.color);
  }

  /** The meter, 0..1 (the ring eases toward it). */
  setValue(v: number): void {
    this.value = v;
  }

  update(ms: number): void {
    const B = FEEL.powers.button;
    this.t += ms;
    this.shown += (this.value - this.shown) * Math.min(1, ms / 180);
    const ready = this.value >= 1;
    if (ready && !this.ready) this.becameReady();
    this.ready = ready;
    const g = this.ring.clear();
    g.fillStyle(0x0a0e22, 0.75).fillCircle(0, 0, B.r + 6);
    g.lineStyle(10, 0x000000, 0.35).strokeCircle(0, 0, B.r + 2);
    if (this.shown > 0.005) {
      g.lineStyle(10, ready ? 0xffe9a0 : this.color, 1);
      g.beginPath().arc(0, 0, B.r + 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, this.shown), false).strokePath();
    }
    const base = (B.r * 1.7) / this.emblem.width;
    if (ready) {
      const p = 0.5 + 0.5 * Math.sin(this.t / 180);
      this.emblem.clearTint().setAlpha(1);
      if (!this.scene.tweens.isTweening(this.emblem)) this.emblem.setScale(base * (1 + 0.05 * p));
      this.glow.setAlpha(0.45 + 0.3 * p);
      this.rays.setAlpha(0.35 + 0.25 * p).setRotation(this.t / 1200);
      this.label.setAlpha(0.75 + 0.25 * p);
    } else {
      this.emblem.setTint(0x9a9aa8).setAlpha(0.75);
      this.glow.setAlpha(0.12 * this.shown);
      this.rays.setAlpha(0);
      this.label.setAlpha(0);
    }
  }

  /** Where sparks fly to when the meter gains. */
  get x(): number {
    return this.root.x;
  }
  get y(): number {
    return this.root.y;
  }

  /** Keyboard / debug: fire if ready. */
  fire(): void {
    if (this.ready) this.onFire();
  }

  private tryFire(p: Phaser.Input.Pointer): void {
    const P = BALANCE.power;
    const held = this.scene.time.now - this.downAt;
    const moved = Math.hypot(p.x - this.downX, p.y - this.downY);
    const wasDown = this.downAt >= 0;
    this.downAt = -1;
    if (!wasDown || held > P.tapMaxMs || moved > P.tapMaxMovePx) return;
    if (!this.ready) {
      // Not yet: a small shake and the school's name, so the orb explains itself.
      this.scene.tweens.add({ targets: this.root, angle: { from: -8, to: 0 }, duration: 320, ease: 'Elastic.easeOut' });
      services.audio.play('ui');
      this.flashHint(`قدرت ${SCHOOLS[this.school].name}: با ضربه‌های طلایی پر می‌شود`);
      return;
    }
    this.onFire();
  }

  private flashHint(text: string): void {
    const h = this.hint;
    this.scene.tweens.killTweensOf(h);
    h.setText(text).setAlpha(1);
    this.scene.tweens.add({ targets: h, alpha: 0, duration: 400, delay: 1600 });
  }

  private becameReady(): void {
    services.audio.play('featherChime');
    services.haptics.play('medium');
    this.scene.tweens.add({ targets: this.root, scale: { from: 1.3, to: 1 }, duration: 420, ease: 'Back.easeOut' });
  }
}
