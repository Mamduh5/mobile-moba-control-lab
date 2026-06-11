import type { Vec2 } from "../types/controlTypes";

export class AimIndicators {
  private readonly scene: Phaser.Scene;
  private readonly line: Phaser.GameObjects.Line;
  private readonly rangeCircle: Phaser.GameObjects.Arc;

  public constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.line = scene.add.line(0, 0, 0, 0, 0, 0, 0xfbbf24, 0.9)
      .setOrigin(0, 0)
      .setLineWidth(5)
      .setVisible(false)
      .setDepth(500);

    this.rangeCircle = scene.add.circle(0, 0, 0, 0xfbbf24, 0.08)
      .setStrokeStyle(2, 0xfbbf24, 0.45)
      .setVisible(false)
      .setDepth(499);
  }

  public showLine(origin: Vec2, direction: Vec2, range: number): void {
    this.line
      .setTo(origin.x, origin.y, origin.x + direction.x * range, origin.y + direction.y * range)
      .setVisible(true);

    this.rangeCircle
      .setPosition(origin.x, origin.y)
      .setRadius(range)
      .setVisible(true);
  }

  public hide(): void {
    this.line.setVisible(false);
    this.rangeCircle.setVisible(false);
  }
}
