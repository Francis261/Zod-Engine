import Phaser from 'phaser';
import { SceneKeys } from '../core/SceneKeys.js';
import { textStyles } from '../styles/textStyles.js';
import { UIManager } from '../ui/UIManager.js';
import { settingsService } from '../services/SettingsService.js';

const difficulties = ['easy', 'normal', 'hard'];

export class OptionsScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.OPTIONS);
  }

  create() {
    const { width, height } = this.scale;
    const ui = new UIManager(this);

    this.settings = settingsService.load();

    ui.createPanel(width / 2, height / 2, 860, 560, 0.9);
    this.add.text(width / 2, 130, 'Options', textStyles.title).setOrigin(0.5).setScale(0.85);
    this.add.text(width / 2, 185, 'Settings persist with localStorage for production-friendly workflows.', textStyles.subtitle)
      .setOrigin(0.5)
      .setFontSize('18px');

    this.musicValue = this.add.text(width / 2 + 190, 280, '', textStyles.body).setOrigin(0, 0.5);
    this.sfxValue = this.add.text(width / 2 + 190, 355, '', textStyles.body).setOrigin(0, 0.5);
    this.debugValue = this.add.text(width / 2 + 190, 430, '', textStyles.body).setOrigin(0, 0.5);
    this.difficultyValue = this.add.text(width / 2 + 190, 505, '', textStyles.body).setOrigin(0, 0.5);

    this.createRow(ui, width / 2 - 220, 280, 'Music Volume', () => this.shiftVolume('musicVolume', -0.1), () => this.shiftVolume('musicVolume', 0.1));
    this.createRow(ui, width / 2 - 220, 355, 'SFX Volume', () => this.shiftVolume('sfxVolume', -0.1), () => this.shiftVolume('sfxVolume', 0.1));
    this.createRow(ui, width / 2 - 220, 430, 'Debug Overlay', () => this.toggleDebug(), () => this.toggleDebug());
    this.createRow(ui, width / 2 - 220, 505, 'Difficulty', () => this.cycleDifficulty(-1), () => this.cycleDifficulty(1));

    this.renderValues();

    ui.createButton(width / 2 - 160, 635, 'Reset Defaults', () => {
      this.settings = { musicVolume: 0.6, sfxVolume: 0.7, showDebug: false, difficulty: 'normal' };
      settingsService.update(this.settings);
      this.renderValues();
    }, { width: 260 });

    ui.createButton(width / 2 + 160, 635, 'Back', () => this.scene.start(SceneKeys.MAIN_MENU), { width: 180 });
  }

  createRow(ui, x, y, label, onMinus, onPlus) {
    this.add.text(x, y, label, textStyles.hud).setOrigin(0, 0.5);
    ui.createButton(x + 260, y, '-', onMinus, { width: 52, height: 44, fontSize: '28px' });
    ui.createButton(x + 430, y, '+', onPlus, { width: 52, height: 44, fontSize: '28px' });
  }

  shiftVolume(key, delta) {
    this.settings[key] = Phaser.Math.Clamp(this.settings[key] + delta, 0, 1);
    settingsService.update(this.settings);
    this.renderValues();
  }

  toggleDebug() {
    this.settings.showDebug = !this.settings.showDebug;
    settingsService.update(this.settings);
    this.renderValues();
  }

  cycleDifficulty(direction) {
    const currentIndex = difficulties.indexOf(this.settings.difficulty);
    const nextIndex = Phaser.Math.Wrap(currentIndex + direction, 0, difficulties.length);
    this.settings.difficulty = difficulties[nextIndex];
    settingsService.update(this.settings);
    this.renderValues();
  }

  renderValues() {
    this.musicValue.setText(`${Math.round(this.settings.musicVolume * 100)}%`);
    this.sfxValue.setText(`${Math.round(this.settings.sfxVolume * 100)}%`);
    this.debugValue.setText(this.settings.showDebug ? 'ON' : 'OFF');
    this.difficultyValue.setText(this.settings.difficulty.toUpperCase());
  }
}
