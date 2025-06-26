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
git clone <repository-url>
cd arbradar

# Backend
cd backend && npm install && npm run dev

# Frontend (new terminal)
cd frontend && pnpm install && pnpm dev
```

### Access
- **Web App**: http://localhost:3000
- **API**: http://localhost:3001

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