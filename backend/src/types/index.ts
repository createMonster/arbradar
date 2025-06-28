export interface ExchangeData {
  price: number;
  volume: number;
  lastUpdated: number;
  // Enhanced funding rate data per exchange
  fundingRate?: {
    rate: number;
    nextTime: number;
    dataAge?: number;
  };
}

export interface SpreadData {
  absolute: number;
  percentage: number;
  bestBuy: string;
  bestSell: string;
}

export interface FundingRate {
  rate: number;
  nextTime: number;
  exchange: string;
}

export interface PriceRow {
  symbol: string;
  marketType?: 'spot' | 'perp'; // Enhanced with market type
  exchanges: {
    [key: string]: ExchangeData;
  };
  spread: SpreadData;
  fundingRate?: FundingRate; // Keep for backward compatibility
  // Enhanced funding rates structure
  fundingRates?: {
    [exchangeName: string]: {
      rate: number;
      nextTime: number;
      isAvailable: boolean;
    };
  };
}

export interface TickerData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
}

export interface ExchangeConfig {
  name: string;
  id: string;
  rateLimit: number;
}

// Market types for exchanges
export type MarketType = 'spot' | 'perp';

// Helper function to determine market type from symbol
export function getMarketType(symbol: string): MarketType {
  // Perpetual contracts typically have formats like:
  // BTC/USDT:USDT (with colon)
  // BTC-PERP, BTC/USD:PERPETUAL
  return symbol.includes(':') || symbol.includes('PERP') || symbol.includes('PERPETUAL') ? 'perp' : 'spot';
}

// Updated supported exchanges based on exchanges.md
export const SUPPORTED_EXCHANGES = ['binance', 'okx', 'bitget', 'bybit', 'gate', 'hyperliquid'] as const;
export type SupportedExchange = (typeof SUPPORTED_EXCHANGES)[number];

// Exchanges that support both spot and perp
export const SPOT_AND_PERP_EXCHANGES = ['binance', 'bitget', 'bybit', 'gate', 'okx'] as const;
export type SpotAndPerpExchange = (typeof SPOT_AND_PERP_EXCHANGES)[number];

// Exchanges that support perp only
export const PERP_ONLY_EXCHANGES = ['hyperliquid'] as const;
export type PerpOnlyExchange = (typeof PERP_ONLY_EXCHANGES)[number];

// API response structures
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: number;
  count?: number;
  total?: number;
  cached?: boolean;
}

export interface SpreadsResponse extends ApiResponse<PriceRow[]> {}

export interface TickersResponse extends ApiResponse<{
  [exchange: string]: {
    [symbol: string]: TickerData;
  };
}> {}

export interface FundingRatesResponse extends ApiResponse<{
  [exchange: string]: {
    [symbol: string]: FundingRate;
  };
}> {}

export interface HealthResponse
  extends ApiResponse<{
    exchanges: { [exchange: string]: boolean };
    cache: {
      size: number;
      keys: string[];
      lastUpdate: number;
      isCached: boolean;
    };
    uptime: number;
  }> {}

export interface ExchangesResponse
  extends ApiResponse<{
    all: string[];
    spot: string[];
    perp: string[];
    spotAndPerp: string[];
    perpOnly: string[];
    capabilities: {
      [exchangeName: string]: {
        supportsSpot: boolean;
        supportsPerp: boolean;
        marketTypes: MarketType[];
      };
    };
  }> {}

export interface ExchangesByMarketResponse
  extends ApiResponse<{
    marketType: MarketType;
    exchanges: string[];
    count: number;
  }> {}

// Error types
export type ErrorType =
  | 'Validation Error'
  | 'Invalid exchange'
  | 'Invalid market type'
  | 'Service Temporarily Unavailable'
  | 'Internal Server Error'
  | 'Health check failed'
  | 'Endpoint not found';

// Filter options for API requests
export interface FilterOptions {
  minSpread?: number;
  minVolume?: number;
  exchanges?: string[];
  search?: string;
  limit?: number;
  refresh?: 'true' | 'false';
}

// Phase 1: Top 5 Routes Implementation
export interface ArbitrageRoute {
  routeId: string;                    // Unique identifier
  type: 'direct';                     // Phase 1: direct routes only
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spread: {
    absolute: number;
    percentage: number;
  };
  profitability: {
    grossProfit: number;              // Before fees
    estimatedFees: number;            // Trading fees both sides
    netProfit: number;                // After fees
    netProfitPercentage: number;
  };
  executionConstraints: {
    maxVolume: number;                // Based on available volume
    liquidityScore: number;           // 0-1 based on volume
    executionRisk: 'low' | 'medium' | 'high';
  };
  fundingImpact?: {                   // For perpetual contracts
    buyExchangeRate: number;
    sellExchangeRate: number;
    netFundingImpact: number;
  };
}

export interface EnhancedSpreadData {
  symbol: string;
  marketType: 'spot' | 'perp';
  exchanges: { [exchangeName: string]: ExchangeData };
  routes: ArbitrageRoute[];           // TOP 5 profitable routes (max)
  bestRoute: ArbitrageRoute;          // Best route for quick access
  routeCount: number;                 // Actual number of routes (≤ 5)
  totalAvailableRoutes: number;       // Total profitable routes found
  lastUpdated: number;
}

// API response for routes endpoint
export interface RoutesResponse extends ApiResponse<EnhancedSpreadData[]> {
  routeStats?: {
    totalSymbols: number;
    averageRoutesPerSymbol: number;
    averageNetProfit: number;
  };
}