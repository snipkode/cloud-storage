/**
 * Simple logging utility with log levels
 * Prevents sensitive data from being logged in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log debug information (only in development)
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments to log
 */
const debug = (message, ...args) => {
  if (isDevelopment) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
};

/**
 * Log info information (only in development)
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments to log
 */
const info = (message, ...args) => {
  if (isDevelopment) {
    console.log(`[INFO] ${message}`, ...args);
  }
};

/**
 * Log warning information
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments to log
 */
const warn = (message, ...args) => {
  console.warn(`[WARN] ${message}`, ...args);
};

/**
 * Log error information (safe for production - use for non-sensitive errors)
 * @param {string} message - Log message
 * @param {...any} args - Additional arguments to log
 */
const error = (message, ...args) => {
  // In production, only log the message, not the full error object
  if (isDevelopment) {
    console.error(`[ERROR] ${message}`, ...args);
  } else {
    console.error(`[ERROR] ${message}`);
  }
};

module.exports = {
  debug,
  info,
  warn,
  error,
  isDevelopment
};
