# Backend-Frontend Communication Protocol

## Overview

The Crypto Arbitrage Monitor uses a **RESTful HTTP API** architecture for communication between the backend (Node.js/Express) and frontend (Next.js/React). All communication follows standard REST principles with JSON data exchange.

## Connection Details

### Base Configuration
- **Protocol**: HTTP/HTTPS
- **Port**: Backend runs on port `3001` (configurable via `PORT` environment variable)
- **Frontend Ports**: `3000`, `3002`, `4000` (CORS-enabled)
- **Content-Type**: `application/json`
- **Method**: Primarily GET requests with some POST/DELETE operations

### CORS Configuration
```javascript
// Allowed origins for CORS
origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:4000']
```

## Communication Format

### Standard Response Structure

All API responses follow this consistent format:

```typescript
interface ApiResponse<T> {
  success: boolean;           // Operation success status
  data?: T;                  // Response payload (when successful)
  error?: string;            // Error type (when failed)
  message?: string;          // Human-readable error message
  timestamp: number;         // Unix timestamp of response
  count?: number;            // Number of items returned (for collections)
  total?: number;            // Total available items (for pagination)
  cached?: boolean;          // Whether data was served from cache
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: string;             // Error category
  message: string;           // Detailed error description
  timestamp: number;
}
```

## API Endpoints

### 1. Arbitrage Opportunities

**Endpoint**: `GET /api/spreads`

**Purpose**: Retrieve real-time arbitrage opportunities across exchanges

**Query Parameters**:
```typescript
interface SpreadsQuery {
  minSpread?: number;        // Minimum spread percentage (e.g., 0.5)
  minVolume?: number;        // Minimum 24h volume in USDT
  exchanges?: string;        // Comma-separated exchange names
  search?: string;           // Symbol search filter
  limit?: number;            // Maximum results to return
  refresh?: 'true' | 'false'; // Force cache refresh
}
```

**Response Format**:
```typescript
interface SpreadsResponse {
  success: true;
  data: PriceRow[];
  count: number;             // Number of opportunities returned
  total: number;             // Total opportunities available
  timestamp: number;
  cached: boolean;
}

interface PriceRow {
  symbol: string;            // Trading pair (e.g., "BTC/USDT:USDT")
  exchanges: {
    [exchangeName: string]: {
      price: number;         // Current price
      volume: number;        // 24h volume in quote currency
      lastUpdated: number;   // Unix timestamp
    };
  };
  spread: {
    absolute: number;        // Absolute price difference
    percentage: number;      // Percentage spread
    bestBuy: string;         // Exchange with lowest price
    bestSell: string;        // Exchange with highest price
  };
  fundingRate?: {
    rate: number;            // Funding rate (e.g., 0.001 = 0.1%)
    nextTime: number;        // Next funding time (Unix timestamp)
    exchange: string;        // Exchange providing the rate
  };
}
```

**Example Request**:
```bash
GET /api/spreads?minSpread=0.5&minVolume=1000&exchanges=binance,okx&limit=20
```

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTC/USDT:USDT",
      "exchanges": {
        "binance": {
          "price": 43250.5,
          "volume": 125000000,
          "lastUpdated": 1703123456789
        },
        "okx": {
          "price": 43180.2,
          "volume": 98000000,
          "lastUpdated": 1703123456789
        }
      },
      "spread": {
        "absolute": 70.3,
        "percentage": 0.163,
        "bestBuy": "okx",
        "bestSell": "binance"
      },
      "fundingRate": {
        "rate": 0.0001,
        "nextTime": 1703152800000,
        "exchange": "binance"
      }
    }
  ],
  "count": 1,
  "total": 45,
  "timestamp": 1703123456789,
  "cached": false
}
```

### 2. Raw Ticker Data

**Endpoint**: `GET /api/tickers`

**Purpose**: Get raw price data from exchanges

**Query Parameters**:
```typescript
interface TickersQuery {
  exchanges?: string;        // Specific exchange name
  refresh?: 'true' | 'false'; // Force refresh
}
```

**Response Format**:
```typescript
interface TickersResponse {
  success: true;
  data: {
    [exchangeName: string]: {
      [symbol: string]: {
        symbol: string;
        last: number;          // Last price
        bid: number;           // Best bid
        ask: number;           // Best ask
        baseVolume: number;    // Volume in base currency
        quoteVolume: number;   // Volume in quote currency
        percentage: number;    // 24h change percentage
        timestamp: number;
      };
    };
  };
  timestamp: number;
  cached: boolean;
}
```

### 3. Funding Rates

**Endpoint**: `GET /api/funding-rates`

**Purpose**: Get futures contract funding rates

**Query Parameters**: Same as tickers

**Response Format**:
```typescript
interface FundingRatesResponse {
  success: true;
  data: {
    [exchangeName: string]: {
      [symbol: string]: {
        symbol: string;
        fundingRate: number;   // Current funding rate
        fundingTime: number;   // Next funding time
        timestamp: number;
      };
    };
  };
  timestamp: number;
  cached: boolean;
}
```

### 4. Exchange Information

**Endpoint**: `GET /api/exchanges`

**Purpose**: Get exchange capabilities and market type support

**Response Format**:
```typescript
interface ExchangesResponse {
  success: true;
  data: {
    all: string[];                    // All supported exchanges
    spot: string[];                   // Spot-supporting exchanges
    perp: string[];                   // Perp-supporting exchanges
    spotAndPerp: string[];            // Exchanges supporting both
    perpOnly: string[];               // Perp-only exchanges
    capabilities: {
      [exchangeName: string]: {
        supportsSpot: boolean;
        supportsPerp: boolean;
        marketTypes: ('spot' | 'perp')[];
      };
    };
  };
  timestamp: number;
}
```

**Endpoint**: `GET /api/exchanges/market/:marketType`

**Parameters**: `marketType` = `'spot'` | `'perp'`

**Response Format**:
```typescript
interface ExchangesByMarketResponse {
  success: true;
  data: {
    marketType: 'spot' | 'perp';
    exchanges: string[];
    count: number;
  };
  timestamp: number;
}
```

### 5. Health Check

**Endpoint**: `GET /api/health`

**Purpose**: Monitor system health and exchange connectivity

**Response Format**:
```typescript
interface HealthResponse {
  success: boolean;
  exchanges: {
    [exchangeName: string]: boolean; // Connection status
  };
  cache: {
    size: number;
    keys: string[];
    lastUpdate: number;
    isCached: boolean;
  };
  uptime: number;                    // Server uptime in seconds
  timestamp: number;
}
```

### 6. Statistics

**Endpoint**: `GET /api/statistics`

**Purpose**: Get arbitrage statistics and market overview

**Response Format**:
```typescript
interface StatisticsResponse {
  success: true;
  data: {
    totalOpportunities: number;
    averageSpread: number;
    topExchanges: string[];
    marketSummary: {
      totalVolume: number;
      activePairs: number;
    };
  };
  timestamp: number;
}
```

### 7. Top Opportunities

**Endpoint**: `GET /api/top-opportunities`

**Query Parameters**:
```typescript
interface TopOpportunitiesQuery {
  count?: number;                    // Number of results (1-100, default: 10)
}
```

**Response Format**: Same as `/api/spreads` but limited to top opportunities.

### 8. Data Refresh

**Endpoint**: `POST /api/refresh`

**Purpose**: Force immediate data refresh

**Response Format**:
```typescript
interface RefreshResponse {
  success: boolean;
  message: string;
  data: {
    spreadsCount: number;
    timestamp: number;
    error?: string;
  };
}
```

### 9. Cache Management

**Get Cache Info**:
```
GET /api/cache/info
```

**Clear Cache**:
```
DELETE /api/cache
```

## Error Handling

### HTTP Status Codes

- **200**: Success
- **400**: Bad Request (invalid parameters)
- **404**: Endpoint not found
- **500**: Internal Server Error
- **503**: Service Unavailable (exchange connectivity issues)

### Error Types

```typescript
type ErrorType = 
  | 'Validation Error'           // Invalid input parameters
  | 'Invalid exchange'           // Unsupported exchange requested
  | 'Invalid market type'        // Invalid market type parameter
  | 'Service Temporarily Unavailable' // Exchange API issues
  | 'Internal Server Error'      // Unexpected server errors
  | 'Health check failed'        // Health endpoint specific
  | 'Endpoint not found';        // 404 errors
```

## Data Flow

### Typical Frontend Request Flow

1. **Frontend** makes HTTP GET request to backend API
2. **Backend** validates query parameters
3. **Backend** checks cache for recent data
4. If cache miss or refresh requested:
   - **Backend** fetches data from exchange APIs
   - **Backend** processes and transforms data
   - **Backend** caches results
5. **Backend** returns formatted JSON response
6. **Frontend** receives and processes data

### Caching Strategy

- **Tickers TTL**: 10 seconds (real-time price data)
- **Funding Rates TTL**: 10 minutes (stable data)
- **Processed Data TTL**: 10 seconds (arbitrage opportunities)
- **Health Check TTL**: 1 minute

## Integration Examples

### Frontend Fetch Example

```typescript
// Fetch arbitrage opportunities
const fetchSpreads = async (filters: FilterOptions) => {
  const params = new URLSearchParams();
  if (filters.minSpread) params.append('minSpread', filters.minSpread.toString());
  if (filters.minVolume) params.append('minVolume', filters.minVolume.toString());
  if (filters.selectedExchanges.length) {
    params.append('exchanges', filters.selectedExchanges.join(','));
  }
  
  const response = await fetch(`http://localhost:3001/api/spreads?${params}`);
  const data: SpreadsResponse = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch data');
  }
  
  return data.data;
};
```

### Error Handling Example

```typescript
const handleApiCall = async () => {
  try {
    const data = await fetchSpreads(filters);
    setSpreadData(data);
  } catch (error) {
    if (error instanceof Error) {
      setError(error.message);
    } else {
      setError('An unexpected error occurred');
    }
  }
};
```

## Real-time Updates

Currently, the system uses **polling-based updates** with configurable intervals:

- Frontend polls `/api/spreads` every 10-30 seconds
- Backend serves cached data when available
- Force refresh available via `refresh=true` parameter

### Future Enhancement: WebSocket Support

Planned WebSocket endpoints for real-time updates:
```
WS /ws/spreads     - Real-time arbitrage opportunities
WS /ws/prices      - Real-time price updates
WS /ws/health      - System health updates
```

## Performance Considerations

### Request Optimization

1. **Use caching**: Don't set `refresh=true` unless necessary
2. **Filter data**: Use query parameters to limit response size
3. **Batch requests**: Avoid rapid sequential API calls
4. **Handle errors**: Implement proper error handling and retry logic

### Rate Limiting

- No explicit rate limiting currently implemented
- Recommended: Max 1 request per second per endpoint
- Use caching effectively to reduce API load

## Monitoring and Logging

### Request Logging
All requests are logged with timestamp, method, and path:
```
2023-12-21T10:30:45.123Z - GET /api/spreads
```

### Error Logging
Errors are logged with full stack traces for debugging.

### Health Monitoring
Use `/api/health` endpoint to monitor:
- Exchange connectivity
- Cache performance
- System uptime

---

## Summary

The backend-frontend communication uses a standard REST API with JSON data exchange. The system is designed for:

- **Reliability**: Consistent error handling and response formats
- **Performance**: Aggressive caching and optimized data structures
- **Scalability**: Stateless design with configurable parameters
- **Monitoring**: Health checks and comprehensive logging
- **Flexibility**: Market type separation and exchange filtering

For AI and automated systems, focus on the structured response formats and error handling patterns. For human developers, pay attention to the query parameters and caching strategies for optimal performance. 