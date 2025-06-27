'use client';

import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center text-lg font-semibold text-primary-solid">
          <Filter className="mr-2 h-5 w-5" />
          {currentTranslations.filters}
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={clearFilters}
          className="italian-button-secondary text-sm"
        >
          <X className="mr-1 h-4 w-4" />
          {currentTranslations.clearFilters}
        </Button>
      </div>
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-italian-sky-500 h-4 w-4" />
          <input
            type="text"
            placeholder={currentTranslations.search}
            value={searchTerm}
            onChange={handleSearchChange}
            className="italian-input w-full pl-10 pr-4"
          />
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Min Volume */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {currentTranslations.minVolume}
            </label>
            <Select 
              value={filters.minVolume.toString()} 
              onValueChange={(value) => onFiltersChange({ ...filters, minVolume: parseInt(value) })}
            >
              <SelectTrigger className="italian-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="italian-card border-0">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {currentTranslations.minSpread}
            </label>
            <Select 
              value={filters.minSpread.toString()} 
              onValueChange={(value) => onFiltersChange({ ...filters, minSpread: parseFloat(value) })}
            >
              <SelectTrigger className="italian-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="italian-card border-0">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {currentTranslations.exchanges}
            </label>
            <div className="flex flex-wrap gap-2">
              {exchanges.map(exchange => (
                <Badge
                  key={exchange}
                  variant={filters.selectedExchanges.includes(exchange) ? "default" : "outline"}
                  className={`cursor-pointer transition-italian ${
                    filters.selectedExchanges.includes(exchange) 
                      ? 'bg-italian-sky-500 text-white hover:bg-italian-sky-600'
                      : 'border-italian-sky-300 text-italian-sky-600 hover:bg-italian-sky-50 dark:border-italian-sky-700 dark:text-italian-sky-400 dark:hover:bg-italian-sky-900'
                  }`}
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
          <div className="flex flex-wrap gap-2 pt-2 border-t border-italian-lemon-200 dark:border-gray-700">
            {filters.minVolume > 0 && (
              <Badge variant="secondary" className="bg-italian-lemon-100 text-italian-lemon-800 dark:bg-italian-lemon-900 dark:text-italian-lemon-200">
                {currentTranslations.volume}: {formatNumber(filters.minVolume)}+
              </Badge>
            )}
            {filters.minSpread > 0 && (
              <Badge variant="secondary" className="bg-italian-sky-100 text-italian-sky-800 dark:bg-italian-sky-900 dark:text-italian-sky-200">
                {currentTranslations.spread}: {filters.minSpread}%+
              </Badge>
            )}
            {filters.selectedExchanges.length < exchanges.length && (
              <Badge variant="secondary" className="bg-italian-sunset-100 text-italian-sunset-800 dark:bg-italian-sunset-900 dark:text-italian-sunset-200">
                {filters.selectedExchanges.length} {currentTranslations.exchanges.toLowerCase()}
              </Badge>
            )}
            {filters.searchTerm && (
              <Badge variant="secondary" className="bg-italian-sage-100 text-italian-sage-800 dark:bg-italian-sage-900 dark:text-italian-sage-200">
                &quot;{filters.searchTerm}&quot;
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 