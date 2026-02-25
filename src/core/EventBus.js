import Phaser from 'phaser';

/**
 * Global event bus for scene-to-scene communication.
 * This keeps scenes loosely coupled and makes it easier to scale features.
 */
export const EventBus = new Phaser.Events.EventEmitter();
