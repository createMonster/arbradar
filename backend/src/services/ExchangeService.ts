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

      exchangeConfigs.forEach(({ name, class: ExchangeClass }) => {
        try {
          const exchange = new ExchangeClass({
            sandbox: false,
            enableRateLimit: true,
            timeout: 10000,
          });
          this.exchanges.set(name as SupportedExchange, exchange);
          console.log(`✅ Initialized ${name} exchange`);
        } catch (error) {
          console.error(`❌ Failed to initialize ${name}:`, error);
        }
      });
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
      return cached;
    }

    const exchange = this.exchanges.get(exchangeName);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeName} not initialized`);
    }

    try {
      console.log(`🔄 Fetching tickers from ${exchangeName}...`);
      
      const tickers: TickerData[] = [];
      
      for (const symbol of SUPPORTED_SYMBOLS) {
        try {
          const ticker = await exchange.fetchTicker(symbol);
          
          if (ticker && ticker.last && ticker.quoteVolume) {
            tickers.push({
              symbol,
              price: ticker.last,
              volume: ticker.quoteVolume,
              timestamp: Date.now()
            });
          }
        } catch (symbolError) {
          console.warn(`⚠️  ${exchangeName}: ${symbol} not available`);
        }
      }

      console.log(`✅ Fetched ${tickers.length} tickers from ${exchangeName}`);
      
      this.cache.set(cacheKey, tickers);
      return tickers;
      
    } catch (error) {
      console.error(`❌ Error fetching from ${exchangeName}:`, error);
      return cached || [];
    }
  }

  async fetchAllTickers(): Promise<Record<SupportedExchange, TickerData[]>> {
    const results: Record<string, TickerData[]> = {};
    
    const promises = Array.from(this.exchanges.keys()).map(async (exchangeName) => {
      try {
        const tickers = await this.fetchTickers(exchangeName);
        results[exchangeName] = tickers;
      } catch (error) {
        console.error(`❌ Failed to fetch from ${exchangeName}:`, error);
        results[exchangeName] = [];
      }
    });

    await Promise.allSettled(promises);
    return results as Record<SupportedExchange, TickerData[]>;
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