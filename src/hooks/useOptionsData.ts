import { useState, useEffect, useCallback } from 'react';
import { schwabApi } from '../services/schwabApi';
import type { OptionsAnalysis, Quote } from '../types/options';

interface UseOptionsDataResult {
  data: OptionsAnalysis | null;
  quote: Quote | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOptionsData(symbol: string, autoRefresh = false, refreshInterval = 30000): UseOptionsDataResult {
  const [data, setData] = useState<OptionsAnalysis | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!symbol) {
      setError('No symbol provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [optionsData, quoteData] = await Promise.all([
        schwabApi.getOptionsChain(symbol),
        schwabApi.getQuote(symbol),
      ]);

      setData(optionsData);
      setQuote(quoteData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      console.error('Error fetching options data:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh || !symbol) return;

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, symbol, fetchData]);

  return {
    data,
    quote,
    loading,
    error,
    refetch: fetchData,
  };
}
