import axios, { AxiosInstance } from 'axios';
import type { OptionsAnalysis, Quote, ChartData } from '../types/options';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class SchwabApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  async getOptionsChain(symbol: string, includeQuotes = true): Promise<OptionsAnalysis> {
    const response = await this.client.get(`/api/schwab/chain/${symbol}`, {
      params: { includeQuotes },
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch options chain');
    }

    return response.data.data;
  }

  async getQuote(symbol: string): Promise<Quote> {
    const response = await this.client.get(`/api/schwab/quote/${symbol}`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch quote');
    }

    return response.data.data;
  }

  async getPriceHistory(
    symbol: string,
    periodType: 'day' | 'month' | 'year' = 'day',
    period: number = 1,
    frequencyType: 'minute' | 'daily' | 'weekly' = 'minute',
    frequency: number = 1
  ): Promise<ChartData> {
    const response = await this.client.get(`/api/schwab/pricehistory/${symbol}`, {
      params: {
        periodType,
        period,
        frequencyType,
        frequency,
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch price history');
    }

    return response.data.data;
  }

  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// Export singleton instance
export const schwabApi = new SchwabApiClient();
export default schwabApi;
