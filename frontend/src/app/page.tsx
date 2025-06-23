'use client';

import { useState, useEffect, useCallback } from 'react';
import PriceTable from '@/components/PriceTable';
import FilterPanel from '@/components/FilterPanel';
import Layout from '@/components/Layout';
import { apiService } from '@/lib/apiService';
import { PriceRow, FilterOptions } from '@/types';

export default function Home() {
  const [data, setData] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [filters, setFilters] = useState<FilterOptions>({
    minVolume: 0,
    minSpread: 0,
    selectedExchanges: ['Binance', 'OKX', 'Bitget', 'Bybit'],
    searchTerm: ''
  });
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching data with filters:', filters);
      
      const result = await apiService.getSpreads(filters);
      
      console.log('✅ Data received:', result);
      setData(result.data);
      setLastUpdate(new Date());
      
    } catch (err) {
      console.error('❌ Error fetching data:', err);
      setError(`Failed to fetch data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Periodic updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleFilterChange = (newFilters: FilterOptions) => {
    console.log('🔧 Filters changed:', newFilters);
    setFilters(newFilters);
  };

  const handleLanguageChange = (newLanguage: 'en' | 'zh') => {
    setLanguage(newLanguage);
  };

  return (
    <Layout language={language} onLanguageChange={handleLanguageChange}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 text-white">
            Crypto Arbitrage Monitor
          </h1>
          <p className="text-gray-400">
            Real-time arbitrage opportunities across major exchanges
          </p>
          {lastUpdate && (
            <p className="text-sm text-green-400 mt-2">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>

        <FilterPanel 
          filters={filters}
          onFiltersChange={handleFilterChange}
          language={language}
        />

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-200">{error}</p>
            <button 
              onClick={fetchData}
              className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm"
            >
              Retry
            </button>
          </div>
        )}

        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <PriceTable 
            data={data} 
            filters={filters}
            language={language}
            isLoading={loading}
            connectionStatus="connected"
          />
        </div>

        {!loading && data.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              No arbitrage opportunities found with current filters
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}