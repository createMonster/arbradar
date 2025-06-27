'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useMemo } from 'react';
import { Clock, TrendingUp, TrendingDown, Zap, ArrowUpRight, ArrowDownLeft, Activity } from 'lucide-react';
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

type MarketType = 'all' | 'spot' | 'perp';

export default function PriceTable({ data, filters, language, isLoading = false, connectionStatus = 'checking' }: PriceTableProps) {
  const [activeTab, setActiveTab] = useState<MarketType>('all');

  const t = {
    en: {
      all: 'All Markets',
      spot: 'Spot',
      perp: 'Perpetual',
      symbol: 'Symbol',
      spread: 'Spread',
      bestBuy: 'Best Buy',
      bestSell: 'Best Sell',
      fundingRate: 'Funding Rate',
      volume: 'Volume',
      loading: 'Loading market data...',
      noData: 'No opportunities available',
      buyFrom: 'BUY FROM',
      sellTo: 'SELL TO',
      nextFunding: 'Next Funding',
      annually: 'annually',
      opportunities: 'opportunities',
      found: 'found'
    },
    zh: {
      all: '全部市场',
      spot: '现货',
      perp: '永续合约',
      symbol: '交易对',
      spread: '价差',
      bestBuy: '最佳买入',
      bestSell: '最佳卖出',
      fundingRate: '资金费率',
      volume: '交易量',
      loading: '加载市场数据中...',
      noData: '暂无机会',
      buyFrom: '买入交易所',
      sellTo: '卖出交易所',
      nextFunding: '下次资金费率',
      annually: '年化',
      opportunities: '机会',
      found: '发现'
    }
  };

  const currentTranslations = t[language];

  // Helper function to determine market type
  const getMarketType = (symbol: string): 'spot' | 'perp' => {
    return symbol.includes(':') || symbol.includes('PERP') || symbol.includes('PERPETUAL') ? 'perp' : 'spot';
  };

  // Filter data by tab
  const filteredData = useMemo(() => {
    if (activeTab === 'all') return data;
    return data.filter(row => {
      const marketType = row.marketType || getMarketType(row.symbol);
      return marketType === activeTab;
    });
  }, [data, activeTab]);

  const tabCounts = useMemo(() => {
    const all = data.length;
    const spot = data.filter(row => {
      const marketType = row.marketType || getMarketType(row.symbol);
      return marketType === 'spot';
    }).length;
    const perp = data.filter(row => {
      const marketType = row.marketType || getMarketType(row.symbol);
      return marketType === 'perp';
    }).length;
    
    return { all, spot, perp };
  }, [data]);

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

  const formatFundingRate = (rate: number): string => {
    const percentage = rate * 100;
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(4)}%`;
  };

  const formatNextFunding = (timestamp: number): string => {
    const now = Date.now();
    const diff = timestamp - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Steve Jobs-inspired Tab Component
  const TabButton = ({ 
    type, 
    label, 
    count, 
    isActive, 
    onClick 
  }: { 
    type: MarketType;
    label: string;
    count: number;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
              className={`
        relative px-6 py-3 rounded-xl font-semibold text-sm transition-italian
        ${isActive 
          ? 'bg-italian-sky-500 text-white shadow-lg scale-105' 
          : 'bg-white/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 border border-italian-lemon-200/50 dark:border-gray-700'
        }
        flex items-center space-x-2 min-w-[120px] justify-center
        active:scale-95 hover:scale-105 transform
        focus:outline-none focus:ring-2 focus:ring-italian-sky-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900
      `}
    >
      <span>{label}</span>
      <Badge 
        className={`
          ${isActive 
            ? 'bg-white/20 text-white border-white/30' 
            : 'bg-italian-sunset-500 text-white border-0'
          }
          text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] flex items-center justify-center transition-italian
        `}
      >
        {count}
      </Badge>
      
      {/* Active indicator */}
      {isActive && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-italian-sunset-400 rounded-full shadow-md" />
      )}
    </button>
  );

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Tab Headers */}
        <div className="flex items-center justify-center space-x-3 p-6">
          <div className="h-12 w-32 bg-italian-lemon-200 dark:bg-gray-700 rounded-xl loading-shimmer" />
          <div className="h-12 w-32 bg-italian-sky-200 dark:bg-gray-700 rounded-xl loading-shimmer" />
          <div className="h-12 w-32 bg-italian-sunset-200 dark:bg-gray-700 rounded-xl loading-shimmer" />
        </div>
        
        {/* Loading Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="italian-card p-6 space-y-4">
              <div className="h-6 bg-italian-lemon-200 dark:bg-gray-700 rounded-lg loading-shimmer" />
              <div className="h-4 bg-italian-sky-200 dark:bg-gray-700 rounded loading-shimmer" />
              <div className="h-16 bg-italian-sunset-200 dark:bg-gray-700 rounded-lg loading-shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty State
  if (data.length === 0) {
    return (
      <div className="space-y-6">
        {/* Tab Headers */}
        <div className="flex items-center justify-center space-x-3 p-6">
          <TabButton
            type="all"
            label={currentTranslations.all}
            count={0}
            isActive={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
          />
          <TabButton
            type="spot"
            label={currentTranslations.spot}
            count={0}
            isActive={activeTab === 'spot'}
            onClick={() => setActiveTab('spot')}
          />
          <TabButton
            type="perp"
            label={currentTranslations.perp}
            count={0}
            isActive={activeTab === 'perp'}
            onClick={() => setActiveTab('perp')}
          />
        </div>
        
        {/* Empty State */}
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-italian-lemon-100 dark:bg-gray-700 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Activity className="w-10 h-10 text-italian-sky-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {currentTranslations.noData}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {currentTranslations.loading}
          </p>
        </div>
      </div>
    );
  }

  // Sort filtered data by spread percentage
  const sortedData = [...filteredData].sort((a, b) => b.spread.percentage - a.spread.percentage);

  return (
    <div className="space-y-8">
      {/* Italian Summer Tab Navigation */}
      <div className="flex items-center justify-center space-x-4 p-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl border border-italian-lemon-200/30 dark:border-gray-700/50">
        <TabButton
          type="all"
          label={currentTranslations.all}
          count={tabCounts.all}
          isActive={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
        />
        <TabButton
          type="spot"
          label={currentTranslations.spot}
          count={tabCounts.spot}
          isActive={activeTab === 'spot'}
          onClick={() => setActiveTab('spot')}
        />
        <TabButton
          type="perp"
          label={currentTranslations.perp}
          count={tabCounts.perp}
          isActive={activeTab === 'perp'}
          onClick={() => setActiveTab('perp')}
        />
      </div>

      {/* Results Summary */}
      <div className="text-center">
        <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
          <span className="text-gray-900 dark:text-white font-bold">{sortedData.length}</span> {currentTranslations.opportunities} {currentTranslations.found}
        </p>
      </div>

      {/* Opportunities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedData.map((row) => {
          const bestBuyExchange = row.exchanges[row.spread.bestBuy];
          const bestSellExchange = row.exchanges[row.spread.bestSell];
          const marketType = row.marketType || getMarketType(row.symbol);
          const isPerp = marketType === 'perp';
          
          return (
            <div 
              key={row.symbol} 
              className="italian-card p-6 space-y-6 hover:scale-105 transition-italian cursor-pointer group"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white font-sf">
                    {row.symbol.replace(':USDT', '').replace('/USDT', '')}
                  </h3>
                  <Badge 
                    className={`
                      text-xs font-semibold px-3 py-1 rounded-full
                      ${isPerp 
                        ? 'bg-gray-700 text-white border border-gray-600' 
                        : 'bg-gray-600 text-white border border-gray-500'
                      }
                    `}
                  >
                    {isPerp ? currentTranslations.perp : currentTranslations.spot}
                  </Badge>
                </div>
                
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {row.spread.percentage.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    ${row.spread.absolute.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Buy/Sell Actions */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-italian-sage-50 dark:bg-italian-sage-900/20 p-4 rounded-xl border border-italian-sage-200/50 dark:border-italian-sage-700 transition-italian hover:bg-italian-sage-100 dark:hover:bg-italian-sage-800/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <ArrowDownLeft className="w-4 h-4 text-italian-sage-600 dark:text-italian-sage-400" />
                    <span className="text-xs font-semibold text-italian-sage-600 dark:text-italian-sage-400 uppercase tracking-wider">
                      {currentTranslations.buyFrom}
                    </span>
                  </div>
                  <div className="font-bold text-italian-sage-900 dark:text-italian-sage-100 mb-1">
                    {row.spread.bestBuy}
                  </div>
                  <div className="text-lg font-bold font-sf text-italian-sage-800 dark:text-italian-sage-200">
                    ${bestBuyExchange?.price.toFixed(bestBuyExchange.price > 1 ? 2 : 6)}
                  </div>
                </div>
                
                <div className="bg-italian-sky-50 dark:bg-italian-sky-900/20 p-4 rounded-xl border border-italian-sky-200/50 dark:border-italian-sky-700 transition-italian hover:bg-italian-sky-100 dark:hover:bg-italian-sky-800/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <ArrowUpRight className="w-4 h-4 text-italian-sky-600 dark:text-italian-sky-400" />
                    <span className="text-xs font-semibold text-italian-sky-600 dark:text-italian-sky-400 uppercase tracking-wider">
                      {currentTranslations.sellTo}
                    </span>
                  </div>
                  <div className="font-bold text-italian-sky-900 dark:text-italian-sky-100 mb-1">
                    {row.spread.bestSell}
                  </div>
                  <div className="text-lg font-bold font-sf text-italian-sky-800 dark:text-italian-sky-200">
                    ${bestSellExchange?.price.toFixed(bestSellExchange.price > 1 ? 2 : 6)}
                  </div>
                </div>
              </div>

              {/* Funding Rate Section for Perp */}
              {isPerp && (bestBuyExchange?.fundingRate || bestSellExchange?.fundingRate) && (
                <div className="bg-italian-sunset-50 dark:bg-italian-sunset-900/20 p-4 rounded-xl border border-italian-sunset-200/50 dark:border-italian-sunset-700 transition-italian hover:bg-italian-sunset-100 dark:hover:bg-italian-sunset-800/30">
                  <div className="flex items-center space-x-2 mb-3">
                    <Zap className="w-4 h-4 text-italian-sunset-600 dark:text-italian-sunset-400" />
                    <span className="text-xs font-semibold text-italian-sunset-600 dark:text-italian-sunset-400 uppercase tracking-wider">
                      {currentTranslations.fundingRate}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {bestBuyExchange?.fundingRate && (
                      <div>
                        <div className="text-xs text-italian-sunset-500 dark:text-italian-sunset-400 mb-1">
                          {row.spread.bestBuy}
                        </div>
                        <div className="font-bold text-italian-sunset-800 dark:text-italian-sunset-200">
                          {formatFundingRate(bestBuyExchange.fundingRate.rate)}
                        </div>
                      </div>
                    )}
                    
                    {bestSellExchange?.fundingRate && (
                      <div>
                        <div className="text-xs text-italian-sunset-500 dark:text-italian-sunset-400 mb-1">
                          {row.spread.bestSell}
                        </div>
                        <div className="font-bold text-italian-sunset-800 dark:text-italian-sunset-200">
                          {formatFundingRate(bestSellExchange.fundingRate.rate)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {bestBuyExchange?.fundingRate?.nextTime && (
                    <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-italian-sunset-200/50 dark:border-italian-sunset-700">
                      <Clock className="w-3 h-3 text-italian-sunset-400" />
                      <span className="text-xs text-italian-sunset-500 dark:text-italian-sunset-400">
                        {currentTranslations.nextFunding}: {formatNextFunding(bestBuyExchange.fundingRate.nextTime)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No Results for Current Tab */}
      {sortedData.length === 0 && data.length > 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
            {activeTab === 'spot' ? (
              <TrendingUp className="w-10 h-10 text-gray-400" />
            ) : (
              <Zap className="w-10 h-10 text-gray-400" />
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No {activeTab === 'spot' ? currentTranslations.spot : currentTranslations.perp} Opportunities
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try switching to a different market type or adjusting your filters
          </p>
        </div>
      )}
    </div>
  );
} 