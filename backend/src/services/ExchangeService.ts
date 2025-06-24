const ccxt = require('ccxt');

// Simple interface for exchange instances to avoid CCXT type issues
interface SimpleExchange {
  fetchTicker(symbol: string): Promise<any>;
  fetchTickers(symbols?: string[]): Promise<any>;
  fetchFundingRates?(): Promise<any>;
  has: any; // More flexible to handle CCXT's has object
}

export interface ExchangeConfig {
  enableRateLimit: boolean;
  timeout: number;
  options: {
    defaultType: string;
  };
}

export interface FilterCriteria {
  minVolume: number;
  minFundingRateAbs: number;
  quoteAssets: string[];
  blacklistedSymbols: string[];
}

export interface TickerData {
  [symbol: string]: any;
}

export interface FundingRateData {
  [symbol: string]: any;
}

export class ExchangeService {
  private exchanges: { [key: string]: any } = {};
  private filterCriteria: FilterCriteria;
  private cache: Map<string, any> = new Map();
  private readonly CACHE_TTL = 5000; // 5 seconds

  constructor(filterCriteria: FilterCriteria) {
    this.filterCriteria = filterCriteria;
    this.initializeExchanges();
  }

  private initializeExchanges(): void {
    const exchangeConfigs: { [key: string]: ExchangeConfig } = {
      binance: {
        enableRateLimit: true,
        timeout: 30000,
        options: { defaultType: 'swap' }
      },
      okx: {
        enableRateLimit: true,
        timeout: 30000,
        options: { defaultType: 'swap' }
      },
      bitget: {
        enableRateLimit: true,
        timeout: 30000,
        options: { defaultType: 'swap' }
      },
      bybit: {
        enableRateLimit: true,
        timeout: 30000,
        options: { defaultType: 'linear' }
      }
    };

    Object.entries(exchangeConfigs).forEach(([name, config]) => {
      this.exchanges[name] = new ccxt[name](config);
    });
  }

  public getExchangeNames(): string[] {
    return Object.keys(this.exchanges);
  }

  public getExchange(name: string): any {
    return this.exchanges[name];
  }

  private shouldIncludeSymbol(symbol: string, ticker: any): boolean {
    // Check if it's a perpetual contract
    if (!symbol.includes(':') && !symbol.includes('PERP')) return false;
    
    // Check quote asset
    const quoteAsset = symbol.split('/')[1]?.split(':')[0];
    if (!this.filterCriteria.quoteAssets.includes(quoteAsset)) return false;
    
    // Check blacklisted symbols
    if (this.filterCriteria.blacklistedSymbols.some(bl => symbol.includes(bl))) return false;
    
    // Check minimum volume
    if (ticker.quoteVolume && ticker.quoteVolume < this.filterCriteria.minVolume) return false;
    
    return true;
  }

  public async fetchAllTickers(exchangeName: string): Promise<TickerData> {
    try {
      console.log(`📡 Fetching all tickers from ${exchangeName}...`);
      
      const exchange = this.exchanges[exchangeName];
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} not found`);
      }

      // Load markets first
      await exchange.loadMarkets();
      
      // Get all tickers for perpetual contracts
      const allTickers = await exchange.fetchTickers();
      
      // Filter meaningful tickers
      const filteredTickers: TickerData = {};
      let totalCount = 0;
      let filteredCount = 0;
      
      for (const [symbol, ticker] of Object.entries(allTickers)) {
        totalCount++;
        
        if (this.shouldIncludeSymbol(symbol, ticker)) {
          filteredTickers[symbol] = ticker;
          filteredCount++;
        }
      }
      
      console.log(`✅ ${exchangeName}: ${filteredCount}/${totalCount} tickers after filtering`);
      return filteredTickers;
      
    } catch (error: any) {
      console.error(`❌ Error fetching tickers from ${exchangeName}:`, error.message);
      throw new Error(`Failed to fetch tickers from ${exchangeName}: ${error.message}`);
    }
  }

  public async fetchFundingRates(exchangeName: string, symbols: string[]): Promise<FundingRateData> {
    try {
      console.log(`💰 Fetching funding rates from ${exchangeName}...`);
      
      const exchange = this.exchanges[exchangeName];
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} not found`);
      }

      const fundingRates: FundingRateData = {};
      const symbolsArray = Array.isArray(symbols) ? symbols : Object.keys(symbols);
      
      // Fetch funding rates in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < symbolsArray.length; i += batchSize) {
        const batch = symbolsArray.slice(i, i + batchSize);
        
        const promises = batch.map(async (symbol) => {
          try {
            const fundingRate = await exchange.fetchFundingRate(symbol);
            if (fundingRate && (this.filterCriteria.minFundingRateAbs === -1 || 
                Math.abs(fundingRate.fundingRate) >= this.filterCriteria.minFundingRateAbs)) {
              return [symbol, fundingRate];
            }
          } catch (error) {
            // Skip symbols that don't support funding rates
            return null;
          }
        });
        
        const results = await Promise.allSettled(promises);
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            const [symbol, fundingRate] = result.value;
            fundingRates[symbol] = fundingRate;
          }
        });
        
        // Small delay between batches
        if (i + batchSize < symbolsArray.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const rateCount = Object.keys(fundingRates).length;
      console.log(`✅ ${exchangeName}: fetched ${rateCount} funding rates`);
      
      return fundingRates;
      
    } catch (error: any) {
      console.error(`❌ Error fetching funding rates from ${exchangeName}:`, error.message);
      throw new Error(`Failed to fetch funding rates from ${exchangeName}: ${error.message}`);
    }
  }

  public async fetchAllExchangeData(): Promise<{ tickers: { [exchange: string]: TickerData }, fundingRates: { [exchange: string]: FundingRateData } }> {
    const allTickers: { [exchange: string]: TickerData } = {};
    const allFundingRates: { [exchange: string]: FundingRateData } = {};
    
    // Fetch all tickers from all exchanges in parallel
    const tickerPromises = Object.keys(this.exchanges).map(async (name): Promise<[string, TickerData]> => {
      try {
        const tickers = await this.fetchAllTickers(name);
        return [name, tickers];
      } catch (error) {
        console.error(`Failed to fetch tickers from ${name}:`, error);
        return [name, {}];
      }
    });
    
    const tickerResults = await Promise.allSettled(tickerPromises);
    
    tickerResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const [name, tickers] = result.value;
        allTickers[name] = tickers;
      }
    });
    
    // Fetch funding rates for all exchanges in parallel
    const fundingPromises = Object.keys(this.exchanges).map(async (name): Promise<[string, FundingRateData]> => {
      try {
        const symbols = allTickers[name] ? Object.keys(allTickers[name]) : [];
        const fundingRates = await this.fetchFundingRates(name, symbols);
        return [name, fundingRates];
      } catch (error) {
        console.error(`Failed to fetch funding rates from ${name}:`, error);
        return [name, {}];
      }
    });
    
    const fundingResults = await Promise.allSettled(fundingPromises);
    
    fundingResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const [name, fundingRates] = result.value;
        allFundingRates[name] = fundingRates;
      }
    });
    
    return { tickers: allTickers, fundingRates: allFundingRates };
  }

  public async healthCheck(): Promise<{ [exchange: string]: boolean }> {
    const health: { [exchange: string]: boolean } = {};
    
    const promises = Object.keys(this.exchanges).map(async (name): Promise<[string, boolean]> => {
      try {
        const exchange = this.exchanges[name];
        // Simple ping test
        await exchange.loadMarkets();
        return [name, true];
      } catch (error) {
        console.error(`Health check failed for ${name}:`, error);
        return [name, false];
      }
    });
    
    const results = await Promise.allSettled(promises);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const [name, status] = result.value;
        health[name] = status;
      } else {
        // If promise was rejected, mark as unhealthy
        health['unknown'] = false;
      }
    });
    
    return health;
  }
} 