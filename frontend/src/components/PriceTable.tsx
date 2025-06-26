'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Skeleton } from '@/components/ui/skeleton';
import { PriceRow, FilterOptions, Language } from '../types';

interface PriceTableProps {
  data: PriceRow[];
  filters: FilterOptions;
  language: Language;
  isLoading?: boolean;
  connectionStatus?: 'connected' | 'disconnected' | 'checking';
}

const exchanges = ['Binance', 'OKX', 'Bitget', 'Bybit'];

export default function PriceTable({ data, filters, language, isLoading = false, connectionStatus = 'checking' }: PriceTableProps) {
  const t = {
    en: {
      symbol: 'Symbol',
      spread: 'Spread',
      bestBuy: 'Best Buy',
      bestSell: 'Best Sell',
      fundingRate: 'Funding Rate',
      fundingRates: 'Funding Rates',
      volume: 'Volume',
      price: 'Price',
      lastUpdated: 'Last Updated',
      noData: 'No data matches your filters',
      loading: 'Loading...',
      disconnected: 'Backend disconnected - Demo mode',
      connecting: 'Connecting to exchanges...',
      noArbitrage: 'No arbitrage opportunities found',
      spot: 'Spot',
      perp: 'Perpetual',
      buyFrom: 'BUY FROM',
      sellTo: 'SELL TO',
      allExchanges: 'ALL EXCHANGES',
      nextFunding: 'Next Funding',
      buyExchange: 'Buy Exchange',
      sellExchange: 'Sell Exchange',
      fundingDifferential: 'Funding Rate Differential',
      annually: 'annually',
    },
    zh: {
      symbol: '交易对',
      spread: '价差',
      bestBuy: '最佳买入',
      bestSell: '最佳卖出',
      fundingRate: '资金费率',
      fundingRates: '资金费率',
      volume: '交易量',
      price: '价格',
      lastUpdated: '最后更新',
      noData: '没有数据匹配您的筛选条件',
      loading: '加载中...',
      disconnected: '后端断开连接 - 演示模式',
      connecting: '连接交易所中...',
      noArbitrage: '未找到套利机会',
      spot: '现货',
      perp: '永续合约',
      buyFrom: '买入交易所',
      sellTo: '卖出交易所',
      allExchanges: '所有交易所',
      nextFunding: '下次资金费率',
      buyExchange: '买入方',
      sellExchange: '卖出方',
      fundingDifferential: '资金费率差值',
      annually: '年化',
    }
  };

  const currentTranslations = t[language];

  // Helper function to determine market type from symbol (fallback if backend doesn't provide marketType)
  const getMarketType = (symbol: string): 'spot' | 'perp' => {
    // Perpetual contracts typically have formats like:
    // BTC/USDT:USDT (with colon)
    // BTC-PERP, BTC/USD:PERPETUAL
    return symbol.includes(':') || symbol.includes('PERP') || symbol.includes('PERPETUAL') ? 'perp' : 'spot';
  };

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

  const formatFundingRate = (rate: number): string => {
    const percentage = rate * 100;
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(4)}%`;
  };

  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const formatNextFunding = (timestamp: number): string => {
    const now = Date.now();
    const diff = timestamp - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getSpreadColor = (percentage: number): string => {
    if (percentage >= 2) return 'text-white font-bold bg-gray-700 px-2 py-1 rounded';
    if (percentage >= 1) return 'text-gray-200 font-semibold';
    if (percentage >= 0.5) return 'text-gray-400';
    return 'text-gray-600';
  };

  const getFundingRateColor = (rate: number): string => {
    if (rate > 0.001) return 'text-red-400'; // High positive rate
    if (rate > 0) return 'text-yellow-400';   // Positive rate
    if (rate > -0.001) return 'text-green-400'; // Small negative rate
    return 'text-green-300'; // High negative rate
  };

  // const filterData = (data: PriceRow[]): PriceRow[] => {
  //   return data.filter(row => {
  //     // Search filter
  //     if (filters.searchTerm && !row.symbol.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
  //       return false;
  //     }

  //     // Volume filter - only apply if minVolume > 0
  //     if (filters.minVolume > 0) {
  //       const totalVolume = Object.values(row.exchanges).reduce((sum, exchange) => sum + exchange.volume, 0);
  //       if (totalVolume < filters.minVolume) {
  //         return false;
  //       }
  //     }

  //     // Spread filter - only apply if minSpread > 0
  //     if (filters.minSpread > 0 && row.spread.percentage < filters.minSpread) {
  //       return false;
  //     }

  //     // Exchange filter - only apply if specific exchanges are selected
  //     if (filters.selectedExchanges.length > 0) {
  //       const hasSelectedExchange = filters.selectedExchanges.some(exchange => 
  //         row.exchanges[exchange] !== undefined
  //       );
  //       if (!hasSelectedExchange) {
  //         return false;
  //       }
  //     }

  //     return true;
  //   });
  // };

  //const filteredData = filterData(data);
  // no filter for now
  const filteredData = data;

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
            <div className="flex items-center space-x-2">
              {connectionStatus === 'connected' && (
                <Badge variant="outline" className="bg-green-900 text-green-200 border-green-600 font-mono">
                  <Clock className="mr-1 h-3 w-3" />
                  LIVE
                </Badge>
              )}
              {connectionStatus === 'disconnected' && (
                <Badge variant="outline" className="bg-red-900 text-red-200 border-red-600 font-mono">
                  OFFLINE
                </Badge>
              )}
              {connectionStatus === 'checking' && (
                <Badge variant="outline" className="bg-yellow-900 text-yellow-200 border-yellow-600 font-mono">
                  CONNECTING...
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Token Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedData.map((row) => {
          const bestBuyExchange = row.exchanges[row.spread.bestBuy];
          const bestSellExchange = row.exchanges[row.spread.bestSell];
          const totalVolume = Object.values(row.exchanges).reduce((sum, ex) => sum + ex.volume, 0);
          // Use backend-provided marketType if available, otherwise fall back to detection
          const marketType = row.marketType || getMarketType(row.symbol);
          const isPerp = marketType === 'perp';
          
          return (
            <Card key={row.symbol} className="technical-card hover:bg-gray-700/30 transition-colors cursor-pointer">
              {/* Card Header with Symbol and Spread */}
              <div className="technical-header flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-lg">{row.symbol}</span>
                  <Badge 
                    variant="secondary" 
                    className={`font-mono text-xs ${
                      isPerp 
                        ? 'bg-purple-700 text-purple-200 border-purple-500' 
                        : 'bg-blue-700 text-blue-200 border-blue-500'
                    }`}
                  >
                    {isPerp ? currentTranslations.perp.toUpperCase() : currentTranslations.spot.toUpperCase()}
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
                    <div className="technical-label">{currentTranslations.buyFrom}</div>
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
                    <div className="technical-label">{currentTranslations.sellTo}</div>
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

                {/* Enhanced Funding Rates for Both Sides (Perp only) */}
                {isPerp && (
                  <div className="bg-gray-800/50 p-3 rounded border border-gray-600">
                    <div className="technical-label mb-3">{currentTranslations.fundingRates}</div>
                    
                    {/* Check for per-exchange funding rates first (enhanced data) */}
                    {(bestBuyExchange?.fundingRate || bestSellExchange?.fundingRate || row.fundingRates) ? (
                      <div className="space-y-3">
                        {/* Buy and Sell Exchange Funding Rates */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Buy Exchange Funding Rate */}
                          <div className="bg-green-900/20 p-2 rounded border border-green-600/30">
                            <div className="text-xs text-green-400 mb-1">
                              {currentTranslations.buyExchange} ({row.spread.bestBuy})
                            </div>
                            {bestBuyExchange?.fundingRate ? (
                              <div className="space-y-1">
                                <div className={`font-mono text-sm ${getFundingRateColor(bestBuyExchange.fundingRate.rate)}`}>
                                  {formatFundingRate(bestBuyExchange.fundingRate.rate)}
                                </div>
                                <div className="flex items-center space-x-1 text-xs text-gray-400">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatNextFunding(bestBuyExchange.fundingRate.nextTime)}</span>
                                </div>
                                {bestBuyExchange.fundingRate.dataAge !== undefined && (
                                  <div className="text-xs text-gray-500">
                                    {bestBuyExchange.fundingRate.dataAge}s ago
                                  </div>
                                )}
                              </div>
                            ) : row.fundingRates?.[row.spread.bestBuy] ? (
                              <div className="space-y-1">
                                <div className={`font-mono text-sm ${getFundingRateColor(row.fundingRates[row.spread.bestBuy].rate)}`}>
                                  {formatFundingRate(row.fundingRates[row.spread.bestBuy].rate)}
                                </div>
                                <div className="flex items-center space-x-1 text-xs text-gray-400">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatNextFunding(row.fundingRates[row.spread.bestBuy].nextTime)}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">No data</div>
                            )}
                          </div>

                          {/* Sell Exchange Funding Rate */}
                          <div className="bg-red-900/20 p-2 rounded border border-red-600/30">
                            <div className="text-xs text-red-400 mb-1">
                              {currentTranslations.sellExchange} ({row.spread.bestSell})
                            </div>
                            {bestSellExchange?.fundingRate ? (
                              <div className="space-y-1">
                                <div className={`font-mono text-sm ${getFundingRateColor(bestSellExchange.fundingRate.rate)}`}>
                                  {formatFundingRate(bestSellExchange.fundingRate.rate)}
                                </div>
                                <div className="flex items-center space-x-1 text-xs text-gray-400">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatNextFunding(bestSellExchange.fundingRate.nextTime)}</span>
                                </div>
                                {bestSellExchange.fundingRate.dataAge !== undefined && (
                                  <div className="text-xs text-gray-500">
                                    {bestSellExchange.fundingRate.dataAge}s ago
                                  </div>
                                )}
                              </div>
                            ) : row.fundingRates?.[row.spread.bestSell] ? (
                              <div className="space-y-1">
                                <div className={`font-mono text-sm ${getFundingRateColor(row.fundingRates[row.spread.bestSell].rate)}`}>
                                  {formatFundingRate(row.fundingRates[row.spread.bestSell].rate)}
                                </div>
                                <div className="flex items-center space-x-1 text-xs text-gray-400">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatNextFunding(row.fundingRates[row.spread.bestSell].nextTime)}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">No data</div>
                            )}
                          </div>
                        </div>

                                                 {/* Funding Rate Differential Analysis */}
                         {bestBuyExchange?.fundingRate && bestSellExchange?.fundingRate && (
                           <div className="bg-blue-900/20 p-2 rounded border border-blue-600/30">
                             <div className="text-xs text-blue-400 mb-1">{currentTranslations.fundingDifferential}</div>
                             <div className="font-mono text-sm text-white">
                               {(() => {
                                 const diff = bestSellExchange.fundingRate.rate - bestBuyExchange.fundingRate.rate;
                                 const annualizedDiff = diff * 365 * 3; // 3 times per day
                                 return (
                                   <div className="space-y-1">
                                     <div className={`${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                       {diff >= 0 ? '+' : ''}{formatFundingRate(diff)}
                                     </div>
                                     <div className="text-xs text-gray-400">
                                       ~{(annualizedDiff * 100).toFixed(2)}% {currentTranslations.annually}
                                     </div>
                                   </div>
                                 );
                               })()}
                             </div>
                           </div>
                         )}
                      </div>
                    ) : row.fundingRate ? (
                      // Fallback to legacy single funding rate
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-400">{row.fundingRate.exchange}:</span>
                            <span className={`font-mono text-sm ${getFundingRateColor(row.fundingRate.rate)}`}>
                              {formatFundingRate(row.fundingRate.rate)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{formatNextFunding(row.fundingRate.nextTime)}</span>
                          </div>
                        </div>
                        <div className="text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded border border-yellow-700">
                          ⚠️ Limited funding rate data available
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 text-center py-2">
                        No funding rate data available
                      </div>
                    )}
                  </div>
                )}

                {/* Exchange Prices Grid */}
                <div className="space-y-2">
                  <div className="technical-label">{currentTranslations.allExchanges}</div>
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
                          <div className="flex items-center justify-between">
                            <div className="font-mono font-semibold text-white">
                              {exchange}
                            </div>
                            {isPerp && (
                              <div className="flex items-center space-x-1">
                                {isHighest ? (
                                  <TrendingUp className="h-3 w-3 text-red-400" />
                                ) : isLowest ? (
                                  <TrendingDown className="h-3 w-3 text-green-400" />
                                ) : null}
                              </div>
                            )}
                          </div>
                          <div className="technical-value">
                            ${exchangeData.price.toFixed(exchangeData.price > 1 ? 2 : 6)}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {formatTime(exchangeData.lastUpdated)}
                          </div>
                          {/* Show funding rate if available for this exchange */}
                          {isPerp && exchangeData.fundingRate && (
                            <div className={`text-xs font-mono ${getFundingRateColor(exchangeData.fundingRate.rate)}`}>
                              FR: {formatFundingRate(exchangeData.fundingRate.rate)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Volume */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                  <div className="technical-label">
                    VOL: {formatNumber(totalVolume, 0)}
                  </div>
                  {!isPerp && (
                    <div className="text-xs text-gray-500">
                      {currentTranslations.spot}
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