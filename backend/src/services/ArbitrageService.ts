export interface SpreadData {
  symbol: string;
  exchanges: { [exchangeName: string]: ExchangeData };
  priceSpread: PriceSpread;
  fundingSpread: FundingSpread;
  arbitrageOpportunity: ArbitrageOpportunity;
  lastUpdated: number;
  // Legacy fields for backward compatibility
  spread: LegacySpread;
}

export interface ExchangeData {
  price: number;
  volume: number;
  bid?: number;
  ask?: number;
  fundingRate: number;
  fundingTime: number | null;
  nextFundingTime: number | null;
}

export interface PriceSpread {
  absolute: number;
  percentage: number;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
}

export interface FundingSpread {
  percentage: number;
  buyExchangeRate: number;
  sellExchangeRate: number;
}

export interface ArbitrageOpportunity {
  type: string;
  profit: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface LegacySpread {
  absolute: number;
  percentage: number;
  bestBuy: string;
  bestSell: string;
}

export interface FilterOptions {
  minSpread?: number;
  minVolume?: number;
  exchanges?: string[];
  search?: string;
  limit?: number;
}

// Enhanced filtering criteria for data quality
interface DataQualityFilters {
  maxRealisticSpread: number; // Maximum realistic spread percentage (e.g., 50%)
  minVolumePerExchange: number; // Minimum volume per exchange
  minTotalVolume: number; // Minimum total volume across all exchanges
  maxVolumeRatio: number; // Maximum volume ratio between exchanges (e.g., 100:1)
  minExchangeCount: number; // Minimum number of exchanges required
  priceValidationThreshold: number; // Price difference threshold for validation
}

interface TickerData {
  last?: number;
  bid?: number;
  ask?: number;
  quoteVolume?: number;
  [key: string]: unknown;
}

interface FundingRateData {
  fundingRate?: number;
  fundingTimestamp?: number;
  [key: string]: unknown;
}

export class ArbitrageService {
  private dataQualityFilters: DataQualityFilters = {
    maxRealisticSpread: 50.0, // 50% max spread - anything higher is likely data quality issue
    minVolumePerExchange: 10000, // $10K minimum volume per exchange
    minTotalVolume: 50000, // $50K minimum total volume
    maxVolumeRatio: 50, // Max 50:1 volume ratio between exchanges
    minExchangeCount: 2, // At least 2 exchanges
    priceValidationThreshold: 100.0, // Flag if spread > 100% for manual review
  };

  constructor() {}

  /**
   * Validates if a symbol has quality data across exchanges
   */
  private validateDataQuality(
    symbol: string,
    prices: { price: number; exchange: string; volume: number; fundingRate: number; fundingTime: number | null }[],
  ): boolean {
    // Check minimum exchange count
    if (prices.length < this.dataQualityFilters.minExchangeCount) {
      return false;
    }

    // Check volume requirements
    const volumes = prices.map((p) => p.volume).filter((v) => v > 0);
    if (volumes.length === 0) {
      console.log(`⚠️ ${symbol}: No volume data available`);
      return false;
    }

    // Check minimum volume per exchange
    const hasInsufficientVolume = prices.some((p) => p.volume < this.dataQualityFilters.minVolumePerExchange);
    if (hasInsufficientVolume) {
      console.log(`⚠️ ${symbol}: Exchange with volume < $${this.dataQualityFilters.minVolumePerExchange}`);
      return false;
    }

    // Check total volume
    const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
    if (totalVolume < this.dataQualityFilters.minTotalVolume) {
      console.log(`⚠️ ${symbol}: Total volume ${totalVolume} < $${this.dataQualityFilters.minTotalVolume}`);
      return false;
    }

    // Check volume ratio (detect when one exchange has extremely low volume)
    const maxVolume = Math.max(...volumes);
    const minVolume = Math.min(...volumes);
    if (maxVolume / minVolume > this.dataQualityFilters.maxVolumeRatio) {
      console.log(
        `⚠️ ${symbol}: Volume ratio ${(maxVolume / minVolume).toFixed(1)}:1 exceeds max ${
          this.dataQualityFilters.maxVolumeRatio
        }:1`,
      );
      return false;
    }

    // Check price sanity
    prices.sort((a, b) => a.price - b.price);
    const minPrice = prices[0].price;
    const maxPrice = prices[prices.length - 1].price;
    const percentageSpread = ((maxPrice - minPrice) / minPrice) * 100;

    // Filter out extreme spreads (likely inactive tokens)
    if (percentageSpread > this.dataQualityFilters.maxRealisticSpread) {
      console.log(
        `⚠️ ${symbol}: Spread ${percentageSpread.toFixed(2)}% exceeds realistic limit ${
          this.dataQualityFilters.maxRealisticSpread
        }%`,
      );
      return false;
    }

    // Flag for manual review if spread is very high but under max limit
    if (percentageSpread > this.dataQualityFilters.priceValidationThreshold) {
      console.log(`🔍 ${symbol}: High spread ${percentageSpread.toFixed(2)}% - manual review recommended`);
    }

    return true;
  }

  /**
   * Enhanced spread calculation with data quality validation
   */
  public calculatePriceSpreads(
    allTickers: Record<string, Record<string, unknown>>,
    allFundingRates: Record<string, Record<string, unknown>>,
  ): SpreadData[] {
    console.log('🔄 Calculating price spreads with enhanced filtering...');

    const spreads: SpreadData[] = [];
    const symbolMap: Record<string, Record<string, { ticker: TickerData; fundingRate: FundingRateData | undefined }>> = {};
    let totalSymbols = 0;
    let qualityRejected = 0;

    // Group tickers by symbol across exchanges
    Object.entries(allTickers).forEach(([exchangeName, tickers]) => {
      Object.entries(tickers).forEach(([symbol, ticker]) => {
        if (!symbolMap[symbol]) {
          symbolMap[symbol] = {};
          totalSymbols++;
        }
        symbolMap[symbol][exchangeName] = {
          ticker: ticker as TickerData,
          fundingRate: allFundingRates[exchangeName]?.[symbol] as FundingRateData | undefined,
        };
      });
    });

    console.log(`📊 Processing ${totalSymbols} unique symbols...`);

    // Calculate spreads for symbols available on multiple exchanges
    Object.entries(symbolMap).forEach(([symbol, exchangeData]) => {
      const exchangeNames = Object.keys(exchangeData);

      if (exchangeNames.length >= 2) {
        const prices: { price: number; exchange: string; volume: number; fundingRate: number; fundingTime: number | null }[] = [];
        const exchangeInfo: { [exchangeName: string]: ExchangeData } = {};

        exchangeNames.forEach((exchangeName) => {
          const data = exchangeData[exchangeName];
          if (data.ticker && data.ticker.last && data.ticker.last > 0) {
            prices.push({
              price: data.ticker.last,
              exchange: exchangeName,
              volume: data.ticker.quoteVolume || 0,
              fundingRate: data.fundingRate?.fundingRate || 0,
              fundingTime: data.fundingRate?.fundingTimestamp || null,
            });

            exchangeInfo[exchangeName] = {
              price: data.ticker.last,
              volume: data.ticker.quoteVolume || 0,
              bid: data.ticker.bid,
              ask: data.ticker.ask,
              fundingRate: data.fundingRate?.fundingRate || 0,
              fundingTime: data.fundingRate?.fundingTimestamp || null,
              nextFundingTime: data.fundingRate?.fundingTimestamp ? data.fundingRate.fundingTimestamp + 8 * 60 * 60 * 1000 : null,
            };
          }
        });

        if (prices.length >= 2) {
          // Apply data quality validation
          if (!this.validateDataQuality(symbol, prices)) {
            qualityRejected++;
            return; // Skip this symbol
          }

          prices.sort((a, b) => a.price - b.price);

          const minPrice = prices[0].price;
          const maxPrice = prices[prices.length - 1].price;
          const minExchange = prices[0].exchange;
          const maxExchange = prices[prices.length - 1].exchange;

          const absoluteSpread = maxPrice - minPrice;
          const percentageSpread = (absoluteSpread / minPrice) * 100;

          // Calculate funding rate spread
          const fundingRateSpread =
            Math.abs((exchangeInfo[maxExchange]?.fundingRate || 0) - (exchangeInfo[minExchange]?.fundingRate || 0)) * 100;

          // Only include meaningful spreads (but now with proper upper bounds)
          if (percentageSpread > 0.01 && percentageSpread <= this.dataQualityFilters.maxRealisticSpread) {
            spreads.push({
              symbol,
              exchanges: exchangeInfo,
              priceSpread: {
                absolute: absoluteSpread,
                percentage: percentageSpread,
                buyExchange: minExchange,
                sellExchange: maxExchange,
                buyPrice: minPrice,
                sellPrice: maxPrice,
              },
              fundingSpread: {
                percentage: fundingRateSpread,
                buyExchangeRate: exchangeInfo[minExchange]?.fundingRate || 0,
                sellExchangeRate: exchangeInfo[maxExchange]?.fundingRate || 0,
              },
              arbitrageOpportunity: {
                type: 'price_arbitrage',
                profit: percentageSpread - 0.1, // Assuming 0.1% total fees
                confidence: prices.length >= 3 ? 'high' : 'medium',
              },
              lastUpdated: Date.now(),
              // Legacy fields for backward compatibility
              spread: {
                absolute: absoluteSpread,
                percentage: percentageSpread,
                bestBuy: minExchange,
                bestSell: maxExchange,
              },
            });
          }
        }
      }
    });

    // Sort by price spread percentage descending
    spreads.sort((a, b) => b.priceSpread.percentage - a.priceSpread.percentage);

    console.log(`🎯 Data Quality Summary:`);
    console.log(`   • Total symbols processed: ${totalSymbols}`);
    console.log(`   • Quality filtered out: ${qualityRejected}`);
    console.log(`   • Valid arbitrage opportunities: ${spreads.length}`);

    if (spreads.length > 0) {
      console.log(`🏆 Best opportunity: ${spreads[0].symbol} - ${spreads[0].priceSpread.percentage.toFixed(4)}%`);
      console.log(
        `📈 Average spread: ${(spreads.reduce((sum, s) => sum + s.priceSpread.percentage, 0) / spreads.length).toFixed(
          4,
        )}%`,
      );
    }

    return spreads;
  }

  public applyFilters(spreads: SpreadData[], filters: FilterOptions): SpreadData[] {
    let filtered = [...spreads];

    // Filter by minimum spread
    if (filters.minSpread !== undefined) {
      filtered = filtered.filter((s) => s.priceSpread.percentage >= filters.minSpread!);
    }

    // Filter by minimum volume
    if (filters.minVolume !== undefined) {
      filtered = filtered.filter((s) => Object.values(s.exchanges).some((ex) => ex.volume >= filters.minVolume!));
    }

    // Filter by exchanges
    if (filters.exchanges && filters.exchanges.length > 0) {
      filtered = filtered.filter((s) => filters.exchanges!.some((ex) => s.exchanges[ex]));
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter((s) => s.symbol.toLowerCase().includes(searchTerm));
    }

    // Limit results
    if (filters.limit && filters.limit > 0) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  public getTopOpportunities(spreads: SpreadData[], count: number = 10): SpreadData[] {
    return spreads.sort((a, b) => b.arbitrageOpportunity.profit - a.arbitrageOpportunity.profit).slice(0, count);
  }

  public getOpportunitiesByConfidence(spreads: SpreadData[], confidence: 'high' | 'medium' | 'low'): SpreadData[] {
    return spreads.filter((s) => s.arbitrageOpportunity.confidence === confidence);
  }

  public getStatistics(spreads: SpreadData[]): {
    totalOpportunities: number;
    averageSpread: number;
    maxSpread: number;
    minSpread: number;
    highConfidenceCount: number;
    mediumConfidenceCount: number;
    lowConfidenceCount: number;
  } {
    if (spreads.length === 0) {
      return {
        totalOpportunities: 0,
        averageSpread: 0,
        maxSpread: 0,
        minSpread: 0,
        highConfidenceCount: 0,
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
      };
    }

    const spreadPercentages = spreads.map((s) => s.priceSpread.percentage);
    const averageSpread = spreadPercentages.reduce((sum, spread) => sum + spread, 0) / spreads.length;
    const maxSpread = Math.max(...spreadPercentages);
    const minSpread = Math.min(...spreadPercentages);

    const confidenceCounts = spreads.reduce(
      (acc, spread) => {
        acc[spread.arbitrageOpportunity.confidence]++;
        return acc;
      },
      { high: 0, medium: 0, low: 0 },
    );

    return {
      totalOpportunities: spreads.length,
      averageSpread,
      maxSpread,
      minSpread,
      highConfidenceCount: confidenceCounts.high,
      mediumConfidenceCount: confidenceCounts.medium,
      lowConfidenceCount: confidenceCounts.low,
    };
  }


}