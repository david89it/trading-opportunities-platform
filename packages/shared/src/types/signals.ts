// Signal History and Tracking Types

/**
 * Signal History Row
 * 
 * Represents a historical trading signal with actual outcome data for calibration.
 * Used for tracking signal performance and improving probability predictions over time.
 */
export interface SignalHistoryRow {
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

export interface CalibrationMetrics {
  decile: number;          // Score decile (1-10)
  predictedProb: number;   // Average predicted probability in decile
  realizedProb: number;    // Actual hit rate in decile
  sampleSize: number;      // Number of signals in decile
  brierScore: number;      // Brier score for this decile
}

export interface CalibrationSummary {
  overallBrierScore: number;
  calibrationError: number; // Mean absolute difference between predicted/realized
  reliability: CalibrationMetrics[];
  totalSignals: number;
  dateRange: {
    start: string;         // ISO 8601 timestamp
    end: string;           // ISO 8601 timestamp
  };
  lastUpdated: string;     // ISO 8601 timestamp
}