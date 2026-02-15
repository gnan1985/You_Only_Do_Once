const robotjs = require('robotjs');
const screenshot = require('screenshot-desktop');
const { generateId, getCurrentTimestamp } = require('../utils/helpers');
const logger = require('../utils/logger');

class Recorder {
  constructor() {
    this.isRecording = false;
    this.isPaused = false;
    this.recordingStartTime = null;
    this.actions = [];
    this.intents = [];
    this.recordingInterval = null;
    this.lastMousePos = { x: 0, y: 0 };
    this.workflowName = '';
  }

  /**
   * Start recording
   */
  start(workflowName) {
    if (this.isRecording) {
      logger.warn('Recording already in progress');
      return;
    }

    this.isRecording = true;
    this.isPaused = false;
    this.recordingStartTime = getCurrentTimestamp();
    this.actions = [];
    this.intents = [];
    this.workflowName = workflowName || `Workflow_${Date.now()}`;

    logger.info(`Recording started: ${this.workflowName}`);

    // Capture mouse position and screen changes periodically
    this.recordingInterval = setInterval(() => {
      if (!this.isPaused) {
        this.captureMouseMovement();
      }
    }, parseInt(process.env.RECORD_INTERVAL) || 500);
  }

  /**
   * Stop recording and return collected data
   */
  stop() {
    if (!this.isRecording) {
      logger.warn('No recording in progress');
      return null;
    }

    clearInterval(this.recordingInterval);
    this.isRecording = false;
    this.isPaused = false;

    const recordedData = {
      name: this.workflowName,
      startTime: this.recordingStartTime,
      endTime: getCurrentTimestamp(),
      duration: getCurrentTimestamp() - this.recordingStartTime,
      actionCount: this.actions.length,
      intentCount: this.intents.length,
      actions: this.actions,
      intents: this.intents,
    };

    logger.info(
      `Recording stopped. Captured ${this.actions.length} actions and ${this.intents.length} intents`
    );

    return recordedData;
  }

  /**
   * Pause recording (without clearing data)
   */
  pause() {
    if (!this.isRecording) {
      logger.warn('No recording in progress');
      return;
    }

    this.isPaused = true;
    logger.info('Recording paused');
  }

  /**
   * Resume recording
   */
  resume() {
    if (!this.isRecording) {
      logger.warn('No recording in progress');
      return;
    }

    this.isPaused = false;
    logger.info('Recording resumed');
  }

  /**
   * Add an intent description
   */
  addIntent(intentDescription) {
    if (!this.isRecording) {
      logger.warn('No recording in progress');
      return;
    }

    const intent = {
      id: generateId(),
      description: intentDescription,
      timestamp: getCurrentTimestamp() - this.recordingStartTime,
      actionIndex: this.actions.length,
      createdAt: new Date().toISOString(),
    };

    this.intents.push(intent);
    logger.info(`Intent added: "${intentDescription}"`);
  }

  /**
   * Capture mouse movement
   */
  async captureMouseMovement() {
    try {
      const mousePos = robotjs.getMousePos();

      // Only record if mouse moved significantly
      const distance = Math.sqrt(
        Math.pow(mousePos.x - this.lastMousePos.x, 2) +
        Math.pow(mousePos.y - this.lastMousePos.y, 2)
      );

      if (distance > 5) {
        // Only record if moved more than 5 pixels
        const action = {
          id: generateId(),
          type: 'mouse-move',
          timestamp: getCurrentTimestamp() - this.recordingStartTime,
          x: mousePos.x,
          y: mousePos.y,
        };

        this.actions.push(action);
        this.lastMousePos = { ...mousePos };
      }
    } catch (error) {
      logger.error('Error capturing mouse movement:', error);
    }
  }

  /**
   * Record mouse click
   */
  recordMouseClick(button = 'left') {
    if (!this.isRecording || this.isPaused) {
      return;
    }

    try {
      const mousePos = robotjs.getMousePos();
      const action = {
        id: generateId(),
        type: 'mouse-click',
        timestamp: getCurrentTimestamp() - this.recordingStartTime,
        button,
        x: mousePos.x,
        y: mousePos.y,
      };

      this.actions.push(action);
      logger.debug(`Mouse click recorded: ${button} at (${mousePos.x}, ${mousePos.y})`);
    } catch (error) {
      logger.error('Error recording mouse click:', error);
    }
  }

  /**
   * Record keyboard input
   */
  recordKeyboardInput(key, text = '') {
    if (!this.isRecording || this.isPaused) {
      return;
    }

    try {
      const action = {
        id: generateId(),
        type: 'keyboard',
        timestamp: getCurrentTimestamp() - this.recordingStartTime,
        key,
        text,
      };

      this.actions.push(action);
      logger.debug(`Keyboard input recorded: ${key}`);
    } catch (error) {
      logger.error('Error recording keyboard input:', error);
    }
  }

  /**
   * Record application context change
   */
  recordAppContextChange(appName, windowTitle) {
    if (!this.isRecording || this.isPaused) {
      return;
    }

    try {
      const action = {
        id: generateId(),
        type: 'app-context-change',
        timestamp: getCurrentTimestamp() - this.recordingStartTime,
        appName,
        windowTitle,
      };

      this.actions.push(action);
      logger.info(`App context changed: ${appName} - ${windowTitle}`);
    } catch (error) {
      logger.error('Error recording app context change:', error);
    }
  }

  /**
   * Get current recording state
   */
  getState() {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      workflowName: this.workflowName,
      actionCount: this.actions.length,
      intentCount: this.intents.length,
      duration: this.isRecording ? getCurrentTimestamp() - this.recordingStartTime : null,
    };
  }
}

module.exports = new Recorder();
