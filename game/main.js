import Phaser from "/node_modules/phaser/dist/phaser.esm.min.js";

const CANVAS_SIZE = 600;
const BORDER_THICKNESS = 24;
const ARENA_X = BORDER_THICKNESS;
const ARENA_Y = BORDER_THICKNESS;
const ARENA_SIZE = CANVAS_SIZE - BORDER_THICKNESS * 2;

const PLAYER_SIZE = 40;
const PLAYER_SPEED = 280;

const COLORS = {
  background: 0x0b1220,
  grid: 0x162238,
  border: 0x334155,
  borderInnerLine: 0x64748b,
  borderHit: 0x38bdf8,
  playerFill: 0x22d3ee,
  playerStroke: 0xe0f2fe,
};

class SquareArenaScene extends Phaser.Scene {
  constructor() {
    super("SquareArenaScene");
    this.player = null;
    this.cursors = null;
    this.wasd = null;
    this.walls = {};
    this.wallTimers = {};
  }

  create() {
    this.drawArenaBackground();
    this.createSquareBorder();
    this.createPlayer();
    this.configureWorldBounds();
    this.configureControls();
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

  createPlayer() {
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(COLORS.playerFill, 1);
    gfx.fillRect(0, 0, PLAYER_SIZE, PLAYER_SIZE);
    gfx.lineStyle(2, COLORS.playerStroke, 1);
    gfx.strokeRect(1, 1, PLAYER_SIZE - 2, PLAYER_SIZE - 2);
    gfx.generateTexture("player-square", PLAYER_SIZE, PLAYER_SIZE);
    gfx.destroy();

    this.player = this.physics.add
      .image(CANVAS_SIZE / 2, CANVAS_SIZE / 2, "player-square")
      .setDepth(4);
  }

  configureWorldBounds() {
    // Define os limites físicos exatamente na parte interna da borda quadrada
    this.physics.world.setBounds(ARENA_X, ARENA_Y, ARENA_SIZE, ARENA_SIZE);

    // Impede o jogador de atravessar qualquer lado da borda
    this.player.setCollideWorldBounds(true, 0, 0, true);

    this.physics.world.on("worldbounds", (body, up, down, left, right) => {
      if (body.gameObject !== this.player) {
        return;
      }
      if (up) this.flashWall("up");
      if (down) this.flashWall("down");
      if (left) this.flashWall("left");
      if (right) this.flashWall("right");
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

  configureControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
  }

  update() {
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      dx -= 1;
    }
    if (this.cursors.right.isDown || this.wasd.right.isDown) {
      dx += 1;
    }
    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      dy -= 1;
    }
    if (this.cursors.down.isDown || this.wasd.down.isDown) {
      dy += 1;
    }

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy);
      this.player.setVelocity(
        (dx / length) * PLAYER_SPEED,
        (dy / length) * PLAYER_SPEED
      );
    } else {
      this.player.setVelocity(0, 0);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: CANVAS_SIZE,
  height: CANVAS_SIZE,
  parent: "game-container",
  backgroundColor: "#0b1220",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [SquareArenaScene],
};

new Phaser.Game(config);
