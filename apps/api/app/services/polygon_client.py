"""
Polygon.io API Client

Handles market data fetching with retries, rate limiting, and caching.
Supports both live API and fixture data for development.
"""

import asyncio
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import httpx
import logging
from functools import wraps

from app.core.config import settings

logger = logging.getLogger(__name__)

# API Configuration
POLYGON_BASE_URL = "https://api.polygon.io"
FIXTURES_PATH = Path(__file__).parent.parent.parent.parent / "tests" / "fixtures" / "polygon"

# Rate limiting configuration based on tier
RATE_LIMITS = {
    "free": {"requests_per_minute": 5, "delay_ms": 12000},
    "basic": {"requests_per_minute": 100, "delay_ms": 600},
    "starter": {"requests_per_minute": 500, "delay_ms": 120},
    "developer": {"requests_per_minute": 1000, "delay_ms": 60},
}

class PolygonAPIError(Exception):
    """Custom exception for Polygon API errors"""
    def __init__(self, status_code: int, message: str, response_data: Optional[Dict] = None):
        self.status_code = status_code
        self.message = message
        self.response_data = response_data or {}
        super().__init__(f"Polygon API Error {status_code}: {message}")

class RateLimiter:
    """Simple rate limiter for API requests"""
    
    def __init__(self, requests_per_minute: int = 100):
        self.requests_per_minute = requests_per_minute
        self.min_delay = 60.0 / requests_per_minute
        self.last_request = 0.0
    
    async def acquire(self):
        """Acquire rate limit slot, waiting if necessary"""
        now = asyncio.get_event_loop().time()
        time_passed = now - self.last_request
        
        if time_passed < self.min_delay:
            wait_time = self.min_delay - time_passed
            await asyncio.sleep(wait_time)
        
        self.last_request = asyncio.get_event_loop().time()

def with_retries(max_retries: int = 3, backoff_factor: float = 1.0):
    """Decorator for retrying failed requests with exponential backoff"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except PolygonAPIError as e:
                    last_exception = e
                    
                    # Don't retry on 4xx errors (except 429 rate limit)
                    if 400 <= e.status_code < 500 and e.status_code != 429:
                        raise
                    
                    if attempt == max_retries:
                        raise
                    
                    # Exponential backoff
                    wait_time = backoff_factor * (2 ** attempt)
                    logger.warning(
                        f"API request failed (attempt {attempt + 1}/{max_retries + 1}), "
                        f"retrying in {wait_time}s: {e}"
                    )
                    await asyncio.sleep(wait_time)
                
                except Exception as e:
                    last_exception = e
                    if attempt == max_retries:
                        raise
                    
                    wait_time = backoff_factor * (2 ** attempt)
                    logger.warning(f"Request failed, retrying in {wait_time}s: {e}")
                    await asyncio.sleep(wait_time)
            
            # This should never be reached, but just in case
            if last_exception:
                raise last_exception
                
        return wrapper
    return decorator

class PolygonClient:
    """
    Polygon.io API client with rate limiting, caching, and fixture support.
    
    Automatically switches between live API and fixture data based on
    USE_POLYGON_LIVE configuration setting.
    """
    
    def __init__(self, api_key: Optional[str] = None, tier: str = "basic"):
        self.api_key = api_key or settings.POLYGON_API_KEY
        self.use_live = settings.USE_POLYGON_LIVE and bool(self.api_key)
        self.tier = tier
        
        # Setup rate limiter
        rate_config = RATE_LIMITS.get(tier, RATE_LIMITS["basic"])
        self.rate_limiter = RateLimiter(rate_config["requests_per_minute"])
        
        # HTTP client for live API
        self.client = httpx.AsyncClient(
            base_url=POLYGON_BASE_URL,
            timeout=30.0,
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
        )
        
        logger.info(
            f"PolygonClient initialized - Live API: {self.use_live}, "
            f"Tier: {tier}, Rate limit: {rate_config['requests_per_minute']}/min"
        )
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
    
    def _load_fixture(self, fixture_name: str) -> Dict[str, Any]:
        """Load fixture data from JSON file"""
        fixture_path = FIXTURES_PATH / f"{fixture_name}.json"
        
        if not fixture_path.exists():
            raise FileNotFoundError(f"Fixture not found: {fixture_path}")
        
        with open(fixture_path, 'r') as f:
            return json.load(f)
    
    @with_retries(max_retries=3, backoff_factor=1.0)
    async def _make_request(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make authenticated request to Polygon API"""
        if not self.use_live:
            raise ValueError("Live API not available - check configuration")
        
        await self.rate_limiter.acquire()
        
        # Add API key to parameters
        params = params or {}
        params["apikey"] = self.api_key
        
        logger.debug(f"Making request to {endpoint} with params: {params}")
        
        try:
            response = await self.client.get(endpoint, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            # Check for API-level errors
            if data.get("status") == "ERROR":
                error_msg = data.get("error", "Unknown API error")
                raise PolygonAPIError(
                    status_code=response.status_code,
                    message=error_msg,
                    response_data=data
                )
            
            return data
            
        except httpx.HTTPStatusError as e:
            error_data = {}
            try:
                error_data = e.response.json()
            except:
                pass
                
            raise PolygonAPIError(
                status_code=e.response.status_code,
                message=f"HTTP {e.response.status_code}: {e.response.text}",
                response_data=error_data
            )
        
        except httpx.RequestError as e:
            raise PolygonAPIError(
                status_code=0,
                message=f"Request failed: {str(e)}"
            )
    
    async def get_full_market_snapshot(self) -> Dict[str, Any]:
        """
        Get current market data for all US stock tickers.
        
        Returns:
            Full market snapshot with all tickers and their current data
        """
        if not self.use_live:
            logger.info("Using fixture data for full market snapshot")
            return self._load_fixture("full-market-snapshot")
        
        return await self._make_request(
            "/v2/snapshot/locale/us/markets/stocks/tickers",
            params={"include_otc": "false"}
        )
    
    async def get_single_ticker_snapshot(self, ticker: str) -> Dict[str, Any]:
        """
        Get current market data for a specific ticker.
        
        Args:
            ticker: Stock symbol (e.g., 'AAPL')
            
        Returns:
            Single ticker snapshot data
        """
        ticker = ticker.upper()
        
        if not self.use_live:
            logger.info(f"Using fixture data for {ticker} snapshot")
            fixture_data = self._load_fixture("single-ticker-snapshot")
            # Modify fixture to match requested ticker
            fixture_data["results"]["ticker"] = ticker
            return fixture_data
        
        return await self._make_request(
            f"/v2/snapshot/locale/us/markets/stocks/tickers/{ticker}"
        )
    
    async def get_aggregates(
        self,
        ticker: str,
        multiplier: int = 1,
        timespan: str = "day",
        from_date: str = None,
        to_date: str = None,
        adjusted: bool = True,
        sort: str = "asc",
        limit: int = 5000
    ) -> Dict[str, Any]:
        """
        Get historical aggregate bars for a ticker.
        
        Args:
            ticker: Stock symbol
            multiplier: Size of timespan multiplier
            timespan: Timespan of bars (minute, hour, day, week, month, quarter, year)
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            adjusted: Adjust for splits
            sort: Sort order (asc or desc)
            limit: Max results
            
        Returns:
            Historical aggregate data
        """
        ticker = ticker.upper()
        
        # Default date range (last 5 days)
        if not from_date or not to_date:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=5)
            from_date = start_date.strftime("%Y-%m-%d")
            to_date = end_date.strftime("%Y-%m-%d")
        
        if not self.use_live:
            logger.info(f"Using fixture data for {ticker} aggregates")
            fixture_data = self._load_fixture("aggregates-daily")
            # Modify fixture to match requested ticker
            fixture_data["ticker"] = ticker
            return fixture_data
        
        endpoint = f"/v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from_date}/{to_date}"
        params = {
            "adjusted": str(adjusted).lower(),
            "sort": sort,
            "limit": limit
        }
        
        return await self._make_request(endpoint, params)
    
    async def get_ticker_overview(self, ticker: str) -> Dict[str, Any]:
        """
        Get detailed information about a ticker.
        
        Args:
            ticker: Stock symbol
            
        Returns:
            Ticker overview with company information
        """
        ticker = ticker.upper()
        
        if not self.use_live:
            logger.info(f"Using mock data for {ticker} overview")
            # Generate mock ticker overview
            return {
                "status": "OK",
                "results": {
                    "ticker": ticker,
                    "name": f"{ticker} Inc.",
                    "market": "stocks",
                    "locale": "us",
                    "primary_exchange": "XNAS",
                    "type": "CS",
                    "active": True,
                    "currency_name": "usd",
                    "market_cap": 2800000000000 if ticker == "AAPL" else 1000000000000,
                    "description": f"Mock description for {ticker}",
                    "list_date": "1980-12-12",
                    "total_employees": 164000 if ticker == "AAPL" else 50000
                }
            }
        
        return await self._make_request(f"/v3/reference/tickers/{ticker}")
    
    async def get_market_status(self) -> Dict[str, Any]:
        """
        Get current market status.
        
        Returns:
            Market status information
        """
        if not self.use_live:
            # Mock market status
            now = datetime.now()
            hour = now.hour
            
            # Simple market hours simulation (9:30 AM - 4:00 PM ET)
            if 9 <= hour < 16:
                market_status = "open"
            elif 4 <= hour < 9:
                market_status = "early_hours"
            elif 16 <= hour < 20:
                market_status = "late_hours"
            else:
                market_status = "closed"
            
            return {
                "status": "OK",
                "results": {
                    "market": "stocks",
                    "serverTime": now.isoformat(),
                    "exchanges": {
                        "nasdaq": market_status,
                        "nyse": market_status,
                    }
                }
            }
        
        return await self._make_request("/v1/marketstatus/now")

# Global client instance
_client_instance: Optional[PolygonClient] = None

def get_polygon_client() -> PolygonClient:
    """Get the global Polygon client instance"""
    global _client_instance
    
    if _client_instance is None:
        _client_instance = PolygonClient()
    
    return _client_instance

async def close_polygon_client():
    """Close the global Polygon client"""
    global _client_instance
    
    if _client_instance:
        await _client_instance.close()
        _client_instance = None

# Convenience functions for common operations
async def get_tickers_snapshot(tickers: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Get snapshots for specific tickers or all tickers.
    
    Args:
        tickers: List of ticker symbols, or None for all tickers
        
    Returns:
        List of ticker snapshots
    """
    client = get_polygon_client()
    
    if tickers:
        # Get individual ticker snapshots
        results = []
        for ticker in tickers:
            snapshot = await client.get_single_ticker_snapshot(ticker)
            if snapshot.get("results"):
                results.append(snapshot["results"])
        return results
    else:
        # Get full market snapshot
        snapshot = await client.get_full_market_snapshot()
        return snapshot.get("results", [])

async def get_liquid_universe(min_volume: int = 1000000, min_price: float = 5.0) -> List[str]:
    """
    Get list of liquid stock tickers based on volume and price criteria.
    
    Args:
        min_volume: Minimum daily volume
        min_price: Minimum stock price
        
    Returns:
        List of liquid ticker symbols
    """
    snapshots = await get_tickers_snapshot()
    
    liquid_tickers = []
    for snapshot in snapshots:
        day_data = snapshot.get("day", {})
        volume = day_data.get("v", 0)
        price = day_data.get("c", 0)
        
        if volume >= min_volume and price >= min_price:
            liquid_tickers.append(snapshot["ticker"])
    
    return liquid_tickers[:500]  # Limit to top 500 for performance

# Market hours utilities
def is_market_open() -> bool:
    """
    Check if the market is currently open (simplified version).
    
    Returns:
        True if market is open, False otherwise
    """
    now = datetime.now()
    hour = now.hour
    weekday = now.weekday()
    
    # Weekend
    if weekday >= 5:
        return False
    
    # Regular market hours: 9:30 AM - 4:00 PM ET (simplified)
    return 9 <= hour < 16

def get_next_market_open() -> datetime:
    """
    Get the next market open time.
    
    Returns:
        Datetime of next market open
    """
    now = datetime.now()
    
    # Simple logic: next weekday at 9:30 AM
    next_open = now.replace(hour=9, minute=30, second=0, microsecond=0)
    
    # If it's past market hours today, go to tomorrow
    if now.hour >= 16:
        next_open += timedelta(days=1)
    
    # Skip weekends
    while next_open.weekday() >= 5:
        next_open += timedelta(days=1)
    
    return next_open