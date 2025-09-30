/**
 * Tracking API Client
 * Handles signal history and trade journal operations
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ============================================
// TYPES
// ============================================

export type SignalOutcome = 'target_hit' | 'stopped_out' | 'expired' | 'still_open';
export type TradeSide = 'long' | 'short';
export type ExitReason = 'target_hit' | 'stopped_out' | 'manual_close' | 'trailing_stop' | 'time_stop';

export interface SignalHistory {
  id: string;
  user_id: string;
  opportunity_id?: string;
  symbol: string;
  signal_score: number;
  p_target: number;
  
  // Signal details
  entry_price?: number;
  stop_price?: number;
  target_price?: number;
  rr_ratio?: number;
  
  // Outcome
  outcome?: SignalOutcome;
  entry_time?: string;
  exit_price?: number;
  exit_time?: string;
  
  // Metrics
  mfe?: number; // Maximum Favorable Excursion
  mae?: number; // Maximum Adverse Excursion
  actual_r?: number;
  days_held?: number;
  
  notes?: string;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface SignalHistoryCreate {
  opportunity_id?: string;
  symbol: string;
  signal_score: number;
  p_target: number;
  entry_price?: number;
  stop_price?: number;
  target_price?: number;
  rr_ratio?: number;
  notes?: string;
}

export interface SignalHistoryUpdate {
  outcome: SignalOutcome;
  exit_price: number;
  exit_time: string;
  mfe?: number;
  mae?: number;
  actual_r?: number;
  notes?: string;
}

export interface Trade {
  id: string;
  user_id: string;
  symbol: string;
  opportunity_id?: string;
  side: TradeSide;
  
  // Entry
  entry_time: string;
  entry_price: number;
  position_size_shares: number;
  stop_loss: number;
  target_1: number;
  target_2?: number;
  
  // Exit
  exit_time?: string;
  exit_price?: number;
  exit_reason?: ExitReason;
  
  // Performance
  pnl_usd?: number;
  pnl_r?: number;
  fees_usd: number;
  slippage_bps?: number;
  
  // Metadata
  tags?: string[];
  notes?: string;
  screenshots?: string[];
  
  created_at: string;
  updated_at: string;
}

export interface TradeCreate {
  symbol: string;
  opportunity_id?: string;
  side?: TradeSide;
  entry_time: string;
  entry_price: number;
  position_size_shares: number;
  stop_loss: number;
  target_1: number;
  target_2?: number;
  exit_time?: string;
  exit_price?: number;
  exit_reason?: ExitReason;
  fees_usd?: number;
  tags?: string[];
  notes?: string;
}

export interface TradeStats {
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  
  // Win/Loss
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  
  // Performance
  total_pnl_usd: number;
  avg_pnl_usd: number;
  avg_pnl_r: number;
  best_trade_r?: number;
  worst_trade_r?: number;
  
  // Risk metrics
  profit_factor?: number;
  expectancy_r: number;
  avg_winner_r?: number;
  avg_loser_r?: number;
  
  // Duration
  avg_hold_time_hours?: number;
  
  // Recent performance
  last_10_trades_win_rate?: number;
  last_10_trades_avg_r?: number;
}

export interface CalibrationBucket {
  predicted_range: string;
  predicted_midpoint: number;
  actual_hit_rate: number;
  sample_size: number;
  calibration_error: number;
}

export interface CalibrationSummary {
  buckets: CalibrationBucket[];
  overall_brier_score: number;
  mean_absolute_error: number;
  total_signals_tracked: number;
  signals_with_outcomes: number;
  calibration_status: 'PASSED' | 'ACCEPTABLE' | 'INSUFFICIENT_DATA' | 'NEEDS_IMPROVEMENT';
  recommendation: string;
}

// ============================================
// SIGNAL HISTORY API
// ============================================

export const trackingApi = {
  // Create signal history
  createSignal: async (data: SignalHistoryCreate): Promise<SignalHistory> => {
    const response = await axios.post<SignalHistory>(
      `${API_BASE_URL}/api/v1/tracking/signals`,
      data
    );
    return response.data;
  },

  // List signal history
  listSignals: async (params?: {
    symbol?: string;
    outcome?: SignalOutcome;
    limit?: number;
    offset?: number;
  }): Promise<SignalHistory[]> => {
    const response = await axios.get<SignalHistory[]>(
      `${API_BASE_URL}/api/v1/tracking/signals`,
      { params }
    );
    return response.data;
  },

  // Update signal outcome
  updateSignalOutcome: async (
    id: string,
    data: SignalHistoryUpdate
  ): Promise<SignalHistory> => {
    const response = await axios.patch<SignalHistory>(
      `${API_BASE_URL}/api/v1/tracking/signals/${id}`,
      data
    );
    return response.data;
  },

  // ============================================
  // TRADE JOURNAL API
  // ============================================

  // Create trade
  createTrade: async (data: TradeCreate): Promise<Trade> => {
    const response = await axios.post<Trade>(
      `${API_BASE_URL}/api/v1/tracking/trades`,
      data
    );
    return response.data;
  },

  // List trades
  listTrades: async (params?: {
    symbol?: string;
    open_only?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Trade[]> => {
    const response = await axios.get<Trade[]>(
      `${API_BASE_URL}/api/v1/tracking/trades`,
      { params }
    );
    return response.data;
  },

  // Get trade statistics
  getTradeStats: async (params?: {
    symbol?: string;
    days?: number;
  }): Promise<TradeStats> => {
    const response = await axios.get<TradeStats>(
      `${API_BASE_URL}/api/v1/tracking/trades/stats`,
      { params }
    );
    return response.data;
  },

  // Update trade
  updateTrade: async (id: string, data: Partial<TradeCreate>): Promise<Trade> => {
    const response = await axios.patch<Trade>(
      `${API_BASE_URL}/api/v1/tracking/trades/${id}`,
      data
    );
    return response.data;
  },

  // ============================================
  // CALIBRATION API
  // ============================================

  // Get calibration analysis
  getCalibration: async (params?: {
    min_samples?: number;
  }): Promise<CalibrationSummary> => {
    const response = await axios.get<CalibrationSummary>(
      `${API_BASE_URL}/api/v1/tracking/calibration`,
      { params }
    );
    return response.data;
  },
};
