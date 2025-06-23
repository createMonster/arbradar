export interface PriceRow {
  symbol: string;
  exchanges: {
    [key: string]: {
      price: number;
      volume: number;
      lastUpdated: number;
    };
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
}

export interface ExchangeData {
  price: number;
  volume: number;
  lastUpdated: number;
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

export interface FilterOptions {
  minVolume: number;
  minSpread: number;
  selectedExchanges: string[];
  searchTerm: string;
}

export type Language = 'en' | 'zh';

export interface Settings {
  language: Language;
  theme: 'light' | 'dark';
  updateInterval: number;
  soundEnabled: boolean;
} 