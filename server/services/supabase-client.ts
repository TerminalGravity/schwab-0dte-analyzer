/**
 * Supabase Client Service
 * Handles all database operations with 30-day retention policy
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SupabaseService {
  private client: SupabaseClient;
  private isConnected: boolean = false;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_supabase_project_url') {
      console.warn('⚠️  Supabase credentials not configured - data storage disabled');
      this.client = null as any;
      this.isConnected = false;
      return;
    }

    try {
      this.client = createClient(supabaseUrl, supabaseKey);
      this.isConnected = true;
      console.log('✓ Supabase client initialized');
    } catch (error) {
      console.error('✗ Failed to initialize Supabase:', error);
      this.client = null as any;
      this.isConnected = false;
    }
  }

  /**
   * Check if Supabase is connected
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Store options quote snapshot
   */
  async storeOptionsQuote(quote: {
    symbol: string;
    optionSymbol: string;
    strikePrice: number;
    expirationDate: string;
    optionType: 'CALL' | 'PUT';
    bid: number;
    ask: number;
    last: number;
    mark: number;
    volume: number;
    openInterest: number;
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
    impliedVolatility?: number;
    underlyingPrice: number;
    daysToExpiration: number;
    inTheMoney: boolean;
  }) {
    if (!this.isConnected) return null;

    const { data, error } = await this.client
      .from('options_quotes')
      .insert({
        symbol: quote.symbol,
        option_symbol: quote.optionSymbol,
        strike_price: quote.strikePrice,
        expiration_date: quote.expirationDate,
        option_type: quote.optionType,
        bid: quote.bid,
        ask: quote.ask,
        last: quote.last,
        mark: quote.mark,
        volume: quote.volume,
        open_interest: quote.openInterest,
        delta: quote.delta,
        gamma: quote.gamma,
        theta: quote.theta,
        vega: quote.vega,
        implied_volatility: quote.impliedVolatility,
        underlying_price: quote.underlyingPrice,
        days_to_expiration: quote.daysToExpiration,
        in_the_money: quote.inTheMoney,
      });

    if (error) {
      console.error('Error storing options quote:', error);
      return null;
    }

    return data;
  }

  /**
   * Store naked position
   */
  async storeNakedPosition(position: {
    symbol: string;
    optionSymbol: string;
    strikePrice: number;
    optionType: 'CALL' | 'PUT';
    volume: number;
    openInterest: number;
    volumeOiRatio: number;
    thresholdMultiplier: number;
    bid: number;
    ask: number;
    mark: number;
    underlyingPrice: number;
  }) {
    if (!this.isConnected) return null;

    const { data, error } = await this.client
      .from('naked_positions')
      .insert({
        symbol: position.symbol,
        option_symbol: position.optionSymbol,
        strike_price: position.strikePrice,
        option_type: position.optionType,
        volume: position.volume,
        open_interest: position.openInterest,
        volume_oi_ratio: position.volumeOiRatio,
        threshold_multiplier: position.thresholdMultiplier,
        bid: position.bid,
        ask: position.ask,
        mark: position.mark,
        underlying_price: position.underlyingPrice,
      });

    if (error) {
      console.error('Error storing naked position:', error);
      return null;
    }

    return data;
  }

  /**
   * Store credit spread analysis
   */
  async storeCreditSpread(spread: {
    symbol: string;
    spreadType: 'CALL' | 'PUT';
    shortStrike: number;
    longStrike: number;
    shortOptionSymbol: string;
    longOptionSymbol: string;
    creditReceived: number;
    maxProfit: number;
    maxLoss: number;
    breakEven: number;
    riskRewardRatio: number;
    probabilityOfProfit?: number;
    deltaSpread?: number;
    aiScore?: number;
    aiConfidence?: number;
    aiReasoning?: string;
    aiModelUsed?: string;
    underlyingPrice: number;
    expirationDate: string;
    rank?: number;
  }) {
    if (!this.isConnected) return null;

    const { data, error} = await this.client
      .from('credit_spreads')
      .insert({
        symbol: spread.symbol,
        spread_type: spread.spreadType,
        short_strike: spread.shortStrike,
        long_strike: spread.longStrike,
        short_option_symbol: spread.shortOptionSymbol,
        long_option_symbol: spread.longOptionSymbol,
        credit_received: spread.creditReceived,
        max_profit: spread.maxProfit,
        max_loss: spread.maxLoss,
        break_even: spread.breakEven,
        risk_reward_ratio: spread.riskRewardRatio,
        probability_of_profit: spread.probabilityOfProfit,
        delta_spread: spread.deltaSpread,
        ai_score: spread.aiScore,
        ai_confidence: spread.aiConfidence,
        ai_reasoning: spread.aiReasoning,
        ai_model_used: spread.aiModelUsed,
        underlying_price: spread.underlyingPrice,
        expiration_date: spread.expirationDate,
        rank: spread.rank,
      });

    if (error) {
      console.error('Error storing credit spread:', error);
      return null;
    }

    return data;
  }

  /**
   * Store trade signal
   */
  async storeTradeSignal(signal: {
    symbol: string;
    optionType: 'CALL' | 'PUT';
    signalType: 'BUY' | 'SELL' | 'HOLD';
    optionSymbol: string;
    strikePrice: number;
    isAtm: boolean;
    entryPrice?: number;
    currentPrice: number;
    underlyingPrice: number;
    aiConfidence: number;
    aiReasoning: string;
    aiModelUsed: string;
    predictedDirection?: string;
    predictedMovePercent?: number;
    expiresAt?: Date;
  }) {
    if (!this.isConnected) return null;

    const { data, error } = await this.client
      .from('trade_signals')
      .insert({
        symbol: signal.symbol,
        option_type: signal.optionType,
        signal_type: signal.signalType,
        option_symbol: signal.optionSymbol,
        strike_price: signal.strikePrice,
        is_atm: signal.isAtm,
        entry_price: signal.entryPrice,
        current_price: signal.currentPrice,
        underlying_price: signal.underlyingPrice,
        ai_confidence: signal.aiConfidence,
        ai_reasoning: signal.aiReasoning,
        ai_model_used: signal.aiModelUsed,
        predicted_direction: signal.predictedDirection,
        predicted_move_percent: signal.predictedMovePercent,
        expires_at: signal.expiresAt?.toISOString(),
      });

    if (error) {
      console.error('Error storing trade signal:', error);
      return null;
    }

    return data;
  }

  /**
   * Update daily P&L
   */
  async updateDailyPnL(pnl: {
    tradingDate: string;
    symbol: string;
    strategy: string;
    totalSignals: number;
    executedTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    grossProfit: number;
    grossLoss: number;
    netPnl: number;
    bestTradePnl?: number;
    worstTradePnl?: number;
    avgTradePnl?: number;
  }) {
    if (!this.isConnected) return null;

    const { data, error } = await this.client
      .from('daily_pnl')
      .upsert({
        trading_date: pnl.tradingDate,
        symbol: pnl.symbol,
        strategy: pnl.strategy,
        total_signals: pnl.totalSignals,
        executed_trades: pnl.executedTrades,
        winning_trades: pnl.winningTrades,
        losing_trades: pnl.losingTrades,
        win_rate: pnl.winRate,
        gross_profit: pnl.grossProfit,
        gross_loss: pnl.grossLoss,
        net_pnl: pnl.netPnl,
        best_trade_pnl: pnl.bestTradePnl,
        worst_trade_pnl: pnl.worstTradePnl,
        avg_trade_pnl: pnl.avgTradePnl,
      });

    if (error) {
      console.error('Error updating daily P&L:', error);
      return null;
    }

    return data;
  }

  /**
   * Get active naked positions
   */
  async getActiveNakedPositions(symbol?: string) {
    if (!this.isConnected) return [];

    let query = this.client
      .from('active_naked_positions')
      .select('*');

    if (symbol) {
      query = query.eq('symbol', symbol);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching naked positions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get today's top credit spreads
   */
  async getTodaysTopSpreads(limit: number = 10) {
    if (!this.isConnected) return [];

    const { data, error } = await this.client
      .from('todays_top_spreads')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Error fetching top spreads:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get active trade signals
   */
  async getActiveTradeSignals(symbol?: string) {
    if (!this.isConnected) return [];

    let query = this.client
      .from('active_trade_signals')
      .select('*');

    if (symbol) {
      query = query.eq('symbol', symbol);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching trade signals:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get today's P&L summary
   */
  async getTodaysPnLSummary() {
    if (!this.isConnected) return [];

    const { data, error } = await this.client
      .from('todays_pnl_summary')
      .select('*');

    if (error) {
      console.error('Error fetching P&L summary:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Run cleanup job to delete old data
   */
  async runCleanup() {
    if (!this.isConnected) return;

    console.log('🧹 Running 30-day data cleanup...');

    const { error } = await this.client.rpc('delete_old_data');

    if (error) {
      console.error('Error running cleanup:', error);
    } else {
      console.log('✓ Cleanup completed successfully');
    }
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();
