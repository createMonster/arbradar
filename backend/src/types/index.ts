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
  marketType?: 'spot' | 'perp';  // Enhanced with market type
  exchanges: {
    [key: string]: ExchangeData;
  };
  spread: SpreadData;
  fundingRate?: FundingRate;  // Keep for backward compatibility
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
export type SupportedExchange = typeof SUPPORTED_EXCHANGES[number];

// Exchanges that support both spot and perp
export const SPOT_AND_PERP_EXCHANGES = ['binance', 'bitget', 'bybit', 'gate', 'okx'] as const;
export type SpotAndPerpExchange = typeof SPOT_AND_PERP_EXCHANGES[number];

// Exchanges that support perp only
export const PERP_ONLY_EXCHANGES = ['hyperliquid'] as const;
export type PerpOnlyExchange = typeof PERP_ONLY_EXCHANGES[number];

export const SUPPORTED_SYMBOLS = [
  'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT',
  'DOT/USDT', 'AVAX/USDT', 'MATIC/USDT', 'LINK/USDT', 'UNI/USDT',
  'LTC/USDT', 'BCH/USDT', 'XRP/USDT', 'DOGE/USDT', 'ATOM/USDT',
  'FTM/USDT', 'NEAR/USDT', 'ALGO/USDT', 'VET/USDT', 'ICP/USDT'
] as const; 