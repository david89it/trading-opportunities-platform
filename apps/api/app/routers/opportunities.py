"""
Opportunities Router
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.models.opportunities import Opportunity, FeatureScores, TradeSetup, RiskMetrics
from app.services.mock_data import get_mock_opportunities

router = APIRouter()


class OpportunitiesResponse(BaseModel):
    """Response model for opportunities endpoint"""
    opportunities: List[Opportunity]
    total: int
    limit: int
    offset: int
    timestamp: datetime


@router.get("/opportunities", response_model=OpportunitiesResponse)
async def get_opportunities(
    limit: int = Query(default=50, ge=1, le=200, description="Number of opportunities to return"),
    offset: int = Query(default=0, ge=0, description="Number of opportunities to skip"),
    min_score: Optional[float] = Query(default=None, ge=0, le=100, description="Minimum signal score"),
    symbol: Optional[str] = Query(default=None, description="Filter by symbol"),
):
    """
    Get trading opportunities
    
    Returns a list of current trading opportunities with their risk metrics
    and trade setups. Data is currently mocked for development.
    """
    opportunities = get_mock_opportunities()
    
    # Apply filters
    if min_score is not None:
        opportunities = [opp for opp in opportunities if opp.signal_score >= min_score]
    
    if symbol:
        opportunities = [opp for opp in opportunities if opp.symbol.upper() == symbol.upper()]
    
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
async def get_opportunity_by_symbol(symbol: str):
    """
    Get a specific opportunity by symbol
    
    Returns detailed information about a trading opportunity for the given symbol.
    """
    opportunities = get_mock_opportunities()
    
    for opp in opportunities:
        if opp.symbol.upper() == symbol.upper():
            return opp
    
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail=f"Opportunity not found for symbol: {symbol}")