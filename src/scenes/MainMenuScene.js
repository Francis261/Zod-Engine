import Phaser from 'phaser';
import { SceneKeys } from '../core/SceneKeys.js';
import { textStyles } from '../styles/textStyles.js';
import { UIManager } from '../ui/UIManager.js';
import { gameState } from '../core/GameState.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.MAIN_MENU);
  }

  create() {
    const { width, height } = this.scale;
    const ui = new UIManager(this);

    this.add.image(width / 2, 120, 'logo').setScale(0.6);
    this.add.text(width / 2, 220, 'Zod Engine', textStyles.title).setOrigin(0.5);
    this.add.text(
      width / 2,
      270,
      'Enterprise-ready Phaser 3 GUI foundation for 2D game projects.',
      textStyles.subtitle
    ).setOrigin(0.5);

    ui.createButton(width / 2, 360, 'Start', () => {
      gameState.reset();
      this.scene.start(SceneKeys.GAME);
      this.scene.launch(SceneKeys.HUD);
    });

    ui.createButton(width / 2, 440, 'Options', () => this.scene.start(SceneKeys.OPTIONS));
    ui.createButton(width / 2, 520, 'Credits', () => this.scene.start(SceneKeys.CREDITS));
  }
}
