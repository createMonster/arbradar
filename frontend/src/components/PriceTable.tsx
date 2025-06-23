'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Skeleton } from '@/components/ui/skeleton';
import { PriceRow, FilterOptions, Language } from '../types';

interface PriceTableProps {
  data: PriceRow[];
  filters: FilterOptions;
  language: Language;
  isLoading?: boolean;
}

const exchanges = ['Binance', 'OKX', 'Bitget', 'Bybit'];

export default function PriceTable({ data, filters, language, isLoading = false }: PriceTableProps) {
  const t = {
    en: {
      symbol: 'Symbol',
      spread: 'Spread',
      bestBuy: 'Best Buy',
      bestSell: 'Best Sell',
      fundingRate: 'Funding Rate',
      volume: 'Volume',
      price: 'Price',
      lastUpdated: 'Last Updated',
      noData: 'No data matches your filters',
      loading: 'Loading...',
    },
    zh: {
      symbol: '交易对',
      spread: '价差',
      bestBuy: '最佳买入',
      bestSell: '最佳卖出',
      fundingRate: '资金费率',
      volume: '交易量',
      price: '价格',
      lastUpdated: '最后更新',
      noData: '没有数据匹配您的筛选条件',
      loading: '加载中...',
    }
  };

  const currentTranslations = t[language];

  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const formatPercentage = (num: number): string => {
    return `${num >= 0 ? '+' : ''}${num.toFixed(4)}%`;
  };

  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const getSpreadColor = (percentage: number): string => {
    if (percentage >= 2) return 'text-white font-bold bg-gray-700 px-2 py-1 rounded';
    if (percentage >= 1) return 'text-gray-200 font-semibold';
    if (percentage >= 0.5) return 'text-gray-400';
    return 'text-gray-600';
  };

  const filterData = (data: PriceRow[]): PriceRow[] => {
    return data.filter(row => {
      // Search filter
      if (filters.searchTerm && !row.symbol.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }

      // Volume filter
      const totalVolume = Object.values(row.exchanges).reduce((sum, exchange) => sum + exchange.volume, 0);
      if (totalVolume < filters.minVolume) {
        return false;
      }

      // Spread filter
      if (row.spread.percentage < filters.minSpread) {
        return false;
      }

      // Exchange filter
      const hasSelectedExchange = filters.selectedExchanges.some(exchange => 
        row.exchanges[exchange] !== undefined
      );
      if (!hasSelectedExchange) {
        return false;
      }

      return true;
    });
  };

  const filteredData = filterData(data);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{currentTranslations.loading}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-muted-foreground text-lg mb-2">
              {currentTranslations.noData}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by spread percentage descending (best opportunities first)
  const sortedData = [...filteredData].sort((a, b) => b.spread.percentage - a.spread.percentage);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="technical-card">
        <CardHeader className="technical-header">
          <CardTitle className="flex items-center justify-between font-mono">
            <span>ARBITRAGE_OPPORTUNITIES [{sortedData.length}]</span>
            <Badge variant="outline" className="ml-2 bg-white text-black border-white font-mono">
              <Clock className="mr-1 h-3 w-3" />
              LIVE
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Token Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedData.map((row) => {
          const bestBuyExchange = row.exchanges[row.spread.bestBuy];
          const bestSellExchange = row.exchanges[row.spread.bestSell];
          const totalVolume = Object.values(row.exchanges).reduce((sum, ex) => sum + ex.volume, 0);
          
          return (
            <Card key={row.symbol} className="technical-card hover:bg-gray-700/30 transition-colors cursor-pointer">
              {/* Card Header with Symbol and Spread */}
              <div className="technical-header flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-lg">{row.symbol}</span>
                  <Badge variant="secondary" className="bg-gray-700 text-white font-mono text-xs">
                    SPOT
                  </Badge>
                </div>
                <div className={`text-right ${getSpreadColor(row.spread.percentage)}`}>
                  <div className="font-mono font-bold text-lg">
                    {row.spread.percentage.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    ${row.spread.absolute.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <CardContent className="pt-4 space-y-3">
                {/* Best Buy/Sell Prices */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="technical-label">BUY FROM</div>
                    <div className="bg-gray-800 p-2 rounded border border-gray-600">
                      <div className="font-mono font-bold text-green-400">
                        {row.spread.bestBuy}
                      </div>
                      <div className="technical-value text-white">
                        ${bestBuyExchange?.price.toFixed(bestBuyExchange.price > 1 ? 2 : 6)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="technical-label">SELL TO</div>
                    <div className="bg-gray-800 p-2 rounded border border-gray-600">
                      <div className="font-mono font-bold text-red-400">
                        {row.spread.bestSell}
                      </div>
                      <div className="technical-value text-white">
                        ${bestSellExchange?.price.toFixed(bestSellExchange.price > 1 ? 2 : 6)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exchange Prices Grid */}
                <div className="space-y-2">
                  <div className="technical-label">ALL EXCHANGES</div>
                  <div className="grid grid-cols-2 gap-2">
                    {exchanges.map(exchange => {
                      const exchangeData = row.exchanges[exchange];
                      if (!exchangeData) return null;
                      
                      const isHighest = exchange === row.spread.bestSell;
                      const isLowest = exchange === row.spread.bestBuy;
                      
                      return (
                        <div 
                          key={exchange} 
                          className={`p-2 rounded text-xs border ${
                            isHighest ? 'border-red-500 bg-red-900/20' : 
                            isLowest ? 'border-green-500 bg-green-900/20' : 
                            'border-gray-600 bg-gray-800/50'
                          }`}
                        >
                          <div className="font-mono font-semibold text-white">
                            {exchange}
                          </div>
                          <div className="technical-value">
                            ${exchangeData.price.toFixed(exchangeData.price > 1 ? 2 : 6)}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {formatTime(exchangeData.lastUpdated)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Volume and Funding Rate */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                  <div className="technical-label">
                    VOL: {formatNumber(totalVolume, 0)}
                  </div>
                  {row.fundingRate && (
                    <div className="text-right">
                      <div className="technical-label">FUNDING</div>
                      <div className={`technical-value ${
                        row.fundingRate.rate >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPercentage(row.fundingRate.rate * 100)}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 