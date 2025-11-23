/**
 * P&L Calculator
 * Tracks and calculates daily profit/loss for all strategies
 */

import { supabaseService } from './supabase-client';
import { createClient } from '@supabase/supabase-js';

export class PnLCalculator {
  private supabase: any;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

    if (supabaseUrl && supabaseKey && supabaseUrl !== 'your_supabase_project_url') {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
      } catch (error) {
        console.error('Failed to initialize Supabase in PnLCalculator:', error);
        this.supabase = null;
      }
    }
  }

  /**
   * Calculate P&L for a specific strategy and date
   */
  async calculateStrategyPnL(
    symbol: string,
    strategy: 'naked_positions' | 'credit_spreads' | 'atm_trades',
    tradingDate: string
  ) {
    if (!this.supabase) {
      console.warn('Supabase not configured, skipping P&L calculation');
      return null;
    }

    let data: any[] = [];

    try {
      // Get relevant signals for the strategy
      if (strategy === 'atm_trades') {
        const { data: signals } = await this.supabase
          .from('trade_signals')
          .select('*')
          .eq('symbol', symbol)
          .gte('generated_at', `${tradingDate}T00:00:00`)
          .lte('generated_at', `${tradingDate}T23:59:59`)
          .eq('executed', true);

        data = signals || [];
      }

      // Calculate metrics
      const totalSignals = data.length;
      const executedTrades = data.filter(d => d.executed || d.profit_loss !== null).length;
      const winningTrades = data.filter(d => (d.profit_loss || 0) > 0).length;
      const losingTrades = data.filter(d => (d.profit_loss || 0) < 0).length;
      const winRate = executedTrades > 0 ? (winningTrades / executedTrades) * 100 : 0;

      const grossProfit = data
        .filter(d => (d.profit_loss || 0) > 0)
        .reduce((sum, d) => sum + (d.profit_loss || 0), 0);

      const grossLoss = Math.abs(
        data
          .filter(d => (d.profit_loss || 0) < 0)
          .reduce((sum, d) => sum + (d.profit_loss || 0), 0)
      );

      const netPnl = grossProfit - grossLoss;

      const pnls = data.map(d => d.profit_loss || 0).filter(p => p !== 0);
      const bestTradePnl = pnls.length > 0 ? Math.max(...pnls) : 0;
      const worstTradePnl = pnls.length > 0 ? Math.min(...pnls) : 0;
      const avgTradePnl = pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0;

      // Update database
      await supabaseService.updateDailyPnL({
        tradingDate,
        symbol,
        strategy,
        totalSignals,
        executedTrades,
        winningTrades,
        losingTrades,
        winRate,
        grossProfit,
        grossLoss,
        netPnl,
        bestTradePnl,
        worstTradePnl,
        avgTradePnl,
      });

      return {
        tradingDate,
        symbol,
        strategy,
        totalSignals,
        executedTrades,
        winningTrades,
        losingTrades,
        winRate,
        grossProfit,
        grossLoss,
        netPnl,
        bestTradePnl,
        worstTradePnl,
        avgTradePnl,
      };
    } catch (error) {
      console.error(`Error calculating P&L for ${symbol} ${strategy}:`, error);
      return null;
    }
  }

  /**
   * Calculate today's P&L for all strategies
   */
  async calculateTodaysPnL() {
    const today = new Date().toISOString().split('T')[0];
    const symbols = ['SPY', 'QQQ', 'SPX'];
    const strategies = ['naked_positions', 'credit_spreads', 'atm_trades'];

    console.log(`\n📊 Calculating P&L for ${today}...`);

    const results = [];

    for (const symbol of symbols) {
      for (const strategy of strategies) {
        // Skip incompatible combinations
        if (symbol === 'SPX' && strategy === 'atm_trades') continue;
        if ((symbol === 'SPY' || symbol === 'QQQ') && strategy === 'credit_spreads') continue;

        const pnl = await this.calculateStrategyPnL(symbol, strategy as any, today);
        if (pnl) {
          results.push(pnl);
          console.log(`  ${symbol} ${strategy}: $${pnl.netPnl.toFixed(2)}`);
        }
      }
    }

    console.log(`✓ P&L calculation complete\n`);

    return results;
  }

  /**
   * Update a trade signal with actual outcome
   */
  async updateTradeOutcome(
    signalId: number,
    outcome: 'WIN' | 'LOSS' | 'BREAK_EVEN',
    profitLoss: number
  ) {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('trade_signals')
      .update({
        executed: true,
        actual_outcome: outcome,
        profit_loss: profitLoss,
      })
      .eq('id', signalId);

    if (error) {
      console.error('Error updating trade outcome:', error);
      return null;
    }

    return data;
  }
}

// Export singleton instance
export const pnlCalculator = new PnLCalculator();
