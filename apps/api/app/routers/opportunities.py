"""
Opportunities Router

Provides endpoints for trading opportunities with live scanner integration
and fallback to mock data for development.
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
import logging

from app.models.opportunities import Opportunity, OpportunitiesResponse
from app.services.mock_data import get_mock_opportunities
from app.db.database import get_db_session
from app.models.opportunity_db import OpportunityDB, Base as _Base  # noqa: F401
from app.services.scanner import scan_opportunities, get_opportunity_by_symbol as scan_opportunity_by_symbol
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


async def get_scanner_enabled() -> bool:
    """Dependency to check if live scanning is enabled"""
    return settings.USE_POLYGON_LIVE and bool(settings.POLYGON_API_KEY)


@router.get("/opportunities", response_model=OpportunitiesResponse)
async def get_opportunities(
    limit: int = Query(50, ge=1, le=500, description="Number of opportunities to return"),
    offset: int = Query(0, ge=0, description="Number of opportunities to skip"),
    min_score: Optional[float] = Query(None, ge=0, le=100, description="Minimum signal score (0-100 scale)"),
    status: Optional[str] = Query(None, description="Filter by guardrail status"),
    scanner_enabled: bool = Depends(get_scanner_enabled)
):
    """
    Get list of current trading opportunities.
    
    Returns trading opportunities with their risk metrics and trade setups.
    Uses live market scanning when enabled, falls back to mock data otherwise.
    """
    
    if scanner_enabled:
        try:
            # Use live scanner
            logger.info("Using live scanner for opportunities")
            min_score_filter = min_score or 5.0
            opportunities = await scan_opportunities(limit=limit, min_score=min_score_filter)
            
            # Apply status filter if provided
            if status:
                opportunities = [opp for opp in opportunities if opp.guardrail_status.value == status]
            
            # Apply offset (simple slice for now)
            if offset > 0:
                opportunities = opportunities[offset:]
            
            return OpportunitiesResponse(
                opportunities=opportunities,
                total=len(opportunities),
                limit=limit,
                offset=offset,
                timestamp=datetime.now(timezone.utc)
            )
            
        except Exception as e:
            logger.error(f"Error in live scanner, falling back to mock data: {e}")
            # Fall back to mock data on error
    
    # Use mock data (development mode or fallback)
    logger.info("Using mock data for opportunities")
    opportunities = get_mock_opportunities()
    
    # Apply filters to mock data
    if min_score is not None:
        opportunities = [opp for opp in opportunities if opp.signal_score >= min_score]
    
    if status:
        opportunities = [opp for opp in opportunities if opp.guardrail_status.value == status]
    
    # Apply pagination
    total = len(opportunities)
    opportunities = opportunities[offset:offset + limit]
    
    return OpportunitiesResponse(
        opportunities=opportunities,
        total=total,
        limit=limit,
        offset=offset,
        timestamp=datetime.now(timezone.utc)
    )


@router.post("/opportunities/persist", response_model=dict)
async def persist_opportunities(
    limit: int = Query(20, ge=1, le=100),
    min_score: float = Query(60.0, ge=0, le=100),
):
    """
    Compute top-N opportunities (fixtures/live based on flag) and persist to Postgres.
    MVP scope: upsert by id; requires database to be available via DATABASE_URL.
    """
    try:
        # Compute via scanner (uses fixtures when live is disabled)
        computed = await scan_opportunities(limit=limit, min_score=min_score)
        inserted = 0
        with get_db_session() as db:
            for opp in computed:
                db_item = db.get(OpportunityDB, opp.id)
                if not db_item:
                    db_item = OpportunityDB(id=opp.id)
                # Map fields
                db_item.symbol = opp.symbol
                db_item.ts = opp.timestamp
                db_item.signal_score = opp.signal_score
                db_item.price_score = opp.scores.price
                db_item.volume_score = opp.scores.volume
                db_item.volatility_score = opp.scores.volatility
                db_item.entry = opp.setup.entry
                db_item.stop = opp.setup.stop
                db_item.target1 = opp.setup.target1
                db_item.target2 = opp.setup.target2
                db_item.pos_size_usd = opp.setup.position_size_usd
                db_item.pos_size_shares = opp.setup.position_size_shares
                db_item.rr_ratio = opp.setup.rr_ratio
                db_item.p_target = opp.risk.p_target
                db_item.net_expected_r = opp.risk.net_expected_r
                db_item.costs_r = opp.risk.costs_r
                db_item.slippage_bps = opp.risk.slippage_bps
                db_item.guardrail_status = opp.guardrail_status
                db_item.guardrail_reason = opp.guardrail_reason
                db_item.features = opp.features
                db_item.version = opp.version
                db.add(db_item)
                inserted += 1
            db.commit()
        return {"status": "ok", "count": inserted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Persist failed: {e}")


@router.get("/opportunities/recent", response_model=OpportunitiesResponse)
async def get_recent_opportunities(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    Read recent opportunities from Postgres (if present), ordered by timestamp desc.
    """
    try:
        with get_db_session() as db:
            q = db.query(OpportunityDB).order_by(OpportunityDB.ts.desc()).offset(offset).limit(limit)
            rows = q.all()
            # Map DB rows to API model
            def _row_to_api(row: OpportunityDB):
                return Opportunity(
                    id=row.id,
                    symbol=row.symbol,
                    timestamp=row.ts,
                    signal_score=row.signal_score,
                    scores=FeatureScores(
                        price=row.price_score,
                        volume=row.volume_score,
                        volatility=row.volatility_score,
                        overall=row.signal_score,  # store overall in signal_score
                    ),
                    setup=TradeSetup(
                        entry=row.entry,
                        stop=row.stop,
                        target1=row.target1,
                        target2=row.target2,
                        position_size_usd=row.pos_size_usd,
                        position_size_shares=row.pos_size_shares,
                        rr_ratio=row.rr_ratio,
                    ),
                    risk=RiskMetrics(
                        p_target=row.p_target,
                        net_expected_r=row.net_expected_r,
                        costs_r=row.costs_r,
                        slippage_bps=row.slippage_bps,
                    ),
                    features=row.features or {},
                    guardrail_status=row.guardrail_status,
                    guardrail_reason=row.guardrail_reason,
                    version=row.version,
                )
            items = [_row_to_api(r) for r in rows]
            return OpportunitiesResponse(
                opportunities=items,
                total=len(items),
                limit=limit,
                offset=offset,
                timestamp=datetime.now(timezone.utc),
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Read failed: {e}")


@router.get("/opportunities/{symbol}", response_model=Opportunity)
async def get_opportunity_by_symbol(
    symbol: str,
    scanner_enabled: bool = Depends(get_scanner_enabled)
):
    """
    Get detailed opportunity data for a specific symbol.
    
    Returns comprehensive analysis including technical features, trade setup,
    probability estimates, and risk calculations for the given symbol.
    """
    
    symbol = symbol.upper()
    
    if scanner_enabled:
        try:
            # Use live scanner
            logger.info(f"Using live scanner for {symbol}")
            opportunity = await scan_opportunity_by_symbol(symbol)
            
            if opportunity:
                return opportunity
            else:
                raise HTTPException(
                    status_code=404,
                    detail=f"No viable opportunity found for symbol: {symbol}"
                )
                
        except Exception as e:
            logger.error(f"Error in live scanner for {symbol}, falling back to mock data: {e}")
            # Fall back to mock data on error
    
    # Use mock data (development mode or fallback)
    logger.info(f"Using mock data for {symbol}")
    opportunities = get_mock_opportunities()
    
    for opp in opportunities:
        if opp.symbol == symbol:
            return opp
    
    raise HTTPException(status_code=404, detail=f"Opportunity not found for symbol: {symbol}")


@router.post("/scan/preview", response_model=OpportunitiesResponse)
async def scan_preview(
    limit: int = Query(20, ge=1, le=100, description="Number of top opportunities to return"),
    min_score: float = Query(60.0, ge=0, le=100, description="Minimum signal score threshold (0-100 scale)"),
    scanner_enabled: bool = Depends(get_scanner_enabled)
):
    """
    Run a fresh scan to generate top opportunities from current market data.
    
    This endpoint computes opportunities in real-time from the latest market data,
    including:
    - Technical feature analysis (trend, momentum, volume, volatility)
    - Probability estimates (p_target)
    - Risk-reward calculations (rr_ratio)
    - Cost estimates (costs_r, net_expected_r)
    - Guardrail status assessment
    
    Returns the highest-scoring opportunities that meet the minimum score threshold.
    """
    
    # Always try to compute preview via scanner; Polygon client will use fixtures when live is disabled
    if not scanner_enabled:
        logger.info("Scanner not live; computing preview from fixtures via scanner")
    
    try:
        logger.info(f"Running live market scan - limit: {limit}, min_score: {min_score}")
        
        # Run scan (uses fixtures when USE_POLYGON_LIVE=false)
        opportunities = await scan_opportunities(limit=limit, min_score=min_score)
        
        logger.info(f"Scan completed - found {len(opportunities)} opportunities")
        
        return OpportunitiesResponse(
            opportunities=opportunities,
            total=len(opportunities),
            limit=limit,
            offset=0,
            timestamp=datetime.now(timezone.utc)
        )
        
    except Exception as e:
        logger.error(f"Error in scan preview: {e}")
        # Fall back to mock data if scanner errors
        fallback = get_mock_opportunities()
        fallback = [opp for opp in fallback if opp.signal_score >= min_score][:limit]
        return OpportunitiesResponse(
            opportunities=fallback,
            total=len(fallback),
            limit=limit,
            offset=0,
            timestamp=datetime.now(timezone.utc)
        )