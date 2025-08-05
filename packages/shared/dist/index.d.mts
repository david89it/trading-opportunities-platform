/**
 * Feature Scores
 *
 * Sub-component scores that make up the overall signal strength.
 * Each score ranges from 0-10, with higher values indicating stronger signals.
 */
interface FeatureScores {
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
interface TradeSetup {
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
interface RiskMetrics {
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
interface Opportunity {
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
interface OpportunitiesResponse {
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

type TradeSide = 'long' | 'short';
type TradeStatus = 'open' | 'closed' | 'cancelled';
type TradeOutcome = 'win' | 'loss' | 'breakeven';
interface Trade {
    id: string;
    userId?: string;
    symbol: string;
    side: TradeSide;
    entryTime: string;
    entryPrice: number;
    positionSize: number;
    stopLoss: number;
    target1: number;
    target2?: number;
    exitTime?: string;
    exitPrice?: number;
    pnl?: number;
    fees: number;
    slippageBps: number;
    status: TradeStatus;
    outcome?: TradeOutcome;
    tags?: string[];
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
interface TradePerformance {
    totalTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    maxDrawdown: number;
    sharpeRatio?: number;
    totalReturn: number;
}

/**
 * Signal History Row
 *
 * Represents a historical trading signal with actual outcome data for calibration.
 * Used for tracking signal performance and improving probability predictions over time.
 */
interface SignalHistoryRow {
    /** Unique identifier for the signal */
    id: string;
    /** Stock ticker symbol (e.g., "AAPL", "GOOGL") */
    symbol: string;
    /** ISO 8601 timestamp when signal was generated */
    timestamp: string;
    /** Signal strength at time of generation (0-100) */
    signal_score: number;
    /** Predicted probability of hitting target before stop (0.0-1.0) */
    p_target: number;
    /** Predicted net expected R value after costs and slippage */
    net_expected_r: number;
    /** Maximum favorable excursion during trade (in R units) */
    mfe: number;
    /** Maximum adverse excursion during trade (in R units) */
    mae: number;
    /** True if target was hit before stop loss was triggered */
    label_hit_target_before_stop: boolean;
    /** Time to hit target in hours (null if target was not hit) */
    t_hit_target?: number;
    /** Actual slippage experienced in basis points */
    slippage_bps: number;
    /** Actual trading fees paid in USD */
    fees_usd: number;
    /** Feature schema version for tracking model changes */
    version: string;
    /** ISO 8601 timestamp when record was created */
    created_at: string;
    /** ISO 8601 timestamp when record was last updated */
    updated_at: string;
}
interface CalibrationMetrics {
    decile: number;
    predictedProb: number;
    realizedProb: number;
    sampleSize: number;
    brierScore: number;
}
interface CalibrationSummary {
    overallBrierScore: number;
    calibrationError: number;
    reliability: CalibrationMetrics[];
    totalSignals: number;
    dateRange: {
        start: string;
        end: string;
    };
    lastUpdated: string;
}

interface RiskParameters {
    riskPctPerTrade: number;
    maxHeatPct: number;
    dailyStopR: number;
    lossStreakHalt: number;
}
interface PortfolioRisk {
    currentHeat: number;
    availableRisk: number;
    openPositions: number;
    dailyPnlR: number;
    consecutiveLosses: number;
    riskStatus: 'normal' | 'warning' | 'halt';
}
interface MonteCarloInput {
    pWin: number;
    rWin: number;
    riskPct: number;
    tradesPerWeek: number;
    weeks: number;
    costPerTradeUsd: number;
    slippageBps: number;
}
interface MonteCarloOutput {
    finalEquity: number[];
    equityCurves: number[][];
    maxDrawdowns: number[];
    summary: {
        meanFinalEquity: number;
        medianFinalEquity: number;
        p95MaxDrawdown: number;
        probDoubleIn1Y: number;
        probTripleIn1Y: number;
        prob50PctDrawdown: number;
    };
}
interface GuardrailCheck {
    passed: boolean;
    reason?: string;
    riskLevel: 'low' | 'medium' | 'high' | 'excessive';
}

declare const DEFAULT_RISK_PARAMS: {
    readonly RISK_PCT_PER_TRADE: 0.005;
    readonly MAX_HEAT_PCT: 0.02;
    readonly DAILY_STOP_R: -2;
    readonly LOSS_STREAK_HALT: 8;
};
declare const DEFAULT_MC_PARAMS: {
    readonly P_WIN: 0.33;
    readonly R_WIN: 3;
    readonly RISK_PCT: 0.005;
    readonly TRADES_PER_WEEK: 10;
    readonly WEEKS: 52;
    readonly COST_PER_TRADE_USD: 1;
    readonly SLIPPAGE_BPS: 10;
};
declare const PROMOTION_GATES: {
    readonly CALIBRATION_ERROR_MAX: 0.1;
    readonly EXPECTANCY_MIN: 0.1;
    readonly MIN_TRADES_FOR_VALIDATION: 300;
    readonly MC_PROB_DOUBLE_MIN: 0.4;
    readonly MC_MAX_DRAWDOWN_P95: 0.2;
};
declare const API_CONFIG: {
    readonly DEFAULT_LIMIT: 50;
    readonly MAX_LIMIT: 200;
    readonly CACHE_TTL_SECONDS: 300;
    readonly RATE_LIMIT_PER_MINUTE: 100;
};
declare const MARKET_SCHEDULE: {
    readonly PREMARKET_START: "04:00";
    readonly REGULAR_START: "09:30";
    readonly REGULAR_END: "16:00";
    readonly AFTERHOURS_END: "20:00";
};
declare const SCORING: {
    readonly MIN_SCORE: 0;
    readonly MAX_SCORE: 100;
    readonly SIGNAL_THRESHOLD: 70;
};
declare const VALIDATION_LIMITS: {
    readonly MIN_PRICE: 0.01;
    readonly MAX_PRICE: 10000;
    readonly MIN_VOLUME: 1000;
    readonly MIN_MARKET_CAP: 100000000;
    readonly MAX_SPREAD_BPS: 50;
};

declare const isValidPrice: (price: number) => boolean;
declare const isValidVolume: (volume: number) => boolean;
declare const isValidScore: (score: number) => boolean;
declare const isValidProbability: (prob: number) => boolean;
declare const isValidSymbol: (symbol: string) => boolean;
declare const isValidTimestamp: (timestamp: string) => boolean;
declare const isValidRiskParams: (params: {
    riskPctPerTrade: number;
    maxHeatPct: number;
    dailyStopR: number;
    lossStreakHalt: number;
}) => boolean;
declare const isValidTradeSetup: (setup: {
    entry: number;
    stop: number;
    target1: number;
    target2?: number;
}) => boolean;
declare const formatCurrency: (amount: number) => string;
declare const formatPercentage: (value: number, decimals?: number) => string;
declare const formatR: (r: number, decimals?: number) => string;

export { API_CONFIG, type CalibrationMetrics, type CalibrationSummary, DEFAULT_MC_PARAMS, DEFAULT_RISK_PARAMS, type FeatureScores, type GuardrailCheck, MARKET_SCHEDULE, type MonteCarloInput, type MonteCarloOutput, type OpportunitiesResponse, type Opportunity, PROMOTION_GATES, type PortfolioRisk, type RiskMetrics, type RiskParameters, SCORING, type SignalHistoryRow, type Trade, type TradeOutcome, type TradePerformance, type TradeSetup, type TradeSide, type TradeStatus, VALIDATION_LIMITS, formatCurrency, formatPercentage, formatR, isValidPrice, isValidProbability, isValidRiskParams, isValidScore, isValidSymbol, isValidTimestamp, isValidTradeSetup, isValidVolume };
