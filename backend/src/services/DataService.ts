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

  /**
   * Phase 1: Get top 5 routes for each symbol
   */
  public async getRoutes(
    filters?: any,
    forceRefresh = false,
  ): Promise<{
    success: boolean;
    data: any[];
    total: number;
    count: number;
    cached: boolean;
    routeStats?: {
      totalSymbols: number;
      averageRoutesPerSymbol: number;
      averageNetProfit: number;
    };
    timestamp: number;
  }> {
    const cacheKey = 'routes_data';

    if (!forceRefresh) {
      const cached = this.cacheService.get<any[]>(cacheKey);
      if (cached) {
        console.log('📦 Returning cached routes data');
        return this.formatRoutesResponse(cached, true);
      }
    }

    try {
      // Get fresh ticker and funding rate data  
      const { tickers, fundingRates } = await this.exchangeService.fetchAllExchangeData();

      // Calculate routes using simplified logic
      const routes = this.calculateTop5RoutesSimple(tickers, fundingRates);

      // Cache the results
      this.cacheService.set(cacheKey, routes);

      return this.formatRoutesResponse(routes, false);
    } catch (error) {
      console.error('❌ Failed to calculate routes:', error);
      return {
        success: false,
        data: [],
        total: 0,
        count: 0,
        cached: false,
        timestamp: Date.now(),
      };
    }
  }

  private formatRoutesResponse(routes: any[], cached: boolean) {
    const totalRoutes = routes.reduce((sum, r) => sum + (r.routeCount || 0), 0);
    const averageRoutesPerSymbol = routes.length > 0 ? totalRoutes / routes.length : 0;
    const averageNetProfit = routes.length > 0 
      ? routes.reduce((sum, r) => sum + (r.bestRoute?.profitability?.netProfitPercentage || 0), 0) / routes.length
      : 0;

    return {
      success: true,
      data: routes,
      total: routes.length,
      count: routes.length,
      cached,
      routeStats: {
        totalSymbols: routes.length,
        averageRoutesPerSymbol: Number(averageRoutesPerSymbol.toFixed(1)),
        averageNetProfit: Number(averageNetProfit.toFixed(4)),
      },
      timestamp: Date.now(),
    };
  }

  private calculateTop5RoutesSimple(
    allTickers: Record<string, Record<string, unknown>>,
    allFundingRates: Record<string, Record<string, unknown>>,
  ): any[] {
    console.log('🔄 Calculating top 5 routes for each symbol...');

    const routes: any[] = [];
    const symbolMap: Record<string, Record<string, any>> = {};
    let totalSymbols = 0;

    // Group tickers by symbol across exchanges
    Object.entries(allTickers).forEach(([exchangeName, tickers]) => {
      Object.entries(tickers).forEach(([symbol, ticker]) => {
        if (!symbolMap[symbol]) {
          symbolMap[symbol] = {};
          totalSymbols++;
        }
        symbolMap[symbol][exchangeName] = {
          ticker: ticker,
          fundingRate: allFundingRates[exchangeName]?.[symbol],
        };
      });
    });

    console.log(`📊 Processing ${totalSymbols} unique symbols for route calculation...`);

    // Calculate routes for each symbol
    Object.entries(symbolMap).forEach(([symbol, exchangeData]) => {
      const exchangeNames = Object.keys(exchangeData);

      if (exchangeNames.length >= 2) {
        const prices: any[] = [];
        const exchangeInfo: any = {};

        // Build price array and exchange info
        exchangeNames.forEach((exchangeName) => {
          const data = exchangeData[exchangeName];
          const ticker = data.ticker as any;
          const fundingRate = data.fundingRate as any;
          
          if (ticker && ticker.last && ticker.last > 0) {
            prices.push({
              price: ticker.last,
              exchange: exchangeName,
              volume: ticker.quoteVolume || 0,
              fundingRate: fundingRate?.fundingRate || 0,
            });

            exchangeInfo[exchangeName] = {
              price: ticker.last,
              volume: ticker.quoteVolume || 0,
              lastUpdated: Date.now(),
              fundingRate: fundingRate?.fundingRate ? {
                rate: fundingRate.fundingRate,
                nextTime: fundingRate.fundingTimestamp ? fundingRate.fundingTimestamp + 8 * 60 * 60 * 1000 : Date.now() + 8 * 60 * 60 * 1000,
                dataAge: 0,
              } : undefined,
            };
          }
        });

        if (prices.length >= 2) {
          // Basic data quality check
          const volumes = prices.map((p) => p.volume).filter((v) => v > 0);
          const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
          
          if (totalVolume < 50000) return; // Skip low volume pairs

          // Calculate all possible profitable routes
          const allRoutes: any[] = [];
          
          for (let i = 0; i < prices.length; i++) {
            for (let j = 0; j < prices.length; j++) {
              if (i !== j) {
                const buyExchange = prices[i].exchange;
                const sellExchange = prices[j].exchange;
                const buyPrice = prices[i].price;
                const sellPrice = prices[j].price;

                if (sellPrice > buyPrice) {
                  const absoluteSpread = sellPrice - buyPrice;
                  const percentageSpread = (absoluteSpread / buyPrice) * 100;

                  // Basic fee estimation (0.1% per side = 0.2% total)
                  const estimatedFees = buyPrice * 0.002;
                  const grossProfit = absoluteSpread;
                  const netProfit = grossProfit - estimatedFees;
                  const netProfitPercentage = (netProfit / buyPrice) * 100;

                  // Only include profitable routes
                  if (netProfit > 0 && percentageSpread > 0.01) {
                    const buyVolume = prices[i].volume;
                    const sellVolume = prices[j].volume;
                    const minVolume = Math.min(buyVolume, sellVolume);
                    
                    let executionRisk: 'low' | 'medium' | 'high' = 'medium';
                    if (minVolume > 100000) executionRisk = 'low';
                    else if (minVolume < 50000) executionRisk = 'high';

                    const route = {
                      routeId: `${symbol}-${buyExchange}-${sellExchange}-${Date.now()}`,
                      type: 'direct',
                      buyExchange,
                      sellExchange,
                      buyPrice,
                      sellPrice,
                      spread: {
                        absolute: absoluteSpread,
                        percentage: percentageSpread,
                      },
                      profitability: {
                        grossProfit,
                        estimatedFees,
                        netProfit,
                        netProfitPercentage,
                      },
                      executionConstraints: {
                        maxVolume: minVolume,
                        liquidityScore: Math.min(minVolume / 100000, 1),
                        executionRisk,
                      },
                    };

                    // Add funding impact for perpetual contracts
                    const isPerp = symbol.includes(':') || symbol.includes('PERP') || symbol.includes('PERPETUAL');
                    if (isPerp) {
                      const buyFundingRate = prices[i].fundingRate;
                      const sellFundingRate = prices[j].fundingRate;
                      (route as any).fundingImpact = {
                        buyExchangeRate: buyFundingRate,
                        sellExchangeRate: sellFundingRate,
                        netFundingImpact: Math.abs(sellFundingRate - buyFundingRate) * 100,
                      };
                    }

                    allRoutes.push(route);
                  }
                }
              }
            }
          }

          // Sort routes by net profitability and take top 5
          allRoutes.sort((a, b) => b.profitability.netProfitPercentage - a.profitability.netProfitPercentage);
          const top5Routes = allRoutes.slice(0, 5);

          if (top5Routes.length > 0) {
            const marketType = symbol.includes(':') || symbol.includes('PERP') || symbol.includes('PERPETUAL') ? 'perp' : 'spot';
            
            routes.push({
              symbol,
              marketType,
              exchanges: exchangeInfo,
              routes: top5Routes,
              bestRoute: top5Routes[0],
              routeCount: top5Routes.length,
              totalAvailableRoutes: allRoutes.length,
              lastUpdated: Date.now(),
            });
          }
        }
      }
    });

    // Sort by best route profitability
    routes.sort((a, b) => b.bestRoute.profitability.netProfitPercentage - a.bestRoute.profitability.netProfitPercentage);

    console.log(`🎯 Route Calculation Summary:`);
    console.log(`   • Symbols with profitable routes: ${routes.length}`);
    if (routes.length > 0) {
      const avgRoutes = routes.reduce((sum, r) => sum + r.routeCount, 0) / routes.length;
      console.log(`   • Average routes per symbol: ${avgRoutes.toFixed(1)}`);
      console.log(`🏆 Best opportunity: ${routes[0].symbol} - ${routes[0].bestRoute.profitability.netProfitPercentage.toFixed(4)}% net profit`);
    }

    return routes;
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