// Risk Management Types

export interface RiskParameters {
  riskPctPerTrade: number;    // Risk per trade as percentage (e.g., 0.005 = 0.5%)
  maxHeatPct: number;         // Maximum concurrent open risk (e.g., 0.02 = 2%)
  dailyStopR: number;         // Daily stop loss in R (e.g., -2.0)
  lossStreakHalt: number;     // Halt after N consecutive losses (e.g., 8)
}

export interface PortfolioRisk {
  currentHeat: number;        // Current open risk as percentage
  availableRisk: number;      // Available risk capacity
  openPositions: number;      // Number of open positions
  dailyPnlR: number;         // Current day P&L in R
  consecutiveLosses: number;  // Current loss streak
  riskStatus: 'normal' | 'warning' | 'halt';
}

export interface MonteCarloInput {
  pWin: number;              // Probability of winning trade (0-1)
  rWin: number;              // Average winning trade R multiple
  riskPct: number;           // Risk per trade as decimal
  tradesPerWeek: number;     // Trading frequency
  weeks: number;             // Simulation period
  costPerTradeUsd: number;   // Fixed cost per trade
  slippageBps: number;       // Slippage in basis points
}

export interface MonteCarloOutput {
  finalEquity: number[];     // Array of final equity values
  equityCurves: number[][];  // Sample equity curves for plotting
  maxDrawdowns: number[];    // Maximum drawdown for each simulation
  summary: {
    meanFinalEquity: number;
    medianFinalEquity: number;
    p95MaxDrawdown: number;
    probDoubleIn1Y: number;  // P(≥2× in 1 year)
    probTripleIn1Y: number;  // P(≥3× in 1 year)
    prob50PctDrawdown: number; // P(max drawdown ≥ 50%)
  };
}

export interface GuardrailCheck {
  passed: boolean;
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'excessive';
}