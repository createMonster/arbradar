import {
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ExternalServiceError,
  ExchangeError,
  NetworkError,
  TimeoutError,
  DataProcessingError,
  CacheError,
  ConfigurationError,
  BusinessLogicError,
  DatabaseError,
  isCustomError,
  isOperationalError,
  isRetryableError,
  extractErrorInfo,
} from '../../src/errors/CustomErrors';

describe('CustomErrors', () => {
  describe('BaseError', () => {
    class TestError extends BaseError {
      constructor(message: string) {
        super(message, 500, true, false, { service: 'TestService' });
      }
    }

    it('should create error with correct properties', () => {
      const message = 'Test error message';
      const error = new TestError(message);

      expect(error.message).toBe(message);
      expect(error.name).toBe('TestError');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.retryable).toBe(false);
      expect(error.context.service).toBe('TestService');
      expect(error.stack).toBeDefined();
    });

    it('should be instanceof Error and BaseError', () => {
      const error = new TestError('Test');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof BaseError).toBe(true);
    });

    it('should serialize to JSON correctly', () => {
      const error = new TestError('Test error');
      const json = error.toJSON();

      expect(json).toMatchObject({
        name: 'TestError',
        message: 'Test error',
        statusCode: 500,
        isOperational: true,
        retryable: false,
        context: { service: 'TestService' },
        stack: expect.any(String),
      });
    });
  });

  describe('ValidationError', () => {
    it('should create with correct defaults', () => {
      const error = new ValidationError('Invalid input');

      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.retryable).toBe(false);
      expect(error.context.service).toBe('ValidationService');
    });

    it('should preserve custom context', () => {
      const context = { field: 'email', service: 'UserService' };
      const error = new ValidationError('Invalid email', context);

      expect(error.context.field).toBe('email');
      expect(error.context.service).toBe('UserService');
    });
  });

  describe('AuthenticationError', () => {
    it('should create with default message', () => {
      const error = new AuthenticationError();

      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.isOperational).toBe(true);
      expect(error.retryable).toBe(false);
    });

    it('should accept custom message', () => {
      const error = new AuthenticationError('Token expired');

      expect(error.message).toBe('Token expired');
    });
  });

  describe('AuthorizationError', () => {
    it('should create with default message', () => {
      const error = new AuthorizationError();

      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('should create with resource name in message', () => {
      const error = new NotFoundError('User');

      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.context.resource).toBe('User');
    });
  });

  describe('RateLimitError', () => {
    it('should create with default message', () => {
      const error = new RateLimitError();

      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
      expect(error.retryable).toBe(true);
    });

    it('should include retry after information', () => {
      const error = new RateLimitError('Too many requests', 300);

      expect(error.context.retryAfter).toBe(300);
    });
  });

  describe('ExternalServiceError', () => {
    it('should create with service name in message', () => {
      const error = new ExternalServiceError('PaymentAPI', 'Connection failed');

      expect(error.message).toBe('External service error [PaymentAPI]: Connection failed');
      expect(error.serviceName).toBe('PaymentAPI');
      expect(error.statusCode).toBe(503);
      expect(error.retryable).toBe(true);
    });

    it('should accept custom status code and retryable flag', () => {
      const error = new ExternalServiceError('API', 'Unauthorized', 401, false);

      expect(error.statusCode).toBe(401);
      expect(error.retryable).toBe(false);
    });
  });

  describe('ExchangeError', () => {
    it('should create with exchange and operation information', () => {
      const error = new ExchangeError('binance', 'fetchTickers', 'Rate limit exceeded');

      expect(error.message).toBe('External service error [binance]: fetchTickers failed: Rate limit exceeded');
      expect(error.exchange).toBe('binance');
      expect(error.operation).toBe('fetchTickers');
      expect(error.context.service).toBe('ExchangeService');
    });
  });

  describe('NetworkError', () => {
    it('should create with default message', () => {
      const error = new NetworkError();

      expect(error.message).toBe('Network error occurred');
      expect(error.statusCode).toBe(503);
      expect(error.retryable).toBe(true);
    });
  });

  describe('TimeoutError', () => {
    it('should create with operation and timeout information', () => {
      const error = new TimeoutError('fetchData', 5000);

      expect(error.message).toBe('Operation timed out: fetchData (5000ms)');
      expect(error.timeout).toBe(5000);
      expect(error.statusCode).toBe(408);
      expect(error.retryable).toBe(true);
    });
  });

  describe('DataProcessingError', () => {
    it('should create with correct status code', () => {
      const error = new DataProcessingError('Invalid data format');

      expect(error.statusCode).toBe(422);
      expect(error.isOperational).toBe(true);
      expect(error.retryable).toBe(false);
    });
  });

  describe('CacheError', () => {
    it('should create with operation in message', () => {
      const error = new CacheError('get', 'Connection lost');

      expect(error.message).toBe('Cache get failed: Connection lost');
      expect(error.context.service).toBe('CacheService');
      expect(error.retryable).toBe(true);
    });
  });

  describe('ConfigurationError', () => {
    it('should create as non-operational error', () => {
      const error = new ConfigurationError('Missing API key');

      expect(error.message).toBe('Configuration error: Missing API key');
      expect(error.isOperational).toBe(false);
      expect(error.retryable).toBe(false);
    });
  });

  describe('BusinessLogicError', () => {
    it('should create with correct status code', () => {
      const error = new BusinessLogicError('Insufficient balance');

      expect(error.statusCode).toBe(422);
      expect(error.retryable).toBe(false);
    });
  });

  describe('DatabaseError', () => {
    it('should create with operation in message', () => {
      const error = new DatabaseError('insert', 'Duplicate key violation');

      expect(error.message).toBe('Database insert failed: Duplicate key violation');
      expect(error.context.service).toBe('DatabaseService');
      expect(error.retryable).toBe(true);
    });

    it('should accept custom retryable flag', () => {
      const error = new DatabaseError('select', 'Table not found', false);

      expect(error.retryable).toBe(false);
    });
  });

  describe('Type Guards', () => {
    describe('isCustomError', () => {
      it('should return true for custom errors', () => {
        const error = new ValidationError('Test');
        expect(isCustomError(error)).toBe(true);
      });

      it('should return false for standard errors', () => {
        const error = new Error('Standard error');
        expect(isCustomError(error)).toBe(false);
      });

      it('should return false for non-error objects', () => {
        expect(isCustomError('string')).toBe(false);
        expect(isCustomError(null)).toBe(false);
        expect(isCustomError(undefined)).toBe(false);
      });
    });

    describe('isOperationalError', () => {
      it('should return true for operational custom errors', () => {
        const error = new ValidationError('Test');
        expect(isOperationalError(error)).toBe(true);
      });

      it('should return false for non-operational custom errors', () => {
        const error = new ConfigurationError('Test');
        expect(isOperationalError(error)).toBe(false);
      });

      it('should return false for standard errors', () => {
        const error = new Error('Standard error');
        expect(isOperationalError(error)).toBe(false);
      });
    });

    describe('isRetryableError', () => {
      it('should return true for retryable errors', () => {
        const error = new NetworkError('Connection failed');
        expect(isRetryableError(error)).toBe(true);
      });

      it('should return false for non-retryable errors', () => {
        const error = new ValidationError('Invalid input');
        expect(isRetryableError(error)).toBe(false);
      });

      it('should return false for standard errors', () => {
        const error = new Error('Standard error');
        expect(isRetryableError(error)).toBe(false);
      });
    });
  });

  describe('extractErrorInfo', () => {
    it('should extract info from custom errors', () => {
      const error = new ValidationError('Invalid email', { field: 'email' });
      const info = extractErrorInfo(error);

      expect(info).toMatchObject({
        name: 'ValidationError',
        message: 'Invalid email',
        statusCode: 400,
        isOperational: true,
        retryable: false,
        context: { field: 'email', service: 'ValidationService' },
        stack: expect.any(String),
      });
    });

    it('should extract info from standard errors', () => {
      const error = new Error('Standard error');
      const info = extractErrorInfo(error);

      expect(info).toMatchObject({
        name: 'Error',
        message: 'Standard error',
        statusCode: 500,
        isOperational: false,
        retryable: false,
        context: {},
        stack: expect.any(String),
      });
    });

    it('should handle unknown error types', () => {
      const error = 'String error';
      const info = extractErrorInfo(error);

      expect(info).toMatchObject({
        name: 'UnknownError',
        message: 'String error',
        statusCode: 500,
        isOperational: false,
        retryable: false,
        context: {},
      });
    });

    it('should handle null and undefined', () => {
      const nullInfo = extractErrorInfo(null);
      const undefinedInfo = extractErrorInfo(undefined);

      expect(nullInfo.message).toBe('null');
      expect(undefinedInfo.message).toBe('undefined');
    });
  });
});

export {}; 