import Phaser from "phaser";
import type { SkillAimKind, SkillId, Vec2 } from "../types/controlTypes";

export type SkillButtonConfig = {
  id: SkillId;
  x: number;
  y: number;
  radius: number;
  label: string;
  aimKind: SkillAimKind;
};

export type SkillAimState = {
  id: SkillId;
  aimKind: SkillAimKind;
  direction: Vec2;
  distance: number;
  screenX: number;
  screenY: number;
};

export class SkillButton {
  private readonly scene: Phaser.Scene;
  private readonly config: SkillButtonConfig;
  private readonly button: Phaser.GameObjects.Arc;
  private readonly label: Phaser.GameObjects.Text;
  private readonly cooldownMask: Phaser.GameObjects.Arc;

  private activePointerId: number | null = null;
  private cooldownUntil = 0;

  public onAimStart?: (state: SkillAimState) => void;
  public onAimMove?: (state: SkillAimState) => void;
  public onCast?: (state: SkillAimState) => void;
  public onCancel?: () => void;

  public constructor(scene: Phaser.Scene, config: SkillButtonConfig) {
    this.scene = scene;
    this.config = config;

    this.button = scene.add.circle(config.x, config.y, config.radius, 0x1f2937, 0.92)
      .setStrokeStyle(2, 0xfbbf24, 0.95)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true });

    this.cooldownMask = scene.add.circle(config.x, config.y, config.radius - 3, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(1001);

    this.label = scene.add.text(config.x, config.y, config.label, {
      color: "#f9fafb",
      fontSize: "12px",
      fontFamily: "Arial",
      fontStyle: "700"
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1002);

    this.button.on("pointerdown", this.handlePointerDown, this);
    scene.input.on("pointermove", this.handlePointerMove, this);
    scene.input.on("pointerup", this.handlePointerUp, this);
    scene.input.on("pointerupoutside", this.handlePointerUp, this);
  }

  public isReady(now: number): boolean {
    return now >= this.cooldownUntil;
  }

  public startCooldown(durationMs: number): void {
    this.cooldownUntil = this.scene.time.now + durationMs;
  }

  public update(now: number): void {
    const remaining = Math.max(0, this.cooldownUntil - now);
    this.cooldownMask.setAlpha(remaining > 0 ? 0.55 : 0);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.activePointerId !== null) {
      return;
    }

    if (!this.isReady(this.scene.time.now)) {
      return;
    }

    this.activePointerId = pointer.id;
    this.onAimStart?.(this.buildAimState(pointer));
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) {
      return;
    }

    this.onAimMove?.(this.buildAimState(pointer));
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) {
      return;
    }

    this.activePointerId = null;
    this.onCast?.(this.buildAimState(pointer));
  }

  private buildAimState(pointer: Phaser.Input.Pointer): SkillAimState {
    const dx = pointer.x - this.config.x;
    const dy = pointer.y - this.config.y;
    const rawDistance = Math.hypot(dx, dy);
    const angle = rawDistance <= 0.001 ? -Math.PI / 2 : Math.atan2(dy, dx);

    return {
      id: this.config.id,
      aimKind: this.config.aimKind,
      direction: {
        x: Math.cos(angle),
        y: Math.sin(angle)
      },
      distance: rawDistance,
      screenX: pointer.x,
      screenY: pointer.y
    };
  }
}
