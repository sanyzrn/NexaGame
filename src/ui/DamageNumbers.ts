import Phaser from 'phaser';
import { DEPTH, FONT_FAMILY } from '../config/display';
import { FEEL } from '../config/feel';
import { faNum } from '../utils/fa';

interface Num {
  text: Phaser.GameObjects.Text;
  age: number;
  x: number;
  y: number;
  drift: number;
  crit: boolean;
}

const POOL = 24;

/** Pop-in scale for t in 0..1: grows fast to `peak` (at 60%), then settles to 1. */
function popScale(t: number, peak: number): number {
  if (t < 0.6) {
    const u = 1 - t / 0.6;
    return peak * (1 - u * u);
  }
  const u = (t - 0.6) / 0.4;
  return peak + (1 - peak) * u * u * (3 - 2 * u);
}

/**
 * Floating damage numbers, pooled and animated on world time (they freeze during hit-stop).
 * They pop in with a scale overshoot, float up and fade; crits are bigger, gold, with "!".
 */
export class DamageNumbers {
  private readonly pool: Num[] = [];
  private next = 0;

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < POOL; i++) {
      const text = scene.add.text(0, 0, '', {
        fontFamily: FONT_FAMILY, fontSize: `${FEEL.numbers.size}px`, fontStyle: '900', color: '#ffffff',
        stroke: '#2a1206', strokeThickness: 12,
      }).setOrigin(0.5).setDepth(DEPTH.numbers).setVisible(false);
      this.pool.push({ text, age: -1, x: 0, y: 0, drift: 0, crit: false });
    }
  }

  spawn(x: number, y: number, amount: number, crit: boolean): void {
    const N = FEEL.numbers;
    const n = this.pool[this.next];
    this.next = (this.next + 1) % POOL;
    n.age = 0;
    n.x = x + Phaser.Math.Between(-18, 18);
    n.y = y;
    n.drift = Phaser.Math.FloatBetween(-N.driftPx, N.driftPx);
    n.crit = crit;
    n.text
      .setText(crit ? `${faNum(amount)}!` : faNum(amount))
      .setFontSize(crit ? N.critSize : N.size)
      .setColor(crit ? '#ffd54a' : '#ffffff')
      .setStroke(crit ? '#5a1a00' : '#2a1206', crit ? 14 : 12)
      .setDepth(DEPTH.numbers + (crit ? 1 : 0))
      .setPosition(n.x, n.y)
      .setScale(0)
      .setVisible(true)
      .setAlpha(1);
  }

  update(dt: number): void {
    const N = FEEL.numbers;
    for (const n of this.pool) {
      if (n.age < 0) continue;
      n.age += dt;
      const t = n.age / N.lifeMs;
      if (t >= 1) {
        n.age = -1;
        n.text.setVisible(false);
        continue;
      }
      const rise = 1 - (1 - t) * (1 - t) * (1 - t);
      const pop = n.age < N.popMs ? popScale(n.age / N.popMs, n.crit ? N.overshoot * 1.2 : N.overshoot) : 1;
      n.text
        .setPosition(n.x + n.drift * rise, n.y - N.risePx * rise)
        .setScale(pop)
        .setAlpha(t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35);
    }
  }
}
