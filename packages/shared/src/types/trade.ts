// Trade Types

export type TradeSide = 'long' | 'short';
export type TradeStatus = 'open' | 'closed' | 'cancelled';
export type TradeOutcome = 'win' | 'loss' | 'breakeven';

export interface Trade {
  id: string;
  userId?: string;         // Nullable for now, required after auth
  symbol: string;
  side: TradeSide;
  entryTime: string;       // ISO 8601 timestamp
  entryPrice: number;
  positionSize: number;    // Number of shares
  stopLoss: number;
  target1: number;
  target2?: number;
  exitTime?: string;       // ISO 8601 timestamp
  exitPrice?: number;
  pnl?: number;            // Profit/loss in USD
  fees: number;            // Trading fees in USD
  slippageBps: number;     // Actual slippage experienced
  status: TradeStatus;
  outcome?: TradeOutcome;
  tags?: string[];         // Optional categorization
  notes?: string;          // Optional notes
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}

export interface TradePerformance {
  totalTrades: number;
  winRate: number;         // Percentage (0-100)
  avgWin: number;          // Average winning trade R
  avgLoss: number;         // Average losing trade R
  profitFactor: number;    // Gross profit / gross loss
  maxDrawdown: number;     // Maximum drawdown in R
  sharpeRatio?: number;    // Risk-adjusted returns
  totalReturn: number;     // Total return in R
}