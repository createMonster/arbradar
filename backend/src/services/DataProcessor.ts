import { TickerData, PriceRow, SpreadData, SupportedExchange, SUPPORTED_SYMBOLS } from '../types';

export class DataProcessor {
  
  static processTickerData(allTickers: Record<SupportedExchange, TickerData[]>): PriceRow[] {
    const symbolMap = new Map<string, Record<string, TickerData>>();
    
    // Group tickers by symbol
    Object.entries(allTickers).forEach(([exchangeName, tickers]) => {
      tickers.forEach(ticker => {
        if (!symbolMap.has(ticker.symbol)) {
          symbolMap.set(ticker.symbol, {});
        }
        symbolMap.get(ticker.symbol)![exchangeName] = ticker;
      });
    });

    const priceRows: PriceRow[] = [];

    // Process each symbol that has data from at least 2 exchanges
    symbolMap.forEach((exchangeData, symbol) => {
      const exchanges = Object.keys(exchangeData);
      if (exchanges.length >= 2) {
        const priceRow = this.createPriceRow(symbol, exchangeData);
        if (priceRow) {
          priceRows.push(priceRow);
        }
      }
    });

    // Sort by spread percentage (highest first)
    return priceRows.sort((a, b) => b.spread.percentage - a.spread.percentage);
  }

  private static createPriceRow(symbol: string, exchangeData: Record<string, TickerData>): PriceRow | null {
    const exchanges: Record<string, any> = {};
    const prices: number[] = [];
    const exchangeNames: string[] = [];

    // Convert ticker data to exchange data format
    Object.entries(exchangeData).forEach(([exchangeName, ticker]) => {
      exchanges[exchangeName] = {
        price: ticker.price,
        volume: ticker.volume,
        lastUpdated: ticker.timestamp
      };
      prices.push(ticker.price);
      exchangeNames.push(exchangeName);
    });

    if (prices.length < 2) {
      return null;
    }

    // Calculate spread
    const spread = this.calculateSpread(prices, exchangeNames);

    // Generate mock funding rate for some symbols (this would come from real API in production)
    const fundingRate = Math.random() > 0.7 ? {
      rate: (Math.random() - 0.5) * 0.002, // -0.1% to +0.1%
      nextTime: Date.now() + Math.random() * 8 * 60 * 60 * 1000, // Within next 8 hours
      exchange: exchangeNames[Math.floor(Math.random() * exchangeNames.length)]
    } : undefined;

    return {
      symbol,
      exchanges,
      spread,
      fundingRate
    };
  }

  private static calculateSpread(prices: number[], exchangeNames: string[]): SpreadData {
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const minIndex = prices.indexOf(minPrice);
    const maxIndex = prices.indexOf(maxPrice);

    return {
      absolute: maxPrice - minPrice,
      percentage: ((maxPrice - minPrice) / minPrice) * 100,
      bestBuy: exchangeNames[minIndex], // Buy from exchange with lowest price
      bestSell: exchangeNames[maxIndex]  // Sell to exchange with highest price
    };
  }

  static filterByMinVolume(priceRows: PriceRow[], minVolume: number): PriceRow[] {
    if (minVolume <= 0) return priceRows;
    
    return priceRows.filter(row => {
      const totalVolume = Object.values(row.exchanges).reduce((sum: number, exchange: any) => {
        return sum + (exchange.volume || 0);
      }, 0);
      return totalVolume >= minVolume;
    });
  }

  static filterByMinSpread(priceRows: PriceRow[], minSpread: number): PriceRow[] {
    if (minSpread <= 0) return priceRows;
    
    return priceRows.filter(row => row.spread.percentage >= minSpread);
  }

  static filterByExchanges(priceRows: PriceRow[], selectedExchanges: string[]): PriceRow[] {
    if (!selectedExchanges.length) return priceRows;
    
    return priceRows.filter(row => {
      return selectedExchanges.some(exchange => 
        row.exchanges[exchange] !== undefined
      );
    });
  }

  static searchBySymbol(priceRows: PriceRow[], searchTerm: string): PriceRow[] {
    if (!searchTerm.trim()) return priceRows;
    
    const term = searchTerm.toLowerCase();
    return priceRows.filter(row => 
      row.symbol.toLowerCase().includes(term)
    );
  }
} 