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

// Initialize exchanges with proper settings
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

// Cache for storing data
let cache = {
  allTickers: {},
  fundingRates: {},
  spreads: [],
  lastUpdate: 0,
  ttl: 30000 // 30 seconds cache
};

// Filter criteria for meaningful trading pairs
const FILTER_CRITERIA = {
  minVolume: 100, // Minimum 24h volume in USDT
  minFundingRateAbs: -1, // Minimum 0.1% funding rate
  quoteAssets: ['USDT', 'USD', 'USDC'], // Only these quote assets
  blacklistedSymbols: ['BULL', 'BEAR', 'UP', 'DOWN', 'HEDGE'] // Exclude leveraged tokens
};

// Helper function to check if symbol should be included
function shouldIncludeSymbol(symbol, ticker) {
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
async function fetchAllTickers(exchangeName, exchange) {
  try {
    console.log(`📡 Fetching all tickers from ${exchangeName}...`);
    
    // Load markets first
    await exchange.loadMarkets();
    
    // Get all tickers for perpetual contracts
    const allTickers = await exchange.fetchTickers();
    
    // Filter meaningful tickers
    const filteredTickers = {};
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
    
  } catch (error) {
    console.error(`❌ Error fetching tickers from ${exchangeName}:`, error.message);
    return {};
  }
}

// Fetch funding rates for perpetual contracts
async function fetchFundingRates(exchangeName, exchange, symbols) {
  try {
    console.log(`💰 Fetching funding rates from ${exchangeName}...`);
    
    const fundingRates = {};
    const symbolsArray = Array.isArray(symbols) ? symbols : Object.keys(symbols);
    
    // Fetch funding rates in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < symbolsArray.length; i += batchSize) {
      const batch = symbolsArray.slice(i, i + batchSize);
      
      const promises = batch.map(async (symbol) => {
        try {
          const fundingRate = await exchange.fetchFundingRate(symbol);
          if (fundingRate && Math.abs(fundingRate.fundingRate) >= FILTER_CRITERIA.minFundingRateAbs) {
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
    
  } catch (error) {
    console.error(`❌ Error fetching funding rates from ${exchangeName}:`, error.message);
    return {};
  }
}

// Calculate price spreads across exchanges
function calculatePriceSpreads(allTickers, allFundingRates) {
  console.log('🔄 Calculating price spreads...');
  
  const spreads = [];
  const symbolMap = {};
  
  // Group tickers by symbol across exchanges
  Object.entries(allTickers).forEach(([exchangeName, tickers]) => {
    Object.entries(tickers).forEach(([symbol, ticker]) => {
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
  Object.entries(symbolMap).forEach(([symbol, exchangeData]) => {
    const exchangeNames = Object.keys(exchangeData);
    
    if (exchangeNames.length >= 2) {
      const prices = [];
      const fundingRates = [];
      const exchangeInfo = {};
      
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
            lastUpdated: Date.now()
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
async function updateAllData() {
  try {
    console.log('🔄 Starting comprehensive data update...');
    
    const allTickers = {};
    const allFundingRates = {};
    
    // Fetch all tickers from all exchanges in parallel
    const tickerPromises = Object.entries(exchanges).map(async ([name, exchange]) => {
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
    const fundingPromises = Object.entries(exchanges).map(async ([name, exchange]) => {
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

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Advanced Crypto Arbitrage Monitor API',
    version: '3.0.0',
    features: [
      'All available tickers from exchanges',
      'Real funding rates for perpetual contracts',
      'Price spread calculations',
      'Arbitrage opportunity detection'
    ],
    endpoints: {
      spreads: '/api/spreads',
      tickers: '/api/tickers',
      funding: '/api/funding-rates',
      health: '/api/health'
    }
  });
});

app.get('/api/health', (req, res) => {
  const exchangeStatus = {};
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
      isCached: (Date.now() - cache.lastUpdate) < cache.ttl
    }
  });
});

app.get('/api/spreads', async (req, res) => {
  try {
    console.log('🔄 API call to /spreads');
    
    const limit = parseInt(req.query.limit) || 50;
    const minSpread = parseFloat(req.query.minSpread) || 0;
    
    // Check cache
    const now = Date.now();
    if (cache.spreads && cache.spreads.length > 0 && (now - cache.lastUpdate) < cache.ttl) {
      console.log(`📦 Returning cached spreads (${cache.spreads.length} items)`);
      
      let filteredSpreads = cache.spreads.filter(s => s.priceSpread.percentage >= minSpread);
      if (limit > 0) {
        filteredSpreads = filteredSpreads.slice(0, limit);
      }
      
      return res.json({
        success: true,
        data: filteredSpreads,
        timestamp: now,
        count: filteredSpreads.length,
        total: cache.spreads.length,
        cached: true,
        filters: { limit, minSpread }
      });
    }
    
    // Fetch fresh data
    const spreads = await updateAllData();
    
    let filteredSpreads = spreads.filter(s => s.priceSpread.percentage >= minSpread);
    if (limit > 0) {
      filteredSpreads = filteredSpreads.slice(0, limit);
    }
    
    res.json({
      success: true,
      data: filteredSpreads,
      timestamp: now,
      count: filteredSpreads.length,
      total: spreads.length,
      cached: false,
      filters: { limit, minSpread }
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

app.get('/api/tickers', async (req, res) => {
  try {
    const exchange = req.query.exchange?.toLowerCase();
    
    if (exchange && !exchanges[exchange]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exchange',
        supportedExchanges: Object.keys(exchanges)
      });
    }
    
    const now = Date.now();
    if (cache.allTickers && (now - cache.lastUpdate) < cache.ttl) {
      const data = exchange ? { [exchange]: cache.allTickers[exchange] } : cache.allTickers;
      
      return res.json({
        success: true,
        data,
        timestamp: now,
        cached: true
      });
    }
    
    // If no cached data, trigger update
    await updateAllData();
    
    const data = exchange ? { [exchange]: cache.allTickers[exchange] } : cache.allTickers;
    
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
      error: 'Failed to fetch tickers',
      message: error.message
    });
  }
});

app.get('/api/funding-rates', async (req, res) => {
  try {
    const exchange = req.query.exchange?.toLowerCase();
    
    if (exchange && !exchanges[exchange]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exchange',
        supportedExchanges: Object.keys(exchanges)
      });
    }
    
    const now = Date.now();
    if (cache.fundingRates && (now - cache.lastUpdate) < cache.ttl) {
      const data = exchange ? { [exchange]: cache.fundingRates[exchange] } : cache.fundingRates;
      
      return res.json({
        success: true,
        data,
        timestamp: now,
        cached: true
      });
    }
    
    // If no cached data, trigger update
    await updateAllData();
    
    const data = exchange ? { [exchange]: cache.fundingRates[exchange] } : cache.fundingRates;
    
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
      message: error.message
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Advanced Arbitrage API running on http://localhost:${PORT}`);
  console.log(`📊 Monitoring all available tickers across ${Object.keys(exchanges).length} exchanges`);
  console.log(`💰 Tracking real funding rates and price spreads`);
  
  // Initial data fetch
  setTimeout(async () => {
    console.log('🔄 Starting initial data fetch...');
    await updateAllData();
  }, 3000);
});

module.exports = app; 