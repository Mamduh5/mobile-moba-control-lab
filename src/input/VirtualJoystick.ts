import Phaser from "phaser";
import type { Vec2 } from "../types/controlTypes";

export type VirtualJoystickConfig = {
  x: number;
  y: number;
  radius: number;
  deadzone: number;
};

export class VirtualJoystick {
  private readonly scene: Phaser.Scene;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly thumb: Phaser.GameObjects.Arc;
  private readonly config: VirtualJoystickConfig;

  private activePointerId: number | null = null;
  private direction: Vec2 = { x: 0, y: 0 };
  private strength = 0;

  public constructor(scene: Phaser.Scene, config: VirtualJoystickConfig) {
    this.scene = scene;
    this.config = config;

    this.base = scene.add.circle(config.x, config.y, config.radius, 0x374151, 0.48)
      .setScrollFactor(0)
      .setDepth(1000);

    this.thumb = scene.add.circle(config.x, config.y, config.radius * 0.42, 0x93c5fd, 0.82)
      .setScrollFactor(0)
      .setDepth(1001);

    scene.input.on("pointerdown", this.handlePointerDown, this);
    scene.input.on("pointermove", this.handlePointerMove, this);
    scene.input.on("pointerup", this.handlePointerUp, this);
    scene.input.on("pointerupoutside", this.handlePointerUp, this);
  }

  public getDirection(): Vec2 {
    return this.direction;
  }

  public getStrength(): number {
    return this.strength;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.activePointerId !== null) {
      return;
    }

    const distance = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.config.x, this.config.y);
    if (distance > this.config.radius * 1.45) {
      return;
    }

    this.activePointerId = pointer.id;
    this.updateFromPointer(pointer);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) {
      return;
    }

    this.updateFromPointer(pointer);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) {
      return;
    }

    this.activePointerId = null;
    this.direction = { x: 0, y: 0 };
    this.strength = 0;
    this.thumb.setPosition(this.config.x, this.config.y);
  }

  private updateFromPointer(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.config.x;
    const dy = pointer.y - this.config.y;
    const distance = Math.min(Math.hypot(dx, dy), this.config.radius);
    const normalizedDistance = distance / this.config.radius;

    if (normalizedDistance < this.config.deadzone) {
      this.direction = { x: 0, y: 0 };
      this.strength = 0;
      this.thumb.setPosition(this.config.x, this.config.y);
      return;
    }

    const angle = Math.atan2(dy, dx);
    this.direction = { x: Math.cos(angle), y: Math.sin(angle) };
    this.strength = normalizedDistance;

    this.thumb.setPosition(
      this.config.x + Math.cos(angle) * distance,
      this.config.y + Math.sin(angle) * distance
    );
  }
}
