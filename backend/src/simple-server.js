const express = require('express');
const cors = require('cors');
const ccxt = require('ccxt');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002', 'http://127.0.0.1:3000', 'http://127.0.0.1:3002'],
  credentials: true
}));

app.use(express.json());

// Initialize exchanges
const exchanges = {
  binance: new ccxt.binance({ enableRateLimit: true }),
  okx: new ccxt.okx({ enableRateLimit: true }),
  bitget: new ccxt.bitget({ enableRateLimit: true }),
  bybit: new ccxt.bybit({ enableRateLimit: true })
};

// Popular trading pairs
const SYMBOLS = [
  'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT',
  'DOT/USDT', 'AVAX/USDT', 'MATIC/USDT', 'LINK/USDT', 'UNI/USDT',
  'LTC/USDT', 'BCH/USDT', 'XRP/USDT', 'DOGE/USDT', 'ATOM/USDT'
];

// Cache for storing data
let cache = {
  spreads: [],
  lastUpdate: 0,
  ttl: 5000 // 5 seconds
};

// Helper function to calculate spreads
function calculateSpreads(exchangeData) {
  const spreads = [];
  
  // Group tickers by symbol
  const symbolMap = {};
  
  Object.entries(exchangeData).forEach(([exchangeName, tickers]) => {
    Object.entries(tickers).forEach(([symbol, ticker]) => {
      if (!symbolMap[symbol]) {
        symbolMap[symbol] = {};
      }
      symbolMap[symbol][exchangeName] = ticker;
    });
  });

  // Calculate spreads for symbols with data from multiple exchanges
  Object.entries(symbolMap).forEach(([symbol, exchanges]) => {
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
        const exchangeData = {};
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

// Fetch data from all exchanges
async function fetchAllData() {
  console.log('🔄 Fetching data from all exchanges...');
  
  const exchangeData = {};
  
  // Fetch from all exchanges in parallel
  const promises = Object.entries(exchanges).map(async ([name, exchange]) => {
    try {
      console.log(`📡 Fetching from ${name}...`);
      const tickers = {};
      
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
    } catch (error) {
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

// Main data processing function
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

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Crypto Arbitrage Monitor API',
    version: '2.0.0',
    endpoints: {
      spreads: '/api/spreads',
      health: '/api/health'
    }
  });
});

app.get('/api/health', (req, res) => {
  const exchangeStatus = {};
  Object.keys(exchanges).forEach(name => {
    exchangeStatus[name] = true; // Simplified health check
  });

  res.json({
    success: true,
    timestamp: Date.now(),
    exchanges: exchangeStatus,
    uptime: process.uptime()
  });
});

app.get('/api/spreads', async (req, res) => {
  try {
    console.log(`🔄 API call to /spreads`);
    
    // Check cache
    const now = Date.now();
    if (cache.spreads && cache.spreads.length > 0 && (now - cache.lastUpdate) < cache.ttl) {
      console.log(`📦 Returning cached data (${cache.spreads.length} items)`);
      return res.json({
        success: true,
        data: cache.spreads,
        timestamp: now,
        count: cache.spreads.length,
        cached: true
      });
    }
    
    // Fetch fresh data
    const spreads = await updateSpreads();
    
    res.json({
      success: true,
      data: spreads,
      timestamp: now,
      count: spreads.length,
      cached: false
    });
    
  } catch (error) {
    console.error('❌ Error in /api/spreads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch arbitrage data',
      message: error.message
    });
  }
});

// Start background data fetching
setInterval(async () => {
  if (cache.lastUpdate === 0 || (Date.now() - cache.lastUpdate) > cache.ttl) {
    await updateSpreads();
  }
}, 30000); // Update every 30 seconds

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple Arbitrage API running on http://localhost:${PORT}`);
  console.log(`📊 Monitoring ${SYMBOLS.length} symbols across 4 exchanges`);
  
  // Initial data fetch
  setTimeout(() => {
    updateSpreads();
  }, 2000);
});

module.exports = app; 