'use client';

import { useState, useEffect, useCallback } from 'react';
import RoutesTable from '@/components/RoutesTable';
import FilterPanel from '@/components/FilterPanel';
import Layout from '@/components/Layout';
import { apiService } from '@/lib/apiService';
import { FilterOptions, EnhancedSpreadData } from '@/types';
import { TrendingUp, Activity } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState<EnhancedSpreadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [filters, setFilters] = useState<FilterOptions>({
    minVolume: 0,
    minSpread: 0,
    selectedExchanges: [], // Start with all exchanges
    searchTerm: ''
  });
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('checking');
      
      console.log('🔄 Fetching routes data with filters:', filters);
      
      const result = await apiService.getRoutes(filters);
      
      console.log('✅ Routes data received:', result);
      setData(result.data);
      setLastUpdate(new Date());
      setConnectionStatus('connected');
      
    } catch (err) {
      console.error('❌ Error fetching routes data:', err);
      setError(`Failed to fetch routes data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Periodic updates every 50 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 50000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleFilterChange = (newFilters: FilterOptions) => {
    console.log('🔧 Filters changed:', newFilters);
    setFilters(newFilters);
  };

  const handleLanguageChange = (newLanguage: 'en' | 'zh') => {
    setLanguage(newLanguage);
  };

  const t = {
    en: {
      hero: 'Crypto Arbitrage',
      heroHighlight: 'Reimagined',
      subtitle: 'Real-time opportunities across exchanges',
      getStarted: 'Refresh Data',
      lastUpdate: 'Last updated',
      opportunities: 'Opportunities Found',
      noData: 'No arbitrage opportunities found with current filters'
    },
    zh: {
      hero: '加密货币套利',
      heroHighlight: '重新定义',
      subtitle: '实时跨交易所机会',
      getStarted: '刷新数据',
      lastUpdate: '最后更新',
      opportunities: '发现机会',
      noData: '当前过滤条件下未发现套利机会'
    }
  };

  const currentTranslations = t[language];

  return (
    <Layout language={language} onLanguageChange={handleLanguageChange}>
      {/* Compact Hero Section */}
      <section className="py-12 px-6 bg-gradient-to-br from-italian-lemon-50 via-white to-italian-sky-50 dark:from-gray-900 dark:via-gray-900 dark:to-italian-sky-900/20">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="space-y-3">
              <h1 className="italian-hero">
                {currentTranslations.hero}{' '}
                <span className="text-accent-solid">
                  {currentTranslations.heroHighlight}
                </span>
              </h1>
              <p className="italian-subtext max-w-xl mx-auto">
                {currentTranslations.subtitle}
              </p>
            </div>
            
            <button 
              onClick={fetchData}
              className="italian-button px-6 py-3 text-base font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-italian float-element"
            >
              <Activity className="mr-2 h-4 w-4" />
              {currentTranslations.getStarted}
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="container mx-auto px-6">
          {/* Status Bar */}
          <div className="italian-card p-6 mb-6 transition-italian">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className={`flex items-center space-x-2 ${
                  connectionStatus === 'connected' ? 'status-online' : 
                  connectionStatus === 'disconnected' ? 'status-offline' : 'status-checking'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-italian-sage-500 animate-pulse' :
                    connectionStatus === 'disconnected' ? 'bg-italian-coral-500' : 'bg-italian-sunset-500'
                  }`} />
                  <span className="text-sm font-medium">
                    {connectionStatus === 'connected' ? 'Connected' : 
                     connectionStatus === 'disconnected' ? 'Disconnected' : 'Checking...'}
                  </span>
                </div>
                
                {data.length > 0 && (
                  <div className="flex items-center space-x-2 text-italian-sky-500">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {data.length} {currentTranslations.opportunities}
                    </span>
                  </div>
                )}
              </div>
              
              {lastUpdate && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentTranslations.lastUpdate}: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="italian-card p-6 mb-6 transition-italian">
            <FilterPanel 
              filters={filters}
              onFiltersChange={handleFilterChange}
              language={language}
            />
          </div>

          {/* Error State */}
          {error && (
            <div className="italian-card p-6 mb-6 border-l-4 border-italian-coral-500 transition-italian">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-italian-coral-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs">!</span>
                </div>
                <div className="space-y-2">
                  <p className="text-italian-coral-500 font-medium">{error}</p>
                  <button 
                    onClick={fetchData}
                    className="italian-button-secondary px-4 py-2 text-sm transition-italian"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Routes Table */}
          <div className="italian-card overflow-hidden transition-italian">
            <RoutesTable 
              data={data} 
              language={language}
              isLoading={loading}
            />
          </div>

          {/* Empty State */}
          {!loading && data.length === 0 && !error && (
            <div className="apple-card p-16 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Opportunities
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                {currentTranslations.noData}
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}