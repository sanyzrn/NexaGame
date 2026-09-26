import Phaser from 'phaser';
import { DEPTH } from '../config/display';
import { FEEL } from '../config/feel';
import type { PotLoot } from '../entities/Pot';
import { easeInCubic, easeOutCubic } from '../utils/ease';
import type { Point } from './ProjectileSystem';
import type { FX } from './FX';

export interface PickupHost {
  onCoins(x: number, y: number): void;
  onHeart(x: number, y: number): void;
  onTriple(x: number, y: number): void;
}

interface Pickup {
  loot: PotLoot;
  img: Phaser.GameObjects.Image;
  active: boolean;
  t: number;
  x: number;
  y: number;
  x0: number;
  y0: number;
}

const POOL = 6;

/**
 * What spills out of a broken pot (or an elite's fall): a little bundle that leaps up out of the
 * shards, then homes to the hero's bow and lands in the player's hands. Coins land immediately
 * where they burst; hearts and سه‌تیر bundles fly to the hero.
 */
export class Pickups {
  private readonly items: Pickup[] = [];

  constructor(scene: Phaser.Scene, private readonly fx: FX, private readonly heroPos: () => Point, private readonly host: PickupHost) {
    for (let i = 0; i < POOL; i++) {
      const img = scene.add.image(0, 0, 'ui_heart_full').setVisible(false).setDepth(DEPTH.numbers - 1);
      this.items.push({ loot: 'coins', img, active: false, t: 0, x: 0, y: 0, x0: 0, y0: 0 });
    }
  }

  drop(loot: PotLoot, x: number, y: number): void {
    if (loot === 'coins') {
      this.host.onCoins(x, y);
      return;
    }
    const p = this.items.find((q) => !q.active);
    if (!p) {
      // Pool full: land the effect immediately.
      if (loot === 'heart') this.host.onHeart(x, y);
      else this.host.onTriple(x, y);
      return;
    }
    p.loot = loot;
    p.active = true;
    p.t = 0;
    p.x0 = p.x = x;
    p.y0 = p.y = y;
    if (loot === 'heart') {
      p.img.setTexture('ui_heart_full').clearTint().setScale(FEEL.pots.pickupScale * 1.1);
    } else {
      p.img.setTexture('arrow').setTint(0xffd24a).setScale(FEEL.pots.pickupScale * 0.5).setRotation(-Math.PI / 2);
    }
    p.img.setVisible(true).setPosition(x, y);
    this.fx.goldenBurst(x, y);
  }

  update(dt: number): void {
    const P = FEEL.pots;
    const hero = this.heroPos();
    for (const p of this.items) {
      if (!p.active) continue;
      p.t += dt;
      if (p.t < P.dropUpMs) {
        // Leap up out of the shards.
        const k = easeOutCubic(p.t / P.dropUpMs);
        p.x = p.x0 + Math.sin(k * Math.PI) * 30;
        p.y = p.y0 - P.dropUpPx * k;
      } else {
        // Home to the hero's bow.
        const k = Math.min(1, (p.t - P.dropUpMs) / P.dropHomeMs);
        const e = easeInCubic(k);
        const bx = p.x0 + Math.sin(Math.PI) * 30; // continuity with the leap's end drift
        const by = p.y0 - P.dropUpPx;
        p.x = bx + (hero.x - bx) * e;
        p.y = by + (hero.y - by) * e;
        if (p.loot === 'triple') p.img.rotation += (dt / 1000) * 7;
        if (k >= 1) {
          p.active = false;
          p.img.setVisible(false);
          if (p.loot === 'heart') this.host.onHeart(hero.x, hero.y);
          else this.host.onTriple(hero.x, hero.y);
          this.fx.goldenBurst(hero.x, hero.y);
          continue;
        }
      }
      p.img.setPosition(p.x, p.y);
    }
  }
}
