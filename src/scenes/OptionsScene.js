import Phaser from 'phaser';
import { SceneKeys } from '../core/SceneKeys.js';
import { textStyles } from '../styles/textStyles.js';
import { UIManager } from '../ui/UIManager.js';

export class OptionsScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.OPTIONS);
  }

  create() {
    const { width, height } = this.scale;
    const ui = new UIManager(this);

    ui.createPanel(width / 2, height / 2, 760, 520, 0.88);
    this.add.text(width / 2, 170, 'Options', textStyles.title).setOrigin(0.5);

    this.add.text(
      width / 2,
      height / 2,
      'Template settings panel.\n\nIntegrate audio sliders, graphics toggles, input bindings,\nand profile save/load here for studio use.',
      textStyles.body
    ).setOrigin(0.5);

    ui.createButton(width / 2, 620, 'Back', () => this.scene.start(SceneKeys.MAIN_MENU));
  }
}
