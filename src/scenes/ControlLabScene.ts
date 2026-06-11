import Phaser from "phaser";
import { findNearestTarget } from "../combat/Targeting";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../game/screen";
import { SkillButton, type SkillAimState } from "../input/SkillButton";
import { VirtualJoystick } from "../input/VirtualJoystick";
import { AimIndicators } from "../ui/AimIndicators";
import type { Vec2 } from "../types/controlTypes";

const HERO_MOVE_SPEED = 220;

const JOYSTICK_X = 118;
const JOYSTICK_Y = 420;
const JOYSTICK_RADIUS = 62;
const JOYSTICK_DEADZONE = 0.12;

const BASIC_ATTACK_X = 820;
const BASIC_ATTACK_Y = 408;
const BASIC_ATTACK_RADIUS = 44;
const BASIC_ATTACK_RANGE = 118;
const BASIC_ATTACK_COOLDOWN_MS = 650;
const BASIC_ATTACK_DAMAGE = 12;

const SKILL_1_X = 744;
const SKILL_1_Y = 424;
const SKILL_1_RADIUS = 36;
const SKILL_1_RANGE = 260;
const SKILL_1_COOLDOWN_MS = 3200;
const SKILL_1_PROJECTILE_SPEED = 520;
const SKILL_1_DAMAGE = 25;

const SKILL_2_X = 796;
const SKILL_2_Y = 342;
const SKILL_2_RADIUS = 36;

const SKILL_3_X = 866;
const SKILL_3_Y = 304;
const SKILL_3_RADIUS = 36;

const ULTIMATE_X = 880;
const ULTIMATE_Y = 464;
const ULTIMATE_RADIUS = 38;

type Dummy = Phaser.GameObjects.Arc & {
  hp: number;
  hpBarBack: Phaser.GameObjects.Rectangle;
  hpBarFill: Phaser.GameObjects.Rectangle;
};

export class ControlLabScene extends Phaser.Scene {
  private hero!: Phaser.GameObjects.Arc;
  private joystick!: VirtualJoystick;
  private basicAttack!: SkillButton;
  private skill1!: SkillButton;
  private aimIndicators!: AimIndicators;
  private dummies: Dummy[] = [];
  private projectiles: Phaser.GameObjects.Arc[] = [];
  private currentAim: SkillAimState | null = null;

  public constructor() {
    super("ControlLabScene");
  }

  public create(): void {
    this.input.addPointer(2);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.drawArena();

    this.hero = this.add.circle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 18, 0x60a5fa, 1)
      .setStrokeStyle(3, 0xdbeafe, 1)
      .setDepth(10);

    this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);

    this.createDummies();

    this.joystick = new VirtualJoystick(this, {
      x: JOYSTICK_X,
      y: JOYSTICK_Y,
      radius: JOYSTICK_RADIUS,
      deadzone: JOYSTICK_DEADZONE
    });

    this.aimIndicators = new AimIndicators(this);

    this.basicAttack = new SkillButton(this, {
      id: "basic_attack",
      x: BASIC_ATTACK_X,
      y: BASIC_ATTACK_Y,
      radius: BASIC_ATTACK_RADIUS,
      label: "ATK",
      aimKind: "line"
    });
    this.basicAttack.onCast = () => this.useBasicAttack();

    this.skill1 = new SkillButton(this, {
      id: "skill_1",
      x: SKILL_1_X,
      y: SKILL_1_Y,
      radius: SKILL_1_RADIUS,
      label: "S1",
      aimKind: "line"
    });
    this.skill1.onAimStart = (aim) => this.updateSkillAim(aim);
    this.skill1.onAimMove = (aim) => this.updateSkillAim(aim);
    this.skill1.onCast = (aim) => this.castSkill1(aim);

    this.createReservedButton(SKILL_2_X, SKILL_2_Y, SKILL_2_RADIUS, "S2");
    this.createReservedButton(SKILL_3_X, SKILL_3_Y, SKILL_3_RADIUS, "S3");
    this.createReservedButton(ULTIMATE_X, ULTIMATE_Y, ULTIMATE_RADIUS, "ULT");

    this.add.text(16, 16, "Mobile MOBA Control Lab", {
      color: "#f9fafb",
      fontFamily: "Arial",
      fontSize: "18px",
      fontStyle: "700"
    }).setScrollFactor(0).setDepth(1000);

    this.add.text(16, 42, "Landscape prototype | Move + ATK/S1 can be held together", {
      color: "#d1d5db",
      fontFamily: "Arial",
      fontSize: "12px"
    }).setScrollFactor(0).setDepth(1000);
  }

  public update(_time: number, delta: number): void {
    this.updateHeroMovement(delta);
    this.updateProjectiles(delta);
    this.updateDummyHpBars();
    this.basicAttack.update(this.time.now);
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
      { x: WORLD_WIDTH / 2 + 92, y: WORLD_HEIGHT / 2 },
      { x: WORLD_WIDTH / 2 + 230, y: WORLD_HEIGHT / 2 + 86 },
      { x: WORLD_WIDTH / 2 - 145, y: WORLD_HEIGHT / 2 + 128 }
    ];

    this.dummies = positions.map((position) => {
      const dummy = this.add.circle(position.x, position.y, 22, 0xef4444, 1)
        .setStrokeStyle(3, 0xfecaca, 1)
        .setDepth(8) as Dummy;

      dummy.hp = 100;
      dummy.hpBarBack = this.add.rectangle(position.x, position.y - 35, 52, 7, 0x111827, 0.95)
        .setStrokeStyle(1, 0xf9fafb, 0.55)
        .setDepth(12);
      dummy.hpBarFill = this.add.rectangle(position.x - 25, position.y - 35, 50, 5, 0x22c55e, 1)
        .setOrigin(0, 0.5)
        .setDepth(13);

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
          this.damageDummy(dummy, SKILL_1_DAMAGE);
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

  private useBasicAttack(): void {
    this.basicAttack.startCooldown(BASIC_ATTACK_COOLDOWN_MS);
    this.showAttackRange();

    const origin = this.getHeroPosition();
    const target = findNearestTarget(origin, this.dummies, BASIC_ATTACK_RANGE);
    if (!target) {
      this.showFloatingText(origin.x, origin.y - 48, "No target", "#e5e7eb", 14);
      return;
    }

    this.showAttackSlash(origin, target);
    this.damageDummy(target, BASIC_ATTACK_DAMAGE);
  }

  private damageDummy(dummy: Dummy, amount: number): void {
    dummy.hp = Math.max(0, dummy.hp - amount);
    this.showFloatingText(dummy.x, dummy.y - 38, `-${amount}`, "#fde68a", 18);

    this.tweens.add({
      targets: dummy,
      scaleX: 1.18,
      scaleY: 1.18,
      yoyo: true,
      duration: 80
    });

    if (dummy.hp <= 0) {
      dummy.setActive(false);
      dummy.setFillStyle(0x6b7280, 0.45);
      dummy.setStrokeStyle(3, 0x9ca3af, 0.4);
      dummy.hpBarFill.setVisible(false);
    }
  }

  private updateDummyHpBars(): void {
    for (const dummy of this.dummies) {
      dummy.hpBarBack.setPosition(dummy.x, dummy.y - 35);
      dummy.hpBarFill.setPosition(dummy.x - 25, dummy.y - 35);
      dummy.hpBarFill.setDisplaySize(50 * Phaser.Math.Clamp(dummy.hp / 100, 0, 1), 5);
    }
  }

  private showAttackRange(): void {
    const origin = this.getHeroPosition();
    const range = this.add.circle(origin.x, origin.y, BASIC_ATTACK_RANGE, 0x93c5fd, 0.05)
      .setStrokeStyle(2, 0x93c5fd, 0.5)
      .setDepth(30);

    this.tweens.add({
      targets: range,
      alpha: 0,
      duration: 260,
      onComplete: () => range.destroy()
    });
  }

  private showAttackSlash(origin: Vec2, target: Vec2): void {
    const line = this.add.line(0, 0, origin.x, origin.y, target.x, target.y, 0xf9fafb, 0.9)
      .setOrigin(0, 0)
      .setLineWidth(4)
      .setDepth(40);

    this.tweens.add({
      targets: line,
      alpha: 0,
      duration: 160,
      onComplete: () => line.destroy()
    });
  }

  private showFloatingText(x: number, y: number, content: string, color: string, fontSize: number): void {
    const text = this.add.text(x, y, content, {
      color,
      fontFamily: "Arial",
      fontSize: `${fontSize}px`,
      fontStyle: "700"
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: text,
      y: text.y - 28,
      alpha: 0,
      duration: 520,
      onComplete: () => text.destroy()
    });
  }

  private createReservedButton(x: number, y: number, radius: number, label: string): void {
    this.add.circle(x, y, radius, 0x111827, 0.78)
      .setStrokeStyle(2, 0x64748b, 0.8)
      .setScrollFactor(0)
      .setDepth(999);

    this.add.text(x, y, label, {
      color: "#94a3b8",
      fontFamily: "Arial",
      fontSize: "11px",
      fontStyle: "700"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
  }

  private getHeroPosition(): Vec2 {
    return {
      x: this.hero.x,
      y: this.hero.y
    };
  }
}
