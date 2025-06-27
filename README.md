# ArbRadar

Real-time cryptocurrency arbitrage monitoring across major exchanges.

## Features

- **Real-time price monitoring** from Binance, OKX, Bitget, Bybit
- **Arbitrage opportunity detection** with spread calculations
- **Professional interface** with filtering and search
- **Multi-language support** (English, Chinese)

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm or npm

### Installation
```bash
# Clone repository
git clone https://github.com/createMonster/arbradar.git
cd arbradar

# Backend
cd backend && pnpm install && pnpm dev

# Frontend (new terminal)
cd frontend && pnpm install && pnpm dev
```

### Access
- **Web App**: http://localhost:3000
- **API**: http://localhost:3001

## Deployment

### Docker Deployment (Recommended)

1. **Clone and setup environment**:
```bash
git clone https://github.com/createMonster/arbradar.git
cd arbradar

# Create backend environment file
cp backend/.env.example backend/.env
# Edit backend/.env with your exchange API keys
```

2. **Deploy with Docker Compose**:
```bash
# Build and start containers
docker-compose up --build -d

# Check container status
docker-compose ps

# View logs
docker-compose logs -f
```

3. **Access deployed application**:
- **Web App**: http://localhost:3000
- **API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

4. **Stop deployment**:
```bash
docker-compose down
```

### Production Deployment

For production environments:

1. **Environment Variables**:
   - Set `NODE_ENV=production`
   - Configure exchange API keys in `backend/.env`
   - Set proper CORS origins if needed

2. **Container Management**:
   - Containers auto-restart on failure
   - Health checks monitor service status
   - Logs stored in Docker volumes

3. **Scaling**:
   - Backend and frontend run in separate containers
   - Can be scaled independently
   - Internal Docker network for secure communication

## API Reference

### Get Arbitrage Opportunities
```bash
GET /api/spreads?minSpread=0.5&exchanges=Binance,OKX
```

### Check Status
```bash
GET /api/health
```

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Express.js, CCXT, TypeScript
- **Real-time**: 5-second updates

## License

ISC 