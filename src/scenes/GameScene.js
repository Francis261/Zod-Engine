import Phaser from 'phaser';
import { SceneKeys } from '../core/SceneKeys.js';
import { EventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { settingsService } from '../services/SettingsService.js';

const difficultyConfig = {
  easy: { spawnDelay: 1500, damageDelay: 4000, damageAmount: 4 },
  normal: { spawnDelay: 1200, damageDelay: 3000, damageAmount: 5 },
  hard: { spawnDelay: 900, damageDelay: 2200, damageAmount: 7 }
};

export class GameScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.GAME);
  }

  create() {
    const { width, height } = this.scale;
    const settings = settingsService.load();
    const diff = difficultyConfig[settings.difficulty] ?? difficultyConfig.normal;

    this.add.rectangle(width / 2, height / 2, width, height, 0x010409);

    this.player = this.physics.add.image(width / 2, height / 2, 'player').setScale(0.7).setCollideWorldBounds(true);
    this.collectibles = this.physics.add.group();

    this.spawnTimer = this.time.addEvent({
      delay: diff.spawnDelay,
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

    this.damageTimer = this.time.addEvent({
      delay: diff.damageDelay,
      callback: () => {
        if (!gameState.isPaused) gameState.damage(diff.damageAmount);
      },
      loop: true
    });

    this.debugText = this.add.text(20, this.scale.height - 30, '', {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '14px',
      color: '#8b949e'
    });
    this.debugText.setVisible(Boolean(settings.showDebug));

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

    if (this.debugText.visible) {
      this.debugText.setText(`Objects: ${this.children.length} | Collectibles: ${this.collectibles.countActive(true)}`);
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
