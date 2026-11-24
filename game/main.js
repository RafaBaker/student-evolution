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
const PLAYER_BODY_WIDTH = 72;
const PLAYER_BODY_HEIGHT = 160;
const PLAYER_SPEED = 280;
const PLAYER_WALK_FPS = 6;

const PLAYER_DIRECTIONS = {
  down: { walk: "player-walk-down", start: 0, end: 1, idleFrame: 0 },
  up: { walk: "player-walk-up", start: 2, end: 3, idleFrame: 2 },
  left: { walk: "player-walk-left", start: 4, end: 5, idleFrame: 4 },
  right: { walk: "player-walk-right", start: 6, end: 7, idleFrame: 6 },
};

const COLORS = {
  background: 0x0b1220,
  grid: 0x162238,
  border: 0x334155,
  borderInnerLine: 0x64748b,
  borderHit: 0x38bdf8,
};

class SquareArenaScene extends Phaser.Scene {
  constructor() {
    super("SquareArenaScene");
    this.player = null;
    this.facing = "down";
    this.cursors = null;
    this.wasd = null;
    this.walls = {};
    this.wallTimers = {};
  }

  preload() {
    this.load.spritesheet(
      PLAYER_SPRITE_KEY,
      PLAYER_SPRITESHEET_PATH,
      {
        frameWidth: PLAYER_FRAME_WIDTH,
        frameHeight: PLAYER_FRAME_HEIGHT,
      }
    );
  }

  create() {
    this.drawArenaBackground();
    this.createSquareBorder();
    this.createPlayerAnimations();
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

  createPlayerAnimations() {
    for (const { walk, start, end } of Object.values(PLAYER_DIRECTIONS)) {
      if (!this.anims.exists(walk)) {
        this.anims.create({
          key: walk,
          frames: this.anims.generateFrameNumbers(PLAYER_SPRITE_KEY, {
            start,
            end,
          }),
          frameRate: PLAYER_WALK_FPS,
          repeat: -1,
        });
      }
    }
  }

  createPlayer() {
    this.player = this.physics.add
      .sprite(
        CANVAS_SIZE / 2,
        CANVAS_SIZE / 2,
        PLAYER_SPRITE_KEY,
        PLAYER_DIRECTIONS[this.facing].idleFrame
      )
      .setScale(PLAYER_SCALE)
      .setDepth(4);

    this.player.body.setSize(PLAYER_BODY_WIDTH, PLAYER_BODY_HEIGHT, true);
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
      if (dx < 0) {
        this.facing = "left";
      } else if (dx > 0) {
        this.facing = "right";
      } else if (dy < 0) {
        this.facing = "up";
      } else if (dy > 0) {
        this.facing = "down";
      }

      const length = Math.hypot(dx, dy);
      this.player.setVelocity(
        (dx / length) * PLAYER_SPEED,
        (dy / length) * PLAYER_SPEED
      );
      this.player.anims.play(PLAYER_DIRECTIONS[this.facing].walk, true);
    } else {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(PLAYER_DIRECTIONS[this.facing].idleFrame);
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
