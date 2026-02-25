import Phaser from 'phaser';
import { SceneKeys } from '../core/SceneKeys.js';
import { gameState } from '../core/GameState.js';
import { EventBus } from '../core/EventBus.js';
import { HealthBar } from '../ui/HealthBar.js';
import { textStyles } from '../styles/textStyles.js';

export class HUDScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.HUD);
  }

  create() {
    this.scoreText = this.add.text(20, 20, 'Score: 0', textStyles.hud);
    this.healthBar = new HealthBar(this, 20, 60, 300, 24);

    this.bindEvents();

    const snapshot = gameState.getSnapshot();
    this.updateScore(snapshot.score);
    this.healthBar.setValue(snapshot.health, snapshot.maxHealth);
  }

  bindEvents() {
    EventBus.on('state:score', this.updateScore, this);
    EventBus.on('state:health', this.updateHealth, this);

    this.events.once('shutdown', () => {
      EventBus.off('state:score', this.updateScore, this);
      EventBus.off('state:health', this.updateHealth, this);
    });
  }

  updateScore(score) {
    this.scoreText.setText(`Score: ${score}`);
  }

  updateHealth({ current, max }) {
    this.healthBar.setValue(current, max);
  }
}
