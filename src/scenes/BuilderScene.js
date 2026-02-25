import Phaser from 'phaser';
import { SceneKeys } from '../core/SceneKeys.js';
import { UIManager } from '../ui/UIManager.js';
import { textStyles } from '../styles/textStyles.js';

/**
 * Lightweight in-game GUI builder sandbox.
 * Demonstrates component placement tooling expected in a game-engine GUI.
 */
export class BuilderScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.BUILDER);
  }

  create() {
    const { width, height } = this.scale;
    const ui = new UIManager(this);

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0f16);
    this.add.text(18, 18, 'Zod Builder Mode', textStyles.hud);
    this.add.text(18, 50, 'Select element type and click canvas to place.', { ...textStyles.subtitle, fontSize: '18px' });

    // Work canvas region where users place UI elements.
    this.canvasBounds = new Phaser.Geom.Rectangle(280, 120, width - 310, height - 150);
    this.add.rectangle(this.canvasBounds.x, this.canvasBounds.y, this.canvasBounds.width, this.canvasBounds.height, 0x0d1117)
      .setOrigin(0)
      .setStrokeStyle(2, 0x30363d);

    this.currentType = 'Panel';
    this.elements = [];

    this.addPalette(ui);
    this.addBuilderActions(ui);

    this.input.on('pointerdown', this.placeElement, this);
  }

  addPalette(ui) {
    const left = 130;
    this.add.text(left, 130, 'Palette', textStyles.hud).setOrigin(0.5);

    ['Panel', 'Label', 'Button'].forEach((type, index) => {
      ui.createButton(left, 190 + index * 75, type, () => {
        this.currentType = type;
        this.selectedTypeText.setText(`Selected: ${type}`);
      }, { width: 210, height: 52, fontSize: '20px' });
    });

    this.selectedTypeText = this.add.text(left, 430, `Selected: ${this.currentType}`, {
      ...textStyles.body,
      fontSize: '16px',
      wordWrap: { width: 230 }
    }).setOrigin(0.5);
  }

  addBuilderActions(ui) {
    const { width, height } = this.scale;

    ui.createButton(130, 530, 'Clear Canvas', () => {
      this.elements.forEach((e) => e.destroy());
      this.elements = [];
    }, { width: 210, height: 52, fontSize: '20px' });

    ui.createButton(130, 605, 'Back', () => this.scene.start(SceneKeys.MAIN_MENU), { width: 210, height: 52, fontSize: '20px' });

    this.add.text(width - 240, height - 36, 'Tip: replace this with JSON export/import for full builder pipelines.', {
      ...textStyles.subtitle,
      fontSize: '14px'
    }).setOrigin(1, 0.5);
  }

  placeElement(pointer) {
    if (!Phaser.Geom.Rectangle.ContainsPoint(this.canvasBounds, pointer)) return;

    let obj;
    if (this.currentType === 'Panel') {
      obj = this.add.rectangle(pointer.x, pointer.y, 170, 80, 0x1f2937, 0.9).setStrokeStyle(2, 0x58a6ff);
    } else if (this.currentType === 'Label') {
      obj = this.add.text(pointer.x, pointer.y, 'New Label', textStyles.body).setOrigin(0.5);
    } else {
      const bg = this.add.rectangle(pointer.x, pointer.y, 160, 48, 0x1f6feb).setStrokeStyle(2, 0x58a6ff);
      const txt = this.add.text(pointer.x, pointer.y, 'New Button', { ...textStyles.button, fontSize: '20px' }).setOrigin(0.5);
      obj = this.add.container(0, 0, [bg, txt]);
    }

    this.elements.push(obj);
  }
}
