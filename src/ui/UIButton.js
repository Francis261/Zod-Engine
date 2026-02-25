import Phaser from 'phaser';
import { textStyles } from '../styles/textStyles.js';

/**
 * Reusable enterprise-style button with hover/press states.
 */
export class UIButton extends Phaser.GameObjects.Container {
  constructor(scene, x, y, label, onClick, options = {}) {
    super(scene, x, y);

    const width = options.width ?? 260;
    const height = options.height ?? 60;

    this.background = scene.add.rectangle(0, 0, width, height, 0x1f6feb, 0.95).setStrokeStyle(2, 0x58a6ff);
    this.text = scene.add.text(0, 0, label, {
      ...textStyles.button,
      fontSize: options.fontSize ?? textStyles.button.fontSize
    }).setOrigin(0.5);

    this.add([this.background, this.text]);
    this.setSize(width, height);
    this.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);

    this.on('pointerover', () => this.background.setFillStyle(0x388bfd, 1));
    this.on('pointerout', () => this.background.setFillStyle(0x1f6feb, 0.95));
    this.on('pointerdown', () => this.background.setFillStyle(0x1158c7, 1));
    this.on('pointerup', () => {
      this.background.setFillStyle(0x388bfd, 1);
      onClick?.();
    });

    scene.add.existing(this);
  }
}
