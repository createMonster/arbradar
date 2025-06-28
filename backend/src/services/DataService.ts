import { ExchangeService, FilterCriteria } from './ExchangeService';
import { CACHE_CONFIG } from '../config/exchanges';
import { ArbitrageService, SpreadData, FilterOptions } from './ArbitrageService';
import { CacheService } from './CacheService';

export interface DataServiceConfig {
  filterCriteria: FilterCriteria;
  cacheTtl?: number;
  updateInterval?: number;
}

export interface DataUpdateResult {
  success: boolean;
  spreads: SpreadData[];
  tickers: Record<string, unknown>;
  fundingRates: Record<string, unknown>;
  timestamp: number;
  error?: string;
}

export class DataService {
  private exchangeService: ExchangeService;
  private arbitrageService: ArbitrageService;
  private cacheService: CacheService;
  private updateTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private isUpdating = false;

  constructor(private config: DataServiceConfig) {
    this.exchangeService = new ExchangeService(config.filterCriteria);
    this.arbitrageService = new ArbitrageService();
    // Use PROCESSED_DATA_TTL which matches TICKERS_TTL for consistency
    this.cacheService = new CacheService(config.cacheTtl || CACHE_CONFIG.PROCESSED_DATA_TTL);

    // Start auto cleanup
    this.cleanupTimer = this.cacheService.startAutoCleanup();

    // Warm up cache on startup
    this.warmUpCaches();

    // Start background updates if interval is specified
    if (config.updateInterval) {
      this.startBackgroundUpdates(config.updateInterval);
    }
  }

  private async warmUpCaches(): Promise<void> {
    try {
      console.log('🔥 Warming up all caches...');
      await this.exchangeService.warmUpCache();
      console.log('✅ Cache warm-up completed');
    } catch (error) {
      console.error('❌ Cache warm-up failed:', error);
    }
  }

  public async getAllData(forceRefresh = false): Promise<DataUpdateResult> {
    const cacheKey = 'all_data';

    if (!forceRefresh) {
      const cached = this.cacheService.get<DataUpdateResult>(cacheKey);
      if (cached) {
        console.log('📦 Returning cached data');
        return { ...cached, timestamp: Date.now() };
      }
    }

    if (this.isUpdating) {
      console.log('⏳ Update already in progress, waiting...');
      // Wait for current update to complete
      while (this.isUpdating) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      // Try to get the fresh data
      const cached = this.cacheService.get<DataUpdateResult>(cacheKey);
      if (cached) {
        return { ...cached, timestamp: Date.now() };
      }
    }

    return this.updateAllData();
  }

  public async getSpreads(
    filters?: FilterOptions,
    forceRefresh = false,
  ): Promise<{
    success: boolean;
    data: SpreadData[];
    total: number;
    count: number;
    cached: boolean;
    filters?: FilterOptions;
    timestamp: number;
  }> {
    const allData = await this.getAllData(forceRefresh);

    if (!allData.success) {
      return {
        success: false,
        data: [],
        total: 0,
        count: 0,
        cached: false,
        timestamp: Date.now(),
      };
    }

    const filteredSpreads = allData.spreads;
    // Remove filters for now
    // if (filters) {
    //   filteredSpreads = this.arbitrageService.applyFilters(allData.spreads, filters);
    // }

    return {
      success: true,
      data: filteredSpreads,
      total: allData.spreads.length,
      count: filteredSpreads.length,
      cached: this.cacheService.has('all_data'),
      filters,
      timestamp: Date.now(),
    };
  }

  public async getTickers(
    exchangeName?: string,
    forceRefresh = false,
  ): Promise<{
    success: boolean;
    data: Record<string, unknown>;
    timestamp: number;
    cached: boolean;
  }> {
    const allData = await this.getAllData(forceRefresh);

    if (!allData.success) {
      return {
        success: false,
        data: {},
        timestamp: Date.now(),
        cached: false,
      };
    }

    const data = exchangeName ? { [exchangeName]: allData.tickers[exchangeName] } : allData.tickers;

    return {
      success: true,
      data,
      timestamp: Date.now(),
      cached: this.cacheService.has('all_data'),
    };
  }

  public async getFundingRates(
    exchangeName?: string,
    forceRefresh = false,
  ): Promise<{
    success: boolean;
    data: Record<string, unknown>;
    timestamp: number;
    cached: boolean;
  }> {
    const allData = await this.getAllData(forceRefresh);

    if (!allData.success) {
      return {
        success: false,
        data: {},
        timestamp: Date.now(),
        cached: false,
      };
    }

    const data = exchangeName ? { [exchangeName]: allData.fundingRates[exchangeName] } : allData.fundingRates;

    return {
      success: true,
      data,
      timestamp: Date.now(),
      cached: this.cacheService.has('all_data'),
    };
  }

  public async getHealthStatus(): Promise<{
    success: boolean;
    exchanges: { [exchange: string]: boolean };
    cache: Record<string, unknown>;
    uptime: number;
    timestamp: number;
  }> {
    try {
      const exchangeHealth = await this.exchangeService.healthCheck();
      const cacheStats = this.cacheService.getStats();

      return {
        success: true,
        exchanges: exchangeHealth,
        cache: {
          ...cacheStats,
          lastUpdate: this.cacheService.getCacheInfo('all_data')?.age || 0,
          isCached: this.cacheService.has('all_data'),
        },
        uptime: process.uptime(),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        success: false,
        exchanges: {},
        cache: {},
        uptime: process.uptime(),
        timestamp: Date.now(),
      };
    }
  }

  public getArbitrageStatistics(spreads?: SpreadData[]) {
    if (!spreads) {
      const cached = this.cacheService.get<DataUpdateResult>('all_data');
      spreads = cached?.spreads || [];
    }

    return this.arbitrageService.getStatistics(spreads);
  }

  public getTopOpportunities(count = 10, spreads?: SpreadData[]): SpreadData[] {
    if (!spreads) {
      const cached = this.cacheService.get<DataUpdateResult>('all_data');
      spreads = cached?.spreads || [];
    }

    return this.arbitrageService.getTopOpportunities(spreads, count);
  }

  private async updateAllData(): Promise<DataUpdateResult> {
    if (this.isUpdating) {
      console.log('⚠️ Update already in progress');
      const cached = this.cacheService.get<DataUpdateResult>('all_data');
      return (
        cached || {
          success: false,
          spreads: [],
          tickers: {},
          fundingRates: {},
          timestamp: Date.now(),
          error: 'Update in progress',
        }
      );
    }

    this.isUpdating = true;

    try {
      console.log('🔄 Starting comprehensive data update...');

      // Fetch all exchange data
      const { tickers, fundingRates } = await this.exchangeService.fetchAllExchangeData();

      // Calculate spreads
      const spreads = this.arbitrageService.calculatePriceSpreads(tickers, fundingRates);

      const result: DataUpdateResult = {
        success: true,
        spreads,
        tickers,
        fundingRates,
        timestamp: Date.now(),
      };

      // Cache the result
      this.cacheService.set('all_data', result);

      console.log('✅ Data update completed successfully');
      return result;
    } catch (error: unknown) {
      console.error('❌ Error updating data:', error);

      // Return cached data if available, otherwise empty result
      const cached = this.cacheService.get<DataUpdateResult>('all_data');
      if (cached) {
        console.log('📦 Returning cached data due to update error');
        return cached;
      }

      return {
        success: false,
        spreads: [],
        tickers: {},
        fundingRates: {},
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.isUpdating = false;
    }
  }

  private startBackgroundUpdates(intervalMs: number): void {
    console.log(`⏰ Starting background updates every ${intervalMs}ms`);

    this.updateTimer = setInterval(async () => {
      if (!this.isUpdating && !this.cacheService.has('all_data')) {
        console.log('⏰ Background update triggered');
        await this.updateAllData();
      }
    }, intervalMs);
  }

  public async forceUpdate(): Promise<DataUpdateResult> {
    console.log('🔄 Forcing data update...');
    return this.updateAllData();
  }

  public clearCache(): void {
    this.cacheService.clear();
    console.log('🧹 All caches cleared');
  }

  public getCacheInfo() {
    return {
      stats: this.cacheService.getStats(),
      keys: this.cacheService.getKeys(),
      size: this.cacheService.getSize(),
    };
  }

  // Cleanup method to stop timers
  public cleanup(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.cacheService.clear();
    console.log('🧹 DataService cleanup completed');
  }
}