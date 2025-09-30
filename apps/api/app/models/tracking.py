"""
Signal Tracking and Trade Journal Models
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class SignalOutcome(str, Enum):
    """Possible outcomes for a tracked signal"""
    TARGET_HIT = "target_hit"
    STOPPED_OUT = "stopped_out"
    EXPIRED = "expired"
    STILL_OPEN = "still_open"


class SignalHistoryCreate(BaseModel):
    """Create a new signal history entry"""
    opportunity_id: Optional[str] = None
    symbol: str = Field(..., min_length=1, max_length=10)
    signal_score: float = Field(..., ge=0, le=100)
    p_target: float = Field(..., ge=0, le=1)
    
    # Signal details
    entry_price: Optional[float] = Field(None, gt=0)
    stop_price: Optional[float] = Field(None, gt=0)
    target_price: Optional[float] = Field(None, gt=0)
    rr_ratio: Optional[float] = Field(None, gt=0)
    
    # Outcome (optional at creation)
    outcome: Optional[SignalOutcome] = None
    entry_time: Optional[datetime] = None
    exit_price: Optional[float] = Field(None, gt=0)
    exit_time: Optional[datetime] = None
    
    # Metrics (calculated or provided)
    mfe: Optional[float] = None  # Max Favorable Excursion
    mae: Optional[float] = None  # Max Adverse Excursion
    actual_r: Optional[float] = None
    days_held: Optional[int] = Field(None, ge=0)
    
    notes: Optional[str] = None


class SignalHistoryUpdate(BaseModel):
    """Update signal outcome"""
    outcome: SignalOutcome
    exit_price: float = Field(..., gt=0)
    exit_time: datetime
    mfe: Optional[float] = None
    mae: Optional[float] = None
    actual_r: Optional[float] = None
    notes: Optional[str] = None


class SignalHistory(BaseModel):
    """Signal history response"""
    id: str
    user_id: str
    opportunity_id: Optional[str]
    symbol: str
    signal_score: float
    p_target: float
    
    entry_price: Optional[float]
    stop_price: Optional[float]
    target_price: Optional[float]
    rr_ratio: Optional[float]
    
    outcome: Optional[SignalOutcome]
    entry_time: Optional[datetime]
    exit_price: Optional[float]
    exit_time: Optional[datetime]
    
    mfe: Optional[float]
    mae: Optional[float]
    actual_r: Optional[float]
    days_held: Optional[int]
    
    notes: Optional[str]
    version: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TradeSide(str, Enum):
    """Trade direction"""
    LONG = "long"
    SHORT = "short"


class ExitReason(str, Enum):
    """Reason for trade exit"""
    TARGET_HIT = "target_hit"
    STOPPED_OUT = "stopped_out"
    MANUAL_CLOSE = "manual_close"
    TRAILING_STOP = "trailing_stop"
    TIME_STOP = "time_stop"


class TradeCreate(BaseModel):
    """Create a new trade"""
    symbol: str = Field(..., min_length=1, max_length=10)
    opportunity_id: Optional[str] = None
    side: TradeSide = TradeSide.LONG
    
    # Entry
    entry_time: datetime
    entry_price: float = Field(..., gt=0)
    position_size_shares: int = Field(..., gt=0)
    stop_loss: float = Field(..., gt=0)
    target_1: float = Field(..., gt=0)
    target_2: Optional[float] = Field(None, gt=0)
    
    # Exit (optional at creation for open trades)
    exit_time: Optional[datetime] = None
    exit_price: Optional[float] = Field(None, gt=0)
    exit_reason: Optional[ExitReason] = None
    
    # Performance (calculated or provided)
    pnl_usd: Optional[float] = None
    pnl_r: Optional[float] = None
    fees_usd: float = 0.0
    slippage_bps: Optional[float] = None
    
    # Metadata
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


class TradeUpdate(BaseModel):
    """Update an existing trade"""
    exit_time: Optional[datetime] = None
    exit_price: Optional[float] = Field(None, gt=0)
    exit_reason: Optional[ExitReason] = None
    pnl_usd: Optional[float] = None
    pnl_r: Optional[float] = None
    fees_usd: Optional[float] = None
    slippage_bps: Optional[float] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


class Trade(BaseModel):
    """Trade response"""
    id: str
    user_id: str
    symbol: str
    opportunity_id: Optional[str]
    side: TradeSide
    
    entry_time: datetime
    entry_price: float
    position_size_shares: int
    stop_loss: float
    target_1: float
    target_2: Optional[float]
    
    exit_time: Optional[datetime]
    exit_price: Optional[float]
    exit_reason: Optional[ExitReason]
    
    pnl_usd: Optional[float]
    pnl_r: Optional[float]
    fees_usd: float
    slippage_bps: Optional[float]
    
    tags: Optional[List[str]]
    notes: Optional[str]
    screenshots: Optional[List[str]]
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TradeStats(BaseModel):
    """Trading statistics"""
    total_trades: int
    open_trades: int
    closed_trades: int
    
    # Win/Loss
    winning_trades: int
    losing_trades: int
    win_rate: float
    
    # Performance
    total_pnl_usd: float
    avg_pnl_usd: float
    avg_pnl_r: float
    best_trade_r: Optional[float]
    worst_trade_r: Optional[float]
    
    # Risk metrics
    profit_factor: Optional[float]
    expectancy_r: float
    avg_winner_r: Optional[float]
    avg_loser_r: Optional[float]
    
    # Duration
    avg_hold_time_hours: Optional[float]
    
    # Recent performance
    last_10_trades_win_rate: Optional[float]
    last_10_trades_avg_r: Optional[float]


class CalibrationBucket(BaseModel):
    """Calibration analysis bucket"""
    predicted_range: str  # e.g., "30-40%"
    predicted_midpoint: float
    actual_hit_rate: float
    sample_size: int
    calibration_error: float  # |predicted - actual|


class CalibrationSummary(BaseModel):
    """Overall calibration analysis"""
    buckets: List[CalibrationBucket]
    overall_brier_score: float
    mean_absolute_error: float
    total_signals_tracked: int
    signals_with_outcomes: int
    calibration_status: str  # "PASSED", "INSUFFICIENT_DATA", "NEEDS_IMPROVEMENT"
    recommendation: str
