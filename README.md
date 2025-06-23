# 🚀 ArbRadar

A real-time cryptocurrency arbitrage monitoring application that displays price spreads across major exchanges with a professional, technical interface.

![Technical Theme](https://img.shields.io/badge/Theme-Technical%20B%26W-black)
![Real-time](https://img.shields.io/badge/Updates-5%20Seconds-green)
![Exchanges](https://img.shields.io/badge/Exchanges-4%20Major-blue)

## ✨ Features

### 🎯 **Real-Time Arbitrage Detection**
- **Live Price Monitoring**: Updates every 5 seconds from multiple exchanges
- **Spread Calculation**: Automatic arbitrage opportunity detection
- **Best Buy/Sell**: Clear identification of optimal trading pairs
- **Profit Visualization**: Percentage and absolute spread display

### 🏢 **Exchange Integration**
- **Binance** - Global leader in crypto trading
- **OKX** - Major derivatives and spot exchange  
- **Bitget** - Growing exchange with competitive rates
- **Bybit** - Popular derivatives platform

### 🎨 **Professional Interface**
- **Card-Based Layout**: Inspired by [taoli.live](https://taoli.live/) for optimal readability
- **Technical Theme**: Monospace fonts, black/white design
- **Mobile Responsive**: Works perfectly on all screen sizes
- **Real-Time Status**: Live connection indicators

### 🔧 **Advanced Filtering**
- **Volume Filter**: Minimum trading volume requirements
- **Spread Filter**: Minimum profit percentage thresholds  
- **Exchange Selection**: Choose specific exchanges to monitor
- **Symbol Search**: Find specific trading pairs quickly

### 🌍 **Multi-Language Support**
- **English** (Default)
- **中文** (Chinese Simplified)
- **Localized Numbers**: Proper formatting for each locale

## 🏗️ Architecture

```
arbradar/
├── 🎨 frontend/          # Next.js 14 + TypeScript + Tailwind
│   ├── src/app/          # App router pages
│   ├── src/components/   # React components + shadcn/ui
│   ├── src/lib/          # API services and utilities
│   └── src/types/        # TypeScript type definitions
│
├── ⚡ backend/           # Express + CCXT + TypeScript  
│   ├── src/services/     # Exchange integration & data processing
│   ├── src/routes/       # REST API endpoints
│   ├── src/types/        # Shared type definitions
│   └── src/index.ts      # Server entry point
│
└── 📋 MVP_PLAN.md        # Development roadmap
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **pnpm** (recommended) or npm
- **Git**

### 1️⃣ Clone Repository
```bash
git clone <repository-url>
cd arbradar
```

### 2️⃣ Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend  
cd ../frontend
pnpm install
```

### 3️⃣ Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# 🚀 API Server: http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash  
cd frontend
pnpm dev
# 🎨 Web App: http://localhost:3000
```

### 4️⃣ Open Application
Visit **http://localhost:3000** to see the arbitrage monitor in action! 

## 📡 API Reference

### Base URL
```
http://localhost:3001/api
```

### Endpoints

#### `GET /spreads`
Get arbitrage opportunities with optional filtering.

**Query Parameters:**
- `minVolume` - Minimum trading volume (number)
- `minSpread` - Minimum spread percentage (number)  
- `exchanges` - Comma-separated exchange list
- `search` - Symbol search term

**Example:**
```bash
curl "http://localhost:3001/api/spreads?minSpread=0.5&exchanges=Binance,OKX"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTC/USDT",
      "exchanges": {
        "Binance": {"price": 67345.50, "volume": 1234567, "lastUpdated": 1640995200000},
        "OKX": {"price": 67389.20, "volume": 987654, "lastUpdated": 1640995200000}
      },
      "spread": {
        "absolute": 43.70,
        "percentage": 0.065,
        "bestBuy": "Binance", 
        "bestSell": "OKX"
      }
    }
  ],
  "timestamp": 1640995200000,
  "count": 1
}
```

#### `GET /health`
Check exchange connection status.

**Response:**
```json
{
  "success": true,
  "exchanges": {
    "binance": true,
    "okx": true, 
    "bitget": true,
    "bybit": true
  },
  "uptime": 3600.5
}
```

#### `GET /tickers`
Get raw ticker data from exchanges.

#### `GET /funding-rates`  
Get futures funding rates (when available).

## 🛠️ Technology Stack

### Frontend
- **⚡ Next.js 14** - React framework with App Router
- **🎨 Tailwind CSS** - Utility-first styling
- **🧩 shadcn/ui** - Beautiful component library
- **📱 TypeScript** - Type-safe development
- **🌍 next-intl** - Internationalization

### Backend  
- **🚀 Express.js** - Fast web framework
- **📊 CCXT** - Cryptocurrency exchange integration
- **💾 Redis** - Caching (production ready)
- **🔧 TypeScript** - Type-safe APIs
- **⚡ Socket.io** - Real-time updates (future)

### DevOps
- **📦 pnpm** - Fast package manager
- **🔍 ESLint** - Code quality
- **💎 Prettier** - Code formatting
- **🐙 Git** - Version control

## 🔧 Development

### Project Scripts

**Backend:**
```bash
npm run dev      # Start development server
npm run build    # Build for production  
npm run start    # Start production server
```

**Frontend:**
```bash
pnpm dev         # Start development server
pnpm build       # Build for production
pnpm start       # Start production server
pnpm lint        # Run ESLint
```

### Environment Variables

Create `.env.local` files for configuration:

**Backend** (`.env`):
```env
# Exchange API Keys (optional for spot prices)
BINANCE_API_KEY=your_binance_key
BINANCE_API_SECRET=your_binance_secret
OKX_API_KEY=your_okx_key  
OKX_API_SECRET=your_okx_secret
OKX_PASSPHRASE=your_okx_passphrase

# Redis (production)
REDIS_URL=redis://localhost:6379

# Server
PORT=3001
```

**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Adding New Exchanges

1. **Install CCXT Support**: Most exchanges supported out-of-the-box
2. **Update Types**: Add to `SUPPORTED_EXCHANGES` in `types/index.ts`
3. **Configure Service**: Add to `ExchangeService.ts` initialization
4. **Update UI**: Add to exchange arrays in components

Example:
```typescript
// types/index.ts
export const SUPPORTED_EXCHANGES = ['binance', 'okx', 'bitget', 'bybit', 'huobi'] as const;

// services/ExchangeService.ts  
const exchangeConfigs = [
  { name: 'binance', class: ccxt.binance },
  { name: 'okx', class: ccxt.okx },
  { name: 'bitget', class: ccxt.bitget },
  { name: 'bybit', class: ccxt.bybit },
  { name: 'huobi', class: ccxt.huobi }, // 👈 New exchange
];
```

## 🚀 Deployment

### Production Deployment

**Backend** (Railway/Render):
```bash
cd backend
npm run build
npm start
```

**Frontend** (Vercel):
```bash
cd frontend  
pnpm build
pnpm start
```

### Docker Support
```dockerfile
# Dockerfile (backend)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build  
EXPOSE 3001
CMD ["npm", "start"]
```

## 📊 Performance

- **⚡ 5-Second Updates**: Real-time price monitoring
- **🔄 Caching**: Intelligent caching to avoid rate limits
- **📱 Responsive**: Optimized for all devices
- **🚀 Fast Load**: < 3 seconds initial page load
- **💾 Efficient**: Minimal memory footprint

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)  
5. **Open** Pull Request

## 📄 License

This project is licensed under the **ISC License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[CCXT](https://github.com/ccxt/ccxt)** - Cryptocurrency exchange integration
- **[taoli.live](https://taoli.live/)** - UI/UX inspiration
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful components
- **Exchange APIs** - Real-time data providers

## 📞 Support

- **📧 Email**: [your-email@example.com]
- **🐛 Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**⭐ Star this repo if you find it useful!**

Made with ❤️ for the crypto community 