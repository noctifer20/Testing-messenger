/**
 * Frontend Logger Utility
 * Provides structured logging with different log levels and environment-aware behavior
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

const LOG_LEVEL_NAMES = {
  [LOG_LEVELS.DEBUG]: 'DEBUG',
  [LOG_LEVELS.INFO]: 'INFO',
  [LOG_LEVELS.WARN]: 'WARN',
  [LOG_LEVELS.ERROR]: 'ERROR',
};

class Logger {
  constructor() {
    this.logLevel = this.getLogLevel();
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.enableColors = this.isDevelopment && typeof window !== 'undefined';
  }

  getLogLevel() {
    return LOG_LEVELS.DEBUG;
    // Check for log level in localStorage or environment variable
    if (typeof window !== 'undefined') {
      const storedLevel = localStorage.getItem('LOG_LEVEL');
      if (storedLevel) {
        return parseInt(storedLevel, 10);
      }
    }

    // Default: show all logs in development, only warnings and errors in production
    return this.isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;
  }

  setLogLevel(level) {
    this.logLevel = level;
    if (typeof window !== 'undefined') {
      localStorage.setItem('LOG_LEVEL', level.toString());
    }
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level] || 'LOG';
    const prefix = `[${timestamp}] [${levelName}]`;

    if (this.enableColors) {
      const colors = {
        [LOG_LEVELS.DEBUG]: 'color: #888',
        [LOG_LEVELS.INFO]: 'color: #2196F3',
        [LOG_LEVELS.WARN]: 'color: #FF9800',
        [LOG_LEVELS.ERROR]: 'color: #F44336',
      };
      return [`%c${prefix}`, colors[level] || '', message, ...args];
    }

    return [prefix, message, ...args];
  }

  shouldLog(level) {
    return level >= this.logLevel;
  }

  debug(message, ...args) {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      const formatted = this.formatMessage(LOG_LEVELS.DEBUG, message, ...args);
      if (this.enableColors) {
        console.log(...formatted);
      } else {
        console.log(...formatted.slice(1));
      }
    }
  }

  info(message, ...args) {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      const formatted = this.formatMessage(LOG_LEVELS.INFO, message, ...args);
      if (this.enableColors) {
        console.log(...formatted);
      } else {
        console.log(...formatted.slice(1));
      }
    }
  }

  warn(message, ...args) {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      const formatted = this.formatMessage(LOG_LEVELS.WARN, message, ...args);
      if (this.enableColors) {
        console.warn(...formatted);
      } else {
        console.warn(...formatted.slice(1));
      }
    }
  }

  error(message, ...args) {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      const formatted = this.formatMessage(LOG_LEVELS.ERROR, message, ...args);
      if (this.enableColors) {
        console.error(...formatted);
      } else {
        console.error(...formatted.slice(1));
      }
    }
  }

  // Group related logs together
  group(label, callback) {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  }

  // Log with context/scope
  withContext(context) {
    return {
      debug: (message, ...args) =>
        this.debug(`[${context}] ${message}`, ...args),
      info: (message, ...args) => this.info(`[${context}] ${message}`, ...args),
      warn: (message, ...args) => this.warn(`[${context}] ${message}`, ...args),
      error: (message, ...args) =>
        this.error(`[${context}] ${message}`, ...args),
    };
  }
}

// Create and export a singleton instance
const logger = new Logger();

// Export LOG_LEVELS for external configuration
export { LOG_LEVELS };
export default logger;
