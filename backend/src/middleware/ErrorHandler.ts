import express from 'express';
import { extractErrorInfo, isCustomError, isOperationalError } from '../errors/CustomErrors';
import logger from '../services/LoggerService';

export interface ErrorResponse {
  success: false;
  error: {
    name: string;
    message: string;
    statusCode: number;
    timestamp: number;
    requestId?: string;
    details?: Record<string, any>;
  };
  // Include stack trace only in development
  stack?: string;
}

/**
 * Global error handling middleware
 * Should be used as the last middleware in the chain
 */
export function errorHandler(
  error: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  // Extract error information
  const errorInfo = extractErrorInfo(error);
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] as string || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Log the error with full context
  logger.error('Request error occurred', error, {
    service: 'ErrorHandler',
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    statusCode: errorInfo.statusCode,
    isOperational: errorInfo.isOperational,
    retryable: errorInfo.retryable
  });

  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      name: errorInfo.name,
      message: errorInfo.message,
      statusCode: errorInfo.statusCode,
      timestamp: Date.now(),
      requestId
    }
  };

  // Add details in development or for operational errors
  if (isDevelopment || isOperationalError(error)) {
    if (errorInfo.context.details) {
      errorResponse.error.details = errorInfo.context.details;
    }
  }

  // Add stack trace only in development for debugging
  if (isDevelopment && errorInfo.stack) {
    errorResponse.stack = errorInfo.stack;
  }

  // Send response with appropriate status code
  res.status(errorInfo.statusCode).json(errorResponse);
}

/**
 * Catch-all handler for unhandled async errors
 */
export function asyncErrorHandler(
  fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const error = {
    name: 'NotFoundError',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
    isOperational: true,
    retryable: false,
    context: {
      service: 'Router',
      method: req.method,
      path: req.path
    }
  };

  next(error);
}

/**
 * Request timeout handler
 */
export function timeoutHandler(timeout: number = 30000) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        const error = {
          name: 'TimeoutError',
          message: `Request timeout after ${timeout}ms`,
          statusCode: 408,
          isOperational: true,
          retryable: true,
          context: {
            service: 'TimeoutMiddleware',
            timeout,
            method: req.method,
            path: req.path
          }
        };
        
        next(error);
      }
    }, timeout);

    // Clear timeout when response is finished
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    
    next();
  };
}

/**
 * Rate limiting error handler
 */
export function rateLimitErrorHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  return (error: any) => {
    if (error.statusCode === 429) {
      const retryAfter = error.retryAfter || 60;
      res.set('Retry-After', retryAfter.toString());
      
      logger.warn('Rate limit exceeded', {
        service: 'RateLimiter',
        ip: req.ip,
        method: req.method,
        path: req.path,
        retryAfter
      });
    }
    
    next(error);
  };
}

/**
 * CORS error handler
 */
export function corsErrorHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  // Set CORS headers for error responses
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  next();
}

/**
 * Security headers for error responses
 */
export function securityHeadersHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  // Add security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  
  next();
}

/**
 * Process exit handler for critical errors
 */
export function handleCriticalError(error: any): void {
  logger.error('Critical error occurred', error, {
    service: 'CriticalErrorHandler',
    critical: true
  });

  // For non-operational errors in production, we might want to restart the process
  if (!isOperationalError(error) && process.env.NODE_ENV === 'production') {
    logger.error('Non-operational error in production, considering graceful shutdown', error);
    
    // Give time for the error to be logged before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
}

/**
 * Graceful shutdown handler
 */
export function gracefulShutdown(signal: string): void {
  logger.info(`Received ${signal}, starting graceful shutdown`, {
    service: 'GracefulShutdown',
    signal
  });

  // Give ongoing requests time to complete
  setTimeout(() => {
    logger.info('Graceful shutdown completed', {
      service: 'GracefulShutdown'
    });
    process.exit(0);
  }, 5000);
}

// Set up process error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', error, {
    service: 'ProcessErrorHandler',
    type: 'uncaughtException'
  });
  handleCriticalError(error);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection', reason, {
    service: 'ProcessErrorHandler',
    type: 'unhandledRejection',
    promise: promise.toString()
  });
  handleCriticalError(reason);
});

// Graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT')); 