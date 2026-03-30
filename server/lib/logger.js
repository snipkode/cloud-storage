const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for log messages
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}] ${message}`;
    
    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    // Add stack trace for errors
    if (stack) {
      msg += `\n${stack}`;
    }
    
    return msg;
  })
);

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: logFormat,
  defaultMeta: { 
    service: 'cloud-storage',
    env: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Daily rotating file for errors (persistent)
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat
    }),
    
    // Daily rotating file for warnings (persistent)
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'warn-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat
    }),
    
    // Daily rotating file for info (persistent)
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'info-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat
    }),
    
    // Daily rotating file for debug (persistent, development only)
    ...(process.env.NODE_ENV === 'development' ? [
      new winston.transports.DailyRotateFile({
        filename: path.join(logsDir, 'debug-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'debug',
        maxSize: '20m',
        maxFiles: '7d',
        format: logFormat
      })
    ] : []),
    
    // Console output (for development and debugging)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ],
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ],
  rejectionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

// Create specific log streams for different purposes
const auditLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'cloud-storage-audit' },
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d' // Keep audit logs longer
    })
  ]
});

const accessLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: 'cloud-storage-access' },
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'access-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '30d'
    })
  ]
});

// Helper functions for common logging patterns
const logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    accessLogger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.uid || 'anonymous'
    });
  });
  
  next();
};

const logAudit = (action, details, user) => {
  auditLogger.info('Audit Event', {
    action,
    details,
    userId: user?.uid,
    userEmail: user?.email,
    timestamp: new Date().toISOString()
  });
};

// Export the logger and helpers
module.exports = {
  // Winston logger instance
  logger,
  
  // Specialized loggers
  auditLogger,
  accessLogger,
  
  // Helper functions
  logRequest,
  logAudit,
  
  // Convenience methods (backward compatible)
  debug: (message, ...args) => logger.debug(message, ...args),
  info: (message, ...args) => logger.info(message, ...args),
  warn: (message, ...args) => logger.warn(message, ...args),
  error: (message, ...args) => logger.error(message, ...args)
};
