import Phaser from "phaser";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../game/screen";
import { VirtualJoystick } from "../input/VirtualJoystick";
import { SkillButton, type SkillAimState } from "../input/SkillButton";
import { AimIndicators } from "../ui/AimIndicators";
import type { Vec2 } from "../types/controlTypes";

const HERO_MOVE_SPEED = 220;
const JOYSTICK_RADIUS = 56;
const JOYSTICK_DEADZONE = 0.12;

const SKILL_1_RANGE = 260;
const SKILL_1_COOLDOWN_MS = 3200;
const SKILL_1_PROJECTILE_SPEED = 520;

type Dummy = Phaser.GameObjects.Arc & {
  hp: number;
};

export class ControlLabScene extends Phaser.Scene {
  private hero!: Phaser.GameObjects.Arc;
  private joystick!: VirtualJoystick;
  private skill1!: SkillButton;
  private aimIndicators!: AimIndicators;
  private dummies: Dummy[] = [];
  private projectiles: Phaser.GameObjects.Arc[] = [];
  private currentAim: SkillAimState | null = null;

  public constructor() {
    super("ControlLabScene");
  }

  public create(): void {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawArena();

    this.hero = this.add.circle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 18, 0x60a5fa, 1)
      .setStrokeStyle(3, 0xdbeafe, 1)
      .setDepth(10);

    this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);

    this.createDummies();

    this.joystick = new VirtualJoystick(this, {
      x: 88,
      y: 704,
      radius: JOYSTICK_RADIUS,
      deadzone: JOYSTICK_DEADZONE
    });

    this.aimIndicators = new AimIndicators(this);

    this.skill1 = new SkillButton(this, {
      id: "skill_1",
      x: 324,
      y: 664,
      radius: 38,
      label: "S1",
      aimKind: "line"
    });

    this.skill1.onAimStart = (aim) => this.updateSkillAim(aim);
    this.skill1.onAimMove = (aim) => this.updateSkillAim(aim);
    this.skill1.onCast = (aim) => this.castSkill1(aim);

    this.add.text(16, 16, "Mobile MOBA Control Lab", {
      color: "#f9fafb",
      fontFamily: "Arial",
      fontSize: "18px",
      fontStyle: "700"
    }).setScrollFactor(0).setDepth(1000);

    this.add.text(16, 42, "Left thumb: move | Hold S1: aim | Release: cast", {
      color: "#d1d5db",
      fontFamily: "Arial",
      fontSize: "12px"
    }).setScrollFactor(0).setDepth(1000);
  }

  public update(_time: number, delta: number): void {
    this.updateHeroMovement(delta);
    this.updateProjectiles(delta);
    this.skill1.update(this.time.now);

    if (this.currentAim) {
      this.aimIndicators.showLine(this.getHeroPosition(), this.currentAim.direction, SKILL_1_RANGE);
    }
  }

  private drawArena(): void {
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x111827, 1);

    for (let x = 0; x <= WORLD_WIDTH; x += 80) {
      this.add.line(0, 0, x, 0, x, WORLD_HEIGHT, 0x1f2937, 0.7).setOrigin(0, 0);
    }

    for (let y = 0; y <= WORLD_HEIGHT; y += 80) {
      this.add.line(0, 0, 0, y, WORLD_WIDTH, y, 0x1f2937, 0.7).setOrigin(0, 0);
    }
  }

  private createDummies(): void {
    const positions = [
      { x: 650, y: 560 },
      { x: 760, y: 640 },
      { x: 700, y: 760 }
    ];

    this.dummies = positions.map((position) => {
      const dummy = this.add.circle(position.x, position.y, 22, 0xef4444, 1)
        .setStrokeStyle(3, 0xfecaca, 1)
        .setDepth(8) as Dummy;

      dummy.hp = 100;
      return dummy;
    });
  }

  private updateHeroMovement(delta: number): void {
    const direction = this.joystick.getDirection();
    const strength = this.joystick.getStrength();
    const dt = delta / 1000;

    this.hero.x = Phaser.Math.Clamp(
      this.hero.x + direction.x * HERO_MOVE_SPEED * strength * dt,
      24,
      WORLD_WIDTH - 24
    );

    this.hero.y = Phaser.Math.Clamp(
      this.hero.y + direction.y * HERO_MOVE_SPEED * strength * dt,
      24,
      WORLD_HEIGHT - 24
    );
  }

  private updateSkillAim(aim: SkillAimState): void {
    this.currentAim = aim;
    this.aimIndicators.showLine(this.getHeroPosition(), aim.direction, SKILL_1_RANGE);
  }

  private castSkill1(aim: SkillAimState): void {
    this.currentAim = null;
    this.aimIndicators.hide();
    this.skill1.startCooldown(SKILL_1_COOLDOWN_MS);

    const origin = this.getHeroPosition();
    const projectile = this.add.circle(origin.x, origin.y, 8, 0xfbbf24, 1)
      .setDepth(20);

    projectile.setData("velocity", {
      x: aim.direction.x * SKILL_1_PROJECTILE_SPEED,
      y: aim.direction.y * SKILL_1_PROJECTILE_SPEED
    } satisfies Vec2);

    projectile.setData("distanceLeft", SKILL_1_RANGE);
    this.projectiles.push(projectile);
  }

  private updateProjectiles(delta: number): void {
    const dt = delta / 1000;

    this.projectiles = this.projectiles.filter((projectile) => {
      const velocity = projectile.getData("velocity") as Vec2;
      const distanceStep = Math.hypot(velocity.x, velocity.y) * dt;
      const distanceLeft = (projectile.getData("distanceLeft") as number) - distanceStep;

      projectile.x += velocity.x * dt;
      projectile.y += velocity.y * dt;
      projectile.setData("distanceLeft", distanceLeft);

      for (const dummy of this.dummies) {
        if (!dummy.active) {
          continue;
        }

        const hit = Phaser.Math.Distance.Between(projectile.x, projectile.y, dummy.x, dummy.y) <= 28;
        if (hit) {
          this.damageDummy(dummy, 25);
          projectile.destroy();
          return false;
        }
      }

      if (distanceLeft <= 0) {
        projectile.destroy();
        return false;
      }

      return true;
    });
  }

  private damageDummy(dummy: Dummy, amount: number): void {
    dummy.hp -= amount;

    const text = this.add.text(dummy.x, dummy.y - 38, `-${amount}`, {
      color: "#fde68a",
      fontFamily: "Arial",
      fontSize: "18px",
      fontStyle: "700"
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: text,
      y: text.y - 28,
      alpha: 0,
      duration: 520,
      onComplete: () => text.destroy()
    });

    this.tweens.add({
      targets: dummy,
      scaleX: 1.18,
      scaleY: 1.18,
      yoyo: true,
      duration: 80
    });

    if (dummy.hp <= 0) {
      dummy.setActive(false);
      dummy.setVisible(false);
    }
  }

  private getHeroPosition(): Vec2 {
    return {
      x: this.hero.x,
      y: this.hero.y
    };
  }
}
