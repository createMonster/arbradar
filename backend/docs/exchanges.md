# Supported Exchanges

## Spot and Perp
- Binance
- Bitget  
- Bybit
- Gate
- OKX

## Perp Only
- Hyperliquid

---

## Implementation Details

### Market Type Separation

The backend now supports proper separation of exchanges based on their market capabilities:

#### Exchange Capabilities
- **Spot and Perp Exchanges**: Support both spot and perpetual futures markets
- **Perp Only Exchanges**: Support only perpetual futures markets

#### Configuration Structure
Each exchange is configured with:
```typescript
interface ExchangeConfig {
  enableRateLimit: boolean;
  timeout: number;
  rateLimit?: number;
  options: {
    defaultType: string;
    [key: string]: any;
  };
  capabilities: ExchangeCapabilities;
}

interface ExchangeCapabilities {
  supportsSpot: boolean;
  supportsPerp: boolean;
  marketTypes: MarketType[];
}
```

### API Endpoints

#### Get Exchange Information
```
GET /api/exchanges
```
Returns comprehensive exchange information including capabilities:
```json
{
  "success": true,
  "data": {
    "all": ["binance", "bitget", "bybit", "gate", "okx", "hyperliquid"],
    "spot": ["binance", "bitget", "bybit", "gate", "okx"],
    "perp": ["binance", "bitget", "bybit", "gate", "okx", "hyperliquid"],
    "spotAndPerp": ["binance", "bitget", "bybit", "gate", "okx"],
    "perpOnly": ["hyperliquid"],
    "capabilities": {
      "binance": {
        "supportsSpot": true,
        "supportsPerp": true,
        "marketTypes": ["spot", "perp"]
      }
    }
  }
}
```

#### Get Exchanges by Market Type
```
GET /api/exchanges/market/:marketType
```
Where `:marketType` can be `spot` or `perp`:
```json
{
  "success": true,
  "data": {
    "marketType": "spot",
    "exchanges": ["binance", "bitget", "bybit", "gate", "okx"],
    "count": 5
  }
}
```

### Service Layer Features

#### ExchangeService Methods
- `getExchangesByMarketType(marketType: MarketType)`: Filter exchanges by market type
- `getSpotExchanges()`: Get all spot-supporting exchanges
- `getPerpExchanges()`: Get all perp-supporting exchanges
- `exchangeSupportsMarketType(exchangeName: string, marketType: MarketType)`: Check if exchange supports specific market type
- `getExchangeCapabilities(exchangeName: string)`: Get exchange capabilities

#### Helper Functions
- `getExchangesByMarketType(marketType)`: Global helper for market type filtering
- `getSpotExchanges()`: Get spot exchanges
- `getPerpExchanges()`: Get perp exchanges
- `exchangeSupportsMarketType(exchange, marketType)`: Check market type support

### Type Definitions

New types added to support market type separation:
```typescript
export type MarketType = 'spot' | 'perp';
export const SPOT_AND_PERP_EXCHANGES = ['binance', 'bitget', 'bybit', 'gate', 'okx'] as const;
export const PERP_ONLY_EXCHANGES = ['hyperliquid'] as const;
```

### Migration Notes

1. **Gate Exchange**: Now supported across all services
2. **Market Type Awareness**: All services can now filter by market type
3. **API Compatibility**: Existing endpoints maintain backward compatibility
4. **Exchange Configuration**: Centralized configuration with capabilities metadata

### Usage Examples

```typescript
// Get all perp exchanges
const perpExchanges = exchangeService.getPerpExchanges();

// Check if an exchange supports spot trading
const supportsSpot = exchangeService.exchangeSupportsMarketType('hyperliquid', 'spot'); // false

// Get exchange capabilities
const capabilities = exchangeService.getExchangeCapabilities('binance');
// Returns: { supportsSpot: true, supportsPerp: true }
```
