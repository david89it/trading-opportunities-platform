"""
Monte Carlo Simulation Engine

This module implements Monte Carlo simulations for trading strategy backtesting
and risk analysis. It provides statistical analysis of potential equity curves
and risk metrics based on trading parameters.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class SimulationParameters:
    """Parameters for Monte Carlo simulation"""
    p_win: float  # Probability of winning trade (0.0-1.0)
    r_win: float  # Risk-reward ratio for winning trades (e.g., 2.0 = 2:1)
    risk_pct: float  # Risk per trade as percentage of account (e.g., 0.005 = 0.5%)
    trades_per_week: int  # Number of trades per week
    weeks: int  # Number of weeks to simulate
    cost_per_trade_usd: float  # Fixed cost per trade in USD
    slippage_bps: float  # Slippage in basis points (e.g., 10 = 0.1%)
    starting_capital: float = 10000.0  # Starting capital in USD
    num_simulations: int = 1000  # Number of Monte Carlo paths


@dataclass
class SimulationResults:
    """Results from Monte Carlo simulation"""
    equity_paths: np.ndarray  # Array of equity curves (num_simulations x num_trades)
    final_equity: np.ndarray  # Final equity values for each simulation
    max_drawdowns: np.ndarray  # Maximum drawdown for each simulation
    trade_returns: np.ndarray  # Individual trade returns for each simulation
    
    # Summary statistics
    mean_final_equity: float
    median_final_equity: float
    std_final_equity: float
    
    # Risk metrics
    prob_2x: float  # Probability of 2x or better return
    prob_3x: float  # Probability of 3x or better return
    prob_loss: float  # Probability of losing money
    p95_max_drawdown: float  # 95th percentile maximum drawdown
    
    # Performance metrics
    sharpe_ratio: float
    max_equity: float
    min_equity: float


def validate_parameters(params: SimulationParameters) -> None:
    """Validate simulation parameters"""
    if not (0.0 <= params.p_win <= 1.0):
        raise ValueError("p_win must be between 0.0 and 1.0")
    
    if params.r_win <= 0:
        raise ValueError("r_win must be positive")
        
    if not (0.0001 <= params.risk_pct <= 0.1):  # 0.01% to 10%
        raise ValueError("risk_pct must be between 0.0001 and 0.1")
        
    if params.trades_per_week <= 0:
        raise ValueError("trades_per_week must be positive")
        
    if params.weeks <= 0:
        raise ValueError("weeks must be positive")
        
    if params.cost_per_trade_usd < 0:
        raise ValueError("cost_per_trade_usd cannot be negative")
        
    if params.slippage_bps < 0:
        raise ValueError("slippage_bps cannot be negative")
        
    if params.starting_capital <= 0:
        raise ValueError("starting_capital must be positive")
        
    if params.num_simulations <= 0:
        raise ValueError("num_simulations must be positive")


def run_monte_carlo_simulation(params: SimulationParameters) -> SimulationResults:
    """
    Run Monte Carlo simulation for trading strategy
    
    Args:
        params: Simulation parameters
        
    Returns:
        SimulationResults object containing all simulation data and metrics
    """
    validate_parameters(params)
    
    # Calculate derived parameters
    total_trades = params.trades_per_week * params.weeks
    
    # Generate random trade outcomes (win/loss) for all simulations
    # Shape: (num_simulations, total_trades)
    np.random.seed(42)  # For reproducible results in development
    trade_outcomes = np.random.random((params.num_simulations, total_trades)) < params.p_win
    
    # Calculate returns for each trade
    # Win: +r_win * risk_pct, Loss: -risk_pct
    trade_returns = np.where(trade_outcomes, 
                           params.r_win * params.risk_pct, 
                           -params.risk_pct)
    
    # Apply costs and slippage
    # Convert slippage from basis points to decimal
    slippage_decimal = params.slippage_bps / 10000.0
    
    # For each trade, subtract costs and slippage
    # Costs are fixed per trade, slippage affects trade size
    cost_per_trade_pct = params.cost_per_trade_usd / params.starting_capital
    slippage_impact = slippage_decimal * params.risk_pct
    
    # Adjust returns for costs and slippage
    trade_returns = trade_returns - cost_per_trade_pct - slippage_impact
    
    # Calculate equity curves
    # Start with 1.0 (100%) and compound returns
    equity_multipliers = 1.0 + trade_returns
    equity_paths = np.cumprod(equity_multipliers, axis=1)
    
    # Convert to dollar values
    equity_paths = equity_paths * params.starting_capital
    
    # Add starting capital as first point
    starting_points = np.full((params.num_simulations, 1), params.starting_capital)
    equity_paths = np.hstack([starting_points, equity_paths])
    
    # Calculate final equity values
    final_equity = equity_paths[:, -1]
    
    # Calculate maximum drawdowns for each simulation
    max_drawdowns = calculate_max_drawdowns(equity_paths)
    
    # Calculate summary statistics
    mean_final = np.mean(final_equity)
    median_final = np.median(final_equity)
    std_final = np.std(final_equity)
    
    # Calculate risk metrics
    prob_2x = np.mean(final_equity >= 2 * params.starting_capital)
    prob_3x = np.mean(final_equity >= 3 * params.starting_capital)
    prob_loss = np.mean(final_equity < params.starting_capital)
    p95_max_drawdown = np.percentile(max_drawdowns, 95)
    
    # Calculate Sharpe ratio (annualized)
    # Assume weekly returns, annualize by multiplying by sqrt(52)
    weekly_returns = np.diff(equity_paths, axis=1) / equity_paths[:, :-1]
    mean_weekly_return = np.mean(weekly_returns)
    std_weekly_return = np.std(weekly_returns)
    
    if std_weekly_return > 0:
        sharpe_ratio = (mean_weekly_return / std_weekly_return) * np.sqrt(52)
    else:
        sharpe_ratio = 0.0
    
    # Performance bounds
    max_equity = np.max(final_equity)
    min_equity = np.min(final_equity)
    
    return SimulationResults(
        equity_paths=equity_paths,
        final_equity=final_equity,
        max_drawdowns=max_drawdowns,
        trade_returns=trade_returns,
        mean_final_equity=mean_final,
        median_final_equity=median_final,
        std_final_equity=std_final,
        prob_2x=prob_2x,
        prob_3x=prob_3x,
        prob_loss=prob_loss,
        p95_max_drawdown=p95_max_drawdown,
        sharpe_ratio=sharpe_ratio,
        max_equity=max_equity,
        min_equity=min_equity
    )


def calculate_max_drawdowns(equity_paths: np.ndarray) -> np.ndarray:
    """
    Calculate maximum drawdown for each equity path
    
    Args:
        equity_paths: Array of equity curves (num_simulations x num_points)
        
    Returns:
        Array of maximum drawdowns for each simulation
    """
    # Calculate running maximum
    running_max = np.maximum.accumulate(equity_paths, axis=1)
    
    # Calculate drawdowns as percentage from peak
    drawdowns = (equity_paths - running_max) / running_max
    
    # Return maximum drawdown (most negative value) for each simulation
    max_drawdowns = np.min(drawdowns, axis=1)
    
    return np.abs(max_drawdowns)  # Return as positive percentages


def get_sample_paths(results: SimulationResults, num_paths: int = 10) -> np.ndarray:
    """
    Get a sample of equity paths for visualization
    
    Args:
        results: Simulation results
        num_paths: Number of paths to return
        
    Returns:
        Array of sampled equity paths
    """
    if num_paths >= results.equity_paths.shape[0]:
        return results.equity_paths
    
    # Sample paths evenly across the distribution
    indices = np.linspace(0, results.equity_paths.shape[0] - 1, num_paths, dtype=int)
    return results.equity_paths[indices]


def calculate_risk_metrics(results: SimulationResults) -> Dict[str, float]:
    """
    Calculate additional risk metrics from simulation results
    
    Args:
        results: Simulation results
        
    Returns:
        Dictionary of risk metrics
    """
    final_returns = (results.final_equity / results.equity_paths[0, 0]) - 1
    
    metrics = {
        "var_95": np.percentile(final_returns, 5),  # 5% VaR
        "cvar_95": np.mean(final_returns[final_returns <= np.percentile(final_returns, 5)]),  # Conditional VaR
        "profit_factor": calculate_profit_factor(results.trade_returns),
        "win_rate": np.mean(results.trade_returns > 0),
        "avg_win": np.mean(results.trade_returns[results.trade_returns > 0]) if np.any(results.trade_returns > 0) else 0,
        "avg_loss": np.mean(results.trade_returns[results.trade_returns < 0]) if np.any(results.trade_returns < 0) else 0,
        "largest_win": np.max(results.trade_returns),
        "largest_loss": np.min(results.trade_returns),
    }
    
    return metrics


def calculate_profit_factor(trade_returns: np.ndarray) -> float:
    """Calculate profit factor (gross profit / gross loss)"""
    wins = trade_returns[trade_returns > 0]
    losses = trade_returns[trade_returns < 0]
    
    if len(losses) == 0:
        return float('inf') if len(wins) > 0 else 1.0
    
    gross_profit = np.sum(wins)
    gross_loss = np.abs(np.sum(losses))
    
    return gross_profit / gross_loss if gross_loss > 0 else float('inf')


# Example usage and testing
if __name__ == "__main__":
    # Example parameters for testing
    params = SimulationParameters(
        p_win=0.45,           # 45% win rate
        r_win=2.5,            # 2.5:1 risk-reward
        risk_pct=0.005,       # 0.5% risk per trade
        trades_per_week=10,   # 10 trades per week
        weeks=52,             # 1 year
        cost_per_trade_usd=1, # $1 per trade
        slippage_bps=10,      # 10 basis points slippage
        num_simulations=1000  # 1000 Monte Carlo paths
    )
    
    results = run_monte_carlo_simulation(params)
    risk_metrics = calculate_risk_metrics(results)
    
    print(f"Mean Final Equity: ${results.mean_final_equity:,.2f}")
    print(f"P(2x or better): {results.prob_2x:.1%}")
    print(f"P(3x or better): {results.prob_3x:.1%}")
    print(f"P95 Max Drawdown: {results.p95_max_drawdown:.1%}")
    print(f"Sharpe Ratio: {results.sharpe_ratio:.2f}")
    print(f"Win Rate: {risk_metrics['win_rate']:.1%}")
    print(f"Profit Factor: {risk_metrics['profit_factor']:.2f}")