import { UIButton } from './UIButton.js';

/**
 * Central place for creating consistent GUI controls.
 */
export class UIManager {
  constructor(scene) {
    this.scene = scene;
  }

  createButton(x, y, label, onClick, options = {}) {
    return new UIButton(this.scene, x, y, label, onClick, options);
  }

  createPanel(x, y, width, height, alpha = 0.8) {
    return this.scene.add.rectangle(x, y, width, height, 0x0d1117, alpha)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x30363d);
  }
}
