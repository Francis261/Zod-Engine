import Phaser from 'phaser';
import { SceneKeys } from '../core/SceneKeys.js';
import { textStyles } from '../styles/textStyles.js';
import { UIManager } from '../ui/UIManager.js';
import { gameState } from '../core/GameState.js';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.PAUSE);
  }

  create() {
    const { width, height } = this.scale;
    const ui = new UIManager(this);

    ui.createPanel(width / 2, height / 2, 460, 320, 0.92);
    this.add.text(width / 2, height / 2 - 100, 'Paused', textStyles.title).setOrigin(0.5).setScale(0.8);

    ui.createButton(width / 2, height / 2 - 10, 'Resume', () => this.resumeGame());
    ui.createButton(width / 2, height / 2 + 80, 'Main Menu', () => this.returnToMenu());

    this.input.keyboard.once('keydown-ESC', () => this.resumeGame());
  }

  resumeGame() {
    gameState.setPaused(false);
    this.scene.stop();
    this.scene.resume(SceneKeys.GAME);
  }

  returnToMenu() {
    gameState.setPaused(false);
    this.scene.stop(SceneKeys.HUD);
    this.scene.stop(SceneKeys.GAME);
    this.scene.start(SceneKeys.MAIN_MENU);
    this.scene.stop();
  }
}
