import Phaser from 'phaser';
import { SceneKeys } from '../core/SceneKeys.js';
import { EventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.GAME);
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x010409);

    this.player = this.physics.add.image(width / 2, height / 2, 'player').setScale(0.7).setCollideWorldBounds(true);
    this.collectibles = this.physics.add.group();

    this.spawnTimer = this.time.addEvent({
      delay: 1200,
      callback: this.spawnCollectible,
      callbackScope: this,
      loop: true
    });

    this.physics.add.overlap(this.player, this.collectibles, (_, collectible) => {
      collectible.destroy();
      gameState.addScore(10);
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Demonstrates periodic damage to prove HUD reactivity.
    this.damageTimer = this.time.addEvent({
      delay: 3000,
      callback: () => {
        if (!gameState.isPaused) gameState.damage(5);
      },
      loop: true
    });

    EventBus.emit('game:started');

    this.events.once('shutdown', () => {
      this.spawnTimer?.destroy();
      this.damageTimer?.destroy();
    });
  }

  update() {
    const speed = 220;
    this.player.setVelocity(0);

    if (this.cursors.left.isDown) this.player.setVelocityX(-speed);
    if (this.cursors.right.isDown) this.player.setVelocityX(speed);
    if (this.cursors.up.isDown) this.player.setVelocityY(-speed);
    if (this.cursors.down.isDown) this.player.setVelocityY(speed);

    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.scene.launch(SceneKeys.PAUSE);
      this.scene.pause();
      gameState.setPaused(true);
    }

    if (gameState.health <= 0) {
      this.scene.stop(SceneKeys.HUD);
      this.scene.start(SceneKeys.MAIN_MENU);
    }
  }

  spawnCollectible() {
    const x = Phaser.Math.Between(40, this.scale.width - 40);
    const y = Phaser.Math.Between(40, this.scale.height - 40);
    this.collectibles.create(x, y, 'collectible');
  }
}
