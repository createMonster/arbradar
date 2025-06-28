'use client';

import React, { useState, useMemo } from 'react';
import { ArrowUpRight, ArrowDownLeft, Route, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EnhancedSpreadData, Language, ArbitrageRoute, ExchangeData } from '../types';

interface RoutesTableProps {
  data: EnhancedSpreadData[];
  language: Language;
  isLoading?: boolean;
}

type MarketType = 'all' | 'spot' | 'perp';

export default function RoutesTable({ data, language, isLoading = false }: RoutesTableProps) {
  const [activeTab, setActiveTab] = useState<MarketType>('all');
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());

  const t = {
    en: {
      all: 'All Markets',
      spot: 'Spot',
      perp: 'Perpetual',
      symbol: 'Symbol',
      routes: 'Routes',
      bestRoute: 'Best Route',
      allRoutes: 'All Routes',
      profit: 'Net Profit',
      fees: 'Est. Fees',
      volume: 'Max Volume',
      risk: 'Risk',
      loading: 'Loading routes...',
      noData: 'No routes available',
      buyFrom: 'BUY',
      sellTo: 'SELL',
      showAllRoutes: 'Show All Routes',
      hideRoutes: 'Hide Routes',
      routesAvailable: 'routes available',
      of: 'of',
      fundingRate: 'Funding'
    },
    zh: {
      all: '全部市场',
      spot: '现货',
      perp: '永续合约',
      symbol: '交易对',
      routes: '路线',
      bestRoute: '最佳路线',
      allRoutes: '全部路线',
      profit: '净利润',
      fees: '预估费用',
      volume: '最大交易量',
      risk: '风险',
      loading: '加载路线中...',
      noData: '暂无路线',
      buyFrom: '买入',
      sellTo: '卖出',
      showAllRoutes: '显示全部路线',
      hideRoutes: '隐藏路线',
      routesAvailable: '条路线可用',
      of: '共',
      fundingRate: '资金费率'
    }
  };

  const currentTranslations = t[language];

  // Filter data by tab
  const filteredData = useMemo(() => {
    if (activeTab === 'all') return data;
    return data.filter(item => item.marketType === activeTab);
  }, [data, activeTab]);

  const tabCounts = useMemo(() => {
    const all = data.length;
    const spot = data.filter(item => item.marketType === 'spot').length;
    const perp = data.filter(item => item.marketType === 'perp').length;
    
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

  const formatPrice = (price: number): string => {
    // For crypto prices, we need more precision
    if (price < 0.01) {
      return price.toFixed(8); // 8 decimal places for very small values
    } else if (price < 1) {
      return price.toFixed(6); // 6 decimal places for values < 1
    } else if (price < 100) {
      return price.toFixed(4); // 4 decimal places for values < 100
    } else {
      return price.toFixed(2); // 2 decimal places for larger values
    }
  };

  const formatFundingRate = (rate: number): string => {
    if (!rate) return 'N/A';
    const percentage = rate * 100;
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(4)}%`;
  };

  const formatPercentage = (num: number): string => {
    return `${num >= 0 ? '+' : ''}${num.toFixed(4)}%`;
  };

  const getRiskColor = (risk: 'low' | 'medium' | 'high'): string => {
    switch (risk) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const toggleExpanded = (symbol: string) => {
    const newExpanded = new Set(expandedSymbols);
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol);
    } else {
      newExpanded.add(symbol);
    }
    setExpandedSymbols(newExpanded);
  };

  const RouteCard = ({ route, rank, symbolExchanges }: { route: ArbitrageRoute; rank: number; symbolExchanges: Record<string, ExchangeData> }) => {
    const buyExchangeFunding = symbolExchanges?.[route.buyExchange]?.fundingRate?.rate;
    const sellExchangeFunding = symbolExchanges?.[route.sellExchange]?.fundingRate?.rate;
    const hasFundingRates = buyExchangeFunding !== undefined || sellExchangeFunding !== undefined;
    
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
        {/* Header with rank and profit */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs font-bold min-w-[24px] flex items-center justify-center">
            #{rank}
          </Badge>
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-100 text-green-800 text-xs font-bold">
              {formatPercentage(route.profitability.netProfitPercentage)}
            </Badge>
            <div className={`w-2 h-2 rounded-full ${getRiskColor(route.executionConstraints.executionRisk)}`} />
          </div>
        </div>
        
        {/* Route details */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1">
            <div className="flex flex-col items-start space-y-1">
              <div className="flex items-center space-x-1 text-green-600">
                <ArrowUpRight className="w-3 h-3" />
                <span className="text-xs font-medium">{route.buyExchange}</span>
              </div>
              <div className="text-xs font-mono">${formatPrice(route.buyPrice)}</div>
              {hasFundingRates && buyExchangeFunding !== undefined && (
                <div className="text-xs text-gray-500">
                  {currentTranslations.fundingRate}: {formatFundingRate(buyExchangeFunding)}
                </div>
              )}
            </div>
            
            <div className="flex items-center px-2">
              <span className="text-gray-400 text-xs">→</span>
            </div>
            
            <div className="flex flex-col items-start space-y-1">
              <div className="flex items-center space-x-1 text-red-600">
                <ArrowDownLeft className="w-3 h-3" />
                <span className="text-xs font-medium">{route.sellExchange}</span>
              </div>
              <div className="text-xs font-mono">${formatPrice(route.sellPrice)}</div>
              {hasFundingRates && sellExchangeFunding !== undefined && (
                <div className="text-xs text-gray-500">
                  {currentTranslations.fundingRate}: {formatFundingRate(sellExchangeFunding)}
                </div>
              )}
            </div>
          </div>
          
          {/* Route stats */}
          <div className="text-right text-xs text-gray-500 space-y-1">
            <div>Vol: {formatNumber(route.executionConstraints.maxVolume)}</div>
            <div>Risk: {route.executionConstraints.executionRisk}</div>
            {route.fundingImpact && (
              <div>Fund Impact: {formatFundingRate(route.fundingImpact.netFundingImpact / 100)}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Tab Button Component
  const TabButton = ({ 
    label, 
    count, 
    isActive, 
    onClick 
  }: { 
    label: string;
    count: number;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`
        relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200
        ${isActive 
          ? 'bg-blue-500 text-white shadow-lg scale-105' 
          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
        }
        flex items-center space-x-2 min-w-[120px] justify-center
        hover:scale-105 transform focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `}
    >
      <span>{label}</span>
      <Badge 
        className={`
          ${isActive 
            ? 'bg-white/20 text-white border-white/30' 
            : 'bg-blue-500 text-white border-0'
          }
          text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] flex items-center justify-center
        `}
      >
        {count}
      </Badge>
    </button>
  );

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center space-x-3 p-6">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty State
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <Route className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {currentTranslations.noData}
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Headers */}
      <div className="flex items-center justify-center space-x-3 p-6">
        <TabButton
          label={currentTranslations.all}
          count={tabCounts.all}
          isActive={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
        />
        <TabButton
          label={currentTranslations.spot}
          count={tabCounts.spot}
          isActive={activeTab === 'spot'}
          onClick={() => setActiveTab('spot')}
        />
        <TabButton
          label={currentTranslations.perp}
          count={tabCounts.perp}
          isActive={activeTab === 'perp'}
          onClick={() => setActiveTab('perp')}
        />
      </div>

      {/* Routes List */}
      <div className="space-y-4">
        {filteredData.map((item) => {
          const isExpanded = expandedSymbols.has(item.symbol);
          
          return (
            <Card key={item.symbol} className="transition-all duration-200 hover:shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-lg font-bold">{item.symbol}</CardTitle>
                    <Badge variant={item.marketType === 'perp' ? 'default' : 'secondary'}>
                      {item.marketType.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {item.routeCount} {currentTranslations.of} {item.totalAvailableRoutes} {currentTranslations.routesAvailable}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-100 text-green-800 font-bold">
                      {formatPercentage(item.bestRoute.profitability.netProfitPercentage)}
                    </Badge>
                    {item.routes.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(item.symbol)}
                        className="flex items-center space-x-1"
                      >
                        <span className="text-xs">
                          {isExpanded ? currentTranslations.hideRoutes : currentTranslations.showAllRoutes}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Best Route (Always Visible) */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    {currentTranslations.bestRoute}
                  </h4>
                  <RouteCard route={item.bestRoute} rank={1} symbolExchanges={item.exchanges} />
                </div>

                {/* Additional Routes (Expandable) */}
                {isExpanded && item.routes.length > 1 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      {currentTranslations.allRoutes}
                    </h4>
                    <div className="space-y-2">
                      {item.routes.slice(1).map((route, index) => (
                        <RouteCard key={route.routeId} route={route} rank={index + 2} symbolExchanges={item.exchanges} />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 