import express, { Router } from 'express';
import { DataService, DataServiceConfig } from '../services/DataService';
import { FilterOptions } from '../services/ArbitrageService';
import { CACHE_CONFIG, EXCHANGE_CONFIGS, getSpotExchanges, getPerpExchanges, getExchangesByMarketType } from '../config/exchanges';
import type { MarketType } from '../config/exchanges';
import { getMarketType } from '../types';

const router: Router = express.Router();

// Helper function to get supported exchanges
const getSupportedExchanges = (): string[] => {
  return Object.keys(EXCHANGE_CONFIGS);
};

// Helper function to get exchanges by market type
const getExchangesByType = (marketType: MarketType): string[] => {
  return getExchangesByMarketType(marketType);
};

// Configuration for the data service
const dataServiceConfig: DataServiceConfig = {
  filterCriteria: {
    minVolume: 100,
    minFundingRateAbs: -1,
    quoteAssets: ['USDT', 'USD', 'USDC'],
    blacklistedSymbols: ['BULL', 'BEAR', 'UP', 'DOWN', 'HEDGE']
  },
  cacheTtl: CACHE_CONFIG.PROCESSED_DATA_TTL, // 10s TTL for processed arbitrage data
  updateInterval: 60000 // 1 minute background updates
};

// Initialize the data service
const dataService = new DataService(dataServiceConfig);

// Input validation middleware
const validateQueryParams = (req: express.Request, res: express.Response, next: any) => {
  const { minSpread, minVolume, limit } = req.query;
  
  if (minSpread && isNaN(Number(minSpread))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid minSpread parameter',
      message: 'minSpread must be a valid number'
    });
  }
  
  if (minVolume && isNaN(Number(minVolume))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid minVolume parameter',
      message: 'minVolume must be a valid number'
    });
  }
  
  if (limit && isNaN(Number(limit))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid limit parameter',
      message: 'limit must be a valid number'
    });
  }
  
  next();
};

// Error handling middleware
const handleServiceError = (error: any, res: express.Response) => {
  console.error('❌ Service error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: error.message
    });
  }
  
  if (error.name === 'NetworkError') {
    return res.status(503).json({
      success: false,
      error: 'Service Temporarily Unavailable',
      message: 'Exchange APIs are currently unavailable'
    });
  }
  
  return res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
};

// GET /api/spreads - Main endpoint for arbitrage opportunities
router.get('/spreads', validateQueryParams, async (req: express.Request, res: express.Response) => {
  try {
    console.log('🔄 API call to /spreads');
    
    // Parse query parameters
    const filters: FilterOptions = {};
    
    if (req.query.minSpread) {
      filters.minSpread = parseFloat(req.query.minSpread as string);
    }
    
    if (req.query.minVolume) {
      filters.minVolume = parseFloat(req.query.minVolume as string);
    }
    
    if (req.query.exchanges) {
      filters.exchanges = (req.query.exchanges as string).split(',');
    }
    
    if (req.query.search) {
      filters.search = req.query.search as string;
    }
    
    if (req.query.limit) {
      filters.limit = parseInt(req.query.limit as string);
    }
    
    const forceRefresh = req.query.refresh === 'true';
    
    // Use the data service
    const result = await dataService.getSpreads(filters, forceRefresh);
    
    // Transform SpreadData[] to PriceRow[] for frontend compatibility
    const transformedData = result.data.map((spread: any) => {
      // Determine market type from symbol
      const marketType = getMarketType(spread.symbol);
      const isPerp = marketType === 'perp';

      // Transform exchanges data to match enhanced frontend expectations
      const exchangesData: any = {};
      const fundingRatesData: any = {};
      let legacyFundingRate = undefined;

      Object.entries(spread.exchanges).forEach(([exchangeName, data]: [string, any]) => {
        // Enhanced exchange data with funding rate per exchange
        exchangesData[exchangeName] = {
          price: data.price,
          volume: data.volume,
          lastUpdated: spread.lastUpdated || Date.now()
        };

        // Add funding rate data per exchange for perp contracts
        if (isPerp && data.fundingRate !== undefined && data.fundingRate !== 0) {
          exchangesData[exchangeName].fundingRate = {
            rate: data.fundingRate,
            nextTime: data.nextFundingTime || Date.now() + (8 * 60 * 60 * 1000),
            dataAge: Math.floor((Date.now() - (spread.lastUpdated || Date.now())) / 1000)
          };

          // Also populate the enhanced fundingRates object
          fundingRatesData[exchangeName] = {
            rate: data.fundingRate,
            nextTime: data.nextFundingTime || Date.now() + (8 * 60 * 60 * 1000),
            isAvailable: true
          };
        }
      });

      // Create legacy funding rate data for backward compatibility
      if (isPerp) {
        const fundingRates = Object.values(spread.exchanges).filter((ex: any) => ex.fundingRate !== 0);
        if (fundingRates.length > 0) {
          const bestFundingEx = fundingRates[0] as any;
          legacyFundingRate = {
            rate: bestFundingEx.fundingRate,
            nextTime: bestFundingEx.nextFundingTime || Date.now() + (8 * 60 * 60 * 1000),
            exchange: spread.priceSpread.buyExchange
          };
        }
      }

      const enhancedPriceRow: any = {
        symbol: spread.symbol,
        marketType: marketType,
        exchanges: exchangesData,
        spread: {
          absolute: spread.spread.absolute,
          percentage: spread.spread.percentage,
          bestBuy: spread.spread.bestBuy,
          bestSell: spread.spread.bestSell
        }
      };

      // Add funding rate data only for perp contracts
      if (isPerp) {
        if (legacyFundingRate) {
          enhancedPriceRow.fundingRate = legacyFundingRate;
        }
        if (Object.keys(fundingRatesData).length > 0) {
          enhancedPriceRow.fundingRates = fundingRatesData;
        }
      }

      return enhancedPriceRow;
    });
    
    console.log(`✅ Returning ${result.count} arbitrage opportunities`);
    
    res.json({
      success: result.success,
      data: transformedData,
      count: result.count,
      total: result.total,
      timestamp: result.timestamp,
      cached: result.cached
    });
    
  } catch (error) {
    handleServiceError(error, res);
  }
});

// GET /api/tickers - Raw ticker data from exchanges
router.get('/tickers', async (req: express.Request, res: express.Response) => {
  try {
    const exchangeName = req.query.exchanges as string;
    const forceRefresh = req.query.refresh === 'true';
    
    // Validate exchange name if provided
    if (exchangeName && !getSupportedExchanges().includes(exchangeName.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exchange',
        supportedExchanges: getSupportedExchanges()
      });
    }
    
    const result = await dataService.getTickers(exchangeName?.toLowerCase(), forceRefresh);
    res.json(result);
    
  } catch (error) {
    handleServiceError(error, res);
  }
});

// GET /api/funding-rates - Funding rates for futures contracts
router.get('/funding-rates', async (req: express.Request, res: express.Response) => {
  try {
    const exchangeName = req.query.exchanges as string;
    const forceRefresh = req.query.refresh === 'true';
    
    // Validate exchange name if provided
    if (exchangeName && !getSupportedExchanges().includes(exchangeName.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exchange',
        supportedExchanges: getSupportedExchanges()
      });
    }
    
    const result = await dataService.getFundingRates(exchangeName?.toLowerCase(), forceRefresh);
    res.json(result);
    
  } catch (error) {
    handleServiceError(error, res);
  }
});

// GET /api/health - Health check endpoint
router.get('/health', async (req: express.Request, res: express.Response) => {
  try {
    const health = await dataService.getHealthStatus();
    
    const httpStatus = health.success ? 200 : 503;
    res.status(httpStatus).json(health);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

// GET /api/statistics - Arbitrage statistics
router.get('/statistics', async (req: express.Request, res: express.Response) => {
  try {
    const stats = dataService.getArbitrageStatistics();
    
    res.json({
      success: true,
      data: stats,
      timestamp: Date.now()
    });
    
  } catch (error) {
    handleServiceError(error, res);
  }
});

// GET /api/top-opportunities - Top arbitrage opportunities
router.get('/top-opportunities', async (req: express.Request, res: express.Response) => {
  try {
    const count = req.query.count ? parseInt(req.query.count as string) : 10;
    
    if (isNaN(count) || count < 1 || count > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid count parameter',
        message: 'count must be a number between 1 and 100'
      });
    }
    
    const opportunities = dataService.getTopOpportunities(count);
    
    res.json({
      success: true,
      data: opportunities,
      count: opportunities.length,
      timestamp: Date.now()
    });
    
  } catch (error) {
    handleServiceError(error, res);
  }
});

// POST /api/refresh - Force data refresh
router.post('/refresh', async (req: express.Request, res: express.Response) => {
  try {
    console.log('🔄 Forced refresh requested');
    
    const result = await dataService.forceUpdate();
    
    res.json({
      success: result.success,
      message: result.success ? 'Data refreshed successfully' : 'Refresh failed',
      data: {
        spreadsCount: result.spreads.length,
        timestamp: result.timestamp,
        error: result.error
      }
    });
    
  } catch (error) {
    handleServiceError(error, res);
  }
});

// GET /api/exchanges - Exchange information with market type support
router.get('/exchanges', (req: express.Request, res: express.Response) => {
  try {
    const allExchanges = getSupportedExchanges();
    const spotExchanges = getSpotExchanges();
    const perpExchanges = getPerpExchanges();
    
    // Calculate capabilities for each exchange
    const capabilities: any = {};
    allExchanges.forEach(exchange => {
      capabilities[exchange] = {
        supportsSpot: spotExchanges.includes(exchange),
        supportsPerp: perpExchanges.includes(exchange),
        marketTypes: []
      };
      
      if (spotExchanges.includes(exchange)) {
        capabilities[exchange].marketTypes.push('spot');
      }
      if (perpExchanges.includes(exchange)) {
        capabilities[exchange].marketTypes.push('perp');
      }
    });

    res.json({
      success: true,
      data: {
        all: allExchanges,
        spot: spotExchanges,
        perp: perpExchanges,
        spotAndPerp: allExchanges.filter(ex => spotExchanges.includes(ex) && perpExchanges.includes(ex)),
        perpOnly: perpExchanges.filter(ex => !spotExchanges.includes(ex)),
        capabilities
      },
      timestamp: Date.now()
    });
    
  } catch (error) {
    handleServiceError(error, res);
  }
});

// GET /api/exchanges/market/:marketType - Get exchanges by market type
router.get('/exchanges/market/:marketType', (req: express.Request, res: express.Response) => {
  try {
    const marketType = req.params.marketType as MarketType;
    
    if (!['spot', 'perp'].includes(marketType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market type',
        message: 'Market type must be either "spot" or "perp"'
      });
    }
    
    const exchanges = getExchangesByType(marketType);
    
    res.json({
      success: true,
      data: {
        marketType,
        exchanges,
        count: exchanges.length
      },
      timestamp: Date.now()
    });
    
  } catch (error) {
    handleServiceError(error, res);
  }
});

// GET /api/cache/info - Cache information
router.get('/cache/info', (req: express.Request, res: express.Response) => {
  try {
    const cacheInfo = dataService.getCacheInfo();
    
    res.json({
      success: true,
      data: cacheInfo,
      timestamp: Date.now()
    });
    
  } catch (error) {
    handleServiceError(error, res);
  }
});

// DELETE /api/cache - Clear cache
router.delete('/cache', (req: express.Request, res: express.Response) => {
  try {
    dataService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: Date.now()
    });
    
  } catch (error) {
    handleServiceError(error, res);
  }
});

// GET /api/exchanges - Get exchange information and capabilities
router.get('/exchanges', async (req, res) => {
  try {
    const exchangeInfo = {
      all: getSupportedExchanges(),
      spot: getSpotExchanges(),
      perp: getPerpExchanges(),
      spotAndPerp: getExchangesByType('spot').filter(ex => getExchangesByType('perp').includes(ex)),
      perpOnly: getExchangesByType('perp').filter(ex => !getExchangesByType('spot').includes(ex)),
      capabilities: Object.fromEntries(
        Object.entries(EXCHANGE_CONFIGS).map(([name, config]) => [
          name,
          {
            supportsSpot: config.capabilities.supportsSpot,
            supportsPerp: config.capabilities.supportsPerp,
            marketTypes: config.capabilities.marketTypes
          }
        ])
      )
    };

    res.json({
      success: true,
      data: exchangeInfo,
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('❌ Error fetching exchange information:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exchange information',
      message: error.message,
      timestamp: Date.now()
    });
  }
});

// GET /api/exchanges/market/:marketType - Get exchanges by market type
router.get('/exchanges/market/:marketType', async (req, res) => {
  try {
    const marketType = req.params.marketType as MarketType;
    
    if (!['spot', 'perp'].includes(marketType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid market type',
        validTypes: ['spot', 'perp'],
        timestamp: Date.now()
      });
    }

    const exchanges = getExchangesByType(marketType);

    res.json({
      success: true,
      data: {
        marketType,
        exchanges,
        count: exchanges.length
      },
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error(`❌ Error fetching exchanges for market type:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exchanges by market type',
      message: error.message,
      timestamp: Date.now()
    });
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, cleaning up...');
  dataService.cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, cleaning up...');
  dataService.cleanup();
  process.exit(0);
});

export default router; 