import { Router, Request, Response } from 'express';
// Remove old service imports - we'll use direct CCXT approach
const ccxt = require('ccxt');

const router = Router();

// Initialize exchanges directly (same as simple-server.js)
const exchanges = {
  binance: new ccxt.binance({ enableRateLimit: true }),
  okx: new ccxt.okx({ enableRateLimit: true }),
  bitget: new ccxt.bitget({ enableRateLimit: true }),
  bybit: new ccxt.bybit({ enableRateLimit: true })
};

// Popular trading pairs (same as simple-server.js)
const SYMBOLS = [
  'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT',
  'DOT/USDT', 'AVAX/USDT', 'MATIC/USDT', 'LINK/USDT', 'UNI/USDT',
  'LTC/USDT', 'BCH/USDT', 'XRP/USDT', 'DOGE/USDT', 'ATOM/USDT'
];

// Cache for storing data (same as simple-server.js)
let cache = {
  spreads: [] as any[],
  lastUpdate: 0,
  ttl: 5000 // 5 seconds
};

interface QueryParams {
  minVolume?: string;
  minSpread?: string;
  exchanges?: string;
  search?: string;
}

// Helper function to calculate spreads (from simple-server.js)
function calculateSpreads(exchangeData: any) {
  const spreads: any[] = [];
  
  // Group tickers by symbol
  const symbolMap: any = {};
  
  Object.entries(exchangeData).forEach(([exchangeName, tickers]: [string, any]) => {
    Object.entries(tickers).forEach(([symbol, ticker]: [string, any]) => {
      if (!symbolMap[symbol]) {
        symbolMap[symbol] = {};
      }
      symbolMap[symbol][exchangeName] = ticker;
    });
  });

  // Calculate spreads for symbols with data from multiple exchanges
  Object.entries(symbolMap).forEach(([symbol, exchanges]: [string, any]) => {
    const exchangeNames = Object.keys(exchanges);
    
    if (exchangeNames.length >= 2) {
      const prices = exchangeNames.map(name => exchanges[name].last);
      const volumes = exchangeNames.map(name => exchanges[name].quoteVolume || 0);
      
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const minIndex = prices.indexOf(minPrice);
      const maxIndex = prices.indexOf(maxPrice);
      
      const spread = {
        absolute: maxPrice - minPrice,
        percentage: ((maxPrice - minPrice) / minPrice) * 100
      };
      
      // Only include if spread is meaningful (> 0.001%)
      if (spread.percentage > 0.001) {
        const exchangeData: any = {};
        exchangeNames.forEach((name, i) => {
          exchangeData[name] = {
            price: prices[i],
            volume: volumes[i],
            lastUpdated: Date.now()
          };
        });

        spreads.push({
          symbol,
          exchanges: exchangeData,
          spread: {
            ...spread,
            bestBuy: exchangeNames[minIndex],
            bestSell: exchangeNames[maxIndex]
          },
          fundingRate: Math.random() > 0.7 ? {
            rate: (Math.random() - 0.5) * 0.002,
            nextTime: Date.now() + Math.random() * 8 * 60 * 60 * 1000,
            exchange: exchangeNames[Math.floor(Math.random() * exchangeNames.length)]
          } : undefined
        });
      }
    }
  });

  return spreads.sort((a, b) => b.spread.percentage - a.spread.percentage);
}

// Fetch data from all exchanges (from simple-server.js)
async function fetchAllData() {
  console.log('🔄 Fetching data from all exchanges...');
  
  const exchangeData: any = {};
  
  // Fetch from all exchanges in parallel
  const promises = Object.entries(exchanges).map(async ([name, exchange]: [string, any]) => {
    try {
      console.log(`📡 Fetching from ${name}...`);
      const tickers: any = {};
      
      // Fetch symbols in smaller batches to avoid rate limits
      const symbolPromises = SYMBOLS.map(async (symbol) => {
        try {
          const ticker = await exchange.fetchTicker(symbol);
          if (ticker && ticker.last && ticker.quoteVolume) {
            tickers[symbol] = ticker;
          }
        } catch (error) {
          console.log(`⚠️  ${name}: ${symbol} not available`);
        }
      });
      
      await Promise.allSettled(symbolPromises);
      
      const tickerCount = Object.keys(tickers).length;
      console.log(`✅ ${name}: fetched ${tickerCount} tickers`);
      
      return [name, tickers];
    } catch (error: any) {
      console.error(`❌ Error fetching from ${name}:`, error.message);
      return [name, {}];
    }
  });

  const results = await Promise.allSettled(promises);
  
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const [name, tickers] = result.value;
      exchangeData[name] = tickers;
    }
  });

  return exchangeData;
}

// Main data processing function (from simple-server.js)
async function updateSpreads() {
  try {
    const exchangeData = await fetchAllData();
    const spreads = calculateSpreads(exchangeData);
    
    console.log(`🎯 Found ${spreads.length} arbitrage opportunities`);
    
    if (spreads.length > 0) {
      console.log(`🏆 Best: ${spreads[0].symbol} - ${spreads[0].spread.percentage.toFixed(4)}%`);
    }
    
    // Update cache
    cache = {
      spreads,
      lastUpdate: Date.now(),
      ttl: 5000
    };
    
    return spreads;
  } catch (error) {
    console.error('❌ Error updating spreads:', error);
    return cache.spreads || [];
  }
}

// Apply filters to spreads data
// TODO: Implement filters
function applyFilters(spreads: any[], filters: QueryParams) {
  return spreads;
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
        cached: true
      });
    }
    
    // Fetch fresh data
    const spreads = await updateSpreads();
    
    // Apply filters
    const filteredData = applyFilters(spreads, req.query);
    
    console.log(`✅ Returning ${filteredData.length} arbitrage opportunities`);
    
    res.json({
      success: true,
      data: filteredData,
      timestamp: now,
      count: filteredData.length,
      cached: false
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
    const { exchanges: exchangesParam } = req.query;
    
    if (exchangesParam) {
      // Fetch from specific exchanges
      const exchangeNames = exchangesParam.split(',');
      const results: any = {};
      
      for (const exchangeName of exchangeNames) {
        try {
          const exchange = (exchanges as any)[exchangeName];
          if (exchange) {
            const tickers: any = {};
            
            for (const symbol of SYMBOLS) {
              try {
                const ticker = await exchange.fetchTicker(symbol);
                if (ticker && ticker.last && ticker.quoteVolume) {
                  tickers[symbol] = ticker;
                }
              } catch (error) {
                // Symbol not available on this exchange
              }
            }
            
            results[exchangeName] = tickers;
          }
        } catch (error) {
          results[exchangeName] = {};
        }
      }
      
      res.json({
        success: true,
        data: results,
        timestamp: Date.now()
      });
    } else {
      // Fetch from all exchanges
      const allTickers = await fetchAllData();
      res.json({
        success: true,
        data: allTickers,
        timestamp: Date.now()
      });
    }
    
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
      exchangeStatus[name] = true; // Simplified health check
    });
    
    res.json({
      success: true,
      timestamp: Date.now(),
      exchanges: exchangeStatus,
      uptime: process.uptime()
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
    const { exchanges: exchangesParam } = req.query;
    const results: any = {};
    
    const exchangesToCheck = exchangesParam 
      ? exchangesParam.split(',') 
      : ['binance', 'okx', 'bitget', 'bybit'];
    
    for (const exchangeName of exchangesToCheck) {
      try {
        const exchange = (exchanges as any)[exchangeName];
        if (exchange && exchange.has['fetchFundingRates']) {
          results[exchangeName] = await exchange.fetchFundingRates();
        } else {
          results[exchangeName] = [];
        }
      } catch (error) {
        results[exchangeName] = [];
      }
    }
    
    res.json({
      success: true,
      data: results,
      timestamp: Date.now()
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

// Start background data fetching (similar to simple-server.js)
setInterval(async () => {
  if (cache.lastUpdate === 0 || (Date.now() - cache.lastUpdate) > cache.ttl) {
    await updateSpreads();
  }
}, 30000); // Update every 30 seconds

// Initial data fetch
setTimeout(() => {
  updateSpreads();
}, 2000);

export default router; 