// Platform Constants

// Risk Management Defaults
export const DEFAULT_RISK_PARAMS = {
  RISK_PCT_PER_TRADE: 0.005,  // 0.5%
  MAX_HEAT_PCT: 0.02,         // 2%
  DAILY_STOP_R: -2.0,         // -2R daily stop
  LOSS_STREAK_HALT: 8,        // Halt after 8 consecutive losses
} as const;

// Monte Carlo Defaults
export const DEFAULT_MC_PARAMS = {
  P_WIN: 0.33,                // 33% win rate
  R_WIN: 3.0,                 // 3R average win
  RISK_PCT: 0.005,            // 0.5% risk per trade
  TRADES_PER_WEEK: 10,        // 10 trades per week
  WEEKS: 52,                  // 1 year simulation
  COST_PER_TRADE_USD: 1,      // $1 per trade
  SLIPPAGE_BPS: 10,           // 10 basis points slippage
} as const;

// Promotion Gates
export const PROMOTION_GATES = {
  CALIBRATION_ERROR_MAX: 0.10,    // 10% max calibration error
  EXPECTANCY_MIN: 0.1,            // Minimum 0.1R/trade expectancy
  MIN_TRADES_FOR_VALIDATION: 300, // Minimum trades for validation
  MC_PROB_DOUBLE_MIN: 0.40,       // 40% chance to double in 1 year
  MC_MAX_DRAWDOWN_P95: 0.20,      // 95th percentile max drawdown < 20%
} as const;

// API Configuration
export const API_CONFIG = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 200,
  CACHE_TTL_SECONDS: 300,     // 5 minutes
  RATE_LIMIT_PER_MINUTE: 100,
} as const;

// Market Hours (US Eastern)
export const MARKET_SCHEDULE = {
  PREMARKET_START: '04:00',   // 4:00 AM ET
  REGULAR_START: '09:30',     // 9:30 AM ET
  REGULAR_END: '16:00',       // 4:00 PM ET
  AFTERHOURS_END: '20:00',    // 8:00 PM ET
} as const;

// Feature Scoring
export const SCORING = {
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  SIGNAL_THRESHOLD: 70,       // Minimum score for signal generation
} as const;

// Data Validation
export const VALIDATION_LIMITS = {
  MIN_PRICE: 0.01,
  MAX_PRICE: 10000,
  MIN_VOLUME: 1000,           // Minimum daily volume
  MIN_MARKET_CAP: 100_000_000, // $100M minimum market cap
  MAX_SPREAD_BPS: 50,         // Maximum 50 bps spread
} as const;