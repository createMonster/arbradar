import { Router, Request, Response } from 'express';
import { DataService, DataServiceConfig } from '../services/DataService';
import { FilterOptions } from '../services/ArbitrageService';

const router = Router();

// Configuration for the data service
const dataServiceConfig: DataServiceConfig = {
  filterCriteria: {
    minVolume: 100,
    minFundingRateAbs: -1,
    quoteAssets: ['USDT', 'USD', 'USDC'],
    blacklistedSymbols: ['BULL', 'BEAR', 'UP', 'DOWN', 'HEDGE']
  },
  cacheTtl: 30000, // 30 seconds
  updateInterval: 60000 // 1 minute background updates
};

// Initialize the data service
const dataService = new DataService(dataServiceConfig);

// Input validation middleware
const validateQueryParams = (req: Request, res: Response, next: any) => {
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
const handleServiceError = (error: any, res: Response) => {
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
router.get('/spreads', validateQueryParams, async (req: Request, res: Response) => {
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
      // Transform exchanges data to match frontend expectations
      const exchangesData: any = {};
      Object.entries(spread.exchanges).forEach(([exchangeName, data]: [string, any]) => {
        exchangesData[exchangeName] = {
          price: data.price,
          volume: data.volume,
          lastUpdated: spread.lastUpdated || Date.now()
        };
      });

      // Create funding rate data if available
      let fundingRate = undefined;
      const fundingRates = Object.values(spread.exchanges).filter((ex: any) => ex.fundingRate !== 0);
      if (fundingRates.length > 0) {
        const bestFundingEx = fundingRates[0] as any;
        fundingRate = {
          rate: bestFundingEx.fundingRate,
          nextTime: bestFundingEx.nextFundingTime || Date.now() + (8 * 60 * 60 * 1000),
          exchange: spread.priceSpread.buyExchange
        };
      }

      return {
        symbol: spread.symbol,
        exchanges: exchangesData,
        spread: {
          absolute: spread.spread.absolute,
          percentage: spread.spread.percentage,
          bestBuy: spread.spread.bestBuy,
          bestSell: spread.spread.bestSell
        },
        fundingRate
      };
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
router.get('/tickers', async (req: Request, res: Response) => {
  try {
    const exchangeName = req.query.exchanges as string;
    const forceRefresh = req.query.refresh === 'true';
    
    // Validate exchange name if provided
    if (exchangeName && !['binance', 'okx', 'bitget', 'bybit'].includes(exchangeName.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exchange',
        supportedExchanges: ['binance', 'okx', 'bitget', 'bybit']
      });
    }
    
    const result = await dataService.getTickers(exchangeName?.toLowerCase(), forceRefresh);
    res.json(result);
    
  } catch (error) {
    handleServiceError(error, res);
  }
});

// GET /api/funding-rates - Funding rates for futures contracts
router.get('/funding-rates', async (req: Request, res: Response) => {
  try {
    const exchangeName = req.query.exchanges as string;
    const forceRefresh = req.query.refresh === 'true';
    
    // Validate exchange name if provided
    if (exchangeName && !['binance', 'okx', 'bitget', 'bybit'].includes(exchangeName.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exchange',
        supportedExchanges: ['binance', 'okx', 'bitget', 'bybit']
      });
    }
    
    const result = await dataService.getFundingRates(exchangeName?.toLowerCase(), forceRefresh);
    res.json(result);
    
  } catch (error) {
    handleServiceError(error, res);
  }
});

// GET /api/health - Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
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
router.get('/statistics', async (req: Request, res: Response) => {
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
router.get('/top-opportunities', async (req: Request, res: Response) => {
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
router.post('/refresh', async (req: Request, res: Response) => {
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

// GET /api/cache/info - Cache information
router.get('/cache/info', (req: Request, res: Response) => {
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
router.delete('/cache', (req: Request, res: Response) => {
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