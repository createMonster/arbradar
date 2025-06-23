import { Router, Request, Response } from 'express';
import { ExchangeService } from '../services/ExchangeService';
import { DataProcessor } from '../services/DataProcessor';

const router = Router();
const exchangeService = new ExchangeService();

interface QueryParams {
  minVolume?: string;
  minSpread?: string;
  exchanges?: string;
  search?: string;
}

// GET /api/spreads - Main endpoint for arbitrage opportunities
router.get('/spreads', async (req: Request<{}, {}, {}, QueryParams>, res: Response) => {
  try {
    console.log('🔄 Fetching spreads data...');
    
    // Fetch data from all exchanges
    const allTickers = await exchangeService.fetchAllTickers();
    
    // Process the data to calculate spreads
    let priceRows = DataProcessor.processTickerData(allTickers);
    
    // Apply filters if provided
    const { minVolume, minSpread, exchanges: exchangesParam, search } = req.query;
    
    if (minVolume) {
      priceRows = DataProcessor.filterByMinVolume(priceRows, parseInt(minVolume));
    }
    
    if (minSpread) {
      priceRows = DataProcessor.filterByMinSpread(priceRows, parseFloat(minSpread));
    }
    
    if (exchangesParam) {
      const selectedExchanges = exchangesParam.split(',');
      priceRows = DataProcessor.filterByExchanges(priceRows, selectedExchanges);
    }
    
    if (search) {
      priceRows = DataProcessor.searchBySymbol(priceRows, search);
    }
    
    console.log(`✅ Returning ${priceRows.length} arbitrage opportunities`);
    
    res.json({
      success: true,
      data: priceRows,
      timestamp: Date.now(),
      count: priceRows.length
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
          results[exchangeName] = await exchangeService.fetchTickers(exchangeName as any);
        } catch (error) {
          results[exchangeName] = [];
        }
      }
      
      res.json({
        success: true,
        data: results,
        timestamp: Date.now()
      });
    } else {
      // Fetch from all exchanges
      const allTickers = await exchangeService.fetchAllTickers();
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
    const healthStatus = exchangeService.getHealthStatus();
    const isHealthy = Object.values(healthStatus).some(status => status);
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      timestamp: Date.now(),
      exchanges: healthStatus,
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
        results[exchangeName] = await exchangeService.fetchFundingRates(exchangeName as any);
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

export default router; 