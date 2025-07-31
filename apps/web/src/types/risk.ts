// Risk Management Types - mirrors backend Pydantic models

/**
 * Monte Carlo Simulation Request Parameters
 */
export interface MonteCarloRequest {
  /** Probability of winning trade (0.0-1.0) */
  p_win: number;
  
  /** Risk-reward ratio for winning trades (e.g., 2.5 = 2.5:1) */
  r_win: number;
  
  /** Risk per trade as percentage of account (e.g., 0.005 = 0.5%) */
  risk_pct: number;
  
  /** Number of trades per week */
  trades_per_week: number;
  
  /** Number of weeks to simulate */
  weeks: number;
  
  /** Fixed cost per trade in USD */
  cost_per_trade_usd: number;
  
  /** Slippage in basis points (e.g., 10 = 0.1%) */
  slippage_bps: number;
  
  /** Starting capital in USD */
  starting_capital: number;
  
  /** Number of Monte Carlo simulation paths */
  num_simulations: number;
}

/**
 * Risk Metrics from Simulation
 */
export interface RiskMetrics {
  /** Probability of 2x or better return */
  prob_2x: number;
  
  /** Probability of 3x or better return */
  prob_3x: number;
  
  /** Probability of losing money */
  prob_loss: number;
  
  /** 95th percentile maximum drawdown */
  p95_max_drawdown: number;
  
  /** Annualized Sharpe ratio */
  sharpe_ratio: number;
  
  /** 95% Value at Risk */
  var_95: number;
  
  /** 95% Conditional Value at Risk */
  cvar_95: number;
  
  /** Overall win rate across all trades */
  win_rate: number;
  
  /** Gross profit / gross loss ratio */
  profit_factor: number;
}

/**
 * Equity Path Data Point for Visualization
 */
export interface EquityPathData {
  /** Week number */
  week: number;
  
  /** Equity value at this point */
  equity: number;
}

/**
 * Monte Carlo Simulation Response
 */
export interface MonteCarloResponse {
  /** Original request parameters */
  parameters: MonteCarloRequest;
  
  /** Mean final equity across all simulations */
  mean_final_equity: number;
  
  /** Median final equity */
  median_final_equity: number;
  
  /** Standard deviation of final equity */
  std_final_equity: number;
  
  /** Minimum final equity across simulations */
  min_equity: number;
  
  /** Maximum final equity across simulations */
  max_equity: number;
  
  /** Comprehensive risk metrics */
  risk_metrics: RiskMetrics;
  
  /** Sample equity paths for chart visualization */
  sample_equity_paths: EquityPathData[][];
  
  /** Final equity values for histogram visualization */
  final_equity_distribution: number[];
  
  /** When the simulation was run */
  timestamp: string;
  
  /** Time taken to run simulation in milliseconds */
  computation_time_ms: number;
  
  /** Total number of trades in simulation */
  total_trades: number;
}

/**
 * Parameter Ranges and Defaults for UI Controls
 */
export const PARAMETER_CONFIG = {
  p_win: {
    min: 0.1,
    max: 0.9,
    step: 0.01,
    default: 0.45,
    label: 'Win Rate',
    format: (value: number) => `${(value * 100).toFixed(0)}%`,
    description: 'Probability of winning each trade'
  },
  r_win: {
    min: 1.0,
    max: 5.0,
    step: 0.1,
    default: 2.5,
    label: 'Risk:Reward Ratio',
    format: (value: number) => `${value.toFixed(1)}:1`,
    description: 'Risk-to-reward ratio for winning trades'
  },
  risk_pct: {
    min: 0.001,
    max: 0.05,
    step: 0.0005,
    default: 0.005,
    label: 'Risk Per Trade',
    format: (value: number) => `${(value * 100).toFixed(1)}%`,
    description: 'Percentage of account risked per trade'
  },
  trades_per_week: {
    min: 1,
    max: 50,
    step: 1,
    default: 10,
    label: 'Trades Per Week',
    format: (value: number) => `${value}`,
    description: 'Number of trades executed per week'
  },
  weeks: {
    min: 4,
    max: 260,
    step: 1,
    default: 52,
    label: 'Simulation Period',
    format: (value: number) => `${value} weeks`,
    description: 'Duration of simulation in weeks'
  },
  cost_per_trade_usd: {
    min: 0,
    max: 10,
    step: 0.25,
    default: 1.0,
    label: 'Cost Per Trade',
    format: (value: number) => `$${value.toFixed(2)}`,
    description: 'Fixed cost per trade (commissions, fees)'
  },
  slippage_bps: {
    min: 0,
    max: 100,
    step: 5,
    default: 10,
    label: 'Slippage',
    format: (value: number) => `${value} bps`,
    description: 'Expected slippage in basis points'
  },
  starting_capital: {
    min: 1000,
    max: 1000000,
    step: 1000,
    default: 10000,
    label: 'Starting Capital',
    format: (value: number) => `$${value.toLocaleString()}`,
    description: 'Initial account size'
  },
  num_simulations: {
    min: 100,
    max: 5000,
    step: 100,
    default: 1000,
    label: 'Simulations',
    format: (value: number) => `${value.toLocaleString()}`,
    description: 'Number of Monte Carlo paths to generate'
  }
} as const;

/**
 * Get default Monte Carlo request parameters
 */
export function getDefaultParameters(): MonteCarloRequest {
  return {
    p_win: PARAMETER_CONFIG.p_win.default,
    r_win: PARAMETER_CONFIG.r_win.default,
    risk_pct: PARAMETER_CONFIG.risk_pct.default,
    trades_per_week: PARAMETER_CONFIG.trades_per_week.default,
    weeks: PARAMETER_CONFIG.weeks.default,
    cost_per_trade_usd: PARAMETER_CONFIG.cost_per_trade_usd.default,
    slippage_bps: PARAMETER_CONFIG.slippage_bps.default,
    starting_capital: PARAMETER_CONFIG.starting_capital.default,
    num_simulations: PARAMETER_CONFIG.num_simulations.default,
  };
}

/**
 * Validate parameters before submission
 */
export function validateParameters(params: MonteCarloRequest): string[] {
  const errors: string[] = [];
  
  Object.entries(PARAMETER_CONFIG).forEach(([key, config]) => {
    const value = params[key as keyof MonteCarloRequest];
    if (typeof value === 'number') {
      if (value < config.min || value > config.max) {
        errors.push(`${config.label} must be between ${config.min} and ${config.max}`);
      }
    }
  });
  
  // Additional business logic validation
  if (params.p_win * params.r_win < 1.0) {
    errors.push('Expected value should typically be positive (Win Rate × R:R Ratio ≥ 1.0)');
  }
  
  return errors;
}

/**
 * Calculate expected R value for given parameters
 */
export function calculateExpectedR(params: MonteCarloRequest): number {
  return (params.p_win * params.r_win) - ((1 - params.p_win) * 1.0);
}

/**
 * Estimate simulation time based on parameters
 */
export function estimateSimulationTime(params: MonteCarloRequest): number {
  // Rough estimate: ~1.2ms per simulation for 100 sims baseline
  const baseTimeMs = 1200;
  const scaleFactor = params.num_simulations / 100;
  const complexityFactor = (params.weeks * params.trades_per_week) / 520; // 520 = 52 weeks * 10 trades
  
  return baseTimeMs * scaleFactor * complexityFactor;
}