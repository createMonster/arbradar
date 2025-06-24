import { Router, Request, Response } from 'express';
// Remove old service imports - we'll use direct CCXT approach
const ccxt = require('ccxt');

const router = Router();

// Initialize exchanges with proper settings for perpetual contracts
const exchanges = {
  binance: new ccxt.binance({ 
    enableRateLimit: true,
    timeout: 30000,
    options: {
      defaultType: 'swap' // For perpetual contracts
    }
  }),
  okx: new ccxt.okx({ 
    enableRateLimit: true,
    timeout: 30000,
    options: {
      defaultType: 'swap'
    }
  }),
  bitget: new ccxt.bitget({ 
    enableRateLimit: true,
    timeout: 30000,
    options: {
      defaultType: 'swap'
    }
  }),
  bybit: new ccxt.bybit({ 
    enableRateLimit: true,
    timeout: 30000,
    options: {
      defaultType: 'linear'
    }
  })
};

// Filter criteria for meaningful trading pairs
const FILTER_CRITERIA = {
  minVolume: 100, // Minimum 24h volume in USDT  
  minFundingRateAbs: -1, // Minimum funding rate (disabled with -1)
  quoteAssets: ['USDT', 'USD', 'USDC'], // Only these quote assets
  blacklistedSymbols: ['BULL', 'BEAR', 'UP', 'DOWN', 'HEDGE'] // Exclude leveraged tokens
};

// Cache for storing data
let cache = {
  allTickers: {} as any,
  fundingRates: {} as any,
  spreads: [] as any[],
  lastUpdate: 0,
  ttl: 30000 // 30 seconds cache
};

interface QueryParams {
  minVolume?: string;
  minSpread?: string;
  exchanges?: string;
  search?: string;
  limit?: string;
}

// Helper function to check if symbol should be included
function shouldIncludeSymbol(symbol: string, ticker: any): boolean {
  // Check if it's a perpetual contract
  if (!symbol.includes(':') && !symbol.includes('PERP')) return false;
  
  // Check quote asset
  const quoteAsset = symbol.split('/')[1]?.split(':')[0];
  if (!FILTER_CRITERIA.quoteAssets.includes(quoteAsset)) return false;
  
  // Check blacklisted symbols
  if (FILTER_CRITERIA.blacklistedSymbols.some(bl => symbol.includes(bl))) return false;
  
  // Check minimum volume
  if (ticker.quoteVolume && ticker.quoteVolume < FILTER_CRITERIA.minVolume) return false;
  
  return true;
}

// Fetch all available tickers from an exchange
async function fetchAllTickers(exchangeName: string, exchange: any): Promise<any> {
  try {
    console.log(`📡 Fetching all tickers from ${exchangeName}...`);
    
    // Load markets first
    await exchange.loadMarkets();
    
    // Get all tickers for perpetual contracts
    const allTickers = await exchange.fetchTickers();
    
    // Filter meaningful tickers
    const filteredTickers: any = {};
    let totalCount = 0;
    let filteredCount = 0;
    
    for (const [symbol, ticker] of Object.entries(allTickers)) {
      totalCount++;
      
      if (shouldIncludeSymbol(symbol, ticker)) {
        filteredTickers[symbol] = ticker;
        filteredCount++;
      }
    }
    
    console.log(`✅ ${exchangeName}: ${filteredCount}/${totalCount} tickers after filtering`);
    return filteredTickers;
    
  } catch (error: any) {
    console.error(`❌ Error fetching tickers from ${exchangeName}:`, error.message);
    return {};
  }
}

// Fetch funding rates for perpetual contracts
async function fetchFundingRates(exchangeName: string, exchange: any, symbols: string[]): Promise<any> {
  try {
    console.log(`💰 Fetching funding rates from ${exchangeName}...`);
    
    const fundingRates: any = {};
    const symbolsArray = Array.isArray(symbols) ? symbols : Object.keys(symbols);
    
    // Fetch funding rates in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < symbolsArray.length; i += batchSize) {
      const batch = symbolsArray.slice(i, i + batchSize);
      
      const promises = batch.map(async (symbol) => {
        try {
          const fundingRate = await exchange.fetchFundingRate(symbol);
          if (fundingRate && (FILTER_CRITERIA.minFundingRateAbs === -1 || Math.abs(fundingRate.fundingRate) >= FILTER_CRITERIA.minFundingRateAbs)) {
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
    return {};
  }
}

// Calculate price spreads across exchanges
function calculatePriceSpreads(allTickers: any, allFundingRates: any): any[] {
  console.log('🔄 Calculating price spreads...');
  
  const spreads: any[] = [];
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
      const exchangeInfo: any = {};
      
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

// Main data fetching and processing function
async function updateAllData(): Promise<any[]> {
  try {
    console.log('🔄 Starting comprehensive data update...');
    
    const allTickers: any = {};
    const allFundingRates: any = {};
    
    // Fetch all tickers from all exchanges in parallel
    const tickerPromises = Object.entries(exchanges).map(async ([name, exchange]: [string, any]) => {
      const tickers = await fetchAllTickers(name, exchange);
      return [name, tickers];
    });
    
    const tickerResults = await Promise.allSettled(tickerPromises);
    
    tickerResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const [name, tickers] = result.value;
        allTickers[name] = tickers;
      }
    });
    
    // Fetch funding rates for all exchanges in parallel
    const fundingPromises = Object.entries(exchanges).map(async ([name, exchange]: [string, any]) => {
      const symbols = allTickers[name] ? Object.keys(allTickers[name]) : [];
      const fundingRates = await fetchFundingRates(name, exchange, symbols);
      return [name, fundingRates];
    });
    
    const fundingResults = await Promise.allSettled(fundingPromises);
    
    fundingResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const [name, fundingRates] = result.value;
        allFundingRates[name] = fundingRates;
      }
    });
    
    // Calculate spreads
    const spreads = calculatePriceSpreads(allTickers, allFundingRates);
    
    // Update cache
    cache = {
      allTickers,
      fundingRates: allFundingRates,
      spreads,
      lastUpdate: Date.now(),
      ttl: 30000
    };
    
    console.log('✅ Data update completed successfully');
    return spreads;
    
  } catch (error) {
    console.error('❌ Error updating data:', error);
    return cache.spreads || [];
  }
}

// Apply filters to spreads data
function applyFilters(spreads: any[], filters: QueryParams): any[] {
  let filtered = [...spreads];
  
  // Filter by minimum spread
  if (filters.minSpread) {
    const minSpread = parseFloat(filters.minSpread);
    filtered = filtered.filter(s => s.priceSpread.percentage >= minSpread);
  }
  
  // Filter by minimum volume
  if (filters.minVolume) {
    const minVolume = parseFloat(filters.minVolume);
    filtered = filtered.filter(s => 
      Object.values(s.exchanges).some((ex: any) => ex.volume >= minVolume)
    );
  }
  
  // Filter by exchanges
  if (filters.exchanges) {
    const targetExchanges = filters.exchanges.split(',');
    filtered = filtered.filter(s => 
      targetExchanges.some(ex => s.exchanges[ex])
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
  if (filters.limit) {
    const limit = parseInt(filters.limit);
    filtered = filtered.slice(0, limit);
  }
  
  return filtered;
}

// GET /api/spreads - Main endpoint for arbitrage opportunities
router.get('/spreads', async (req: Request<{}, {}, {}, QueryParams>, res: Response) => {
  try {
    console.log('🔄 API call to /spreads');
    
    // Check cache
    const now = Date.now();
    if (cache.spreads && cache.spreads.length > 0 && (now - cache.lastUpdate) < cache.ttl) {
      console.log(`📦 Returning cached data (${cache.spreads.length} items)`);
      
      // Apply filters to cached data
      const filteredData = applyFilters(cache.spreads, req.query);
      
      return res.json({
        success: true,
        data: filteredData,
        timestamp: now,
        count: filteredData.length,
        total: cache.spreads.length,
        cached: true,
        filters: req.query
      });
    }
    
    // Fetch fresh data
    const spreads = await updateAllData();
    
    // Apply filters
    const filteredData = applyFilters(spreads, req.query);
    
    console.log(`✅ Returning ${filteredData.length} arbitrage opportunities`);
    
    res.json({
      success: true,
      data: filteredData,
      timestamp: now,
      count: filteredData.length,
      total: spreads.length,
      cached: false,
      filters: req.query
    });
    
  } catch (error) {
    console.error('❌ Error in /api/spreads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch arbitrage data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/tickers - Raw ticker data from exchanges
router.get('/tickers', async (req: Request<{}, {}, {}, { exchanges?: string }>, res: Response) => {
  try {
    const exchangeParam = req.query.exchanges?.toLowerCase();
    
    if (exchangeParam && !exchanges[exchangeParam as keyof typeof exchanges]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exchange',
        supportedExchanges: Object.keys(exchanges)
      });
    }
    
    const now = Date.now();
    if (cache.allTickers && (now - cache.lastUpdate) < cache.ttl) {
      const data = exchangeParam ? { [exchangeParam]: cache.allTickers[exchangeParam] } : cache.allTickers;
      
      return res.json({
        success: true,
        data,
        timestamp: now,
        cached: true
      });
    }
    
    // If no cached data, trigger update
    await updateAllData();
    
    const data = exchangeParam ? { [exchangeParam]: cache.allTickers[exchangeParam] } : cache.allTickers;
    
    res.json({
      success: true,
      data,
      timestamp: now,
      cached: false
    });
    
  } catch (error) {
    console.error('❌ Error in /api/tickers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticker data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/health - Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    const exchangeStatus: any = {};
    Object.keys(exchanges).forEach(name => {
      exchangeStatus[name] = true;
    });
    
    res.json({
      success: true,
      timestamp: Date.now(),
      exchanges: exchangeStatus,
      uptime: process.uptime(),
      cacheStatus: {
        lastUpdate: cache.lastUpdate,
        spreadCount: cache.spreads.length,
        tickerCount: Object.keys(cache.allTickers).length,
        isCached: (Date.now() - cache.lastUpdate) < cache.ttl
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/funding-rates - Funding rates for futures contracts
router.get('/funding-rates', async (req: Request<{}, {}, {}, { exchanges?: string }>, res: Response) => {
  try {
    const exchangeParam = req.query.exchanges?.toLowerCase();
    
    if (exchangeParam && !exchanges[exchangeParam as keyof typeof exchanges]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exchange',
        supportedExchanges: Object.keys(exchanges)
      });
    }
    
    const now = Date.now();
    if (cache.fundingRates && (now - cache.lastUpdate) < cache.ttl) {
      const data = exchangeParam ? { [exchangeParam]: cache.fundingRates[exchangeParam] } : cache.fundingRates;
      
      return res.json({
        success: true,
        data,
        timestamp: now,
        cached: true
      });
    }
    
    // If no cached data, trigger update
    await updateAllData();
    
    const data = exchangeParam ? { [exchangeParam]: cache.fundingRates[exchangeParam] } : cache.fundingRates;
    
    res.json({
      success: true,
      data,
      timestamp: now,
      cached: false
    });
    
  } catch (error) {
    console.error('❌ Error in /api/funding-rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch funding rates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Background data updates
setInterval(async () => {
  if (cache.lastUpdate === 0 || (Date.now() - cache.lastUpdate) > cache.ttl) {
    console.log('⏰ Background update triggered');
    await updateAllData();
  }
}, 60000); // Check every minute

// Initial data fetch
setTimeout(async () => {
  console.log('🔄 Starting initial data fetch...');
  await updateAllData();
}, 3000);

export default router; 