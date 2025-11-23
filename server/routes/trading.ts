/**
 * Trading Analysis API Routes
 * Endpoints for accessing signals, spreads, naked positions, and P&L
 */

import { Hono } from 'hono';
import { supabaseService } from '../services/supabase-client';
import { dataCollector } from '../services/data-collector';
import { pnlCalculator } from '../services/pnl-calculator';

const app = new Hono();

/**
 * GET /api/trading/status
 * Get data collection service status
 */
app.get('/status', (c) => {
  const status = dataCollector.getStatus();
  return c.json({
    success: true,
    data: status,
  });
});

/**
 * POST /api/trading/start
 * Start data collection service
 */
app.post('/start', (c) => {
  try {
    dataCollector.start();
    return c.json({
      success: true,
      message: 'Data collection service started',
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to start data collection',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/trading/stop
 * Stop data collection service
 */
app.post('/stop', (c) => {
  try {
    dataCollector.stop();
    return c.json({
      success: true,
      message: 'Data collection service stopped',
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to stop data collection',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/trading/naked-positions
 * Get active naked positions (volume > OI * 1.5)
 */
app.get('/naked-positions', async (c) => {
  try {
    const symbol = c.req.query('symbol');
    const positions = await supabaseService.getActiveNakedPositions(symbol);

    return c.json({
      success: true,
      data: positions,
      count: positions.length,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to fetch naked positions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/trading/credit-spreads
 * Get today's top credit spreads for SPX
 */
app.get('/credit-spreads', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    const spreads = await supabaseService.getTodaysTopSpreads(limit);

    return c.json({
      success: true,
      data: spreads,
      count: spreads.length,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to fetch credit spreads',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/trading/signals
 * Get active trade signals for SPY/QQQ
 */
app.get('/signals', async (c) => {
  try {
    const symbol = c.req.query('symbol');
    const signals = await supabaseService.getActiveTradeSignals(symbol);

    return c.json({
      success: true,
      data: signals,
      count: signals.length,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to fetch trade signals',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/trading/pnl
 * Get today's P&L summary
 */
app.get('/pnl', async (c) => {
  try {
    const summary = await supabaseService.getTodaysPnLSummary();

    return c.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to fetch P&L summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/trading/pnl/calculate
 * Manually trigger P&L calculation for today
 */
app.post('/pnl/calculate', async (c) => {
  try {
    const results = await pnlCalculator.calculateTodaysPnL();

    return c.json({
      success: true,
      data: results,
      message: 'P&L calculation completed',
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to calculate P&L',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/trading/signals/:id/outcome
 * Update a trade signal with actual outcome
 */
app.post('/signals/:id/outcome', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    const { outcome, profitLoss } = body;

    if (!outcome || profitLoss === undefined) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: outcome, profitLoss',
        },
        400
      );
    }

    const result = await pnlCalculator.updateTradeOutcome(id, outcome, profitLoss);

    return c.json({
      success: true,
      data: result,
      message: 'Trade outcome updated',
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to update trade outcome',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/trading/dashboard
 * Get comprehensive dashboard data
 */
app.get('/dashboard', async (c) => {
  try {
    const [nakedPositions, creditSpreads, signals, pnl] = await Promise.all([
      supabaseService.getActiveNakedPositions(),
      supabaseService.getTodaysTopSpreads(5),
      supabaseService.getActiveTradeSignals(),
      supabaseService.getTodaysPnLSummary(),
    ]);

    return c.json({
      success: true,
      data: {
        nakedPositions: {
          count: nakedPositions.length,
          positions: nakedPositions.slice(0, 10),
        },
        creditSpreads: {
          count: creditSpreads.length,
          top5: creditSpreads,
        },
        signals: {
          count: signals.length,
          active: signals,
        },
        pnl: {
          summary: pnl,
          totalPnL: pnl.reduce((sum: number, item: any) => sum + (item.total_pnl || 0), 0),
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to fetch dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
