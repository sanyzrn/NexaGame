import Phaser from 'phaser';
import { Art } from '../assets/Art';
import { BALANCE } from '../config/balance';
import { worldDepth } from '../config/display';
import { PROPS } from '../data/entities';
import { Shadow } from '../render/Shadow';
import type { ArrowHit, HitOutcome, Target } from '../systems/ProjectileSystem';

export type PotLoot = 'coins' | 'heart' | 'triple';

let nextPotId = 700001;

/**
 * A kettle-pot standing on the arena floor. One arrow breaks it — and the arrow flies on
 * ('pass'), so a pot never shields an enemy. What spills out was rolled when the run started.
 */
export class Pot implements Target {
  readonly id = nextPotId++;
  readonly x: number;
  readonly y: number;
  loot: PotLoot = 'coins';
  private broken = false;
  private readonly img: Phaser.GameObjects.Image;
  private readonly shadow: Shadow;

  constructor(scene: Phaser.Scene, def: { x: number; y: number; scale: number; flip?: boolean }, private readonly onBreak: (pot: Pot, x: number, y: number) => void) {
    this.x = def.x;
    this.y = def.y;
    this.img = Art.image(scene, def.x, def.y, 'pot').setScale(def.scale).setDepth(worldDepth(def.y));
    if (def.flip) this.img.setFlipX(!this.img.flipX);
    this.shadow = new Shadow(scene, PROPS.pot.shadow, def.scale).place(def.x, def.y);
  }

  get hittable(): boolean {
    return !this.broken;
  }
  get hitX(): number {
    return this.x;
  }
  get hitY(): number {
    return this.y - 40;
  }
  get hitR(): number {
    return 42;
  }
  get color(): number {
    return 0xd8a86a;
  }

  receiveArrow(_hit: ArrowHit): HitOutcome {
    if (this.broken) return 'pass';
    this.broken = true;
    this.img.setVisible(false);
    this.shadow.setVisible(false);
    void BALANCE.pots.hp; // tuning hook: pots could take more than one hit later
    this.onBreak(this, this.x, this.y - 30);
    return 'pass';
  }
}
