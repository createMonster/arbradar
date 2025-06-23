'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import FilterPanel from '@/components/FilterPanel';
import PriceTable from '@/components/PriceTable';
import { PriceRow, FilterOptions, Language } from '@/types';
import { ApiService, FilterParams } from '@/lib/apiService';

export default function Home() {
  const [language, setLanguage] = useState<Language>('en');
  const [data, setData] = useState<PriceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [filters, setFilters] = useState<FilterOptions>({
    minVolume: 0,
    minSpread: 0,
    selectedExchanges: ['Binance', 'OKX', 'Bitget', 'Bybit'],
    searchTerm: ''
  });

  // Convert FilterOptions to API FilterParams
  const getFilterParams = useCallback((): FilterParams => {
    return {
      minVolume: filters.minVolume > 0 ? filters.minVolume : undefined,
      minSpread: filters.minSpread > 0 ? filters.minSpread : undefined,
      exchanges: filters.selectedExchanges.length > 0 ? filters.selectedExchanges : undefined,
      search: filters.searchTerm || undefined
    };
  }, [filters]);

  // Fetch real data from API
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const filterParams = getFilterParams();
      const newData = await ApiService.fetchArbitrageData(filterParams);
      
      setData(newData);
      setConnectionStatus('connected');
      setIsLoading(false);
      
    } catch (error) {
      console.error('Failed to fetch arbitrage data:', error);
      setConnectionStatus('disconnected');
      setIsLoading(false);
    }
  }, [getFilterParams]);

  // Initial data load and connection test
  useEffect(() => {
    const initializeData = async () => {
      console.log('🔄 Initializing arbitrage monitor...');
      
      // Test backend connection
      const isConnected = await ApiService.testConnection();
      if (!isConnected) {
        console.warn('❌ Backend not available, using demo mode');
        setConnectionStatus('disconnected');
        setIsLoading(false);
        return;
      }
      
      // Fetch initial data
      await fetchData();
    };

    initializeData();
  }, [fetchData]);

  // Update data periodically (5 seconds as requested)
  useEffect(() => {
    if (connectionStatus !== 'connected') return;

    const interval = setInterval(() => {
      console.log('🔄 Refreshing arbitrage data...');
      fetchData();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [fetchData, connectionStatus]);

  // Refetch when filters change
  useEffect(() => {
    if (connectionStatus === 'connected') {
      fetchData();
    }
  }, [filters, fetchData, connectionStatus]);

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
          connectionStatus={connectionStatus}
        />
      </div>
    </Layout>
  );
}