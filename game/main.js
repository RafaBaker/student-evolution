import Phaser from "/node_modules/phaser/dist/phaser.esm.min.js";

const CANVAS_SIZE = 600;
const BORDER_THICKNESS = 24;
const ARENA_X = BORDER_THICKNESS;
const ARENA_Y = BORDER_THICKNESS;
const ARENA_SIZE = CANVAS_SIZE - BORDER_THICKNESS * 2;

const PLAYER_SPRITE_KEY = "player";
const PLAYER_SPRITESHEET_PATH = "./assets/player-spritesheet-4dir.png";
const PLAYER_FRAME_WIDTH = 96;
const PLAYER_FRAME_HEIGHT = 168;
const PLAYER_SCALE = 0.5;
const PLAYER_IDLE_FRAME = 0;

const STUDENT_COST = 1;
const STUDENT_EMISSION_INTERVAL_MS = 2 * 60 * 1000; // 2 minutos
const EVOLVED_EMISSION_INTERVAL_MS = 1 * 60 * 1000; // 1 minuto

const EVOLVED_WIDTH = 56;
const EVOLVED_HEIGHT = 52;
const MERGE_DISTANCE = 56;
const MIN_SPAWN_SPACING = 76;

const TOKEN_SIZE = 24;
const TOKEN_VALUE = 1;
const TOKEN_SYMBOL = "RAM";
const TOKEN_SPAWN_MIN_DISTANCE = 48;
const TOKEN_SPAWN_MAX_DISTANCE = 76;
const TOKEN_ARENA_PADDING = 8;

const COLORS = {
  background: 0x0b1220,
  grid: 0x162238,
  border: 0x334155,
  borderInnerLine: 0x64748b,
  borderHit: 0x38bdf8,
  dragTint: 0xe0f2fe,
  mergeHighlightTint: 0xfca5a5,
  evolvedFill: 0xef4444,
  evolvedDragFill: 0xf87171,
  evolvedStroke: 0xfecaca,
  tokenFill: 0xfacc15,
  tokenHover: 0xfde047,
  tokenStroke: 0xfef9c3,
};

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

class SquareArenaScene extends Phaser.Scene {
  constructor() {
    super("SquareArenaScene");
    this.characters = [];
    this.tokens = new Set();
    this.walls = {};
    this.wallTimers = {};
    this.mergeTarget = null;
    this.lastCountdownText = "";
    this.hud = {};
    this.wallet = {
      balance: 0,
      symbol: TOKEN_SYMBOL,
    };
  }

  preload() {
    this.load.spritesheet(PLAYER_SPRITE_KEY, PLAYER_SPRITESHEET_PATH, {
      frameWidth: PLAYER_FRAME_WIDTH,
      frameHeight: PLAYER_FRAME_HEIGHT,
    });
  }

  create() {
    this.input.topOnly = true;

    this.bindHudElements();
    this.bindShopEvents();
    this.drawArenaBackground();
    this.createSquareBorder();
    this.createStudent(CANVAS_SIZE / 2, CANVAS_SIZE / 2, false);
    this.configureDragControls();
    this.updateHud();
  }

  bindHudElements() {
    this.hud = {
      walletBalance: document.getElementById("wallet-balance"),
      tokenCountdown: document.getElementById("token-countdown"),
      arenaTokens: document.getElementById("arena-tokens"),
      studentCount: document.getElementById("student-count"),
      evolvedCount: document.getElementById("evolved-count"),
      buyStudentBtn: document.getElementById("buy-student-btn"),
      shopStatus: document.getElementById("shop-status"),
    };
  }

  bindShopEvents() {
    if (!this.hud.buyStudentBtn) {
      return;
    }

    this.hud.buyStudentBtn.addEventListener("click", () => {
      this.buyStudent();
    });
  }

  drawArenaBackground() {
    this.add
      .rectangle(
        CANVAS_SIZE / 2,
        CANVAS_SIZE / 2,
        ARENA_SIZE,
        ARENA_SIZE,
        COLORS.background
      )
      .setDepth(0);

    const grid = this.add.graphics().setDepth(1);
    grid.lineStyle(1, COLORS.grid, 0.8);

    const step = 46;
    for (let offset = step; offset < ARENA_SIZE; offset += step) {
      grid.lineBetween(
        ARENA_X + offset,
        ARENA_Y,
        ARENA_X + offset,
        ARENA_Y + ARENA_SIZE
      );
      grid.lineBetween(
        ARENA_X,
        ARENA_Y + offset,
        ARENA_X + ARENA_SIZE,
        ARENA_Y + offset
      );
    }
  }

  createSquareBorder() {
    const halfCanvas = CANVAS_SIZE / 2;
    const halfBorder = BORDER_THICKNESS / 2;

    this.walls = {
      up: this.add
        .rectangle(halfCanvas, halfBorder, CANVAS_SIZE, BORDER_THICKNESS, COLORS.border)
        .setDepth(2),
      down: this.add
        .rectangle(
          halfCanvas,
          CANVAS_SIZE - halfBorder,
          CANVAS_SIZE,
          BORDER_THICKNESS,
          COLORS.border
        )
        .setDepth(2),
      left: this.add
        .rectangle(halfBorder, halfCanvas, BORDER_THICKNESS, CANVAS_SIZE, COLORS.border)
        .setDepth(2),
      right: this.add
        .rectangle(
          CANVAS_SIZE - halfBorder,
          halfCanvas,
          BORDER_THICKNESS,
          CANVAS_SIZE,
          COLORS.border
        )
        .setDepth(2),
    };

    const innerOutline = this.add.graphics().setDepth(3);
    innerOutline.lineStyle(2, COLORS.borderInnerLine, 1);
    innerOutline.strokeRect(
      ARENA_X - 1,
      ARENA_Y - 1,
      ARENA_SIZE + 2,
      ARENA_SIZE + 2
    );
  }

  getCharacterBounds(halfWidth, halfHeight) {
    return {
      minX: ARENA_X + halfWidth,
      maxX: ARENA_X + ARENA_SIZE - halfWidth,
      minY: ARENA_Y + halfHeight,
      maxY: ARENA_Y + ARENA_SIZE - halfHeight,
    };
  }

  attachCharacterBehavior(character, config) {
    const { kind, baseScale, halfWidth, halfHeight, emissionIntervalMs } = config;

    character.setData("type", "character");
    character.setData("characterKind", kind);
    character.setData("baseScale", baseScale);
    character.setData("halfWidth", halfWidth);
    character.setData("halfHeight", halfHeight);
    character.setData("emissionIntervalMs", emissionIntervalMs);

    character.setInteractive({
      draggable: true,
      useHandCursor: true,
    });

    const emissionTimer = this.time.addEvent({
      delay: emissionIntervalMs,
      loop: true,
      callback: () => {
        if (character.active) {
          this.spawnTokenNear(character);
        }
      },
    });
    character.setData("emissionTimer", emissionTimer);

    this.characters.push(character);
    return character;
  }

  createStudent(x, y, animate = true) {
    const halfWidth = (PLAYER_FRAME_WIDTH * PLAYER_SCALE) / 2;
    const halfHeight = (PLAYER_FRAME_HEIGHT * PLAYER_SCALE) / 2;
    const bounds = this.getCharacterBounds(halfWidth, halfHeight);
    const clampedX = Phaser.Math.Clamp(x, bounds.minX, bounds.maxX);
    const clampedY = Phaser.Math.Clamp(y, bounds.minY, bounds.maxY);

    const student = this.add
      .sprite(clampedX, clampedY, PLAYER_SPRITE_KEY, PLAYER_IDLE_FRAME)
      .setScale(animate ? 0.1 : PLAYER_SCALE)
      .setDepth(4);

    this.attachCharacterBehavior(student, {
      kind: "student",
      baseScale: PLAYER_SCALE,
      halfWidth,
      halfHeight,
      emissionIntervalMs: STUDENT_EMISSION_INTERVAL_MS,
    });

    if (animate) {
      this.tweens.add({
        targets: student,
        scale: PLAYER_SCALE,
        duration: 240,
        ease: "Back.easeOut",
      });
    }

    return student;
  }

  createEvolvedCharacter(x, y, animate = true) {
    const halfWidth = EVOLVED_WIDTH / 2;
    const halfHeight = EVOLVED_HEIGHT / 2;
    const bounds = this.getCharacterBounds(halfWidth, halfHeight);
    const clampedX = Phaser.Math.Clamp(x, bounds.minX, bounds.maxX);
    const clampedY = Phaser.Math.Clamp(y, bounds.minY, bounds.maxY);

    const triangle = this.add
      .triangle(
        clampedX,
        clampedY,
        0,
        EVOLVED_HEIGHT,
        EVOLVED_WIDTH / 2,
        0,
        EVOLVED_WIDTH,
        EVOLVED_HEIGHT,
        COLORS.evolvedFill
      )
      .setStrokeStyle(2, COLORS.evolvedStroke)
      .setScale(animate ? 0.2 : 1)
      .setDepth(4);

    this.attachCharacterBehavior(triangle, {
      kind: "evolved",
      baseScale: 1,
      halfWidth,
      halfHeight,
      emissionIntervalMs: EVOLVED_EMISSION_INTERVAL_MS,
    });

    if (animate) {
      this.tweens.add({
        targets: triangle,
        scale: 1,
        duration: 280,
        ease: "Back.easeOut",
      });
    }

    return triangle;
  }

  destroyCharacter(character) {
    const emissionTimer = character.getData("emissionTimer");
    if (emissionTimer) {
      emissionTimer.remove(false);
    }

    this.tweens.killTweensOf(character);
    this.characters = this.characters.filter((item) => item !== character);
    character.destroy();
  }

  findSpawnPosition(halfWidth, halfHeight) {
    const padding = 12;
    const bounds = this.getCharacterBounds(halfWidth + padding, halfHeight + padding);

    let bestPos = { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 };
    let bestMinDist = -1;

    for (let attempt = 0; attempt < 30; attempt++) {
      const candidateX = Phaser.Math.FloatBetween(bounds.minX, bounds.maxX);
      const candidateY = Phaser.Math.FloatBetween(bounds.minY, bounds.maxY);

      if (this.characters.length === 0) {
        return { x: candidateX, y: candidateY };
      }

      let minDist = Infinity;
      for (const character of this.characters) {
        const dist = Phaser.Math.Distance.Between(
          candidateX,
          candidateY,
          character.x,
          character.y
        );
        if (dist < minDist) {
          minDist = dist;
        }
      }

      if (minDist >= MIN_SPAWN_SPACING) {
        return { x: candidateX, y: candidateY };
      }

      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestPos = { x: candidateX, y: candidateY };
      }
    }

    return bestPos;
  }

  buyStudent() {
    if (this.wallet.balance < STUDENT_COST) {
      this.setShopStatus("Saldo insuficiente. Colete 1 RAM para comprar.");
      return;
    }

    this.wallet.balance -= STUDENT_COST;

    const halfWidth = (PLAYER_FRAME_WIDTH * PLAYER_SCALE) / 2;
    const halfHeight = (PLAYER_FRAME_HEIGHT * PLAYER_SCALE) / 2;
    const pos = this.findSpawnPosition(halfWidth, halfHeight);

    const student = this.createStudent(pos.x, pos.y, true);
    this.showFloatingText(student.x, student.y - 44, "Novo Estudante!", "#38bdf8");
    this.setShopStatus("Estudante comprado por 1 RAM!");
    this.updateHud();
  }

  setShopStatus(message) {
    if (!this.hud.shopStatus) {
      return;
    }
    this.hud.shopStatus.textContent = message;
  }

  setCharacterHighlight(character, state) {
    if (!character || !character.active) {
      return;
    }

    const baseScale = character.getData("baseScale") ?? 1;
    const kind = character.getData("characterKind");

    if (state === "drag") {
      character.setScale(baseScale * 1.05);
      if (kind === "evolved") {
        character.setFillStyle(COLORS.evolvedDragFill);
      } else if (typeof character.setTint === "function") {
        character.setTint(COLORS.dragTint);
      }
      return;
    }

    if (state === "mergeTarget") {
      character.setScale(baseScale * 1.08);
      if (typeof character.setTint === "function") {
        character.setTint(COLORS.mergeHighlightTint);
      }
      return;
    }

    character.setScale(baseScale);
    if (kind === "evolved") {
      character.setFillStyle(COLORS.evolvedFill);
    } else if (typeof character.clearTint === "function") {
      character.clearTint();
    }
  }

  findMergeCandidate(draggedStudent) {
    if (draggedStudent.getData("characterKind") !== "student") {
      return null;
    }

    let closest = null;
    let closestDistance = MERGE_DISTANCE;

    for (const candidate of this.characters) {
      if (
        candidate === draggedStudent ||
        !candidate.active ||
        candidate.getData("characterKind") !== "student"
      ) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        draggedStudent.x,
        draggedStudent.y,
        candidate.x,
        candidate.y
      );

      if (distance <= closestDistance) {
        closest = candidate;
        closestDistance = distance;
      }
    }

    return closest;
  }

  updateMergeTarget(draggedCharacter) {
    const nextTarget = this.findMergeCandidate(draggedCharacter);
    if (nextTarget === this.mergeTarget) {
      return;
    }

    if (this.mergeTarget) {
      this.setCharacterHighlight(this.mergeTarget, "idle");
    }

    this.mergeTarget = nextTarget;

    if (this.mergeTarget) {
      this.setCharacterHighlight(this.mergeTarget, "mergeTarget");
    }
  }

  mergeStudents(studentA, studentB) {
    const mergeX = studentB.x;
    const mergeY = studentB.y;

    this.destroyCharacter(studentA);
    this.destroyCharacter(studentB);

    const evolved = this.createEvolvedCharacter(mergeX, mergeY, true);
    this.showFloatingText(evolved.x, evolved.y - 36, "Evoluiu! 1 RAM/min", "#f87171");
    this.setShopStatus("Dois estudantes evoluíram para um Triângulo Vermelho!");
    this.updateHud();
  }

  configureDragControls() {
    this.input.on("dragstart", (_pointer, gameObject) => {
      if (gameObject.getData("type") !== "character") {
        return;
      }
      this.tweens.killTweensOf(gameObject);
      gameObject.setDepth(6);
      this.setCharacterHighlight(gameObject, "drag");
    });

    this.input.on("drag", (_pointer, gameObject, dragX, dragY) => {
      if (gameObject.getData("type") !== "character") {
        return;
      }

      const halfWidth = gameObject.getData("halfWidth");
      const halfHeight = gameObject.getData("halfHeight");
      const { minX, maxX, minY, maxY } = this.getCharacterBounds(halfWidth, halfHeight);

      const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);
      const clampedY = Phaser.Math.Clamp(dragY, minY, maxY);

      if (dragX < minX) this.flashWall("left");
      if (dragX > maxX) this.flashWall("right");
      if (dragY < minY) this.flashWall("up");
      if (dragY > maxY) this.flashWall("down");

      gameObject.setPosition(clampedX, clampedY);
      this.updateMergeTarget(gameObject);
    });

    this.input.on("dragend", (_pointer, gameObject) => {
      if (gameObject.getData("type") !== "character") {
        return;
      }

      const target = this.mergeTarget;
      this.mergeTarget = null;

      if (target) {
        this.setCharacterHighlight(target, "idle");
      }

      gameObject.setDepth(4);
      this.setCharacterHighlight(gameObject, "idle");

      if (
        target &&
        target.active &&
        gameObject.active &&
        gameObject.getData("characterKind") === "student" &&
        target.getData("characterKind") === "student"
      ) {
        this.mergeStudents(gameObject, target);
      }
    });
  }

  spawnTokenNear(character) {
    const halfToken = TOKEN_SIZE / 2;
    const minX = ARENA_X + halfToken + TOKEN_ARENA_PADDING;
    const maxX = ARENA_X + ARENA_SIZE - halfToken - TOKEN_ARENA_PADDING;
    const minY = ARENA_Y + halfToken + TOKEN_ARENA_PADDING;
    const maxY = ARENA_Y + ARENA_SIZE - halfToken - TOKEN_ARENA_PADDING;

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.FloatBetween(
      TOKEN_SPAWN_MIN_DISTANCE,
      TOKEN_SPAWN_MAX_DISTANCE
    );

    const targetX = Phaser.Math.Clamp(
      character.x + Math.cos(angle) * distance,
      minX,
      maxX
    );
    const targetY = Phaser.Math.Clamp(
      character.y + Math.sin(angle) * distance,
      minY,
      maxY
    );

    const token = this.add
      .rectangle(
        character.x,
        character.y,
        TOKEN_SIZE,
        TOKEN_SIZE,
        COLORS.tokenFill
      )
      .setStrokeStyle(2, COLORS.tokenStroke)
      .setDepth(10)
      .setScale(0.2);

    token.setData("type", "token");
    token.setInteractive({ useHandCursor: true });

    this.tokens.add(token);
    this.updateHud();

    this.tweens.add({
      targets: token,
      x: targetX,
      y: targetY,
      scale: 1,
      duration: 280,
      ease: "Back.easeOut",
      onComplete: () => {
        if (!this.tokens.has(token)) {
          return;
        }
        this.tweens.add({
          targets: token,
          scale: 1.08,
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      },
    });

    token.on("pointerover", () => {
      if (!this.tokens.has(token)) {
        return;
      }
      token.setFillStyle(COLORS.tokenHover);
    });

    token.on("pointerout", () => {
      if (!this.tokens.has(token)) {
        return;
      }
      token.setFillStyle(COLORS.tokenFill);
    });

    token.on("pointerdown", () => {
      this.collectToken(token);
    });
  }

  collectToken(token) {
    if (!this.tokens.has(token)) {
      return;
    }

    this.tokens.delete(token);
    token.disableInteractive();
    this.tweens.killTweensOf(token);

    this.wallet.balance += TOKEN_VALUE;
    this.updateHud();

    this.showFloatingText(
      token.x,
      token.y - 10,
      `+${TOKEN_VALUE} ${this.wallet.symbol}`,
      "#fde047"
    );

    this.tweens.add({
      targets: token,
      scale: 1.4,
      alpha: 0,
      duration: 160,
      ease: "Quad.easeOut",
      onComplete: () => token.destroy(),
    });
  }

  showFloatingText(x, y, text, color) {
    const feedback = this.add
      .text(x, y, text, {
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color,
        stroke: "#0f172a",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.tweens.add({
      targets: feedback,
      y: feedback.y - 28,
      alpha: 0,
      duration: 700,
      ease: "Cubic.easeOut",
      onComplete: () => feedback.destroy(),
    });
  }

  flashWall(side) {
    const wall = this.walls[side];
    if (!wall) {
      return;
    }

    wall.setFillStyle(COLORS.borderHit);

    if (this.wallTimers[side]) {
      this.wallTimers[side].remove(false);
    }

    this.wallTimers[side] = this.time.delayedCall(120, () => {
      wall.setFillStyle(COLORS.border);
      this.wallTimers[side] = null;
    });
  }

  getSoonestEmissionRemaining() {
    let soonest = Infinity;

    for (const character of this.characters) {
      const timer = character.getData("emissionTimer");
      if (!timer) {
        continue;
      }
      const remaining = timer.getRemaining();
      if (remaining < soonest) {
        soonest = remaining;
      }
    }

    return soonest;
  }

  updateHud() {
    if (this.hud.walletBalance) {
      this.hud.walletBalance.textContent = `${this.wallet.balance} ${this.wallet.symbol}`;
    }
    if (this.hud.arenaTokens) {
      this.hud.arenaTokens.textContent = String(this.tokens.size);
    }

    let students = 0;
    let evolved = 0;
    for (const character of this.characters) {
      const kind = character.getData("characterKind");
      if (kind === "student") students += 1;
      if (kind === "evolved") evolved += 1;
    }

    if (this.hud.studentCount) {
      this.hud.studentCount.textContent = String(students);
    }
    if (this.hud.evolvedCount) {
      this.hud.evolvedCount.textContent = String(evolved);
    }
    if (this.hud.buyStudentBtn) {
      this.hud.buyStudentBtn.disabled = this.wallet.balance < STUDENT_COST;
    }

    this.updateCountdownHud();
  }

  updateCountdownHud() {
    if (!this.hud.tokenCountdown) {
      return;
    }

    const soonest = this.getSoonestEmissionRemaining();
    const formatted = Number.isFinite(soonest) ? formatCountdown(soonest) : "--:--";
    if (formatted !== this.lastCountdownText) {
      this.lastCountdownText = formatted;
      this.hud.tokenCountdown.textContent = formatted;
    }
  }

  update() {
    this.updateCountdownHud();
  }
}

const config = {
  type: Phaser.AUTO,
  width: CANVAS_SIZE,
  height: CANVAS_SIZE,
  parent: "game-container",
  backgroundColor: "#0b1220",
  scene: [SquareArenaScene],
};

new Phaser.Game(config);
