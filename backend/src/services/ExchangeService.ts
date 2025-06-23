import { TickerData, SupportedExchange, SUPPORTED_SYMBOLS } from '../types';

// Simple interface for exchange instances to avoid CCXT type issues
interface SimpleExchange {
  fetchTicker(symbol: string): Promise<any>;
  fetchTickers(symbols?: string[]): Promise<any>;
  fetchFundingRates?(): Promise<any>;
  has: any; // More flexible to handle CCXT's has object
}

export class ExchangeService {
  private exchanges: Map<SupportedExchange, SimpleExchange> = new Map();
  private cache: Map<string, TickerData[]> = new Map();
  private readonly CACHE_TTL = 5000; // 5 seconds

  constructor() {
    this.initializeExchanges();
  }

  private async initializeExchanges() {
    try {
      // Dynamic import of CCXT to handle ES module issues
      const ccxt = await import('ccxt');
      
      const exchangeConfigs = [
        { name: 'binance', class: ccxt.binance },
        { name: 'okx', class: ccxt.okx },
        { name: 'bitget', class: ccxt.bitget },
        { name: 'bybit', class: ccxt.bybit }
      ];

      // Initialize exchanges in parallel
      const initPromises = exchangeConfigs.map(async ({ name, class: ExchangeClass }) => {
        try {
          const exchange = new ExchangeClass({
            sandbox: false,
            enableRateLimit: true,
            timeout: 10000,
          });
          this.exchanges.set(name as SupportedExchange, exchange);
          console.log(`✅ Initialized ${name} exchange`);
          return { name, success: true };
        } catch (error) {
          console.error(`❌ Failed to initialize ${name}:`, error);
          return { name, success: false, error };
        }
      });

      await Promise.allSettled(initPromises);
    } catch (error) {
      console.error('❌ Failed to import CCXT:', error);
      // Initialize without CCXT for demo mode
      this.initializeDemoMode();
    }
  }

  private initializeDemoMode() {
    console.log('🔄 Initializing demo mode without CCXT...');
    // Create mock exchanges for demo
    const mockExchange: SimpleExchange = {
      fetchTicker: async (symbol: string) => ({
        symbol,
        last: Math.random() * 100000 + 1000,
        quoteVolume: Math.random() * 10000000 + 100000,
        timestamp: Date.now()
      }),
      fetchTickers: async () => ({}),
      has: { fetchFundingRates: false }
    };

    ['binance', 'okx', 'bitget', 'bybit'].forEach(name => {
      this.exchanges.set(name as SupportedExchange, mockExchange);
    });
    console.log('✅ Demo mode initialized');
  }

  async fetchTickers(exchangeName: SupportedExchange): Promise<TickerData[]> {
    const cacheKey = `${exchangeName}_tickers`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached[0]?.timestamp < this.CACHE_TTL) {
      console.log(`🔄 Using cached data for ${exchangeName} (${cached.length} tickers)`);
      return cached;
    }

    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} not initialized`);
    }

    try {
      console.log(`🔄 Fetching tickers from ${exchangeName}...`);
      
      // Fetch all symbols in parallel instead of sequentially
      const tickerPromises = SUPPORTED_SYMBOLS.map(async (symbol): Promise<TickerData | null> => {
        try {
          const ticker = await exchange.fetchTicker(symbol);
          
          if (ticker && ticker.last && ticker.quoteVolume) {
            return {
              symbol,
              price: ticker.last,
              volume: ticker.quoteVolume,
              timestamp: Date.now()
            };
          }
          return null;
        } catch (symbolError) {
          console.warn(`⚠️  ${exchangeName}: ${symbol} not available`);
          return null;
        }
      });

      // Wait for all ticker fetches to complete
      const tickerResults = await Promise.allSettled(tickerPromises);
      
      // Filter out failed/null results
      const tickers: TickerData[] = tickerResults
        .filter((result): result is PromiseFulfilledResult<TickerData> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);

      console.log(`✅ Fetched ${tickers.length} tickers from ${exchangeName}`);
      
      // Cache the results
      if (tickers.length > 0) {
        this.cache.set(cacheKey, tickers);
      }
      
      return tickers;
      
    } catch (error) {
      console.error(`❌ Error fetching from ${exchangeName}:`, error);
      return cached || [];
    }
  }

  async fetchAllTickers(): Promise<Record<SupportedExchange, TickerData[]>> {
    console.log('🔄 Fetching data from all exchanges in parallel...');
    
    // Get all available exchanges
    const availableExchanges = Array.from(this.exchanges.keys());
    console.log(`📊 Available exchanges: ${availableExchanges.join(', ')}`);
    
    // Fetch from all exchanges in parallel
    const fetchPromises = availableExchanges.map(async (exchangeName): Promise<[string, TickerData[]]> => {
      try {
        const tickers = await this.fetchTickers(exchangeName);
        return [exchangeName, tickers];
      } catch (error) {
        console.error(`❌ Failed to fetch from ${exchangeName}:`, error);
        return [exchangeName, []];
      }
    });

    // Wait for all fetches to complete
    const results = await Promise.allSettled(fetchPromises);
    
    // Build results object
    const allTickers: Record<string, TickerData[]> = {};
    let totalSymbols = 0;
    
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const [exchangeName, tickers] = result.value;
        allTickers[exchangeName] = tickers;
        totalSymbols += tickers.length;
        console.log(`📈 ${exchangeName}: ${tickers.length} symbols`);
      }
    });
    
    console.log(`✅ Total symbols fetched: ${totalSymbols}`);
    return allTickers as Record<SupportedExchange, TickerData[]>;
  }

  async fetchFundingRates(exchangeName: SupportedExchange): Promise<any[]> {
    const exchange = this.exchanges.get(exchangeName);
    if (!exchange || !exchange.has?.fetchFundingRates) {
      return [];
    }

    try {
      const fundingRates = await exchange.fetchFundingRates?.();
      return Object.values(fundingRates || {}).filter((rate: any) => 
        SUPPORTED_SYMBOLS.some(symbol => 
          symbol.replace('/', '') === rate.symbol?.replace('/', '')
        )
      );
    } catch (error) {
      console.error(`❌ Error fetching funding rates from ${exchangeName}:`, error);
      return [];
    }
  }

  isHealthy(exchangeName: SupportedExchange): boolean {
    return this.exchanges.has(exchangeName);
  }

  getHealthStatus(): Record<SupportedExchange, boolean> {
    const status: Record<string, boolean> = {};
    ['binance', 'okx', 'bitget', 'bybit'].forEach(exchangeName => {
      status[exchangeName] = this.isHealthy(exchangeName as SupportedExchange);
    });
    return status as Record<SupportedExchange, boolean>;
  }
} 