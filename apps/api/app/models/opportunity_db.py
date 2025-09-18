"""
SQLAlchemy models for persistence (MVP scope)
"""

from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base

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


