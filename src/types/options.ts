// Frontend types for options data

export interface OptionContract {
  putCall: 'PUT' | 'CALL';
  symbol: string;
  description: string;
  bid: number;
  ask: number;
  last: number;
  mark: number;
  totalVolume: number;
  openInterest: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  strikePrice: number;
  expirationDate: string;
  daysToExpiration: number;
  inTheMoney: boolean;
  impliedVolatility: number;
  percentChange: number;
}

export interface OptionsAnalysis {
  symbol: string;
  underlyingPrice: number;
  totalCallVolume: number;
  totalPutVolume: number;
  putCallRatio: number;
  maxPain: number;
  calls: OptionContract[];
  puts: OptionContract[];
  volumeByStrike: { [strike: string]: number };
  openInterestByStrike: { [strike: string]: number };
  timestamp: string;
}

export interface Quote {
  symbol: string;
  description: string;
  lastPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  volume: number;
  bidPrice: number;
  askPrice: number;
  netChange: number;
  netPercentChange: number;
  mark: number;
}

export interface PriceBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartData {
  symbol: string;
  bars: PriceBar[];
}

export type OptionType = 'CALL' | 'PUT' | 'ALL';
export type TimeInterval = '1m' | '5m' | '15m' | '30m' | '1h';
