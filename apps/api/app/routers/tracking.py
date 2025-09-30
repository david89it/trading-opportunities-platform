"""
Signal Tracking and Trade Journal Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from app.db.database import get_db
from app.models.tracking import (
    SignalHistory,
    SignalHistoryCreate,
    SignalHistoryUpdate,
    Trade,
    TradeCreate,
    TradeUpdate,
    TradeStats,
    CalibrationSummary,
    CalibrationBucket,
    SignalOutcome,
)
from app.models.opportunity_db import SignalHistoryDB, TradeDB

router = APIRouter(prefix="/api/v1/tracking", tags=["tracking"])


# --- SIGNAL HISTORY ENDPOINTS ---

@router.post("/signals", response_model=SignalHistory, status_code=201)
async def create_signal_history(
    signal: SignalHistoryCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000000"  # TODO: Get from auth
):
    """Create a new signal history entry for tracking"""
    
    # Calculate days_held if both times provided
    days_held = None
    if signal.entry_time and signal.exit_time:
        delta = signal.exit_time - signal.entry_time
        days_held = delta.days
    
    db_signal = SignalHistoryDB(
        id=uuid.uuid4(),
        user_id=uuid.UUID(user_id),
        opportunity_id=uuid.UUID(signal.opportunity_id) if signal.opportunity_id else None,
        symbol=signal.symbol,
        signal_score=signal.signal_score,
        p_target=signal.p_target,
        entry_price=signal.entry_price,
        stop_price=signal.stop_price,
        target_price=signal.target_price,
        rr_ratio=signal.rr_ratio,
        outcome=signal.outcome.value if signal.outcome else None,
        entry_time=signal.entry_time,
        exit_price=signal.exit_price,
        exit_time=signal.exit_time,
        mfe=signal.mfe,
        mae=signal.mae,
        actual_r=signal.actual_r,
        days_held=days_held or signal.days_held,
        notes=signal.notes,
        version="1.0",
    )
    
    db.add(db_signal)
    await db.commit()
    await db.refresh(db_signal)
    
    return SignalHistory.model_validate(db_signal)


@router.get("/signals", response_model=List[SignalHistory])
async def list_signal_history(
    symbol: Optional[str] = None,
    outcome: Optional[SignalOutcome] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000000"
):
    """Get signal history with optional filters"""
    
    query = select(SignalHistoryDB).where(SignalHistoryDB.user_id == uuid.UUID(user_id))
    
    if symbol:
        query = query.where(SignalHistoryDB.symbol == symbol.upper())
    if outcome:
        query = query.where(SignalHistoryDB.outcome == outcome.value)
    
    query = query.order_by(SignalHistoryDB.created_at.desc()).limit(limit).offset(offset)
    
    result = await db.execute(query)
    signals = result.scalars().all()
    
    return [SignalHistory.model_validate(sig) for sig in signals]


@router.patch("/signals/{signal_id}", response_model=SignalHistory)
async def update_signal_outcome(
    signal_id: str,
    update: SignalHistoryUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000000"
):
    """Update signal with outcome data"""
    
    query = select(SignalHistoryDB).where(
        and_(
            SignalHistoryDB.id == uuid.UUID(signal_id),
            SignalHistoryDB.user_id == uuid.UUID(user_id)
        )
    )
    result = await db.execute(query)
    db_signal = result.scalar_one_or_none()
    
    if not db_signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    
    # Calculate days held
    if db_signal.entry_time and update.exit_time:
        delta = update.exit_time - db_signal.entry_time
        db_signal.days_held = delta.days
    
    # Calculate actual_r if not provided
    if update.actual_r is None and db_signal.entry_price and db_signal.stop_price:
        risk_per_share = abs(db_signal.entry_price - db_signal.stop_price)
        if risk_per_share > 0:
            profit_per_share = update.exit_price - db_signal.entry_price
            update.actual_r = profit_per_share / risk_per_share
    
    # Update fields
    db_signal.outcome = update.outcome.value
    db_signal.exit_price = update.exit_price
    db_signal.exit_time = update.exit_time
    db_signal.mfe = update.mfe
    db_signal.mae = update.mae
    db_signal.actual_r = update.actual_r
    if update.notes:
        db_signal.notes = update.notes
    
    await db.commit()
    await db.refresh(db_signal)
    
    return SignalHistory.model_validate(db_signal)


# --- TRADE JOURNAL ENDPOINTS ---

@router.post("/trades", response_model=Trade, status_code=201)
async def create_trade(
    trade: TradeCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000000"
):
    """Create a new trade entry"""
    
    # Calculate P&L if exit provided
    pnl_usd = trade.pnl_usd
    pnl_r = trade.pnl_r
    
    if trade.exit_price and pnl_usd is None:
        if trade.side.value == "long":
            pnl_usd = (trade.exit_price - trade.entry_price) * trade.position_size_shares - trade.fees_usd
        else:  # short
            pnl_usd = (trade.entry_price - trade.exit_price) * trade.position_size_shares - trade.fees_usd
    
    if trade.exit_price and pnl_r is None:
        risk_per_share = abs(trade.entry_price - trade.stop_loss)
        if risk_per_share > 0:
            if trade.side.value == "long":
                profit_per_share = trade.exit_price - trade.entry_price
            else:
                profit_per_share = trade.entry_price - trade.exit_price
            pnl_r = (profit_per_share / risk_per_share)
    
    db_trade = TradeDB(
        id=uuid.uuid4(),
        user_id=uuid.UUID(user_id),
        symbol=trade.symbol,
        opportunity_id=uuid.UUID(trade.opportunity_id) if trade.opportunity_id else None,
        side=trade.side.value,
        entry_time=trade.entry_time,
        entry_price=trade.entry_price,
        position_size_shares=trade.position_size_shares,
        stop_loss=trade.stop_loss,
        target_1=trade.target_1,
        target_2=trade.target_2,
        exit_time=trade.exit_time,
        exit_price=trade.exit_price,
        exit_reason=trade.exit_reason.value if trade.exit_reason else None,
        pnl_usd=pnl_usd,
        pnl_r=pnl_r,
        fees_usd=trade.fees_usd,
        slippage_bps=trade.slippage_bps,
        tags=trade.tags,
        notes=trade.notes,
    )
    
    db.add(db_trade)
    await db.commit()
    await db.refresh(db_trade)
    
    return Trade.model_validate(db_trade)


@router.get("/trades", response_model=List[Trade])
async def list_trades(
    symbol: Optional[str] = None,
    open_only: bool = False,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000000"
):
    """Get trade history with optional filters"""
    
    query = select(TradeDB).where(TradeDB.user_id == uuid.UUID(user_id))
    
    if symbol:
        query = query.where(TradeDB.symbol == symbol.upper())
    if open_only:
        query = query.where(TradeDB.exit_time.is_(None))
    
    query = query.order_by(TradeDB.entry_time.desc()).limit(limit).offset(offset)
    
    result = await db.execute(query)
    trades = result.scalars().all()
    
    return [Trade.model_validate(t) for t in trades]


@router.get("/trades/stats", response_model=TradeStats)
async def get_trade_stats(
    symbol: Optional[str] = None,
    days: int = Query(90, le=365),
    db: AsyncSession = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000000"
):
    """Get trading statistics"""
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Base query
    query = select(TradeDB).where(
        and_(
            TradeDB.user_id == uuid.UUID(user_id),
            TradeDB.entry_time >= cutoff_date
        )
    )
    
    if symbol:
        query = query.where(TradeDB.symbol == symbol.upper())
    
    result = await db.execute(query)
    all_trades = result.scalars().all()
    
    if not all_trades:
        return TradeStats(
            total_trades=0,
            open_trades=0,
            closed_trades=0,
            winning_trades=0,
            losing_trades=0,
            win_rate=0.0,
            total_pnl_usd=0.0,
            avg_pnl_usd=0.0,
            avg_pnl_r=0.0,
            best_trade_r=None,
            worst_trade_r=None,
            profit_factor=None,
            expectancy_r=0.0,
            avg_winner_r=None,
            avg_loser_r=None,
            avg_hold_time_hours=None,
            last_10_trades_win_rate=None,
            last_10_trades_avg_r=None,
        )
    
    closed_trades = [t for t in all_trades if t.exit_time is not None]
    open_trades = [t for t in all_trades if t.exit_time is None]
    
    winning_trades = [t for t in closed_trades if t.pnl_r and t.pnl_r > 0]
    losing_trades = [t for t in closed_trades if t.pnl_r and t.pnl_r < 0]
    
    # Calculate stats
    total_pnl = sum(t.pnl_usd for t in closed_trades if t.pnl_usd)
    avg_pnl = total_pnl / len(closed_trades) if closed_trades else 0
    
    r_values = [t.pnl_r for t in closed_trades if t.pnl_r is not None]
    avg_r = sum(r_values) / len(r_values) if r_values else 0
    best_r = max(r_values) if r_values else None
    worst_r = min(r_values) if r_values else None
    
    winner_r_values = [t.pnl_r for t in winning_trades if t.pnl_r]
    loser_r_values = [t.pnl_r for t in losing_trades if t.pnl_r]
    
    avg_winner_r = sum(winner_r_values) / len(winner_r_values) if winner_r_values else None
    avg_loser_r = sum(loser_r_values) / len(loser_r_values) if loser_r_values else None
    
    # Profit factor
    total_wins = sum(t.pnl_usd for t in winning_trades if t.pnl_usd)
    total_losses = abs(sum(t.pnl_usd for t in losing_trades if t.pnl_usd))
    profit_factor = total_wins / total_losses if total_losses > 0 else None
    
    # Hold time
    hold_times = []
    for t in closed_trades:
        if t.exit_time:
            delta = t.exit_time - t.entry_time
            hold_times.append(delta.total_seconds() / 3600)  # hours
    avg_hold_time = sum(hold_times) / len(hold_times) if hold_times else None
    
    # Last 10 trades
    recent_10 = sorted(closed_trades, key=lambda t: t.entry_time, reverse=True)[:10]
    if recent_10:
        recent_winners = len([t for t in recent_10 if t.pnl_r and t.pnl_r > 0])
        last_10_win_rate = recent_winners / len(recent_10)
        recent_r = [t.pnl_r for t in recent_10 if t.pnl_r is not None]
        last_10_avg_r = sum(recent_r) / len(recent_r) if recent_r else None
    else:
        last_10_win_rate = None
        last_10_avg_r = None
    
    return TradeStats(
        total_trades=len(all_trades),
        open_trades=len(open_trades),
        closed_trades=len(closed_trades),
        winning_trades=len(winning_trades),
        losing_trades=len(losing_trades),
        win_rate=len(winning_trades) / len(closed_trades) if closed_trades else 0,
        total_pnl_usd=total_pnl,
        avg_pnl_usd=avg_pnl,
        avg_pnl_r=avg_r,
        best_trade_r=best_r,
        worst_trade_r=worst_r,
        profit_factor=profit_factor,
        expectancy_r=avg_r,
        avg_winner_r=avg_winner_r,
        avg_loser_r=avg_loser_r,
        avg_hold_time_hours=avg_hold_time,
        last_10_trades_win_rate=last_10_win_rate,
        last_10_trades_avg_r=last_10_avg_r,
    )


@router.patch("/trades/{trade_id}", response_model=Trade)
async def update_trade(
    trade_id: str,
    update: TradeUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000000"
):
    """Update an existing trade"""
    
    query = select(TradeDB).where(
        and_(
            TradeDB.id == uuid.UUID(trade_id),
            TradeDB.user_id == uuid.UUID(user_id)
        )
    )
    result = await db.execute(query)
    db_trade = result.scalar_one_or_none()
    
    if not db_trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    # Update fields
    if update.exit_time is not None:
        db_trade.exit_time = update.exit_time
    if update.exit_price is not None:
        db_trade.exit_price = update.exit_price
    if update.exit_reason is not None:
        db_trade.exit_reason = update.exit_reason.value
    if update.pnl_usd is not None:
        db_trade.pnl_usd = update.pnl_usd
    if update.pnl_r is not None:
        db_trade.pnl_r = update.pnl_r
    if update.fees_usd is not None:
        db_trade.fees_usd = update.fees_usd
    if update.slippage_bps is not None:
        db_trade.slippage_bps = update.slippage_bps
    if update.tags is not None:
        db_trade.tags = update.tags
    if update.notes is not None:
        db_trade.notes = update.notes
    
    await db.commit()
    await db.refresh(db_trade)
    
    return Trade.model_validate(db_trade)


# --- CALIBRATION ENDPOINTS ---

@router.get("/calibration", response_model=CalibrationSummary)
async def get_calibration_analysis(
    min_samples: int = Query(10, ge=5),
    db: AsyncSession = Depends(get_db),
    user_id: str = "00000000-0000-0000-0000-000000000000"
):
    """Analyze model calibration by comparing predicted vs actual probabilities"""
    
    # Get all signals with outcomes
    query = select(SignalHistoryDB).where(
        and_(
            SignalHistoryDB.user_id == uuid.UUID(user_id),
            SignalHistoryDB.outcome.isnot(None),
            SignalHistoryDB.outcome != SignalOutcome.STILL_OPEN.value
        )
    )
    
    result = await db.execute(query)
    signals = result.scalars().all()
    
    if len(signals) < min_samples:
        return CalibrationSummary(
            buckets=[],
            overall_brier_score=0.0,
            mean_absolute_error=0.0,
            total_signals_tracked=len(signals),
            signals_with_outcomes=len(signals),
            calibration_status="INSUFFICIENT_DATA",
            recommendation=f"Need at least {min_samples} tracked outcomes. Currently have {len(signals)}."
        )
    
    # Create probability buckets (0-20%, 20-40%, 40-60%, 60-80%, 80-100%)
    buckets = []
    bucket_ranges = [(0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.0)]
    
    brier_scores = []
    abs_errors = []
    
    for low, high in bucket_ranges:
        bucket_signals = [
            s for s in signals
            if low <= s.p_target < high
        ]
        
        if len(bucket_signals) < 3:  # Skip buckets with too few samples
            continue
        
        # Count how many actually hit target
        hits = len([s for s in bucket_signals if s.outcome == SignalOutcome.TARGET_HIT.value])
        actual_rate = hits / len(bucket_signals)
        predicted_midpoint = (low + high) / 2
        
        calibration_error = abs(predicted_midpoint - actual_rate)
        abs_errors.append(calibration_error)
        
        # Brier score for this bucket
        for s in bucket_signals:
            outcome_binary = 1 if s.outcome == SignalOutcome.TARGET_HIT.value else 0
            brier_scores.append((s.p_target - outcome_binary) ** 2)
        
        buckets.append(CalibrationBucket(
            predicted_range=f"{int(low*100)}-{int(high*100)}%",
            predicted_midpoint=predicted_midpoint,
            actual_hit_rate=actual_rate,
            sample_size=len(bucket_signals),
            calibration_error=calibration_error
        ))
    
    # Overall metrics
    overall_brier = sum(brier_scores) / len(brier_scores) if brier_scores else 0
    mae = sum(abs_errors) / len(abs_errors) if abs_errors else 0
    
    # Determine status
    if mae < 0.10:
        status = "PASSED"
        recommendation = "Excellent calibration! Your probability predictions are well-aligned with actual outcomes."
    elif mae < 0.20:
        status = "ACCEPTABLE"
        recommendation = "Good calibration. Minor adjustments may improve accuracy."
    else:
        status = "NEEDS_IMPROVEMENT"
        recommendation = "Significant calibration drift detected. Consider adjusting signal scoring logic."
    
    return CalibrationSummary(
        buckets=buckets,
        overall_brier_score=overall_brier,
        mean_absolute_error=mae,
        total_signals_tracked=len(signals),
        signals_with_outcomes=len(signals),
        calibration_status=status,
        recommendation=recommendation
    )
