# 🌊 Hyperliquid Exchange Integration

## Overview
Hyperliquid is a decentralized exchange (DEX) that requires wallet-based authentication instead of traditional API keys.

## 🔧 Setup Requirements

### 1. Environment Variables
Set these in your `.env` file or environment:

```bash
# Hyperliquid wallet configuration
HYPERLIQUID_WALLET_ADDRESS=0x1234567890123456789012345678901234567890
HYPERLIQUID_PRIVATE_KEY=0x1234567890123456789012345678901234567890123456789012345678901234
```

### 2. Wallet Address Format
- **walletAddress**: Hex format `0x<40 hex characters>`
- **privateKey**: Hex format `0x<64 hex characters>`

### 3. Security Recommendations

⚠️ **IMPORTANT SECURITY NOTES:**

1. **Use API Wallet**: Generate a separate API wallet on Hyperliquid
2. **Never use your main wallet private key**
3. **API wallets can only trade, not withdraw**
4. **Keep your mnemonic phrase private**

## 📊 Features

### Supported Operations
- ✅ Fetch tickers (price data)
- ✅ Fetch funding rates
- ✅ Stoploss on exchange
- ⚠️ Limited historical data (5000 candles max)

### Limitations
- No market orders (simulated with limit orders + 5% slippage)
- Limited backtesting data
- DEX-specific rate limits

## 🚀 Getting Started

### 1. Create API Wallet
1. Visit Hyperliquid
2. Generate an API wallet (not your main wallet)
3. Copy the wallet address and private key

### 2. Fund the Wallet
1. Deposit USDC to Arbitrum One chain
2. Transfer to your Hyperliquid wallet
3. Ensure sufficient balance for trading

### 3. Configure Environment
```bash
# Add to your .env file
HYPERLIQUID_WALLET_ADDRESS=your_wallet_address_here
HYPERLIQUID_PRIVATE_KEY=your_api_private_key_here
```

### 4. Test Configuration
```bash
# Check if Hyperliquid is initialized
curl http://localhost:3001/api/health
```

## 📈 API Endpoints

All standard endpoints support Hyperliquid:

```bash
# Get Hyperliquid tickers
GET /api/tickers?exchanges=hyperliquid

# Get Hyperliquid funding rates  
GET /api/funding-rates?exchanges=hyperliquid

# Get arbitrage opportunities including Hyperliquid
GET /api/spreads
```

## 🔍 Monitoring

Look for these log messages:

```bash
# Successful initialization
✅ Initialized exchange: hyperliquid

# Missing credentials
⚠️ Skipping Hyperliquid - missing wallet credentials

# Configuration error  
❌ Hyperliquid requires walletAddress and privateKey
```

## ⚡ Performance Notes

- **Rate Limiting**: Conservative (100ms between calls)
- **Batch Size**: 10 (smaller than CEX)
- **Network**: Runs on Arbitrum One (Layer 2)
- **Fees**: Uses USDC as collateral

## 🛡️ Security Best Practices

1. **Separate Wallets**: Use different wallets for trading vs holding
2. **API Keys Only**: Never store main wallet private keys on servers
3. **Environment Variables**: Store credentials securely
4. **Regular Monitoring**: Check wallet balances and activity
5. **Withdrawal Limits**: API wallets cannot withdraw (security feature)

## 🔧 Troubleshooting

### Common Issues

**Hyperliquid not initializing:**
- Check environment variables are set
- Verify wallet address format (starts with 0x)
- Ensure private key is 64 hex characters + 0x prefix

**Authentication errors:**
- Verify private key matches the wallet address
- Check wallet has sufficient balance
- Ensure API wallet is properly generated

**Rate limiting:**
- Hyperliquid has conservative rate limits
- Monitor logs for timeout messages
- Consider increasing delays if needed 