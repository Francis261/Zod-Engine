import Phaser from 'phaser';
import { SceneKeys } from '../core/SceneKeys.js';
import { textStyles } from '../styles/textStyles.js';
import { UIManager } from '../ui/UIManager.js';

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.CREDITS);
  }

  create() {
    const { width, height } = this.scale;
    const ui = new UIManager(this);

    ui.createPanel(width / 2, height / 2, 760, 540, 0.88);
    this.add.text(width / 2, 160, 'Credits', textStyles.title).setOrigin(0.5);

    this.add.text(
      width / 2,
      height / 2,
      'Zod Engine\n\nBuilt with Phaser 3\nArchitecture by modular scenes + reusable UI manager\nReady for game jam to enterprise team workflows',
      textStyles.body
    ).setOrigin(0.5);

    ui.createButton(width / 2, 640, 'Back', () => this.scene.start(SceneKeys.MAIN_MENU));
  }
}
