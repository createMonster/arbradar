import winston from 'winston';
import { isDevelopment } from '../config/environment';

export interface LogContext {
  service?: string;
  exchange?: string;
  symbol?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}

class LoggerService {
  private logger: winston.Logger;
  private static instance: LoggerService;

  constructor() {
    // Custom format for better readability
    const customFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        const serviceTag = service ? `[${service}]` : '';
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level.toUpperCase()} ${serviceTag} ${message}${metaStr}`;
      })
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        const serviceTag = service ? `[${service}]` : '';
        const metaStr = Object.keys(meta).length && isDevelopment() ? ` ${JSON.stringify(meta, null, 2)}` : '';
        return `${timestamp} ${level} ${serviceTag} ${message}${metaStr}`;
      })
    );

    this.logger = winston.createLogger({
      level: isDevelopment() ? 'debug' : 'info',
      defaultMeta: {
        service: 'arb-radar-backend'
      },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: consoleFormat,
          level: isDevelopment() ? 'debug' : 'warn'
        }),
        
        // File transports for production
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: customFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: customFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ],
      
      // Handle uncaught exceptions and rejections
      exceptionHandlers: [
        new winston.transports.File({ 
          filename: 'logs/exceptions.log',
          format: customFormat 
        })
      ],
      
      rejectionHandlers: [
        new winston.transports.File({ 
          filename: 'logs/rejections.log',
          format: customFormat 
        })
      ]
    });

    // Ensure logs directory exists
    this.createLogsDirectory();
  }

  private createLogsDirectory(): void {
    const fs = require('fs');
    const path = require('path');
    
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  // Convenience methods for different log levels
  public debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  public info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  public error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    };
    
    this.logger.error(message, errorContext);
  }

  // Performance logging
  public startTimer(operation: string, context?: LogContext): () => void {
    const start = Date.now();
    
    return () => {
      const duration = Date.now() - start;
      this.info(`Operation completed: ${operation}`, {
        ...context,
        operation,
        duration
      });
    };
  }

  // Exchange-specific logging
  public exchangeLog(level: 'debug' | 'info' | 'warn' | 'error', exchange: string, message: string, context?: LogContext): void {
    const exchangeContext = {
      ...context,
      service: 'ExchangeService',
      exchange
    };

    this.logger[level](message, exchangeContext);
  }

  // API request logging
  public apiLog(method: string, path: string, statusCode: number, duration: number, context?: LogContext): void {
    const level = statusCode >= 400 ? 'warn' : 'info';
    
    this.logger[level](`${method} ${path} ${statusCode}`, {
      ...context,
      service: 'API',
      method,
      path,
      statusCode,
      duration
    });
  }

  // Data processing logging
  public dataLog(operation: string, count: number, duration: number, context?: LogContext): void {
    this.info(`Data processing: ${operation}`, {
      ...context,
      service: 'DataService',
      operation,
      count,
      duration
    });
  }

  // Cache logging
  public cacheLog(operation: 'hit' | 'miss' | 'set' | 'clear', key: string, context?: LogContext): void {
    this.debug(`Cache ${operation}: ${key}`, {
      ...context,
      service: 'CacheService',
      cacheOperation: operation,
      cacheKey: key
    });
  }

  // Health check logging
  public healthLog(component: string, status: 'healthy' | 'unhealthy', details?: any): void {
    const level = status === 'healthy' ? 'info' : 'warn';
    
    this.logger[level](`Health check: ${component} is ${status}`, {
      service: 'HealthService',
      component,
      status,
      details
    });
  }

  // Get the underlying Winston logger for advanced usage
  public getLogger(): winston.Logger {
    return this.logger;
  }
}

// Export singleton instance and type
export const logger = LoggerService.getInstance();
export default logger; 