import { PriceRow } from '../types';

const exchanges = ['Binance', 'OKX', 'Bitget', 'Bybit'];
const symbols = [
  'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT',
  'DOT/USDT', 'AVAX/USDT', 'MATIC/USDT', 'LINK/USDT', 'UNI/USDT',
  'LTC/USDT', 'BCH/USDT', 'XRP/USDT', 'DOGE/USDT', 'ATOM/USDT',
  'FTM/USDT', 'NEAR/USDT', 'ALGO/USDT', 'VET/USDT', 'ICP/USDT'
];

function generateRandomPrice(basePrice: number, variance: number = 0.02): number {
  const change = (Math.random() - 0.5) * 2 * variance;
  return basePrice * (1 + change);
}

function generateRandomVolume(): number {
  return Math.random() * 10000000 + 100000; // 100K to 10M
}

function calculateSpread(prices: number[]): { absolute: number; percentage: number; bestBuy: string; bestSell: string } {
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minIndex = prices.indexOf(minPrice);
  const maxIndex = prices.indexOf(maxPrice);
  
  return {
    absolute: maxPrice - minPrice,
    percentage: ((maxPrice - minPrice) / minPrice) * 100,
    bestBuy: exchanges[minIndex], // Buy from exchange with lowest price
    bestSell: exchanges[maxIndex]  // Sell to exchange with highest price
  };
}

const basePrices: { [key: string]: number } = {
  'BTC/USDT': 67500,
  'ETH/USDT': 3850,
  'BNB/USDT': 635,
  'SOL/USDT': 180,
  'ADA/USDT': 1.25,
  'DOT/USDT': 11.5,
  'AVAX/USDT': 42,
  'MATIC/USDT': 1.15,
  'LINK/USDT': 18.5,
  'UNI/USDT': 12.8,
  'LTC/USDT': 105,
  'BCH/USDT': 485,
  'XRP/USDT': 0.52,
  'DOGE/USDT': 0.38,
  'ATOM/USDT': 8.9,
  'FTM/USDT': 0.85,
  'NEAR/USDT': 7.2,
  'ALGO/USDT': 0.28,
  'VET/USDT': 0.045,
  'ICP/USDT': 12.5
};

export function generateMockData(): PriceRow[] {
  return symbols.map(symbol => {
    const basePrice = basePrices[symbol];
    const exchangePrices: number[] = [];
    const exchangeData: { [key: string]: { price: number; volume: number; lastUpdated: number } } = {};
    
    exchanges.forEach(exchange => {
      const price = generateRandomPrice(basePrice);
      exchangePrices.push(price);
      exchangeData[exchange] = {
        price: Number(price.toFixed(price > 1 ? 2 : 6)),
        volume: Math.round(generateRandomVolume()),
        lastUpdated: Date.now() - Math.random() * 30000 // Within last 30 seconds
      };
    });
    
    const spread = calculateSpread(exchangePrices);
    
    return {
      symbol,
      exchanges: exchangeData,
      spread: {
        absolute: Number(spread.absolute.toFixed(6)),
        percentage: Number(spread.percentage.toFixed(4)),
        bestBuy: spread.bestBuy,
        bestSell: spread.bestSell
      },
      // Add funding rate for futures pairs (random data)
      fundingRate: Math.random() > 0.3 ? {
        rate: (Math.random() - 0.5) * 0.002, // -0.1% to +0.1%
        nextTime: Date.now() + Math.random() * 8 * 60 * 60 * 1000, // Within next 8 hours
        exchange: exchanges[Math.floor(Math.random() * exchanges.length)]
      } : undefined
    };
  });
}

export function updateMockData(currentData: PriceRow[]): PriceRow[] {
  return currentData.map(row => {
    const updatedExchanges = { ...row.exchanges };
    const exchangePrices: number[] = [];
    
    // Update each exchange price slightly
    exchanges.forEach(exchange => {
      if (updatedExchanges[exchange]) {
        const currentPrice = updatedExchanges[exchange].price;
        const newPrice = generateRandomPrice(currentPrice, 0.005); // Smaller variance for updates
        exchangePrices.push(newPrice);
        updatedExchanges[exchange] = {
          ...updatedExchanges[exchange],
          price: Number(newPrice.toFixed(currentPrice > 1 ? 2 : 6)),
          lastUpdated: Date.now()
        };
      }
    });
    
    const spread = calculateSpread(exchangePrices);
    
    return {
      ...row,
      exchanges: updatedExchanges,
      spread: {
        absolute: Number(spread.absolute.toFixed(6)),
        percentage: Number(spread.percentage.toFixed(4)),
        bestBuy: spread.bestBuy,
        bestSell: spread.bestSell
      }
    };
  });
} 