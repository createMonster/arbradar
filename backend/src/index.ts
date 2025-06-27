import express, { Application } from 'express';
import cors from 'cors';
import apiRoutes from './routes/api-refactored';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000', 
    'http://localhost:4000',
    'http://localhost:3002',
    // Docker internal network - frontend container
    'http://frontend:3000'
  ],
  credentials: true
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Crypto Arbitrage Monitor API',
    version: '1.0.0',
    endpoints: {
      spreads: '/api/spreads',
      tickers: '/api/tickers', 
      health: '/api/health',
      fundingRates: '/api/funding-rates'
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Crypto Arbitrage API server running on http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   • GET /api/spreads - Arbitrage opportunities`);
  console.log(`   • GET /api/tickers - Exchange ticker data`);
  console.log(`   • GET /api/health - Service health check`);
  console.log(`   • GET /api/funding-rates - Futures funding rates`);
});

export default app; 