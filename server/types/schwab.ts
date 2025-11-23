// Schwab API Type Definitions

export interface SchwabTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

export interface SchwabQuoteResponse {
  [symbol: string]: {
    quote: {
      '52WeekHigh': number;
      '52WeekLow': number;
      askPrice: number;
      askSize: number;
      bidPrice: number;
      bidSize: number;
      closePrice: number;
      highPrice: number;
      lastPrice: number;
      lastSize: number;
      lowPrice: number;
      mark: number;
      markChange: number;
      markPercentChange: number;
      netChange: number;
      netPercentChange: number;
      openPrice: number;
      quoteTime: number;
      securityStatus: string;
      totalVolume: number;
      tradeTime: number;
    };
    reference: {
      cusip: string;
      description: string;
      exchange: string;
      exchangeName: string;
      isHardToBorrow: boolean;
      isShortable: boolean;
      htbRate: number;
    };
  };
}

export interface OptionContract {
  putCall: 'PUT' | 'CALL';
  symbol: string;
  description: string;
  exchangeName: string;
  bid: number;
  ask: number;
  last: number;
  mark: number;
  bidSize: number;
  askSize: number;
  bidAskSize: string;
  lastSize: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
  closePrice: number;
  totalVolume: number;
  tradeDate: number | null;
  tradeTimeInLong: number;
  quoteTimeInLong: number;
  netChange: number;
  volatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  openInterest: number;
  timeValue: number;
  theoreticalOptionValue: number;
  theoreticalVolatility: number;
  optionDeliverablesList: null;
  strikePrice: number;
  expirationDate: number;
  daysToExpiration: number;
  expirationType: string;
  lastTradingDay: number;
  multiplier: number;
  settlementType: string;
  deliverableNote: string;
  isIndexOption: null | boolean;
  percentChange: number;
  markChange: number;
  markPercentChange: number;
  intrinsicValue: number;
  pennyPilot: boolean;
  inTheMoney: boolean;
  mini: boolean;
  nonStandard: boolean;
}

export interface OptionDateMap {
  [strikePrice: string]: OptionContract[];
}

export interface SchwabOptionsChainResponse {
  symbol: string;
  status: string;
  underlying: {
    ask: number;
    askSize: number;
    bid: number;
    bidSize: number;
    change: number;
    close: number;
    delayed: boolean;
    description: string;
    exchangeName: string;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    highPrice: number;
    last: number;
    lowPrice: number;
    mark: number;
    markChange: number;
    markPercentChange: number;
    openPrice: number;
    percentChange: number;
    quoteTime: number;
    symbol: string;
    totalVolume: number;
    tradeTime: number;
  };
  strategy: string;
  interval: number;
  isDelayed: boolean;
  isIndex: boolean;
  interestRate: number;
  underlyingPrice: number;
  volatility: number;
  daysToExpiration: number;
  numberOfContracts: number;
  assetMainType: string;
  assetSubType: string;
  isChainTruncated: boolean;
  callExpDateMap?: {
    [date: string]: OptionDateMap;
  };
  putExpDateMap?: {
    [date: string]: OptionDateMap;
  };
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  datetime: number;
}

export interface SchwabPriceHistoryResponse {
  candles: Candle[];
  symbol: string;
  empty: boolean;
  previousClose: number;
  previousCloseDate: number;
}

// Internal token storage
export interface TokenStore {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
}
