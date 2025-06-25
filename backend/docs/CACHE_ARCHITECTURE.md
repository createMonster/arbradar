# 🏗️ Backend Cache Architecture

## Overview
This document explains the caching architecture of the crypto arbitrage backend to resolve TTL confusion and provide clear guidelines.

## 🎯 Cache Layers & Their Purpose

### 1. **ExchangeService Cache** (L1 - Raw Data)
- **Location**: `services/ExchangeService.ts`
- **Purpose**: Caches raw exchange data with different TTLs by data type
- **TTL**: 
  - **Tickers**: 10 seconds (`CACHE_CONFIG.TICKERS_TTL`) - Price data needs frequent updates
  - **Funding Rates**: 10 minutes (`CACHE_CONFIG.FUNDING_RATES_TTL`) - Stable data
- **Scope**: Per-exchange data
- **Type**: Simple Map<string, any>

### 2. **CacheService** (L2 - Processed Data) 
- **Location**: `services/CacheService.ts`
- **Purpose**: Generic caching service for processed data
- **TTL**: Configurable (default: 10 minutes)
- **Scope**: Application-wide processed data
- **Type**: Map with expiration tracking

### 3. **DataService Cache** (L3 - Orchestration)
- **Location**: `services/DataService.ts`
- **Purpose**: Caches aggregated arbitrage opportunities
- **TTL**: 10 seconds (`CACHE_CONFIG.PROCESSED_DATA_TTL`) - Matches price data freshness
- **Uses**: CacheService internally

## 📊 Cache Flow Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Routes    │───▶│   DataService   │───▶│ ExchangeService │
│                 │    │   (L3 Cache)    │    │   (L1 Cache)    │
│  api-refactored │    │                 │    │                 │
│      api.ts     │    │  CacheService   │    │  Raw Exchange   │
│                 │    │  (L2 Generic)   │    │      Data       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ⚙️ Centralized Cache Configuration

All TTL values are now centralized in `CACHE_CONFIG`:

```typescript
// services/ExchangeService.ts
export const CACHE_CONFIG = {
  TICKERS_TTL: 10000,          // 10 seconds - Price data (frequent updates)
  FUNDING_RATES_TTL: 600000,   // 10 minutes - Funding rates (stable data)  
  PROCESSED_DATA_TTL: 10000,   // 10 seconds - Processed arbitrage data (matches price freshness)
  HEALTH_CHECK_TTL: 60000      // 1 minute - Health status cache
};
```

## 🧠 **Cache Consistency Principle**

### **⚡ Key Rule: Processed Data Cannot Be Fresher Than Input Data**

```
Price Data (10s) → Arbitrage Calculations (10s) ✅ Consistent
Price Data (10s) → Arbitrage Calculations (10min) ❌ Inconsistent!
```

This ensures:
- ✅ Arbitrage opportunities reflect latest prices
- ✅ No stale calculated spreads with old price data
- ✅ Real-time accuracy for trading decisions

## 🔄 Cache Invalidation Strategy

### **Optimized TTL Strategy**
- **Price Data (Tickers)**: 10 seconds - Frequent updates for real-time arbitrage
- **Funding Rates**: 10 minutes - Stable data, changes infrequently  
- **Processed Data**: 10 seconds - Matches price data freshness for accurate arbitrage
- **Health Checks**: 1 minute - Service status monitoring

### **Background Updates**
- DataService updates every 1 minute (`updateInterval`)
- Uses cached exchange data if still valid
- Only fetches new exchange data if cache expired

## 🚀 Cache Warm-up Process

1. **Server Start**: DataService warms up ExchangeService cache
2. **Background Updates**: Continuously refresh data at intervals
3. **On-Demand**: Force refresh available via API

## 📈 Cache Performance Benefits

- **Optimized for Data Type**: 
  - Price data: 10s cache for near real-time updates
  - Funding rates: 10min cache reduces API calls by ~98%
- **Faster Response**: Cached responses in <50ms vs 2-5s fresh fetches
- **Rate Limit Protection**: Prevents hitting exchange rate limits
- **Cost Reduction**: Smart caching reduces API costs significantly

## 🔧 Cache Management APIs

### Clear Cache
```
DELETE /api/cache
```

### Cache Information  
```
GET /api/cache/info
```

### Force Refresh
```
GET /api/spreads?refresh=true
```

## ⚠️ Migration Notes

### **Legacy Route (api.ts)**
- Still uses in-memory cache object
- **TODO**: Should be deprecated in favor of api-refactored.ts
- Different caching strategy (30s TTL)

### **Recommendation**: 
- Use `api-refactored.ts` for all new development
- Gradually migrate endpoints from `api.ts`
- Deprecate legacy caching patterns

## 🎯 Best Practices

1. **Use Centralized Config**: Always import `CACHE_CONFIG` for TTL values
2. **Cache Key Consistency**: Use descriptive, unique cache keys
3. **Error Handling**: Always handle cache misses gracefully
4. **Monitor Performance**: Track cache hit rates and performance
5. **Documentation**: Update this doc when adding new cache layers 