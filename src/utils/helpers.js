const logger = require('./logger');

/**
 * Generate a unique ID
 */
function generateId() {
  return require('uuid').v4();
}

/**
 * Get timestamp in milliseconds
 */
function getCurrentTimestamp() {
  return Date.now();
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Delay execution for specified milliseconds
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clone an object deeply
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if an object is empty
 */
function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

/**
 * Get current system info
 */
function getSystemInfo() {
  const os = require('os');
  return {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    memory: {
      total: formatBytes(os.totalmem()),
      free: formatBytes(os.freemem()),
    },
  };
}

module.exports = {
  generateId,
  getCurrentTimestamp,
  formatBytes,
  delay,
  deepClone,
  isEmpty,
  getSystemInfo,
  logger,
};
