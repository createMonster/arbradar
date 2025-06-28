export interface PriceRow {
  symbol: string;
  marketType?: 'spot' | 'perp';  // Optional for backward compatibility
  exchanges: {
    [key: string]: ExchangeData;
  };
  spread: {
    absolute: number;
    percentage: number;
    bestBuy: string;
    bestSell: string;
  };
  fundingRate?: {
    rate: number;
    nextTime: number;
    exchange: string;
  };
  // Enhanced funding rates structure (for future backend implementation)
  fundingRates?: {
    [exchangeName: string]: {
      rate: number;
      nextTime: number;
      isAvailable: boolean;
    };
  };
}

export interface ExchangeData {
  price: number;
  volume: number;
  lastUpdated: number;
  // Enhanced funding rate per exchange (for future backend implementation)
  fundingRate?: {
    rate: number;
    nextTime: number;
    dataAge?: number;
    annualizedRate?: number;
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

// Enhanced funding rate interface for future use
export interface EnhancedFundingRate {
  rate: number;
  nextTime: number;
  dataAge: number;
  confidence: 'high' | 'medium' | 'low';
  annualizedRate?: number;
}

export interface FilterOptions {
  minVolume: number;
  minSpread: number;
  selectedExchanges: string[];
  searchTerm: string;
  marketType?: 'all' | 'spot' | 'perp';  // Future filter option
}

export type Language = 'en' | 'zh';

export interface Settings {
  language: Language;
  theme: 'light' | 'dark';
  updateInterval: number;
  soundEnabled: boolean;
}

// Market type helper type
export type MarketType = 'spot' | 'perp';

// Enhanced API response types for future backend implementation
export interface EnhancedPriceRow extends Omit<PriceRow, 'marketType'> {
  marketType: MarketType;  // Required in enhanced version
  exchanges: {
    [key: string]: ExchangeData & {
      fundingRate?: EnhancedFundingRate;
    };
  };
}

// Phase 1: Top 5 Routes Implementation
export interface ArbitrageRoute {
  routeId: string;
  type: 'direct';
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spread: {
    absolute: number;
    percentage: number;
  };
  profitability: {
    grossProfit: number;
    estimatedFees: number;
    netProfit: number;
    netProfitPercentage: number;
  };
  executionConstraints: {
    maxVolume: number;
    liquidityScore: number;
    executionRisk: 'low' | 'medium' | 'high';
  };
  fundingImpact?: {
    buyExchangeRate: number;
    sellExchangeRate: number;
    netFundingImpact: number;
  };
}

export interface EnhancedSpreadData {
  symbol: string;
  marketType: 'spot' | 'perp';
  exchanges: { [exchangeName: string]: ExchangeData };
  routes: ArbitrageRoute[];
  bestRoute: ArbitrageRoute;
  routeCount: number;
  totalAvailableRoutes: number;
  lastUpdated: number;
}

export interface RoutesResponse {
  success: boolean;
  data: EnhancedSpreadData[];
  total: number;
  count: number;
  cached: boolean;
  routeStats?: {
    totalSymbols: number;
    averageRoutesPerSymbol: number;
    averageNetProfit: number;
  };
  timestamp: number;
} 