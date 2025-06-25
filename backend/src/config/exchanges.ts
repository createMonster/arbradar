// Exchange configuration definitions
export interface ExchangeConfig {
  enableRateLimit: boolean;
  timeout: number;
  rateLimit?: number;
  options: {
    defaultType: string;
    recvWindow?: number;  // Binance-specific option
    [key: string]: any;   // Allow other exchange-specific options
  };
  // Hyperliquid-specific fields
  walletAddress?: string;
  privateKey?: string;
}

// Centralized cache configuration
export const CACHE_CONFIG = {
  TICKERS_TTL: 10000,         // 10 seconds for price data (frequent updates needed)
  FUNDING_RATES_TTL: 600000,  // 10 minutes for funding rates (stable data)
  PROCESSED_DATA_TTL: 10000,  // 10 seconds to match price data freshness (arbitrage needs real-time data)
  HEALTH_CHECK_TTL: 60000     // 1 minute for health checks
};

// Exchange-specific configurations
export const EXCHANGE_CONFIGS: { [key: string]: ExchangeConfig } = {
  binance: {
    enableRateLimit: true,
    timeout: 20000,
    options: { 
      defaultType: 'swap',
      recvWindow: 10000    // Binance-specific: increase receive window
    }
  },
  
  okx: {
    enableRateLimit: true,
    timeout: 30000,
    options: { 
      defaultType: 'swap' 
    }
  },
  
  bitget: {
    enableRateLimit: true,
    timeout: 30000,
    options: { 
      defaultType: 'swap' 
    }
  },
  
  bybit: {
    enableRateLimit: true,
    timeout: 30000,
    options: { 
      defaultType: 'linear'  // Bybit uses 'linear' for perpetual futures
    }
  },
  
  hyperliquid: {
    enableRateLimit: true,
    timeout: 30000,
    rateLimit: 100,        // Conservative rate limiting for DEX
    options: { 
      defaultType: 'swap',
      // Hyperliquid-specific options can be added here
    }
    // Note: walletAddress and privateKey should be set via environment variables
    // walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS,
    // privateKey: process.env.HYPERLIQUID_PRIVATE_KEY
  }
};

// Exchange-specific performance settings
export const EXCHANGE_PERFORMANCE = {
  // Optimal batch sizes per exchange based on their rate limits
  batchSizes: {
    'binance': 50,      // Binance has high rate limits
    'okx': 30,          // OKX is moderately fast
    'bitget': 20,       // Bitget is slower
    'bybit': 40,        // Bybit is quite fast
    'hyperliquid': 10   // Conservative for DEX
  },
  
  // Optimal delays per exchange (in milliseconds)
  delays: {
    'binance': 100,     // Very fast
    'okx': 200,         // Fast
    'bitget': 500,      // Slower
    'bybit': 150,       // Fast
    'hyperliquid': 200  // Moderate for DEX
  }
};

// Exchange-specific features and capabilities
export const EXCHANGE_FEATURES = {
  supportsBulkFundingRates: ['binance', 'okx', 'bitget'],
  supportsWebSocket: ['binance', 'okx', 'bitget', 'bybit', 'hyperliquid'],
  requiresPassphrase: ['okx'],
  requiresWallet: ['hyperliquid'],
  isDecentralized: ['hyperliquid']
};

// Helper function to get exchange config with environment variable overrides
export function getExchangeConfig(exchangeName: string): ExchangeConfig {
  const baseConfig = EXCHANGE_CONFIGS[exchangeName];
  if (!baseConfig) {
    throw new Error(`Unsupported exchange: ${exchangeName}`);
  }

  // Handle Hyperliquid wallet configuration from environment
  if (exchangeName === 'hyperliquid') {
    return {
      ...baseConfig,
      walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS,
      privateKey: process.env.HYPERLIQUID_PRIVATE_KEY
    };
  }

  return baseConfig;
}

// Validation function for exchange configurations
export function validateExchangeConfig(exchangeName: string, config: ExchangeConfig): boolean {
  // Basic validation
  if (!config.enableRateLimit || !config.timeout || !config.options) {
    return false;
  }

  // Exchange-specific validation
  switch (exchangeName) {
    case 'hyperliquid':
      if (!config.walletAddress || !config.privateKey) {
        console.error('❌ Hyperliquid requires walletAddress and privateKey');
        return false;
      }
      break;
    
    case 'okx':
      // OKX might require additional validation for passphrase
      break;
      
    default:
      break;
  }

  return true;
} 