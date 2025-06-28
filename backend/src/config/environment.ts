import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  LOG_LEVEL: string;
  
  // Cache TTLs
  CACHE_TTL_TICKERS: number;
  CACHE_TTL_FUNDING_RATES: number;
  CACHE_TTL_PROCESSED_DATA: number;
  
  // API Configuration
  API_RATE_LIMIT_WINDOW: number;
  API_RATE_LIMIT_MAX: number;
  
  // CORS
  CORS_ORIGINS: string[];
  
  // Hyperliquid (Optional)
  HYPERLIQUID_WALLET_ADDRESS?: string;
  HYPERLIQUID_PRIVATE_KEY?: string;
  
  // Health Check
  HEALTH_CHECK_TIMEOUT: number;
  HEALTH_CHECK_INTERVAL: number;
  
  // Development
  DEV_ENABLE_DEBUG_LOGS: boolean;
  DEV_ENABLE_CACHE_LOGS: boolean;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseStringArray(value: string | undefined, defaultValue: string[]): string[] {
  if (!value) return defaultValue;
  return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

export const env: EnvironmentConfig = {
  // Basic Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseNumber(process.env.PORT, 3001),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Cache TTLs
  CACHE_TTL_TICKERS: parseNumber(process.env.CACHE_TTL_TICKERS, 10000),
  CACHE_TTL_FUNDING_RATES: parseNumber(process.env.CACHE_TTL_FUNDING_RATES, 600000),
  CACHE_TTL_PROCESSED_DATA: parseNumber(process.env.CACHE_TTL_PROCESSED_DATA, 10000),
  
  // API Configuration
  API_RATE_LIMIT_WINDOW: parseNumber(process.env.API_RATE_LIMIT_WINDOW, 60000),
  API_RATE_LIMIT_MAX: parseNumber(process.env.API_RATE_LIMIT_MAX, 100),
  
  // CORS Origins
  CORS_ORIGINS: parseStringArray(process.env.CORS_ORIGINS, [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4000',
    'http://localhost:3002',
    'http://frontend:3000'
  ]),
  
  // Hyperliquid (Optional)
  HYPERLIQUID_WALLET_ADDRESS: process.env.HYPERLIQUID_WALLET_ADDRESS,
  HYPERLIQUID_PRIVATE_KEY: process.env.HYPERLIQUID_PRIVATE_KEY,
  
  // Health Check
  HEALTH_CHECK_TIMEOUT: parseNumber(process.env.HEALTH_CHECK_TIMEOUT, 5000),
  HEALTH_CHECK_INTERVAL: parseNumber(process.env.HEALTH_CHECK_INTERVAL, 30000),
  
  // Development
  DEV_ENABLE_DEBUG_LOGS: parseBoolean(process.env.DEV_ENABLE_DEBUG_LOGS, true),
  DEV_ENABLE_CACHE_LOGS: parseBoolean(process.env.DEV_ENABLE_CACHE_LOGS, true),
};

// Validate required environment variables
export function validateEnvironmentConfig(): void {
  const errors: string[] = [];
  
  // Check for required variables
  if (!env.PORT || env.PORT < 1 || env.PORT > 65535) {
    errors.push('PORT must be a valid port number (1-65535)');
  }
  
  if (!env.NODE_ENV) {
    errors.push('NODE_ENV is required');
  }
  
  // Validate Hyperliquid config if provided
  if (env.HYPERLIQUID_WALLET_ADDRESS && !env.HYPERLIQUID_PRIVATE_KEY) {
    errors.push('HYPERLIQUID_PRIVATE_KEY is required when HYPERLIQUID_WALLET_ADDRESS is provided');
  }
  
  if (env.HYPERLIQUID_PRIVATE_KEY && !env.HYPERLIQUID_WALLET_ADDRESS) {
    errors.push('HYPERLIQUID_WALLET_ADDRESS is required when HYPERLIQUID_PRIVATE_KEY is provided');
  }
  
  if (errors.length > 0) {
    console.error('❌ Environment Configuration Errors:');
    errors.forEach(error => console.error(`   • ${error}`));
    process.exit(1);
  }
  
  console.log('✅ Environment configuration validated successfully');
}

// Utility to check if running in production
export const isProduction = (): boolean => env.NODE_ENV === 'production';
export const isDevelopment = (): boolean => env.NODE_ENV === 'development';
export const isTest = (): boolean => env.NODE_ENV === 'test'; 