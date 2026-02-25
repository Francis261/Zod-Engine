import Phaser from 'phaser';
/**
 * Health bar widget used by the HUD scene.
 */
export class HealthBar {
  constructor(scene, x, y, width = 240, height = 24) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.background = scene.add.rectangle(x, y, width, height, 0x161b22).setOrigin(0, 0).setStrokeStyle(2, 0x30363d);
    this.fill = scene.add.rectangle(x + 2, y + 2, width - 4, height - 4, 0x2ea043).setOrigin(0, 0);
  }

  setValue(current, max) {
    const ratio = Phaser.Math.Clamp(current / max, 0, 1);
    const innerWidth = (this.width - 4) * ratio;
    this.fill.width = innerWidth;

    if (ratio > 0.6) {
      this.fill.setFillStyle(0x2ea043);
    } else if (ratio > 0.3) {
      this.fill.setFillStyle(0xd29922);
    } else {
      this.fill.setFillStyle(0xf85149);
    }
  }
}
