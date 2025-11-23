import { Hono } from 'hono';
import { SchwabAuth } from '../auth';
import type {
  SchwabOptionsChainResponse,
  SchwabQuoteResponse,
  SchwabPriceHistoryResponse,
  OptionContract as SchwabOptionContract,
} from '../types/schwab';

const app = new Hono();
const auth = new SchwabAuth();

const SCHWAB_API_BASE = 'https://api.schwabapi.com';

/**
 * Helper function to make authenticated requests to Schwab API
 */
async function schwabApiRequest<T>(endpoint: string): Promise<T> {
  const accessToken = await auth.getAccessToken();

  const response = await fetch(`${SCHWAB_API_BASE}${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Schwab API Error (${response.status}):`, errorText);
    throw new Error(`Schwab API request failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Calculate max pain level from options chain
 */
function calculateMaxPain(
  calls: SchwabOptionContract[],
  puts: SchwabOptionContract[]
): number {
  const strikeMap = new Map<number, { callOI: number; putOI: number }>();

  // Aggregate open interest by strike
  for (const call of calls) {
    const existing = strikeMap.get(call.strikePrice) || { callOI: 0, putOI: 0 };
    existing.callOI += call.openInterest;
    strikeMap.set(call.strikePrice, existing);
  }

  for (const put of puts) {
    const existing = strikeMap.get(put.strikePrice) || { callOI: 0, putOI: 0 };
    existing.putOI += put.openInterest;
    strikeMap.set(put.strikePrice, existing);
  }

  // Calculate pain at each strike
  let maxPainStrike = 0;
  let minPain = Infinity;

  for (const [strike, { callOI, putOI }] of strikeMap.entries()) {
    let pain = 0;

    // Calculate total pain if price settles at this strike
    for (const [otherStrike, { callOI: otherCallOI, putOI: otherPutOI }] of strikeMap.entries()) {
      // Calls lose money if strike < settlement price
      if (otherStrike < strike) {
        pain += otherCallOI * (strike - otherStrike) * 100;
      }
      // Puts lose money if strike > settlement price
      if (otherStrike > strike) {
        pain += otherPutOI * (otherStrike - strike) * 100;
      }
    }

    if (pain < minPain) {
      minPain = pain;
      maxPainStrike = strike;
    }
  }

  return maxPainStrike;
}

/**
 * Transform Schwab option contract to frontend format
 */
function transformOptionContract(contract: SchwabOptionContract) {
  return {
    putCall: contract.putCall,
    symbol: contract.symbol,
    description: contract.description,
    bid: contract.bid,
    ask: contract.ask,
    last: contract.last,
    mark: contract.mark,
    totalVolume: contract.totalVolume,
    openInterest: contract.openInterest,
    delta: contract.delta,
    gamma: contract.gamma,
    theta: contract.theta,
    vega: contract.vega,
    strikePrice: contract.strikePrice,
    expirationDate: new Date(contract.expirationDate).toISOString(),
    daysToExpiration: contract.daysToExpiration,
    inTheMoney: contract.inTheMoney,
    impliedVolatility: contract.volatility,
    percentChange: contract.percentChange,
  };
}

/**
 * GET /api/schwab/chain/:symbol
 * Get options chain for a symbol
 */
app.get('/chain/:symbol', async (c) => {
  try {
    const symbol = c.req.param('symbol').toUpperCase();

    // Get query parameters
    const contractType = c.req.query('contractType') || 'ALL';
    const strikeCount = c.req.query('strikeCount') || '25';
    const includeQuotes = c.req.query('includeQuotes') || 'TRUE';
    const strategy = c.req.query('strategy') || 'SINGLE';
    const range = c.req.query('range') || 'ALL';
    const fromDate = c.req.query('fromDate');
    const toDate = c.req.query('toDate');
    const daysToExpiration = c.req.query('daysToExpiration') || '0';

    // Build query string
    const params = new URLSearchParams({
      symbol,
      contractType,
      strikeCount,
      includeQuotes,
      strategy,
      range,
      daysToExpiration,
    });

    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);

    const endpoint = `/marketdata/v1/chains?${params.toString()}`;
    console.log(`→ Fetching options chain for ${symbol}`);

    const schwabData = await schwabApiRequest<SchwabOptionsChainResponse>(endpoint);

    console.log(`✓ Options chain retrieved: ${schwabData.numberOfContracts} contracts`);

    // Extract and transform options
    const calls: SchwabOptionContract[] = [];
    const puts: SchwabOptionContract[] = [];

    if (schwabData.callExpDateMap) {
      for (const dateMap of Object.values(schwabData.callExpDateMap)) {
        for (const contracts of Object.values(dateMap)) {
          calls.push(...contracts);
        }
      }
    }

    if (schwabData.putExpDateMap) {
      for (const dateMap of Object.values(schwabData.putExpDateMap)) {
        for (const contracts of Object.values(dateMap)) {
          puts.push(...contracts);
        }
      }
    }

    // Calculate metrics
    const totalCallVolume = calls.reduce((sum, c) => sum + c.totalVolume, 0);
    const totalPutVolume = puts.reduce((sum, p) => sum + p.totalVolume, 0);
    const putCallRatio = totalCallVolume > 0 ? totalPutVolume / totalCallVolume : 0;
    const maxPain = calculateMaxPain(calls, puts);

    // Build volume and OI maps by strike
    const volumeByStrike: { [strike: string]: number } = {};
    const openInterestByStrike: { [strike: string]: number } = {};

    for (const call of calls) {
      const strike = call.strikePrice.toString();
      volumeByStrike[strike] = (volumeByStrike[strike] || 0) + call.totalVolume;
      openInterestByStrike[strike] = (openInterestByStrike[strike] || 0) + call.openInterest;
    }

    for (const put of puts) {
      const strike = put.strikePrice.toString();
      volumeByStrike[strike] = (volumeByStrike[strike] || 0) + put.totalVolume;
      openInterestByStrike[strike] = (openInterestByStrike[strike] || 0) + put.openInterest;
    }

    // Build response
    const response = {
      success: true,
      data: {
        symbol: schwabData.symbol,
        underlyingPrice: schwabData.underlyingPrice,
        totalCallVolume,
        totalPutVolume,
        putCallRatio,
        maxPain,
        calls: calls.map(transformOptionContract),
        puts: puts.map(transformOptionContract),
        volumeByStrike,
        openInterestByStrike,
        timestamp: new Date().toISOString(),
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error fetching options chain:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch options chain',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

/**
 * GET /api/schwab/quote/:symbol
 * Get real-time quote for a symbol
 */
app.get('/quote/:symbol', async (c) => {
  try {
    const symbol = c.req.param('symbol').toUpperCase();
    const endpoint = `/marketdata/v1/quotes?symbols=${symbol}&fields=quote,reference`;

    console.log(`→ Fetching quote for ${symbol}`);

    const schwabData = await schwabApiRequest<SchwabQuoteResponse>(endpoint);
    const symbolData = schwabData[symbol];

    if (!symbolData) {
      throw new Error(`No data found for symbol ${symbol}`);
    }

    const quote = symbolData.quote;
    const reference = symbolData.reference;

    console.log(`✓ Quote retrieved for ${symbol}`);

    return c.json({
      success: true,
      data: {
        symbol,
        description: reference.description,
        lastPrice: quote.lastPrice,
        openPrice: quote.openPrice,
        highPrice: quote.highPrice,
        lowPrice: quote.lowPrice,
        closePrice: quote.closePrice,
        volume: quote.totalVolume,
        bidPrice: quote.bidPrice,
        askPrice: quote.askPrice,
        netChange: quote.netChange,
        netPercentChange: quote.netPercentChange,
        mark: quote.mark,
      },
    });
  } catch (error) {
    console.error('Error fetching quote:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch quote',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

/**
 * GET /api/schwab/pricehistory/:symbol
 * Get price history for a symbol
 */
app.get('/pricehistory/:symbol', async (c) => {
  try {
    const symbol = c.req.param('symbol').toUpperCase();

    // Get query parameters with defaults for 1 day of 5-minute candles
    const periodType = c.req.query('periodType') || 'day';
    const period = c.req.query('period') || '1';
    const frequencyType = c.req.query('frequencyType') || 'minute';
    const frequency = c.req.query('frequency') || '5';
    const needExtendedHoursData = c.req.query('needExtendedHoursData') || 'false';

    const params = new URLSearchParams({
      symbol,
      periodType,
      period,
      frequencyType,
      frequency,
      needExtendedHoursData,
    });

    const endpoint = `/marketdata/v1/pricehistory?${params.toString()}`;
    console.log(`→ Fetching price history for ${symbol}`);

    const schwabData = await schwabApiRequest<SchwabPriceHistoryResponse>(endpoint);

    console.log(`✓ Price history retrieved: ${schwabData.candles?.length || 0} candles`);

    return c.json({
      success: true,
      data: {
        symbol: schwabData.symbol,
        bars: schwabData.candles.map(candle => ({
          time: candle.datetime,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching price history:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch price history',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

/**
 * GET /api/schwab/status
 * Check authentication status and token info
 */
app.get('/status', (c) => {
  const tokenInfo = auth.getTokenInfo();

  return c.json({
    ...tokenInfo,
    expiresInMinutes: tokenInfo.expiresIn ? Math.floor(tokenInfo.expiresIn / 60) : null,
  });
});

export default app;
