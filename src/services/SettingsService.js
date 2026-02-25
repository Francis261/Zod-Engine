import Phaser from 'phaser';
import { EventBus } from '../core/EventBus.js';

const STORAGE_KEY = 'zod-engine-settings-v1';

const DEFAULT_SETTINGS = Object.freeze({
  musicVolume: 0.6,
  sfxVolume: 0.7,
  showDebug: false,
  difficulty: 'normal'
});

class SettingsService {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
  }

  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return this.settings;

    try {
      const parsed = JSON.parse(raw);
      this.settings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        musicVolume: Phaser.Math.Clamp(parsed.musicVolume ?? DEFAULT_SETTINGS.musicVolume, 0, 1),
        sfxVolume: Phaser.Math.Clamp(parsed.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume, 0, 1)
      };
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }

    EventBus.emit('settings:changed', this.getSnapshot());
    return this.settings;
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    EventBus.emit('settings:changed', this.getSnapshot());
  }

  update(partial) {
    this.settings = { ...this.settings, ...partial };
    this.save();
  }

  getSnapshot() {
    return { ...this.settings };
  }
}

export const settingsService = new SettingsService();
