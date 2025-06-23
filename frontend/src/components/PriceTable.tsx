'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Clock, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    if (percentage >= 2) return 'text-green-600 font-semibold';
    if (percentage >= 1) return 'text-green-500';
    if (percentage >= 0.5) return 'text-yellow-600';
    return 'text-gray-500';
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Price Arbitrage Opportunities ({filteredData.length})</span>
          <Badge variant="outline" className="ml-2">
            <Clock className="mr-1 h-3 w-3" />
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px]">{currentTranslations.symbol}</TableHead>
                {exchanges.map(exchange => (
                  <TableHead key={exchange} className="text-center min-w-[120px]">
                    {exchange}
                    <div className="text-xs text-muted-foreground">{currentTranslations.price}</div>
                  </TableHead>
                ))}
                <TableHead className="text-center min-w-[120px]">
                  {currentTranslations.spread}
                  <div className="text-xs text-muted-foreground">%</div>
                </TableHead>
                <TableHead className="text-center min-w-[140px]">
                  {currentTranslations.bestBuy} / {currentTranslations.bestSell}
                </TableHead>
                {language === 'en' && (
                  <TableHead className="text-center min-w-[120px]">
                    {currentTranslations.fundingRate}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row, index) => (
                <TableRow key={row.symbol} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{row.symbol}</span>
                      <span className="text-xs text-muted-foreground">
                        Vol: {formatNumber(Object.values(row.exchanges).reduce((sum, ex) => sum + ex.volume, 0), 0)}
                      </span>
                    </div>
                  </TableCell>
                  
                  {exchanges.map(exchange => {
                    const exchangeData = row.exchanges[exchange];
                    if (!exchangeData) {
                      return <TableCell key={exchange} className="text-center text-muted-foreground">-</TableCell>;
                    }
                    
                    const isLowest = row.spread.bestBuy === exchange;
                    const isHighest = row.spread.bestSell === exchange;
                    
                    return (
                      <TableCell key={exchange} className="text-center">
                        <div className="flex flex-col">
                          <span className={`font-mono ${
                            isLowest ? 'text-green-600 font-semibold' : 
                            isHighest ? 'text-red-600 font-semibold' : ''
                          }`}>
                            ${formatNumber(exchangeData.price, exchangeData.price > 1 ? 2 : 4)}
                            {isLowest && <TrendingDown className="inline ml-1 h-3 w-3" />}
                            {isHighest && <TrendingUp className="inline ml-1 h-3 w-3" />}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(exchangeData.lastUpdated)}
                          </span>
                        </div>
                      </TableCell>
                    );
                  })}
                  
                  <TableCell className="text-center">
                    <div className="flex flex-col">
                      <span className={`font-mono ${getSpreadColor(row.spread.percentage)}`}>
                        {formatPercentage(row.spread.percentage)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ${formatNumber(row.spread.absolute, 4)}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <div className="flex flex-col space-y-1">
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        Buy: {row.spread.bestBuy}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                        Sell: {row.spread.bestSell}
                      </Badge>
                    </div>
                  </TableCell>
                  
                  {language === 'en' && (
                    <TableCell className="text-center">
                      {row.fundingRate ? (
                        <div className="flex flex-col">
                          <span className={`font-mono text-sm ${
                            row.fundingRate.rate >= 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatPercentage(row.fundingRate.rate * 100)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {row.fundingRate.exchange}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 