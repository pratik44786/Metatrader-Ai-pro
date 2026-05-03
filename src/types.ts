export interface Position {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  lot: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  timestamp: string;
}

export interface AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  positions: Position[];
  autoTradingEnabled: boolean;
  history: any[];
  brokerConnected: boolean;
  brokerConfig: { login: string, server: string } | null;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
}
