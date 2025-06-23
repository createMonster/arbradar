import { TickerData, PriceRow, SpreadData, SupportedExchange, SUPPORTED_SYMBOLS } from '../types';

export class DataProcessor {
  
  static processTickerData(allTickers: Record<SupportedExchange, TickerData[]>): PriceRow[] {
    console.log('🔍 Processing ticker data for arbitrage opportunities...');
    
    const symbolMap = new Map<string, Record<string, TickerData>>();
    
    // Group tickers by symbol
    Object.entries(allTickers).forEach(([exchangeName, tickers]) => {
      console.log(`📊 Processing ${exchangeName}: ${tickers.length} tickers`);
      tickers.forEach(ticker => {
        if (!symbolMap.has(ticker.symbol)) {
          symbolMap.set(ticker.symbol, {});
        }
        symbolMap.get(ticker.symbol)![exchangeName] = ticker;
      });
    });

    console.log(`📈 Found ${symbolMap.size} unique symbols across all exchanges`);

    const priceRows: PriceRow[] = [];

    // Process each symbol that has data from at least 2 exchanges
    symbolMap.forEach((exchangeData, symbol) => {
      const exchanges = Object.keys(exchangeData);
      console.log(`🔍 ${symbol}: available on ${exchanges.length} exchanges [${exchanges.join(', ')}]`);
      
      if (exchanges.length >= 2) {
        const priceRow = this.createPriceRow(symbol, exchangeData);
        if (priceRow) {
          console.log(`✅ ${symbol}: Spread ${priceRow.spread.percentage.toFixed(4)}% (${priceRow.spread.bestBuy} → ${priceRow.spread.bestSell})`);
          priceRows.push(priceRow);
        } else {
          console.log(`❌ ${symbol}: Failed to create price row`);
        }
      } else {
        console.log(`⚠️  ${symbol}: Only available on ${exchanges.length} exchange(s), skipping`);
      }
    });

    console.log(`🎯 Generated ${priceRows.length} arbitrage opportunities`);

    // Sort by spread percentage (highest first)
    const sortedRows = priceRows.sort((a, b) => b.spread.percentage - a.spread.percentage);
    
    if (sortedRows.length > 0) {
      console.log(`🏆 Best opportunity: ${sortedRows[0].symbol} with ${sortedRows[0].spread.percentage.toFixed(4)}% spread`);
    }

    return sortedRows;
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
      console.log(`❌ ${symbol}: Less than 2 prices available`);
      return null;
    }

    // Calculate spread
    const spread = this.calculateSpread(prices, exchangeNames);
    
    // Log price details for debugging
    const priceDetails = prices.map((price, i) => `${exchangeNames[i]}: $${price}`).join(', ');
    console.log(`💰 ${symbol} prices: ${priceDetails}`);

    // Only include if there's an actual spread (avoid zero spreads)
    if (spread.percentage < 0.001) {
      console.log(`⚠️  ${symbol}: Spread too small (${spread.percentage.toFixed(6)}%), skipping`);
      return null;
    }

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

    const absolute = maxPrice - minPrice;
    const percentage = ((maxPrice - minPrice) / minPrice) * 100;

    return {
      absolute,
      percentage,
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