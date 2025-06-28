import { LogContext } from '../services/LoggerService';

export interface ErrorContext extends LogContext {
  statusCode?: number;
  isOperational?: boolean;
  retryable?: boolean;
  details?: Record<string, any>;
}

/**
 * Base custom error class that all other errors extend
 */
export abstract class BaseError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly retryable: boolean;
  public readonly context: ErrorContext;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    retryable: boolean = false,
    context: ErrorContext = {}
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.retryable = retryable;
    this.context = context;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, BaseError.prototype);
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      retryable: this.retryable,
      context: this.context,
      stack: this.stack
    };
  }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends BaseError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 400, true, false, {
      ...context,
      service: context.service || 'ValidationService'
    });
  }
}

/**
 * Authentication errors (401)
 */
export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication failed', context: ErrorContext = {}) {
    super(message, 401, true, false, {
      ...context,
      service: context.service || 'AuthService'
    });
  }
}

/**
 * Authorization errors (403)
 */
export class AuthorizationError extends BaseError {
  constructor(message: string = 'Insufficient permissions', context: ErrorContext = {}) {
    super(message, 403, true, false, {
      ...context,
      service: context.service || 'AuthService'
    });
  }
}

/**
 * Resource not found errors (404)
 */
export class NotFoundError extends BaseError {
  constructor(resource: string, context: ErrorContext = {}) {
    super(`${resource} not found`, 404, true, false, {
      ...context,
      resource
    });
  }
}

/**
 * Rate limiting errors (429)
 */
export class RateLimitError extends BaseError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number, context: ErrorContext = {}) {
    super(message, 429, true, true, {
      ...context,
      retryAfter,
      service: context.service || 'RateLimitService'
    });
  }
}

/**
 * External service/API errors (502/503/504)
 */
export class ExternalServiceError extends BaseError {
  public readonly serviceName: string;

  constructor(
    serviceName: string, 
    message: string, 
    statusCode: number = 503,
    retryable: boolean = true,
    context: ErrorContext = {}
  ) {
    super(`External service error [${serviceName}]: ${message}`, statusCode, true, retryable, {
      ...context,
      serviceName,
      service: context.service || 'ExternalService'
    });
    
    this.serviceName = serviceName;
  }
}

/**
 * Exchange-specific errors
 */
export class ExchangeError extends ExternalServiceError {
  public readonly exchange: string;
  public readonly operation: string;

  constructor(
    exchange: string,
    operation: string,
    message: string,
    statusCode: number = 503,
    retryable: boolean = true,
    context: ErrorContext = {}
  ) {
    super(exchange, `${operation} failed: ${message}`, statusCode, retryable, {
      ...context,
      exchange,
      operation,
      service: 'ExchangeService'
    });
    
    this.exchange = exchange;
    this.operation = operation;
  }
}

/**
 * Network/connectivity errors
 */
export class NetworkError extends BaseError {
  constructor(message: string = 'Network error occurred', context: ErrorContext = {}) {
    super(message, 503, true, true, {
      ...context,
      service: context.service || 'NetworkService'
    });
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends BaseError {
  public readonly timeout: number;

  constructor(operation: string, timeout: number, context: ErrorContext = {}) {
    super(`Operation timed out: ${operation} (${timeout}ms)`, 408, true, true, {
      ...context,
      operation,
      timeout,
      service: context.service || 'TimeoutService'
    });
    
    this.timeout = timeout;
  }
}

/**
 * Data processing errors
 */
export class DataProcessingError extends BaseError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 422, true, false, {
      ...context,
      service: context.service || 'DataService'
    });
  }
}

/**
 * Cache errors
 */
export class CacheError extends BaseError {
  constructor(operation: string, message: string, context: ErrorContext = {}) {
    super(`Cache ${operation} failed: ${message}`, 500, true, true, {
      ...context,
      operation,
      service: 'CacheService'
    });
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends BaseError {
  constructor(message: string, context: ErrorContext = {}) {
    super(`Configuration error: ${message}`, 500, false, false, {
      ...context,
      service: 'ConfigService'
    });
  }
}

/**
 * Business logic errors
 */
export class BusinessLogicError extends BaseError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 422, true, false, {
      ...context,
      service: context.service || 'BusinessService'
    });
  }
}

/**
 * Database errors
 */
export class DatabaseError extends BaseError {
  constructor(operation: string, message: string, retryable: boolean = true, context: ErrorContext = {}) {
    super(`Database ${operation} failed: ${message}`, 500, true, retryable, {
      ...context,
      operation,
      service: 'DatabaseService'
    });
  }
}

/**
 * Type guard to check if error is a custom error
 */
export function isCustomError(error: any): error is BaseError {
  return error instanceof BaseError;
}

/**
 * Type guard to check if error is operational (expected/handled)
 */
export function isOperationalError(error: any): boolean {
  if (isCustomError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * Type guard to check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (isCustomError(error)) {
    return error.retryable;
  }
  return false;
}

/**
 * Extract error information for logging
 */
export function extractErrorInfo(error: any): {
  name: string;
  message: string;
  statusCode: number;
  isOperational: boolean;
  retryable: boolean;
  context: ErrorContext;
  stack?: string;
} {
  if (isCustomError(error)) {
    return {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      retryable: error.retryable,
      context: error.context,
      stack: error.stack
    };
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      statusCode: 500,
      isOperational: false,
      retryable: false,
      context: {},
      stack: error.stack
    };
  }

  // Handle unknown error types
  return {
    name: 'UnknownError',
    message: String(error),
    statusCode: 500,
    isOperational: false,
    retryable: false,
    context: {}
  };
} 