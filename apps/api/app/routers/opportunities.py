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
    
    if not scanner_enabled:
        logger.warning("Scanner not enabled, returning mock preview data")
        # Return enhanced mock data for preview
        opportunities = get_mock_opportunities()
        opportunities = [opp for opp in opportunities if opp.signal_score >= min_score]
        
        return OpportunitiesResponse(
            opportunities=opportunities[:limit],
            total=len(opportunities),
            limit=limit,
            offset=0,
            timestamp=datetime.now(timezone.utc)
        )
    
    try:
        logger.info(f"Running live market scan - limit: {limit}, min_score: {min_score}")
        
        # Run live scan with current market data
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
        raise HTTPException(
            status_code=500,
            detail=f"Market scan failed: {str(e)}"
        )