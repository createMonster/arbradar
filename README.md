# ArbRadar

Real-time cryptocurrency arbitrage monitoring across major exchanges.

## Features

- **Real-time price monitoring** from Binance, OKX, Bitget, Bybit, Hyperliquid
- **Arbitrage opportunity detection** with spread calculations
- **Professional web interface** with filtering and search
- **RESTful API** for data access
- **Production-ready** with Docker deployment

## Quick Start

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose (for deployment)

### Development Setup
```bash
# Clone repository
git clone <your-repo-url>
cd arbradar

# Install dependencies
pnpm install

# Backend development
cd backend && pnpm dev

# Frontend development (new terminal)
cd frontend && pnpm dev
```

**Access**: Frontend at http://localhost:3000, API at http://localhost:3001

## Production Deployment

### Easy Deployment with Script

1. **Setup environment**:
```bash
# Copy and configure environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your exchange API keys (optional)
```

2. **Deploy**:
```bash
# Quick deployment
./deploy.sh

# Clean deployment (removes old images)
./deploy.sh --clean

# View logs
./deploy.sh --logs

# Stop services
./deploy.sh --stop
```

3. **Access**:
- **Web App**: http://localhost:3000
- **API**: http://localhost:3001/api/health

### Manual Docker Deployment
```bash
# Build and start
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## API Reference

```bash
# Get arbitrage opportunities
GET /api/spreads?minSpread=0.5&symbol=BTC/USDT

# Get all tickers
GET /api/tickers?exchange=Binance

# Get funding rates
GET /api/funding-rates

# Health check
GET /api/health

# Refresh data
POST /api/refresh
```

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript, CCXT, Winston logging
- **Deployment**: Docker, Docker Compose, multi-stage builds
- **Architecture**: Microservices with health checks and auto-restart

## Project Structure

```
arbradar/
├── frontend/          # Next.js web application
├── backend/           # Express.js API server
├── docker-compose.yml # Full-stack deployment
└── deploy.sh         # Deployment automation script
```

## License

ISC 