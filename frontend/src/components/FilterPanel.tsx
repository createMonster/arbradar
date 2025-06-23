'use client';

import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FilterOptions, Language } from '../types';

interface FilterPanelProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  language: Language;
}

const exchanges = ['Binance', 'OKX', 'Bitget', 'Bybit'];

export default function FilterPanel({ filters, onFiltersChange, language }: FilterPanelProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm);

  const t = {
    en: {
      filters: 'Filters',
      search: 'Search symbols...',
      minVolume: 'Min Volume',
      minSpread: 'Min Spread %',
      exchanges: 'Exchanges',
      allExchanges: 'All Exchanges',
      clearFilters: 'Clear Filters',
      volume: 'Volume',
      spread: 'Spread'
    },
    zh: {
      filters: '筛选器',
      search: '搜索交易对...',
      minVolume: '最小交易量',
      minSpread: '最小价差 %',
      exchanges: '交易所',
      allExchanges: '所有交易所',
      clearFilters: '清除筛选',
      volume: '交易量',
      spread: '价差'
    }
  };

  const currentTranslations = t[language];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onFiltersChange({ ...filters, searchTerm: value });
  };

  const toggleExchange = (exchange: string) => {
    const selectedExchanges = filters.selectedExchanges.includes(exchange)
      ? filters.selectedExchanges.filter(e => e !== exchange)
      : [...filters.selectedExchanges, exchange];
    
    onFiltersChange({ ...filters, selectedExchanges });
  };

  const clearFilters = () => {
    setSearchTerm('');
    onFiltersChange({
      minVolume: 0,
      minSpread: 0,
      selectedExchanges: exchanges,
      searchTerm: ''
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <Card className="mb-6 technical-card">
      <CardHeader className="pb-3 technical-header">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg font-mono">
            <Filter className="mr-2 h-5 w-5" />
            {currentTranslations.filters.toUpperCase()}
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearFilters}
            className="text-sm technical-button border-gray-600 hover:bg-gray-800 hover:text-white"
          >
            <X className="mr-1 h-4 w-4" />
            {currentTranslations.clearFilters.toUpperCase()}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder={currentTranslations.search.toUpperCase()}
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent technical-input font-mono"
          />
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Min Volume */}
          <div>
            <label className="block technical-label mb-2">
              {currentTranslations.minVolume.toUpperCase()}
            </label>
            <Select 
              value={filters.minVolume.toString()} 
              onValueChange={(value) => onFiltersChange({ ...filters, minVolume: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No minimum</SelectItem>
                <SelectItem value="100000">100K+</SelectItem>
                <SelectItem value="500000">500K+</SelectItem>
                <SelectItem value="1000000">1M+</SelectItem>
                <SelectItem value="5000000">5M+</SelectItem>
                <SelectItem value="10000000">10M+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Min Spread */}
          <div>
            <label className="block technical-label mb-2">
              {currentTranslations.minSpread.toUpperCase()}
            </label>
            <Select 
              value={filters.minSpread.toString()} 
              onValueChange={(value) => onFiltersChange({ ...filters, minSpread: parseFloat(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No minimum</SelectItem>
                <SelectItem value="0.1">0.1%+</SelectItem>
                <SelectItem value="0.5">0.5%+</SelectItem>
                <SelectItem value="1">1%+</SelectItem>
                <SelectItem value="2">2%+</SelectItem>
                <SelectItem value="5">5%+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Exchange Filter */}
          <div>
            <label className="block technical-label mb-2">
              {currentTranslations.exchanges.toUpperCase()}
            </label>
            <div className="flex flex-wrap gap-2">
              {exchanges.map(exchange => (
                <Badge
                  key={exchange}
                  variant={filters.selectedExchanges.includes(exchange) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleExchange(exchange)}
                >
                  {exchange}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(filters.minVolume > 0 || filters.minSpread > 0 || filters.selectedExchanges.length < exchanges.length || filters.searchTerm) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {filters.minVolume > 0 && (
              <Badge variant="secondary">
                {currentTranslations.volume}: {formatNumber(filters.minVolume)}+
              </Badge>
            )}
            {filters.minSpread > 0 && (
              <Badge variant="secondary">
                {currentTranslations.spread}: {filters.minSpread}%+
              </Badge>
            )}
            {filters.selectedExchanges.length < exchanges.length && (
              <Badge variant="secondary">
                {filters.selectedExchanges.length} {currentTranslations.exchanges.toLowerCase()}
              </Badge>
            )}
            {filters.searchTerm && (
              <Badge variant="secondary">
                &quot;{filters.searchTerm}&quot;
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 