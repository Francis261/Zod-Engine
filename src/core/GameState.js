import Phaser from 'phaser';
import { EventBus } from './EventBus.js';

/**
 * A tiny state container for cross-scene game values.
 * In larger projects this can be replaced with a full Redux-like store.
 */
class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.isPaused = false;
    EventBus.emit('state:changed', this.getSnapshot());
  }

  setScore(score) {
    this.score = Math.max(0, score);
    EventBus.emit('state:score', this.score);
  }

  addScore(amount) {
    this.setScore(this.score + amount);
  }

  setHealth(health) {
    this.health = Phaser.Math.Clamp(health, 0, this.maxHealth);
    EventBus.emit('state:health', { current: this.health, max: this.maxHealth });
  }

  damage(amount) {
    this.setHealth(this.health - Math.abs(amount));
  }

  heal(amount) {
    this.setHealth(this.health + Math.abs(amount));
  }

  setPaused(isPaused) {
    this.isPaused = isPaused;
    EventBus.emit('state:pause', this.isPaused);
  }

  getSnapshot() {
    return {
      score: this.score,
      health: this.health,
      maxHealth: this.maxHealth,
      isPaused: this.isPaused
    };
  }
}

export const gameState = new GameState();
