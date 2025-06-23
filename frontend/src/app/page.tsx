'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import FilterPanel from '@/components/FilterPanel';
import PriceTable from '@/components/PriceTable';
import { PriceRow, FilterOptions, Language } from '@/types';
import { generateMockData, updateMockData } from '@/lib/mockData';

export default function Home() {
  const [language, setLanguage] = useState<Language>('en');
  const [data, setData] = useState<PriceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    minVolume: 0,
    minSpread: 0,
    selectedExchanges: ['Binance', 'OKX', 'Bitget', 'Bybit'],
    searchTerm: ''
  });

  // Initialize mock data
  useEffect(() => {
    const initializeData = () => {
      const mockData = generateMockData();
      setData(mockData);
      setIsLoading(false);
    };

    // Initialize immediately for better UX
    initializeData();
  }, []);

  // Update data periodically
  useEffect(() => {
    if (data.length === 0) return;

    const interval = setInterval(() => {
      setData(currentData => updateMockData(currentData));
    }, 30000); // Update every 30 seconds for better UX

    return () => clearInterval(interval);
  }, [data.length]);

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
  };

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  return (
    <Layout language={language} onLanguageChange={handleLanguageChange}>
      <div className="space-y-6">
        <FilterPanel 
          filters={filters} 
          onFiltersChange={handleFiltersChange} 
          language={language} 
        />
        <PriceTable 
          data={data} 
          filters={filters} 
          language={language} 
          isLoading={isLoading}
        />
      </div>
    </Layout>
  );
}