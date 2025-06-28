// Exchange configuration definitions

// Market types that exchanges can support
export type MarketType = 'spot' | 'perp';

// Exchange capabilities based on exchanges.md
export interface ExchangeCapabilities {
  supportsSpot: boolean;
  supportsPerp: boolean;
  marketTypes: MarketType[];
}

export interface ExchangeConfig {
  enableRateLimit: boolean;
  timeout: number;
  rateLimit?: number;
  options: {
    defaultType: string;
    recvWindow?: number; // Binance-specific option
    [key: string]: unknown;
  };
  // Exchange capabilities
  capabilities: ExchangeCapabilities;
  // Hyperliquid-specific fields
  walletAddress?: string;
  privateKey?: string;
}

// Exchange market support based on exchanges.md
export const EXCHANGE_MARKET_SUPPORT: { [key: string]: ExchangeCapabilities } = {
  // Spot and Perp exchanges
  binance: {
    supportsSpot: true,
    supportsPerp: true,
    marketTypes: ['spot', 'perp'],
  },
  bitget: {
    supportsSpot: true,
    supportsPerp: true,
    marketTypes: ['spot', 'perp'],
  },
  bybit: {
    supportsSpot: true,
    supportsPerp: true,
    marketTypes: ['spot', 'perp'],
  },
  gate: {
    supportsSpot: true,
    supportsPerp: true,
    marketTypes: ['spot', 'perp'],
  },
  okx: {
    supportsSpot: true,
    supportsPerp: true,
    marketTypes: ['spot', 'perp'],
  },

  // Perp only exchanges
  hyperliquid: {
    supportsSpot: false,
    supportsPerp: true,
    marketTypes: ['perp'],
  },
};

// Centralized cache configuration
export const CACHE_CONFIG = {
  TICKERS_TTL: 10000, // 10 seconds for price data (frequent updates needed)
  FUNDING_RATES_TTL: 600000, // 10 minutes for funding rates (stable data)
  PROCESSED_DATA_TTL: 10000, // 10 seconds to match price data freshness (arbitrage needs real-time data)
  HEALTH_CHECK_TTL: 60000, // 1 minute for health checks
};

// Exchange-specific configurations
export const EXCHANGE_CONFIGS: { [key: string]: ExchangeConfig } = {
  binance: {
    enableRateLimit: true,
    timeout: 20000,
    options: {
      defaultType: 'swap',
      recvWindow: 10000, // Binance-specific: increase receive window
    },
    capabilities: EXCHANGE_MARKET_SUPPORT.binance,
  },

  okx: {
    enableRateLimit: true,
    timeout: 30000,
    options: {
      defaultType: 'swap',
    },
    capabilities: EXCHANGE_MARKET_SUPPORT.okx,
  },

  bitget: {
    enableRateLimit: true,
    timeout: 30000,
    options: {
      defaultType: 'swap',
    },
    capabilities: EXCHANGE_MARKET_SUPPORT.bitget,
  },

  bybit: {
    enableRateLimit: true,
    timeout: 30000,
    options: {
      defaultType: 'linear', // Bybit uses 'linear' for perpetual futures
    },
    capabilities: EXCHANGE_MARKET_SUPPORT.bybit,
  },

  gate: {
    enableRateLimit: true,
    timeout: 30000,
    options: {
      defaultType: 'swap',
    },
    capabilities: EXCHANGE_MARKET_SUPPORT.gate,
  },

  hyperliquid: {
    enableRateLimit: true,
    timeout: 30000,
    rateLimit: 100, // Conservative rate limiting for DEX
    options: {
      defaultType: 'swap',
      // Hyperliquid-specific options can be added here
    },
    capabilities: EXCHANGE_MARKET_SUPPORT.hyperliquid,
    // Note: walletAddress and privateKey should be set via environment variables
    // walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS,
    // privateKey: process.env.HYPERLIQUID_PRIVATE_KEY
  },
};

// Exchange-specific performance settings
export const EXCHANGE_PERFORMANCE = {
  // Optimal batch sizes per exchange based on their rate limits
  batchSizes: {
    binance: 50, // Binance has high rate limits
    okx: 30, // OKX is moderately fast
    bitget: 20, // Bitget is slower
    bybit: 40, // Bybit is quite fast
    gate: 25, // Gate.io moderate performance
    hyperliquid: 10, // Conservative for DEX
  },

  // Optimal delays per exchange (in milliseconds)
  delays: {
    binance: 100, // Very fast
    okx: 200, // Fast
    bitget: 500, // Slower
    bybit: 150, // Fast
    gate: 300, // Moderate
    hyperliquid: 200, // Moderate for DEX
  },
};

// Exchange-specific features and capabilities
export const EXCHANGE_FEATURES = {
  supportsBulkFundingRates: ['binance', 'okx', 'bitget', 'gate'],
  supportsWebSocket: ['binance', 'okx', 'bitget', 'bybit', 'gate', 'hyperliquid'],
  requiresPassphrase: ['okx'],
  requiresWallet: ['hyperliquid'],
  isDecentralized: ['hyperliquid'],

  // Market type support
  supportsSpotAndPerp: ['binance', 'bitget', 'bybit', 'gate', 'okx'],
  supportsPerpOnly: ['hyperliquid'],
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
      privateKey: process.env.HYPERLIQUID_PRIVATE_KEY,
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

// Helper functions for market type filtering
export function getExchangesByMarketType(marketType: MarketType): string[] {
  return Object.entries(EXCHANGE_MARKET_SUPPORT)
    .filter(([, capabilities]) => capabilities.marketTypes.includes(marketType))
    .map(([exchangeName]) => exchangeName);
}

export function getSpotExchanges(): string[] {
  return getExchangesByMarketType('spot');
}

export function getPerpExchanges(): string[] {
  return getExchangesByMarketType('perp');
}

export function exchangeSupportsMarketType(exchangeName: string, marketType: MarketType): boolean {
  const capabilities = EXCHANGE_MARKET_SUPPORT[exchangeName];
  return capabilities ? capabilities.marketTypes.includes(marketType) : false;
}