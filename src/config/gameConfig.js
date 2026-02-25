import Phaser from 'phaser';
import { SceneKeys } from '../core/SceneKeys.js';
import { BootScene } from '../scenes/BootScene.js';
import { PreloaderScene } from '../scenes/PreloaderScene.js';
import { MainMenuScene } from '../scenes/MainMenuScene.js';
import { OptionsScene } from '../scenes/OptionsScene.js';
import { CreditsScene } from '../scenes/CreditsScene.js';
import { GameScene } from '../scenes/GameScene.js';
import { HUDScene } from '../scenes/HUDScene.js';
import { PauseScene } from '../scenes/PauseScene.js';

export const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 1280,
  height: 720,
  backgroundColor: '#010409',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [
    BootScene,
    PreloaderScene,
    MainMenuScene,
    OptionsScene,
    CreditsScene,
    GameScene,
    HUDScene,
    PauseScene
  ],
  callbacks: {
    postBoot: (game) => {
      game.scene.start(SceneKeys.BOOT);
    }
  }
};
