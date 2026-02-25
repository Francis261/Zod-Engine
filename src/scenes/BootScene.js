import Phaser from 'phaser';
import { SceneKeys } from '../core/SceneKeys.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.BOOT);
  }

  preload() {
    // Generate a texture used by multiple scenes when no external sprite exists.
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture('pixel', 2, 2);
    g.destroy();
  }

  create() {
    this.scene.start(SceneKeys.PRELOADER);
  }
}
