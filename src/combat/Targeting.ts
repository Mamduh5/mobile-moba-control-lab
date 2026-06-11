import Phaser from "phaser";
import type { Vec2 } from "../types/controlTypes";

export function findNearestTarget<T extends { x: number; y: number; active: boolean }>(
  origin: Vec2,
  targets: T[],
  maxRange: number
): T | null {
  let best: T | null = null;
  let bestDistance = maxRange;

  for (const target of targets) {
    if (!target.active) {
      continue;
    }

    const distance = Phaser.Math.Distance.Between(origin.x, origin.y, target.x, target.y);
    if (distance <= bestDistance) {
      best = target;
      bestDistance = distance;
    }
  }

  return best;
}
