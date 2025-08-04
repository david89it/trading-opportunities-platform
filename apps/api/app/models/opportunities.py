"""
Opportunity Models

Pydantic models for trading opportunities and related data structures.
Enhanced with comprehensive field validation for financial data integrity.
"""

import re
from datetime import datetime, time
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel, Field, field_validator, ConfigDict


class GuardrailStatus(str, Enum):
    """Guardrail status for trading opportunities"""
    APPROVED = "approved"
    REVIEW = "review"
    BLOCKED = "blocked"


class FeatureScores(BaseModel):
    """Feature scores for trading opportunity components"""
    model_config = ConfigDict(validate_assignment=True)
    
    price: float = Field(
        ge=0.0, 
        le=100.0,
        description="Price trend alignment score (0-100)"
    )
    volume: float = Field(
        ge=0.0, 
        le=100.0,
        description="Volume and liquidity score (0-100)"
    )
    volatility: float = Field(
        ge=0.0, 
        le=100.0,
        description="Volatility and momentum score (0-100)"
    )
    overall: float = Field(
        ge=0.0, 
        le=100.0,
        description="Combined weighted score (0-100)"
    )


class TradeSetup(BaseModel):
    """Trade execution setup with prices and position sizing"""
    model_config = ConfigDict(validate_assignment=True)
    
    entry: float = Field(
        gt=0.0,
        lt=10000.0,
        description="Entry price level"
    )
    stop: float = Field(
        gt=0.0,
        lt=10000.0,
        description="Stop loss price level"
    )
    target1: float = Field(
        gt=0.0,
        lt=10000.0,
        description="Primary target price"
    )
    target2: Optional[float] = Field(
        default=None,
        gt=0.0,
        lt=10000.0,
        description="Optional secondary target price"
    )
    position_size_usd: float = Field(
        ge=0.0,
        le=1000000.0,
        description="Position size in USD"
    )
    position_size_shares: int = Field(
        ge=0,
        le=1000000,
        description="Position size in shares"
    )
    rr_ratio: float = Field(
        ge=1.0,
        le=5.0,
        description="Risk to reward ratio (1:1 to 5:1)"
    )
    
    @field_validator('target2')
    @classmethod
    def validate_target2(cls, v, info):
        """Ensure target2 is greater than target1 if provided"""
        if v is not None and 'target1' in info.data:
            target1 = info.data['target1']
            if v <= target1:
                raise ValueError('target2 must be greater than target1')
        return v
    
    @field_validator('rr_ratio')
    @classmethod
    def validate_risk_reward(cls, v, info):
        """Validate risk-reward ratio calculation"""
        if 'entry' in info.data and 'stop' in info.data and 'target1' in info.data:
            entry = info.data['entry']
            stop = info.data['stop']
            target1 = info.data['target1']
            
            # Determine if this is a long or short position
            if stop < entry < target1:  # Long position
                risk = entry - stop
                reward = target1 - entry
            elif stop > entry > target1:  # Short position
                risk = stop - entry
                reward = entry - target1
            else:
                raise ValueError('Invalid price relationship: stop, entry, target must be in proper order')
            
            if risk <= 0 or reward <= 0:
                raise ValueError('Risk and reward must be positive')
                
            calculated_rr = reward / risk
            # Allow 5% tolerance for rounding
            if abs(calculated_rr - v) > 0.05 * v:
                raise ValueError(f'R:R ratio {v} does not match calculated ratio {calculated_rr:.2f}')
        
        return v


class RiskMetrics(BaseModel):
    """Risk assessment and probability calculations"""
    model_config = ConfigDict(validate_assignment=True)
    
    p_target: float = Field(
        ge=0.2,
        le=0.8,
        description="Probability of hitting target before stop (0.2-0.8)"
    )
    net_expected_r: float = Field(
        ge=-5.0,
        le=5.0,
        description="Net expected R after costs and slippage"
    )
    costs_r: float = Field(
        ge=0.0,
        le=1.0,
        description="Total costs in R units"
    )
    slippage_bps: float = Field(
        ge=0.0,
        le=100.0,
        description="Expected slippage in basis points"
    )


class Opportunity(BaseModel):
    """Complete trading opportunity with validation"""
    model_config = ConfigDict(validate_assignment=True)
    
    id: str = Field(
        pattern=r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        description="UUID v4 identifier"
    )
    symbol: str = Field(
        min_length=1,
        max_length=5,
        pattern=r'^[A-Z]+$',
        description="Stock ticker symbol (uppercase letters only)"
    )
    timestamp: datetime = Field(
        description="When the opportunity was identified"
    )
    signal_score: float = Field(
        ge=0.0,
        le=100.0,
        description="Overall signal strength (0-100)"
    )
    scores: FeatureScores = Field(
        description="Breakdown of signal component scores"
    )
    setup: TradeSetup = Field(
        description="Trade execution setup"
    )
    risk: RiskMetrics = Field(
        description="Risk assessment and probabilities"
    )
    features: Dict[str, Any] = Field(
        description="Raw feature data used in signal generation"
    )
    guardrail_status: GuardrailStatus = Field(
        default=GuardrailStatus.APPROVED,
        description="Risk management guardrail status"
    )
    guardrail_reason: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Explanation for guardrail status"
    )
    version: str = Field(
        default="1.0.0",
        pattern=r'^\d+\.\d+\.\d+$',
        description="Feature schema version"
    )
    
    @field_validator('timestamp')
    @classmethod
    def validate_market_hours(cls, v):
        """Validate timestamp is during reasonable market hours (ET)"""
        # Convert to ET for validation (simplified - in production use proper timezone handling)
        time_component = v.time()
        
        # Market hours: 4:00 AM - 8:00 PM ET (pre-market to after-hours)
        market_open = time(4, 0)   # 4:00 AM ET
        market_close = time(20, 0)  # 8:00 PM ET
        
        # Allow weekdays only (simplified - in production check for holidays)
        if v.weekday() > 4:  # Saturday = 5, Sunday = 6
            raise ValueError('Signals should only be generated on trading days (Mon-Fri)')
            
        if not (market_open <= time_component <= market_close):
            raise ValueError('Signals should be generated during extended market hours (4:00 AM - 8:00 PM ET)')
        
        return v
    
    @field_validator('features')
    @classmethod
    def validate_features(cls, v):
        """Validate required features are present with realistic values"""
        required_features = ['rvol', 'atr_pct']
        
        for feature in required_features:
            if feature not in v:
                raise ValueError(f'Required feature "{feature}" is missing')
        
        # Validate RVOL range (0.5-3.0)
        rvol = v.get('rvol')
        if not isinstance(rvol, (int, float)) or not (0.5 <= rvol <= 3.0):
            raise ValueError('RVOL must be between 0.5 and 3.0')
        
        # Validate ATR% range (1-8%)
        atr_pct = v.get('atr_pct')
        if not isinstance(atr_pct, (int, float)) or not (1.0 <= atr_pct <= 8.0):
            raise ValueError('ATR% must be between 1.0 and 8.0')
        
        return v


class OpportunitiesResponse(BaseModel):
    """Response model for opportunities API endpoints"""
    model_config = ConfigDict(validate_assignment=True)
    
    opportunities: List[Opportunity] = Field(
        description="List of trading opportunities"
    )
    total: int = Field(
        ge=0,
        description="Total number of opportunities available (before pagination)"
    )
    limit: int = Field(
        ge=1,
        le=500,
        description="Number of opportunities requested in this page"
    )
    offset: int = Field(
        ge=0,
        description="Number of opportunities skipped (pagination offset)"
    )
    timestamp: datetime = Field(
        description="ISO 8601 timestamp when the response was generated"
    )