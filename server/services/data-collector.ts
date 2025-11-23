/**
 * Data Collection Service
 * Polls SPY, QQQ, SPX options every 1 minute and stores in Supabase
 */

import { SchwabAuth } from '../auth';
import { supabaseService } from './supabase-client';
import type { SchwabOptionsChainResponse, OptionContract } from '../types/schwab';

const SCHWAB_API_BASE = 'https://api.schwabapi.com';
const TRACKED_SYMBOLS = (process.env.TRACKED_SYMBOLS || 'SPY,QQQ,SPX').split(',');
const POLLING_INTERVAL = parseInt(process.env.DATA_POLLING_INTERVAL || '60000'); // 1 minute
const NAKED_THRESHOLD = parseFloat(process.env.NAKED_POSITION_THRESHOLD || '1.5');

export class DataCollector {
  private auth: SchwabAuth;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.auth = new SchwabAuth();
  }

  /**
   * Fetch options chain from Schwab API
   */
  private async fetchOptionsChain(symbol: string): Promise<SchwabOptionsChainResponse | null> {
    try {
      const accessToken = await this.auth.getAccessToken();

      // Fetch 0DTE options only
      const params = new URLSearchParams({
        symbol,
        contractType: 'ALL',
        strikeCount: '50',
        includeQuotes: 'TRUE',
        strategy: 'SINGLE',
        range: 'ALL',
        daysToExpiration: '0', // 0DTE only
      });

      const endpoint = `/marketdata/v1/chains?${params.toString()}`;

      const response = await fetch(`${SCHWAB_API_BASE}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch ${symbol} options chain:`, response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${symbol} options chain:`, error);
      return null;
    }
  }

  /**
   * Extract and store options from chain
   */
  private async processOptionsChain(symbol: string, chain: SchwabOptionsChainResponse) {
    const underlyingPrice = chain.underlyingPrice;
    const expirationDate = new Date().toISOString().split('T')[0]; // Today's date for 0DTE

    // Process calls
    if (chain.callExpDateMap) {
      for (const dateMap of Object.values(chain.callExpDateMap)) {
        for (const contracts of Object.values(dateMap)) {
          for (const contract of contracts) {
            await this.storeOption(symbol, contract, underlyingPrice, expirationDate);
            await this.checkNakedPosition(symbol, contract, underlyingPrice);
          }
        }
      }
    }

    // Process puts
    if (chain.putExpDateMap) {
      for (const dateMap of Object.values(chain.putExpDateMap)) {
        for (const contracts of Object.values(dateMap)) {
          for (const contract of contracts) {
            await this.storeOption(symbol, contract, underlyingPrice, expirationDate);
            await this.checkNakedPosition(symbol, contract, underlyingPrice);
          }
        }
      }
    }
  }

  /**
   * Store individual option quote
   */
  private async storeOption(
    symbol: string,
    contract: OptionContract,
    underlyingPrice: number,
    expirationDate: string
  ) {
    await supabaseService.storeOptionsQuote({
      symbol,
      optionSymbol: contract.symbol,
      strikePrice: contract.strikePrice,
      expirationDate,
      optionType: contract.putCall,
      bid: contract.bid,
      ask: contract.ask,
      last: contract.last,
      mark: contract.mark,
      volume: contract.totalVolume,
      openInterest: contract.openInterest,
      delta: contract.delta,
      gamma: contract.gamma,
      theta: contract.theta,
      vega: contract.vega,
      impliedVolatility: contract.volatility,
      underlyingPrice,
      daysToExpiration: contract.daysToExpiration,
      inTheMoney: contract.inTheMoney,
    });
  }

  /**
   * Check if option meets naked position criteria (volume > OI * threshold)
   */
  private async checkNakedPosition(
    symbol: string,
    contract: OptionContract,
    underlyingPrice: number
  ) {
    const volume = contract.totalVolume;
    const openInterest = contract.openInterest;

    // Skip if no volume or OI
    if (volume === 0 || openInterest === 0) return;

    const volumeOiRatio = volume / openInterest;

    // Check if volume exceeds threshold
    if (volume > openInterest * NAKED_THRESHOLD) {
      console.log(
        `🎯 Naked position detected: ${symbol} ${contract.strikePrice} ${contract.putCall} ` +
        `(V:${volume} / OI:${openInterest} = ${volumeOiRatio.toFixed(2)}x)`
      );

      await supabaseService.storeNakedPosition({
        symbol,
        optionSymbol: contract.symbol,
        strikePrice: contract.strikePrice,
        optionType: contract.putCall,
        volume,
        openInterest,
        volumeOiRatio,
        thresholdMultiplier: NAKED_THRESHOLD,
        bid: contract.bid,
        ask: contract.ask,
        mark: contract.mark,
        underlyingPrice,
      });
    }
  }

  /**
   * Collect data for all tracked symbols
   */
  private async collectData() {
    console.log(`\n📊 Data collection cycle started - ${new Date().toLocaleTimeString()}`);

    for (const symbol of TRACKED_SYMBOLS) {
      console.log(`→ Fetching ${symbol} 0DTE options...`);

      const chain = await this.fetchOptionsChain(symbol.trim());

      if (chain) {
        console.log(`  ✓ ${symbol}: ${chain.numberOfContracts} contracts`);
        await this.processOptionsChain(symbol.trim(), chain);
      } else {
        console.log(`  ✗ ${symbol}: Failed to fetch`);
      }
    }

    console.log(`✓ Data collection cycle completed\n`);
  }

  /**
   * Start data collection service
   */
  start() {
    if (this.isRunning) {
      console.log('Data collector is already running');
      return;
    }

    console.log('\n🚀 Starting Data Collection Service');
    console.log(`   Symbols: ${TRACKED_SYMBOLS.join(', ')}`);
    console.log(`   Interval: ${POLLING_INTERVAL / 1000} seconds`);
    console.log(`   Naked threshold: Volume > OI * ${NAKED_THRESHOLD}`);
    console.log('');

    // Run immediately
    this.collectData();

    // Then run at intervals
    this.intervalId = setInterval(() => {
      this.collectData();
    }, POLLING_INTERVAL);

    this.isRunning = true;
  }

  /**
   * Stop data collection service
   */
  stop() {
    if (!this.isRunning || !this.intervalId) {
      console.log('Data collector is not running');
      return;
    }

    console.log('🛑 Stopping Data Collection Service');
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Get collection status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      symbols: TRACKED_SYMBOLS,
      pollingInterval: POLLING_INTERVAL,
      nakedThreshold: NAKED_THRESHOLD,
    };
  }
}

// Export singleton instance
export const dataCollector = new DataCollector();
