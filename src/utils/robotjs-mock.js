/**
 * Mock robotjs for development without native compilation
 * Provides minimal interface for recorder.js
 * In production, users record actions and intents through the UI
 */

const logger = require('./logger');

const RobotjsMock = {
  // Mock mouse position - in UI-based recording, this is supplementary
  getMousePos: () => {
    return { x: 0, y: 0 };
  },

  // Mock keyboard methods - intents are captured through UI
  keyDown: (key) => {
    logger.debug(`[Mock] Key down: ${key}`);
  },

  keyUp: (key) => {
    logger.debug(`[Mock] Key up: ${key}`);
  },

  typeString: (text) => {
    logger.debug(`[Mock] Type string: ${text}`);
  },

  // Mouse methods
  moveMouse: (x, y) => {
    logger.debug(`[Mock] Move mouse to: ${x}, ${y}`);
  },

  mouseClick: (button = 'left') => {
    logger.debug(`[Mock] Mouse click: ${button}`);
  },

  mouseToggle: (down, button = 'left') => {
    logger.debug(`[Mock] Mouse toggle: ${down ? 'down' : 'up'} ${button}`);
  },
};

module.exports = RobotjsMock;
