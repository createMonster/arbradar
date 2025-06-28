import winston from 'winston';

// Create a persistent mock logger instance
const mockWinstonLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock winston to avoid actual file operations during tests
jest.mock('winston', () => ({
  createLogger: jest.fn(() => mockWinstonLogger),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    splat: jest.fn(),
    json: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

import logger from '../../src/services/LoggerService';

// Mock fs for directory creation
jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
}));

describe('LoggerService', () => {
  let loggerService: typeof logger;

  beforeEach(() => {
    // Clear only the mock logger calls, not the mock setup
    jest.clearAllMocks();
    loggerService = logger;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = logger;
      const instance2 = logger;
      expect(instance1).toBe(instance2);
    });
  });

  describe('Basic Logging Methods', () => {
    it('should call winston debug with correct parameters', () => {
      const message = 'Debug message';
      const context = { service: 'TestService' };

      loggerService.debug(message, context);

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(message, context);
    });

    it('should call winston info with correct parameters', () => {
      const message = 'Info message';
      const context = { service: 'TestService' };

      loggerService.info(message, context);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(message, context);
    });

    it('should call winston warn with correct parameters', () => {
      const message = 'Warning message';
      const context = { service: 'TestService' };

      loggerService.warn(message, context);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(message, context);
    });

    it('should handle error logging with Error object', () => {
      const message = 'Error occurred';
      const error = new Error('Test error');
      const context = { service: 'TestService' };

      loggerService.error(message, error, context);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(message, {
        ...context,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      });
    });

    it('should handle error logging with unknown error type', () => {
      const message = 'Error occurred';
      const error = 'String error';
      const context = { service: 'TestService' };

      loggerService.error(message, error, context);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(message, {
        ...context,
        error: 'String error',
      });
    });
  });

  describe('Performance Logging', () => {
    it('should create timer and log completion', (done) => {
      const operation = 'test-operation';
      const context = { service: 'TestService' };

      const endTimer = loggerService.startTimer(operation, context);

      // Simulate some work
      setTimeout(() => {
        endTimer();

        expect(mockWinstonLogger.info).toHaveBeenCalledWith(
          `Operation completed: ${operation}`,
          expect.objectContaining({
            ...context,
            operation,
            duration: expect.any(Number),
          })
        );

        done();
      }, 10);
    });

    it('should measure duration correctly', (done) => {
      const operation = 'test-operation';
      const endTimer = loggerService.startTimer(operation);

      setTimeout(() => {
        endTimer();

        const call = mockWinstonLogger.info.mock.calls[0];
        const duration = call[1].duration;

        expect(duration).toBeGreaterThan(8); // Should be around 10ms
        expect(duration).toBeLessThan(50); // Allow for some variance

        done();
      }, 10);
    });
  });

  describe('Exchange Logging', () => {
    it('should log exchange messages with correct context', () => {
      const exchange = 'binance';
      const message = 'Fetching tickers';
      const context = { symbol: 'BTC/USDT' };

      loggerService.exchangeLog('info', exchange, message, context);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(message, {
        ...context,
        service: 'ExchangeService',
        exchange,
      });
    });

    it('should support different log levels for exchange logging', () => {
      const exchange = 'binance';
      const message = 'Error occurred';

      loggerService.exchangeLog('error', exchange, message);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(message, {
        service: 'ExchangeService',
        exchange,
      });
    });
  });

  describe('API Logging', () => {
    it('should log successful API requests', () => {
      const method = 'GET';
      const path = '/api/spreads';
      const statusCode = 200;
      const duration = 150;

      loggerService.apiLog(method, path, statusCode, duration);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        `${method} ${path} ${statusCode}`,
        {
          service: 'API',
          method,
          path,
          statusCode,
          duration,
        }
      );
    });

    it('should log failed API requests with warning level', () => {
      const method = 'POST';
      const path = '/api/refresh';
      const statusCode = 500;
      const duration = 200;
      const context = { error: 'Internal server error' };

      loggerService.apiLog(method, path, statusCode, duration, context);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
        `${method} ${path} ${statusCode}`,
        {
          service: 'API',
          method,
          path,
          statusCode,
          duration,
          error: 'Internal server error',
        }
      );
    });
  });

  describe('Data Logging', () => {
    it('should log data processing operations', () => {
      const operation = 'process-spreads';
      const count = 100;
      const duration = 500;

      loggerService.dataLog(operation, count, duration);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        `Data processing: ${operation}`,
        {
          service: 'DataService',
          operation,
          count,
          duration,
        }
      );
    });
  });

  describe('Cache Logging', () => {
    it('should log cache operations', () => {
      const operation = 'hit';
      const key = 'binance:tickers';

      loggerService.cacheLog(operation, key);

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
        `Cache ${operation}: ${key}`,
        {
          service: 'CacheService',
          cacheOperation: operation,
          cacheKey: key,
        }
      );
    });
  });

  describe('Health Logging', () => {
    it('should log healthy components with info level', () => {
      const component = 'database';
      const status = 'healthy';
      const details = { responseTime: 50 };

      loggerService.healthLog(component, status, details);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        `Health check: ${component} is ${status}`,
        {
          service: 'HealthService',
          component,
          status,
          details,
        }
      );
    });

    it('should log unhealthy components with warning level', () => {
      const component = 'exchange-api';
      const status = 'unhealthy';
      const details = { error: 'Connection timeout' };

      loggerService.healthLog(component, status, details);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
        `Health check: ${component} is ${status}`,
        {
          service: 'HealthService',
          component,
          status,
          details,
        }
      );
    });
  });

  describe('Logger Access', () => {
    it('should provide access to underlying winston logger', () => {
      const winstonLogger = loggerService.getLogger();
      expect(winstonLogger).toBe(mockWinstonLogger);
    });
  });
});

export {}; 