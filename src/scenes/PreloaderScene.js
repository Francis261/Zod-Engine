import Phaser from 'phaser';
import { SceneKeys } from '../core/SceneKeys.js';
import { textStyles } from '../styles/textStyles.js';

export class PreloaderScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.PRELOADER);
  }

  preload() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2 - 40, 'Loading Zod Engine...', textStyles.subtitle).setOrigin(0.5);
    const progressBar = this.add.rectangle(width / 2 - 180, height / 2, 360, 20, 0x30363d).setOrigin(0, 0.5);
    const progressFill = this.add.rectangle(width / 2 - 178, height / 2, 1, 16, 0x58a6ff).setOrigin(0, 0.5);

    this.load.on('progress', (value) => {
      progressFill.width = 356 * value;
    });

    // Builder-friendly assets. Teams can replace these with project-specific art.
    this.load.image('logo', '/assets/zod-logo.svg');
    this.load.image('player', '/assets/player.svg');
    this.load.image('collectible', '/assets/collectible.svg');
  }

  create() {
    this.scene.start(SceneKeys.MAIN_MENU);
  }
}
