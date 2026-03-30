const { accessLogger } = require('../lib/logger');

/**
 * Middleware to log all HTTP requests with details
 * Logs: method, URL, status, duration, IP, user agent, user ID
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Attach request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.originalUrl || req.url;
    
    // Skip logging for health checks and static files
    if (route === '/health' || route.startsWith('/favicon')) {
      return;
    }
    
    accessLogger.info('HTTP Request', {
      requestId,
      method: req.method,
      url: route,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.uid || 'anonymous',
      authMethod: req.user?.authMethod || 'none'
    });
  });
  
  // Log error if request fails
  res.on('close', () => {
    if (res.headersSent && !res.writableEnded) {
      accessLogger.warn('Request aborted', {
        requestId,
        method: req.method,
        url: req.originalUrl
      });
    }
  });
  
  next();
};

/**
 * Log successful authentication
 */
const logAuthSuccess = (user, authMethod) => {
  accessLogger.info('Authentication Success', {
    userId: user.uid,
    email: user.email,
    authMethod,
    role: user.role,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log failed authentication
 */
const logAuthFailure = (reason, details = {}) => {
  accessLogger.warn('Authentication Failure', {
    reason,
    ...details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log sensitive operations for audit trail
 */
const logSensitiveOperation = (operation, user, details = {}) => {
  accessLogger.info('Sensitive Operation', {
    operation,
    userId: user?.uid,
    userEmail: user?.email,
    ...details,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  requestLogger,
  logAuthSuccess,
  logAuthFailure,
  logSensitiveOperation
};
