# Crypto Price Spread Monitor - MVP Plan

## Project Overview
A real-time crypto arbitrage monitoring tool that displays price spreads and funding rates across major exchanges (Binance, OKX, Bitget, Bybit) with Chinese/English language support.

## Tech Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Real-time**: Socket.io
- **Exchange Data**: CCXT library
- **Caching**: Redis
- **i18n**: next-intl
- **Deployment**: Vercel (frontend) + Railway/Render (backend)

## Phase 1: Foundation & UI (Week 1)

### Day 1-2: Project Setup
- [ ] Initialize Next.js project with TypeScript
- [ ] Setup Tailwind CSS and shadcn/ui
- [ ] Configure ESLint, Prettier, and pre-commit hooks
- [ ] Setup project structure and basic routing
- [ ] Initialize Git repository

### Day 3-4: Core UI Components
- [ ] Create main layout with header and navigation
- [ ] Build language toggle component
- [ ] Design and implement price table component
- [ ] Create filter panel component
- [ ] Add loading states and skeletons

### Day 5-7: Static Website Version
- [ ] Implement responsive design
- [ ] Add mock data for testing
- [ ] Create settings modal
- [ ] Setup i18n with next-intl
- [ ] Add Chinese/English translations

## Phase 2: Backend & Real-time Data (Week 2)

### Day 8-10: Backend Setup
- [ ] Initialize Node.js backend with Express + TypeScript
- [ ] Setup CCXT integration
- [ ] Implement data fetching for 4 exchanges:
  - [ ] Binance API integration
  - [ ] OKX API integration
  - [ ] Bitget API integration
  - [ ] Bybit API integration
- [ ] Setup Redis for caching
- [ ] Create API endpoints for price data

### Day 11-12: Data Processing
- [ ] Implement spread calculation logic
- [ ] Add funding rate data processing
- [ ] Create data aggregation service
- [ ] Setup error handling for API failures

### Day 13-14: Real-time Features
- [ ] Setup Socket.io server
- [ ] Implement WebSocket client in frontend
- [ ] Add real-time price updates
- [ ] Test real-time data flow

## Phase 3: Advanced Features & Polish (Week 3)

### Day 15-17: Advanced Functionality
- [ ] Implement sorting and filtering logic
- [ ] Add volume-based filtering
- [ ] Create search functionality
- [ ] Add price change indicators and animations

### Day 18-19: Performance Optimization
- [ ] Implement virtual scrolling for large datasets
- [ ] Optimize WebSocket message frequency
- [ ] Add client-side caching
- [ ] Implement proper error boundaries

### Day 20-21: Final Polish
- [ ] Add dark/light theme support
- [ ] Implement mobile responsive design
- [ ] Add loading states and error handling
- [ ] Create 404 and error pages

## Phase 4: Testing & Deployment (Week 4)

### Day 22-24: Testing
- [ ] Write unit tests for core functions
- [ ] Test WebSocket connections
- [ ] Cross-browser testing
- [ ] Mobile device testing

### Day 25-28: Deployment & Launch
- [ ] Setup production environment
- [ ] Deploy backend to Railway/Render
- [ ] Deploy frontend to Vercel
- [ ] Configure domain and SSL
- [ ] Monitor and fix any production issues

## Core Features Breakdown

### 1. Price Table Component
```typescript
interface PriceRow {
  symbol: string;
  exchanges: {
    [key: string]: {
      price: number;
      volume: number;
      lastUpdated: number;
    };
  };
  spread: {
    absolute: number;
    percentage: number;
    bestBuy: string;
    bestSell: string;
  };
  fundingRate?: {
    rate: number;
    nextTime: number;
    exchange: string;
  };
}
```

### 2. Exchange Data Service
```typescript
interface ExchangeConfig {
  name: string;
  id: string;
  apiConfig: any;
  rateLimit: number;
}

class ExchangeService {
  async fetchTickers(exchange: string): Promise<Ticker[]>
  async fetchFundingRates(exchange: string): Promise<FundingRate[]>
  calculateSpreads(tickers: Ticker[]): SpreadData[]
}
```

### 3. WebSocket Events
```typescript
// Server -> Client
'price_update' -> { symbol: string, data: PriceRow }
'funding_update' -> { symbol: string, data: FundingRate }
'connection_status' -> { exchange: string, status: 'connected' | 'disconnected' }

// Client -> Server
'subscribe' -> { symbols: string[] }
'unsubscribe' -> { symbols: string[] }
```

## File Structure
```
crypto-spread-monitor/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── ui/           # shadcn/ui components
│   │   │   │   ├── PriceTable.tsx
│   │   │   │   ├── FilterPanel.tsx
│   │   │   │   ├── LanguageToggle.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── store/
│   │   │   └── types/
│   │   ├── public/
│   │   └── messages/             # i18n files
│   ├── backend/
│   │   ├── src/
│   │   │   ├── services/
│   │   │   │   ├── ExchangeService.ts
│   │   │   │   ├── DataProcessor.ts
│   │   │   │   └── WebSocketService.ts
│   │   │   ├── routes/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   └── package.json
│   └── shared/
│       └── types/                # Shared TypeScript types
```

## API Endpoints

### REST API
```
GET /api/tickers?exchanges=binance,okx
GET /api/funding-rates?exchanges=binance,okx
GET /api/spreads?min_volume=1000000
GET /api/health
```

### WebSocket Events
```
Connection: ws://localhost:3001
Events: price_update, funding_update, connection_status
```

## Environment Variables
```bash
# Backend
REDIS_URL=redis://localhost:6379
BINANCE_API_KEY=
BINANCE_API_SECRET=
OKX_API_KEY=
OKX_API_SECRET=
OKX_PASSPHRASE=
BITGET_API_KEY=
BITGET_API_SECRET=
BITGET_PASSPHRASE=
BYBIT_API_KEY=
BYBIT_API_SECRET=

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## UI/UX Requirements

### Color Scheme
- Green: Positive spreads, buy opportunities
- Red: Negative spreads, funding rates
- Blue: Neutral information
- Gray: Secondary information

### Responsive Breakpoints
- Mobile: < 768px (stacked layout)
- Tablet: 768px - 1024px (2-column)
- Desktop: > 1024px (full table)

### Language Support
- English (default)
- Simplified Chinese
- Number formatting based on locale
- Time zone display preferences

## Success Metrics
- [ ] Display real-time data from 4 exchanges
- [ ] Update frequency: < 10 seconds
- [ ] Page load time: < 3 seconds
- [ ] Mobile responsive (all breakpoints)
- [ ] Language switching works seamlessly
- [ ] 99%+ uptime for data feeds

## Next Steps After MVP
1. Add more exchanges (Huobi, KuCoin, Gate.io)
2. Historical data and charts
3. Price alerts and notifications
4. User accounts and preferences
5. Advanced filtering (by market cap, category)
6. API rate limiting and premium features
7. Mobile app development 