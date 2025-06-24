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

export class ArbitrageService {
  
  constructor() {}

  public calculatePriceSpreads(allTickers: any, allFundingRates: any): SpreadData[] {
    console.log('🔄 Calculating price spreads...');
    
    const spreads: SpreadData[] = [];
    const symbolMap: any = {};
    
    // Group tickers by symbol across exchanges
    Object.entries(allTickers).forEach(([exchangeName, tickers]: [string, any]) => {
      Object.entries(tickers).forEach(([symbol, ticker]: [string, any]) => {
        if (!symbolMap[symbol]) {
          symbolMap[symbol] = {};
        }
        symbolMap[symbol][exchangeName] = {
          ticker,
          fundingRate: allFundingRates[exchangeName]?.[symbol]
        };
      });
    });
    
    // Calculate spreads for symbols available on multiple exchanges
    Object.entries(symbolMap).forEach(([symbol, exchangeData]: [string, any]) => {
      const exchangeNames = Object.keys(exchangeData);
      
      if (exchangeNames.length >= 2) {
        const prices: any[] = [];
        const exchangeInfo: { [key: string]: ExchangeData } = {};
        
        exchangeNames.forEach(exchangeName => {
          const data = exchangeData[exchangeName];
          if (data.ticker && data.ticker.last) {
            prices.push({
              price: data.ticker.last,
              exchange: exchangeName,
              volume: data.ticker.quoteVolume || 0,
              fundingRate: data.fundingRate?.fundingRate || 0,
              fundingTime: data.fundingRate?.fundingTimestamp || null
            });
            
            exchangeInfo[exchangeName] = {
              price: data.ticker.last,
              volume: data.ticker.quoteVolume || 0,
              bid: data.ticker.bid,
              ask: data.ticker.ask,
              fundingRate: data.fundingRate?.fundingRate || 0,
              fundingTime: data.fundingRate?.fundingTimestamp || null,
              nextFundingTime: data.fundingRate?.fundingTimestamp ? 
                data.fundingRate.fundingTimestamp + (8 * 60 * 60 * 1000) : null
            };
          }
        });
        
        if (prices.length >= 2) {
          prices.sort((a, b) => a.price - b.price);
          
          const minPrice = prices[0].price;
          const maxPrice = prices[prices.length - 1].price;
          const minExchange = prices[0].exchange;
          const maxExchange = prices[prices.length - 1].exchange;
          
          const absoluteSpread = maxPrice - minPrice;
          const percentageSpread = (absoluteSpread / minPrice) * 100;
          
          // Calculate funding rate spread
          const fundingRateSpread = Math.abs(
            (exchangeInfo[maxExchange]?.fundingRate || 0) - 
            (exchangeInfo[minExchange]?.fundingRate || 0)
          ) * 100;
          
          // Only include meaningful spreads
          if (percentageSpread > 0.01) { // > 0.01%
            spreads.push({
              symbol,
              exchanges: exchangeInfo,
              priceSpread: {
                absolute: absoluteSpread,
                percentage: percentageSpread,
                buyExchange: minExchange,
                sellExchange: maxExchange,
                buyPrice: minPrice,
                sellPrice: maxPrice
              },
              fundingSpread: {
                percentage: fundingRateSpread,
                buyExchangeRate: exchangeInfo[minExchange]?.fundingRate || 0,
                sellExchangeRate: exchangeInfo[maxExchange]?.fundingRate || 0
              },
              arbitrageOpportunity: {
                type: 'price_arbitrage',
                profit: percentageSpread - 0.1, // Assuming 0.1% total fees
                confidence: prices.length >= 3 ? 'high' : 'medium'
              },
              lastUpdated: Date.now(),
              // Legacy fields for backward compatibility
              spread: {
                absolute: absoluteSpread,
                percentage: percentageSpread,
                bestBuy: minExchange,
                bestSell: maxExchange
              }
            });
          }
        }
      }
    });
    
    // Sort by price spread percentage descending
    spreads.sort((a, b) => b.priceSpread.percentage - a.priceSpread.percentage);
    
    console.log(`🎯 Found ${spreads.length} arbitrage opportunities`);
    if (spreads.length > 0) {
      console.log(`🏆 Best: ${spreads[0].symbol} - ${spreads[0].priceSpread.percentage.toFixed(4)}%`);
    }
    
    return spreads;
  }

  public applyFilters(spreads: SpreadData[], filters: FilterOptions): SpreadData[] {
    let filtered = [...spreads];
    
    // Filter by minimum spread
    if (filters.minSpread !== undefined) {
      filtered = filtered.filter(s => s.priceSpread.percentage >= filters.minSpread!);
    }
    
    // Filter by minimum volume
    if (filters.minVolume !== undefined) {
      filtered = filtered.filter(s => 
        Object.values(s.exchanges).some(ex => ex.volume >= filters.minVolume!)
      );
    }
    
    // Filter by exchanges
    if (filters.exchanges && filters.exchanges.length > 0) {
      filtered = filtered.filter(s => 
        filters.exchanges!.some(ex => s.exchanges[ex])
      );
    }
    
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(s => 
        s.symbol.toLowerCase().includes(searchTerm)
      );
    }
    
    // Limit results
    if (filters.limit && filters.limit > 0) {
      filtered = filtered.slice(0, filters.limit);
    }
    
    return filtered;
  }

  public getTopOpportunities(spreads: SpreadData[], count: number = 10): SpreadData[] {
    return spreads
      .sort((a, b) => b.arbitrageOpportunity.profit - a.arbitrageOpportunity.profit)
      .slice(0, count);
  }

  public getOpportunitiesByConfidence(spreads: SpreadData[], confidence: 'high' | 'medium' | 'low'): SpreadData[] {
    return spreads.filter(s => s.arbitrageOpportunity.confidence === confidence);
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
        lowConfidenceCount: 0
      };
    }

    const spreadPercentages = spreads.map(s => s.priceSpread.percentage);
    const averageSpread = spreadPercentages.reduce((sum, spread) => sum + spread, 0) / spreads.length;
    const maxSpread = Math.max(...spreadPercentages);
    const minSpread = Math.min(...spreadPercentages);

    const confidenceCounts = spreads.reduce((acc, spread) => {
      acc[spread.arbitrageOpportunity.confidence]++;
      return acc;
    }, { high: 0, medium: 0, low: 0 });

    return {
      totalOpportunities: spreads.length,
      averageSpread,
      maxSpread,
      minSpread,
      highConfidenceCount: confidenceCounts.high,
      mediumConfidenceCount: confidenceCounts.medium,
      lowConfidenceCount: confidenceCounts.low
    };
  }
} 