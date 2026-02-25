import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig.js';

// Main bootstrap point.
// Keeping this file small makes engine composition easier in larger teams.
window.addEventListener('load', () => {
  // eslint-disable-next-line no-new
  new Phaser.Game(gameConfig);
});
