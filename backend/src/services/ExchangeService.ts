import * as ccxt from 'ccxt';
import {
  CACHE_CONFIG,
  EXCHANGE_CONFIGS,
  EXCHANGE_PERFORMANCE,
  getExchangeConfig,
  validateExchangeConfig,
  getExchangesByMarketType,
  getSpotExchanges,
  getPerpExchanges,
  exchangeSupportsMarketType,
  type MarketType,
} from '../config/exchanges';



export interface FilterCriteria {
  minVolume: number;
  minFundingRateAbs: number;
  quoteAssets: string[];
  blacklistedSymbols: string[];
}

export interface TickerData {
  [symbol: string]: unknown;
}

export interface FundingRateData {
  [symbol: string]: unknown;
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

export class ExchangeService {
  private exchanges: { [key: string]: ccxt.Exchange } = {};
  private filterCriteria: FilterCriteria;
  private cache: Map<string, CacheEntry> = new Map();

  constructor(filterCriteria: FilterCriteria) {
    this.filterCriteria = filterCriteria;
    this.initializeExchanges();
  }

  private initializeExchanges(): void {
    console.log('🔄 Initializing exchanges...');

    Object.entries(EXCHANGE_CONFIGS).forEach(([name, config]) => {
      try {
        // Special handling for Hyperliquid
        if (name === 'hyperliquid') {
          if (!config.walletAddress || !config.privateKey) {
            console.warn(`⚠️ Skipping Hyperliquid - missing wallet credentials`);
            return;
          }
        }

        // Type assertion for CCXT dynamic import
        const exchangeClass = (ccxt as any)[name];
        if (!exchangeClass) {
          throw new Error(`Exchange ${name} not found in CCXT`);
        }

        this.exchanges[name] = new exchangeClass(config);
        console.log(`✅ Initialized exchange: ${name}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to initialize exchange ${name}:`, errorMessage);
      }
    });

    console.log(`🔄 Initialized ${Object.keys(this.exchanges).length} exchanges`);
  }

  public getExchangeNames(): string[] {
    return Object.keys(this.exchanges);
  }

  public getExchange(name: string): ccxt.Exchange | undefined {
    return this.exchanges[name] as ccxt.Exchange;
  }

  // New methods for market type handling
  public getExchangesByMarketType(marketType: MarketType): string[] {
    return getExchangesByMarketType(marketType).filter((name) => this.exchanges[name]);
  }

  public getSpotExchanges(): string[] {
    return getSpotExchanges().filter((name) => this.exchanges[name]);
  }

  public getPerpExchanges(): string[] {
    return getPerpExchanges().filter((name) => this.exchanges[name]);
  }

  public exchangeSupportsMarketType(exchangeName: string, marketType: MarketType): boolean {
    return !!this.exchanges[exchangeName] && exchangeSupportsMarketType(exchangeName, marketType);
  }

  public getExchangeCapabilities(exchangeName: string): { supportsSpot: boolean; supportsPerp: boolean } | null {
    const config = EXCHANGE_CONFIGS[exchangeName];
    if (!config || !this.exchanges[exchangeName]) {
      return null;
    }
    return {
      supportsSpot: config.capabilities.supportsSpot,
      supportsPerp: config.capabilities.supportsPerp,
    };
  }

  private shouldIncludeSymbol(symbol: string, ticker: Record<string, unknown>): boolean {
    // Check if it's a perpetual contract
    if (!symbol.includes(':') && !symbol.includes('PERP')) return false;

    // Check quote asset
    const quoteAsset = symbol.split('/')[1]?.split(':')[0];
    if (!this.filterCriteria.quoteAssets.includes(quoteAsset)) return false;

    // Check blacklisted symbols
    if (this.filterCriteria.blacklistedSymbols.some((bl) => symbol.includes(bl))) return false;

    // Enhanced volume filtering - require meaningful trading activity
    const quoteVolume = typeof ticker.quoteVolume === 'number' ? ticker.quoteVolume : 0;
    if (quoteVolume < this.filterCriteria.minVolume) return false;

    // Additional data quality checks

    // Check if price data is valid
    const lastPrice = typeof ticker.last === 'number' ? ticker.last : 0;
    if (!lastPrice || lastPrice <= 0) {
      return false;
    }

    // Check if there's reasonable price movement (not stale data)
    const high = typeof ticker.high === 'number' ? ticker.high : null;
    const low = typeof ticker.low === 'number' ? ticker.low : null;
    if (high && low && high === low && lastPrice === high) {
      // Suspicious: all prices are identical, might be stale/inactive
      return false;
    }

    // Check for reasonable bid-ask spread if available
    const bid = typeof ticker.bid === 'number' ? ticker.bid : null;
    const ask = typeof ticker.ask === 'number' ? ticker.ask : null;
    if (bid && ask && bid > 0) {
      const bidAskSpread = ((ask - bid) / bid) * 100;
      if (bidAskSpread > 10) {
        // If bid-ask spread > 10%, likely low liquidity
        return false;
      }
    }

    // Check timestamp freshness if available
    const timestamp = typeof ticker.timestamp === 'number' ? ticker.timestamp : null;
    if (timestamp) {
      const dataAge = Date.now() - timestamp;
      const maxAgeMs = 5 * 60 * 1000; // 5 minutes
      if (dataAge > maxAgeMs) {
        console.log(`⚠️ Stale data for ${symbol}: ${Math.round(dataAge / 1000)}s old`);
        return false;
      }
    }

    return true;
  }

  public async fetchAllTickers(exchangeName: string): Promise<TickerData> {
    try {
      console.log(`📡 Fetching all tickers from ${exchangeName}...`);
      const startTime = Date.now();

      const exchange = this.exchanges[exchangeName];
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} not found`);
      }

      // Check cache first
      const cacheKey = `tickers_${exchangeName}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.TICKERS_TTL) {
        console.log(`📦 Using cached tickers for ${exchangeName} (10s cache)`);
        return cached.data;
      }

      // Load markets first (cached by CCXT)
      await exchange.loadMarkets();

      // Get all tickers for perpetual contracts
      const fetchStart = Date.now();

      const allTickers = await exchange.fetchTickers();

      const fetchElapsed = Date.now() - fetchStart;
      console.log(`🔍 ${exchangeName} fetchTickers API call took ${fetchElapsed}ms`);

      // Filter meaningful tickers
      const filteredTickers: TickerData = {};
      let totalCount = 0;
      let filteredCount = 0;

      for (const [symbol, ticker] of Object.entries(allTickers)) {
        totalCount++;

        // Convert CCXT Ticker to Record<string, unknown> for our filter
        const tickerData = ticker as unknown as Record<string, unknown>;
        if (this.shouldIncludeSymbol(symbol, tickerData)) {
          filteredTickers[symbol] = ticker;
          filteredCount++;
        }
      }

      const elapsed = Date.now() - startTime;
      console.log(`✅ ${exchangeName}: ${filteredCount}/${totalCount} tickers after filtering in ${elapsed}ms`);

      // Cache the result
      this.cache.set(cacheKey, { data: filteredTickers, timestamp: Date.now() });

      return filteredTickers;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error fetching tickers from ${exchangeName}:`, errorMessage);
      throw new Error(`Failed to fetch tickers from ${exchangeName}: ${errorMessage}`);
    }
  }

  public async fetchFundingRates(exchangeName: string, symbols: string[]): Promise<FundingRateData> {
    try {
      console.log(`💰 Fetching funding rates from ${exchangeName}...`);
      const startTime = Date.now();

      const exchange = this.exchanges[exchangeName];
      if (!exchange) {
        throw new Error(`Exchange ${exchangeName} not found`);
      }

      // Check cache first
      const cacheKey = `funding_rates_${exchangeName}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.FUNDING_RATES_TTL) {
        console.log(`📦 Using cached funding rates for ${exchangeName} (10min cache)`);
        return cached.data;
      }

      const fundingRates: FundingRateData = {};
      const symbolsArray = Array.isArray(symbols) ? symbols : Object.keys(symbols);

      // Try bulk fetch first (much faster if supported)
      if (exchange.has && exchange.has['fetchFundingRates']) {
        try {
          console.log(`🚀 Using bulk funding rates API for ${exchangeName}`);
          const allRates = await exchange.fetchFundingRates();

          // Filter to only requested symbols
          symbolsArray.forEach((symbol) => {
            if (allRates[symbol]) {
              const rate = allRates[symbol];
              if (
                this.filterCriteria.minFundingRateAbs === -1 ||
                (rate.fundingRate && Math.abs(rate.fundingRate) >= this.filterCriteria.minFundingRateAbs)
              ) {
                fundingRates[symbol] = rate;
              }
            }
          });

          const elapsed = Date.now() - startTime;
          console.log(
            `✅ ${exchangeName}: fetched ${Object.keys(fundingRates).length} funding rates in ${elapsed}ms (bulk)`,
          );

          // Cache the result
          this.cache.set(cacheKey, { data: fundingRates, timestamp: Date.now() });
          return fundingRates;
        } catch (error) {
          console.log(`⚠️ Bulk fetch failed for ${exchangeName}, falling back to individual calls`);
        }
      }

      // Fallback to individual calls with optimizations
      const batchSize = this.getOptimalBatchSize(exchangeName);
      const delay = this.getOptimalDelay(exchangeName);

      for (let i = 0; i < symbolsArray.length; i += batchSize) {
        const batch = symbolsArray.slice(i, i + batchSize);

        // Process batch in parallel
        const promises = batch.map(async (symbol) => {
          try {
            const fundingRate = await exchange.fetchFundingRate(symbol);
            if (
              fundingRate &&
              fundingRate.fundingRate !== undefined &&
              (this.filterCriteria.minFundingRateAbs === -1 ||
                Math.abs(fundingRate.fundingRate) >= this.filterCriteria.minFundingRateAbs)
            ) {
              return [symbol, fundingRate];
            }
          } catch (error: unknown) {
            // Skip symbols that don't support funding rates
            return null;
          }
          return null;
        });

        const results = await Promise.allSettled(promises);
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            const [symbol, fundingRate] = result.value as [string, any];
            fundingRates[symbol] = fundingRate;
          }
        });

        // Adaptive delay between batches
        if (i + batchSize < symbolsArray.length && delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      const elapsed = Date.now() - startTime;
      const rateCount = Object.keys(fundingRates).length;
      console.log(`✅ ${exchangeName}: fetched ${rateCount} funding rates in ${elapsed}ms (individual)`);

      // Cache the result
      this.cache.set(cacheKey, { data: fundingRates, timestamp: Date.now() });

      return fundingRates;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error fetching funding rates from ${exchangeName}:`, errorMessage);
      throw new Error(`Failed to fetch funding rates from ${exchangeName}: ${errorMessage}`);
    }
  }

  private getOptimalBatchSize(exchangeName: string): number {
    return EXCHANGE_PERFORMANCE.batchSizes[exchangeName as keyof typeof EXCHANGE_PERFORMANCE.batchSizes] || 20;
  }

  private getOptimalDelay(exchangeName: string): number {
    return EXCHANGE_PERFORMANCE.delays[exchangeName as keyof typeof EXCHANGE_PERFORMANCE.delays] || 300;
  }

  public async fetchAllExchangeData(): Promise<{
    tickers: { [exchange: string]: TickerData };
    fundingRates: { [exchange: string]: FundingRateData };
  }> {
    console.log('🚀 Starting parallel fetch of all exchange data...');
    const startTime = Date.now();

    const allTickers: { [exchange: string]: TickerData } = {};
    const allFundingRates: { [exchange: string]: FundingRateData } = {};

    // Fetch all tickers from all exchanges in parallel
    const tickerPromises = Object.keys(this.exchanges).map(
      async (name): Promise<[string, TickerData]> => {
        try {
          const tickers = await this.fetchAllTickers(name);
          return [name, tickers];
        } catch (error) {
          console.error(`Failed to fetch tickers from ${name}:`, error);
          return [name, {}];
        }
      },
    );

    const tickerResults = await Promise.allSettled(tickerPromises);

    tickerResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const [name, tickers] = result.value;
        allTickers[name] = tickers;
      }
    });

    const tickerElapsed = Date.now() - startTime;
    console.log(`✅ All tickers fetched in ${tickerElapsed}ms`);

    // Fetch funding rates for all exchanges in parallel (only for symbols that have tickers)
    const fundingStartTime = Date.now();
    const fundingPromises = Object.keys(this.exchanges).map(
      async (name): Promise<[string, FundingRateData]> => {
        try {
          const symbols = allTickers[name] ? Object.keys(allTickers[name]) : [];
          if (symbols.length === 0) {
            console.log(`⚠️ No symbols found for ${name}, skipping funding rates`);
            return [name, {}];
          }

          const fundingRates = await this.fetchFundingRates(name, symbols);
          return [name, fundingRates];
        } catch (error) {
          console.error(`Failed to fetch funding rates from ${name}:`, error);
          return [name, {}];
        }
      },
    );

    const fundingResults = await Promise.allSettled(fundingPromises);

    fundingResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const [name, fundingRates] = result.value;
        allFundingRates[name] = fundingRates;
      }
    });

    const fundingElapsed = Date.now() - fundingStartTime;
    const totalElapsed = Date.now() - startTime;

    const totalTickers = Object.values(allTickers).reduce((sum, tickers) => sum + Object.keys(tickers).length, 0);
    const totalFundingRates = Object.values(allFundingRates).reduce(
      (sum, rates) => sum + Object.keys(rates).length,
      0,
    );

    console.log(
      `✅ All exchange data fetched: ${totalTickers} tickers, ${totalFundingRates} funding rates in ${totalElapsed}ms (funding: ${fundingElapsed}ms)`,
    );

    return { tickers: allTickers, fundingRates: allFundingRates };
  }

  public async healthCheck(): Promise<{ [exchange: string]: boolean }> {
    const health: { [exchange: string]: boolean } = {};

    const promises = Object.keys(this.exchanges).map(
      async (name): Promise<[string, boolean]> => {
        try {
          const exchange = this.exchanges[name];
          // Simple ping test
          await exchange.loadMarkets();
          return [name, true];
        } catch (error) {
          console.error(`Health check failed for ${name}:`, error);
          return [name, false];
        }
      },
    );

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

  // Cache management methods
  public clearCache(): void {
    this.cache.clear();
    console.log('🧹 ExchangeService cache cleared');
  }

  public getCacheStats(): { size: number; keys: string[]; oldestEntry: number | null } {
    const keys = Array.from(this.cache.keys());
    let oldestTimestamp: number | null = null;

    for (const [, value] of this.cache.entries()) {
      if (value.timestamp && (!oldestTimestamp || value.timestamp < oldestTimestamp)) {
        oldestTimestamp = value.timestamp;
      }
    }

    return {
      size: this.cache.size,
      keys,
      oldestEntry: oldestTimestamp,
    };
  }

  // Method to warm up cache by pre-fetching data
  public async warmUpCache(): Promise<void> {
    console.log('🔥 Warming up ExchangeService cache...');
    const startTime = Date.now();

    try {
      // Pre-fetch all tickers in parallel
      const tickerPromises = Object.keys(this.exchanges).map((name) =>
        this.fetchAllTickers(name).catch((error) => {
          console.error(`Failed to warm up tickers for ${name}:`, error.message);
          return {};
        }),
      );

      await Promise.all(tickerPromises);

      const elapsed = Date.now() - startTime;
      console.log(`✅ Cache warmed up in ${elapsed}ms`);
    } catch (error) {
      console.error('❌ Failed to warm up cache:', error);
    }
  }
}