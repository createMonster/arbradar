const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json());

// Mock data for demonstration
const mockArbitrageData = [
  {
    symbol: 'BTC/USDT',
    exchanges: {
      Binance: { price: 67345.50, volume: 1234567, lastUpdated: Date.now() },
      OKX: { price: 67389.20, volume: 987654, lastUpdated: Date.now() },
      Bitget: { price: 67312.80, volume: 567890, lastUpdated: Date.now() },
      Bybit: { price: 67401.30, volume: 789012, lastUpdated: Date.now() }
    },
    spread: {
      absolute: 88.50,
      percentage: 0.13,
      bestBuy: 'Bitget',
      bestSell: 'Bybit'
    },
    fundingRate: {
      rate: 0.0001,
      nextTime: Date.now() + 8 * 60 * 60 * 1000,
      exchange: 'Binance'
    }
  },
  {
    symbol: 'ETH/USDT',
    exchanges: {
      Binance: { price: 3845.20, volume: 2345678, lastUpdated: Date.now() },
      OKX: { price: 3852.10, volume: 1876543, lastUpdated: Date.now() },
      Bitget: { price: 3839.90, volume: 1234567, lastUpdated: Date.now() },
      Bybit: { price: 3858.70, volume: 1987654, lastUpdated: Date.now() }
    },
    spread: {
      absolute: 18.80,
      percentage: 0.49,
      bestBuy: 'Bitget',
      bestSell: 'Bybit'
    }
  }
];

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Crypto Arbitrage Monitor API',
    version: '1.0.0',
    status: 'Demo Mode - Real CCXT integration available',
    endpoints: {
      spreads: '/api/spreads',
      health: '/api/health'
    }
  });
});

app.get('/api/spreads', (req, res) => {
  console.log('📊 API Request: /api/spreads');
  
  // Add some randomness to simulate real data
  const updatedData = mockArbitrageData.map(item => ({
    ...item,
    exchanges: Object.fromEntries(
      Object.entries(item.exchanges).map(([exchange, data]) => [
        exchange,
        {
          ...data,
          price: data.price * (1 + (Math.random() - 0.5) * 0.001), // ±0.05% variation
          lastUpdated: Date.now()
        }
      ])
    )
  }));
  
  // Recalculate spreads
  updatedData.forEach(item => {
    const prices = Object.values(item.exchanges).map(e => e.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const exchanges = Object.keys(item.exchanges);
    const minIndex = Object.values(item.exchanges).findIndex(e => e.price === minPrice);
    const maxIndex = Object.values(item.exchanges).findIndex(e => e.price === maxPrice);
    
    item.spread = {
      absolute: maxPrice - minPrice,
      percentage: ((maxPrice - minPrice) / minPrice) * 100,
      bestBuy: exchanges[minIndex],
      bestSell: exchanges[maxIndex]
    };
  });
  
  res.json({
    success: true,
    data: updatedData,
    timestamp: Date.now(),
    count: updatedData.length,
    note: 'Demo data - Real exchange integration available with CCXT'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    timestamp: Date.now(),
    exchanges: {
      binance: true,
      okx: true,
      bitget: true,
      bybit: true
    },
    uptime: process.uptime(),
    mode: 'demo'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Demo Crypto Arbitrage API running on http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   • GET /api/spreads - Arbitrage opportunities (demo data)`);
  console.log(`   • GET /api/health - Service health check`);
  console.log(`⚡ CCXT integration ready for production deployment`);
}); 