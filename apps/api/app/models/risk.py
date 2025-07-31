"""
Risk Management Models

Pydantic models for risk management endpoints including Monte Carlo simulation
request/response schemas and validation.
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Any, Optional
from datetime import datetime


class MonteCarloRequest(BaseModel):
    """Request model for Monte Carlo simulation"""
    
    p_win: float = Field(
        default=0.45,
        ge=0.0,
        le=1.0,
        description="Probability of winning trade (0.0-1.0)"
    )
    r_win: float = Field(
        default=2.5,
        gt=0.0,
        le=10.0,
        description="Risk-reward ratio for winning trades (e.g., 2.5 = 2.5:1)"
    )
    risk_pct: float = Field(
        default=0.005,
        gt=0.0001,
        le=0.1,
        description="Risk per trade as percentage of account (e.g., 0.005 = 0.5%)"
    )
    trades_per_week: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Number of trades per week"
    )
    weeks: int = Field(
        default=52,
        ge=1,
        le=520,
        description="Number of weeks to simulate (max 10 years)"
    )
    cost_per_trade_usd: float = Field(
        default=1.0,
        ge=0.0,
        le=100.0,
        description="Fixed cost per trade in USD"
    )
    slippage_bps: float = Field(
        default=10.0,
        ge=0.0,
        le=500.0,
        description="Slippage in basis points (e.g., 10 = 0.1%)"
    )
    starting_capital: float = Field(
        default=10000.0,
        ge=1000.0,
        le=10000000.0,
        description="Starting capital in USD"
    )
    num_simulations: int = Field(
        default=1000,
        ge=100,
        le=10000,
        description="Number of Monte Carlo simulation paths"
    )
    
    @field_validator('risk_pct')
    @classmethod
    def validate_risk_percentage(cls, v):
        """Ensure reasonable risk per trade"""
        if v > 0.05:  # 5%
            raise ValueError("Risk per trade should typically not exceed 5%")
        return v
    
    @field_validator('p_win')
    @classmethod
    def validate_win_probability(cls, v):
        """Validate win probability is reasonable"""
        if v < 0.1:
            raise ValueError("Win probability should be at least 10%")
        if v > 0.9:
            raise ValueError("Win probability should not exceed 90%")
        return v


class RiskMetrics(BaseModel):
    """Risk metrics from simulation"""
    
    prob_2x: float = Field(description="Probability of 2x or better return")
    prob_3x: float = Field(description="Probability of 3x or better return")
    prob_loss: float = Field(description="Probability of losing money")
    p95_max_drawdown: float = Field(description="95th percentile maximum drawdown")
    sharpe_ratio: float = Field(description="Annualized Sharpe ratio")
    var_95: float = Field(description="95% Value at Risk")
    cvar_95: float = Field(description="95% Conditional Value at Risk")
    win_rate: float = Field(description="Overall win rate across all trades")
    profit_factor: float = Field(description="Gross profit / gross loss ratio")


class EquityPathData(BaseModel):
    """Equity path data for visualization"""
    
    week: int = Field(description="Week number")
    equity: float = Field(description="Equity value at this point")


class MonteCarloResponse(BaseModel):
    """Response model for Monte Carlo simulation"""
    
    # Request parameters (echoed back)
    parameters: MonteCarloRequest = Field(description="Original request parameters")
    
    # Summary statistics
    mean_final_equity: float = Field(description="Mean final equity across all simulations")
    median_final_equity: float = Field(description="Median final equity")
    std_final_equity: float = Field(description="Standard deviation of final equity")
    min_equity: float = Field(description="Minimum final equity across simulations")
    max_equity: float = Field(description="Maximum final equity across simulations")
    
    # Risk metrics
    risk_metrics: RiskMetrics = Field(description="Comprehensive risk metrics")
    
    # Sample equity paths for visualization (limited number)
    sample_equity_paths: List[List[EquityPathData]] = Field(
        description="Sample equity paths for chart visualization"
    )
    
    # Final equity distribution (for histogram)
    final_equity_distribution: List[float] = Field(
        description="Final equity values for histogram visualization"
    )
    
    # Metadata
    timestamp: datetime = Field(description="When the simulation was run")
    computation_time_ms: float = Field(description="Time taken to run simulation in milliseconds")
    total_trades: int = Field(description="Total number of trades in simulation")


class ErrorResponse(BaseModel):
    """Error response model"""
    
    error: str = Field(description="Error type")
    message: str = Field(description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional error details"
    )


# Example usage for documentation
MONTE_CARLO_EXAMPLE_REQUEST = {
    "p_win": 0.45,
    "r_win": 2.5,
    "risk_pct": 0.005,
    "trades_per_week": 10,
    "weeks": 52,
    "cost_per_trade_usd": 1.0,
    "slippage_bps": 10.0,
    "starting_capital": 10000.0,
    "num_simulations": 1000
}

MONTE_CARLO_EXAMPLE_RESPONSE = {
    "parameters": MONTE_CARLO_EXAMPLE_REQUEST,
    "mean_final_equity": 25000.0,
    "median_final_equity": 22000.0,
    "std_final_equity": 15000.0,
    "min_equity": 5000.0,
    "max_equity": 75000.0,
    "risk_metrics": {
        "prob_2x": 0.75,
        "prob_3x": 0.45,
        "prob_loss": 0.15,
        "p95_max_drawdown": 0.25,
        "sharpe_ratio": 1.2,
        "var_95": -0.35,
        "cvar_95": -0.45,
        "win_rate": 0.45,
        "profit_factor": 1.8
    },
    "sample_equity_paths": [
        [{"week": 0, "equity": 10000}, {"week": 1, "equity": 10500}]
    ],
    "final_equity_distribution": [25000, 22000, 30000],
    "timestamp": "2024-01-15T10:30:00Z",
    "computation_time_ms": 125.5,
    "total_trades": 520
}