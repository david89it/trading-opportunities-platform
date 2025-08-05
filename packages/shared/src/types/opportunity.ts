// Trading Opportunity Types

/**
 * Feature Scores
 * 
 * Sub-component scores that make up the overall signal strength.
 * Each score ranges from 0-10, with higher values indicating stronger signals.
 */
export interface FeatureScores {
  /** Price trend alignment score based on EMA crossovers and momentum (0-10) */
  price: number;
  
  /** Volume and liquidity score based on RVOL and market depth (0-10) */
  volume: number;
  
  /** Volatility and momentum score based on ATR and price action (0-10) */
  volatility: number;
  
  /** Combined weighted score of all sub-components (0-10) */
  overall: number;
}

/**
 * Trade Setup
 * 
 * Specific price levels and position sizing for executing the trade.
 * Includes entry, stop loss, targets, and calculated position size.
 */
export interface TradeSetup {
  /** Entry price level for initiating the position */
  entry: number;
  
  /** Stop loss price level for risk management */
  stop: number;
  
  /** Primary target price for profit taking */
  target1: number;
  
  /** Optional secondary target for extended profits */
  target2?: number;
  
  /** Position size in US dollars */
  position_size_usd: number;
  
  /** Position size in number of shares */
  position_size_shares: number;
  
  /** Risk to reward ratio (e.g., 3.0 means 3:1 R:R) */
  rr_ratio: number;
}

/**
 * Risk Metrics
 * 
 * Probabilistic risk assessment and expected value calculations.
 * Used for position sizing and trade evaluation.
 */
export interface RiskMetrics {
  /** Probability of hitting target before stop loss (0.0-1.0) */
  p_target: number;
  
  /** Net expected R value after deducting costs and slippage */
  net_expected_r: number;
  
  /** Total trading costs expressed in R units */
  costs_r: number;
  
  /** Expected slippage in basis points (e.g., 10 = 0.10%) */
  slippage_bps: number;
}

/**
 * Trading Opportunity
 * 
 * Complete trading opportunity with signal analysis, trade setup, and risk metrics.
 * Represents a potential trade identified by the scanning algorithm.
 * 
 * @example
 * ```typescript
 * const opportunity: Opportunity = {
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   symbol: "AAPL",
 *   timestamp: "2024-01-15T14:30:00.000Z",
 *   signal_score: 8.5,
 *   scores: { price: 8.8, volume: 8.2, volatility: 8.6, overall: 8.5 },
 *   setup: { entry: 180.50, stop: 175.00, target1: 190.00, rr_ratio: 1.73 },
 *   risk: { p_target: 0.45, net_expected_r: 0.23, costs_r: 0.05 },
 *   guardrail_status: "approved",
 *   // ... other fields
 * }
 * ```
 */
export interface Opportunity {
  /** Unique identifier for the trading opportunity */
  id: string;
  
  /** Stock ticker symbol (e.g., "AAPL", "GOOGL") */
  symbol: string;
  
  /** ISO 8601 timestamp when the opportunity was identified */
  timestamp: string;
  
  /** Overall signal strength score (0-10) */
  signal_score: number;
  
  /** Breakdown of signal component scores */
  scores: FeatureScores;
  
  /** Trade execution setup with prices and position sizing */
  setup: TradeSetup;
  
  /** Risk assessment and probability calculations */
  risk: RiskMetrics;
  
  /** Raw feature data used in signal generation (JSONB equivalent) */
  features: Record<string, unknown>;
  
  /** Risk management guardrail status */
  guardrail_status: 'approved' | 'review' | 'blocked';
  
  /** Explanation for why guardrails blocked or warned about this signal */
  guardrail_reason?: string;
  
  /** Feature schema version for tracking model changes */
  version: string;
}

/**
 * API Response for Opportunities List
 * 
 * Response model that wraps the list of opportunities with pagination
 * and metadata from the API endpoint.
 */
export interface OpportunitiesResponse {
  /** Array of trading opportunities */
  opportunities: Opportunity[];
  
  /** Total number of opportunities available (before pagination) */
  total: number;
  
  /** Number of opportunities requested in this page */
  limit: number;
  
  /** Number of opportunities skipped (pagination offset) */
  offset: number;
  
  /** ISO 8601 timestamp when the response was generated */
  timestamp: string;
}