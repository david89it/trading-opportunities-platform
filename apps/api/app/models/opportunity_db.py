"""
SQLAlchemy models for persistence (MVP scope)
"""

from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, Index, TIMESTAMP, Text, ARRAY, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class OpportunityDB(Base):
    __tablename__ = "opportunities"

    id = Column(String, primary_key=True, index=True)
    # Supabase user identifier (UUID). Nullable for backfilled rows created pre-auth.
    user_id = Column(UUID(as_uuid=True), index=True, nullable=True)
    symbol = Column(String, index=True, nullable=False)
    ts = Column(DateTime, index=True, nullable=False)

    # Scores (0-100)
    signal_score = Column(Float, nullable=False)
    price_score = Column(Float, nullable=False)
    volume_score = Column(Float, nullable=False)
    volatility_score = Column(Float, nullable=False)

    # Trade setup
    entry = Column(Float, nullable=False)
    stop = Column(Float, nullable=False)
    target1 = Column(Float, nullable=False)
    target2 = Column(Float, nullable=True)
    pos_size_usd = Column(Float, nullable=False)
    pos_size_shares = Column(Integer, nullable=False)
    rr_ratio = Column(Float, nullable=False)

    # Risk metrics
    p_target = Column(Float, nullable=False)
    net_expected_r = Column(Float, nullable=False)
    costs_r = Column(Float, nullable=False)
    slippage_bps = Column(Float, nullable=False)

    # Guardrails
    guardrail_status = Column(String, nullable=False)
    guardrail_reason = Column(String, nullable=True)

    # Raw features
    features = Column(JSON, nullable=False)

    version = Column(String, nullable=False)

    __table_args__ = (
        Index("ix_opportunities_symbol_ts", "symbol", "ts", unique=False),
    )


class SignalHistoryDB(Base):
    """Signal tracking history for calibration analysis"""
    __tablename__ = "signal_history"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'), nullable=False, index=True)
    opportunity_id = Column(UUID(as_uuid=True), nullable=True)
    symbol = Column(String(10), nullable=False, index=True)
    signal_score = Column(Float, nullable=False)
    p_target = Column(Float, nullable=False)
    
    # Signal details
    entry_price = Column(Float, nullable=True)
    stop_price = Column(Float, nullable=True)
    target_price = Column(Float, nullable=True)
    rr_ratio = Column(Float, nullable=True)
    
    # Outcome
    outcome = Column(String(20), nullable=True, index=True)
    entry_time = Column(TIMESTAMP(timezone=True), nullable=True)
    exit_price = Column(Float, nullable=True)
    exit_time = Column(TIMESTAMP(timezone=True), nullable=True)
    
    # Metrics
    mfe = Column(Float, nullable=True)  # Maximum Favorable Excursion
    mae = Column(Float, nullable=True)  # Maximum Adverse Excursion
    actual_r = Column(Float, nullable=True)
    days_held = Column(Integer, nullable=True)
    
    notes = Column(Text, nullable=True)
    version = Column(String(10), nullable=False, server_default='1.0')
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class TradeDB(Base):
    """Trade journal for tracking actual trades"""
    __tablename__ = "trades"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Trade ID
    symbol = Column(String(10), nullable=False, index=True)
    opportunity_id = Column(UUID(as_uuid=True), nullable=True)
    side = Column(String(10), nullable=False, server_default='long')
    
    # Entry
    entry_time = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    entry_price = Column(Float, nullable=False)
    position_size_shares = Column(Integer, nullable=False)
    stop_loss = Column(Float, nullable=False)
    target_1 = Column(Float, nullable=False)
    target_2 = Column(Float, nullable=True)
    
    # Exit
    exit_time = Column(TIMESTAMP(timezone=True), nullable=True, index=True)
    exit_price = Column(Float, nullable=True)
    exit_reason = Column(String(50), nullable=True)
    
    # Performance
    pnl_usd = Column(Float, nullable=True)
    pnl_r = Column(Float, nullable=True)
    fees_usd = Column(Float, nullable=False, server_default='0')
    slippage_bps = Column(Float, nullable=True)
    
    # Metadata
    tags = Column(ARRAY(String(50)), nullable=True)
    notes = Column(Text, nullable=True)
    screenshots = Column(ARRAY(String(500)), nullable=True)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


