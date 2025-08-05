"""
Polygon.io API Client with async HTTP, retry logic, and Redis caching.

This client provides the foundation for fetching real market data to power
the asymmetric alpha scanner. It handles API failures gracefully and caches
data to respect rate limits.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from urllib.parse import urlencode

import httpx
from pydantic import BaseModel, Field
import redis.asyncio as redis

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class PolygonApiError(Exception):
    """Raised when Polygon.io API returns an error"""
    def __init__(self, message: str, status_code: Optional[int] = None, response_data: Optional[Dict] = None):
        self.message = message
        self.status_code = status_code
        self.response_data = response_data
        super().__init__(self.message)


class MarketSnapshot(BaseModel):
    """Single ticker market snapshot from Polygon.io"""
    ticker: str
    updated: int = Field(description="Unix timestamp of last update")
    day: Dict[str, float] = Field(description="Day's OHLCV data")
    last_quote: Optional[Dict[str, float]] = Field(None, description="Last quote data")
    last_trade: Optional[Dict[str, float]] = Field(None, description="Last trade data")
    prev_day: Optional[Dict[str, float]] = Field(None, description="Previous day's data")


class AggregateBar(BaseModel):
    """OHLCV aggregate bar from Polygon.io"""
    c: float = Field(description="Close price")
    h: float = Field(description="High price")
    l: float = Field(description="Low price")
    o: float = Field(description="Open price")
    v: float = Field(description="Volume")
    vw: Optional[float] = Field(None, description="Volume weighted average price")
    t: int = Field(description="Unix timestamp")
    n: Optional[int] = Field(None, description="Number of transactions")


class TickerOverview(BaseModel):
    """Ticker overview/details from Polygon.io"""
    ticker: str
    name: str
    description: Optional[str] = None
    market_cap: Optional[float] = None
    share_class_shares_outstanding: Optional[float] = None
    weighted_shares_outstanding: Optional[float] = None
    sic_code: Optional[str] = None
    sic_description: Optional[str] = None


class PolygonClient:
    """
    Async HTTP client for Polygon.io API with retry logic and Redis caching.
    
    Features:
    - Exponential backoff retry (max 3 attempts)
    - Redis caching with configurable TTL
    - Rate limiting compliance
    - Fixture mode for development
    """
    
    def __init__(self, 
                 api_key: Optional[str] = None,
                 base_url: str = "https://api.polygon.io",
                 use_live: bool = False,
                 redis_client: Optional[redis.Redis] = None):
        
        self.api_key = api_key or settings.POLYGON_API_KEY
        self.base_url = base_url
        self.use_live = use_live or settings.USE_POLYGON_LIVE
        self.redis_client = redis_client
        
        # HTTP client with timeout settings
        self.http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
        )
        
        # Rate limiting: Polygon free tier allows 5 requests per minute
        self.rate_limit_delay = 12.0  # seconds between requests
        self.last_request_time = 0.0
        
    async def __aenter__(self):
        if self.redis_client is None and settings.REDIS_URL:
            try:
                self.redis_client = redis.from_url(settings.REDIS_URL)
                await self.redis_client.ping()
                logger.info("Connected to Redis for caching")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}. Operating without cache.")
                self.redis_client = None
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.http_client.aclose()
        if self.redis_client:
            await self.redis_client.aclose()
    
    async def _wait_for_rate_limit(self):
        """Enforce rate limiting between API requests"""
        if not self.use_live:
            return  # No rate limiting for fixture mode
            
        current_time = asyncio.get_event_loop().time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit_delay:
            wait_time = self.rate_limit_delay - time_since_last
            logger.debug(f"Rate limiting: waiting {wait_time:.1f}s")
            await asyncio.sleep(wait_time)
        
        self.last_request_time = asyncio.get_event_loop().time()
    
    async def _get_cached(self, cache_key: str) -> Optional[Dict]:
        """Get data from Redis cache"""
        if not self.redis_client:
            return None
            
        try:
            cached_data = await self.redis_client.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logger.warning(f"Cache read error: {e}")
        
        return None
    
    async def _set_cache(self, cache_key: str, data: Dict, ttl_seconds: int = 300):
        """Set data in Redis cache with TTL"""
        if not self.redis_client:
            return
            
        try:
            await self.redis_client.setex(
                cache_key, 
                ttl_seconds, 
                json.dumps(data, default=str)
            )
        except Exception as e:
            logger.warning(f"Cache write error: {e}")
    
    async def _make_request(self, 
                          endpoint: str, 
                          params: Optional[Dict] = None,
                          max_retries: int = 3,
                          cache_ttl: int = 300) -> Dict:
        """
        Make HTTP request with retry logic and caching
        
        Args:
            endpoint: API endpoint path (e.g., '/v2/snapshot/locale/us/markets/stocks')
            params: Query parameters
            max_retries: Maximum retry attempts
            cache_ttl: Cache TTL in seconds (300 = 5 minutes)
        """
        
        # Use fixture data in development mode
        if not self.use_live:
            return await self._get_fixture_data(endpoint, params)
        
        # Build cache key
        cache_key = f"polygon:{endpoint}:{hash(str(sorted((params or {}).items())))}"
        
        # Try cache first
        cached_data = await self._get_cached(cache_key)
        if cached_data:
            logger.debug(f"Cache hit for {endpoint}")
            return cached_data
        
        # Prepare request
        if not self.api_key:
            raise PolygonApiError("Polygon.io API key not configured")
        
        url = f"{self.base_url}{endpoint}"
        request_params = {"apikey": self.api_key}
        if params:
            request_params.update(params)
        
        # Retry logic with exponential backoff
        last_exception = None
        for attempt in range(max_retries):
            try:
                await self._wait_for_rate_limit()
                
                logger.debug(f"Request attempt {attempt + 1}: {endpoint}")
                response = await self.http_client.get(url, params=request_params)
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # Check for API-level errors
                    if result.get("status") == "ERROR":
                        raise PolygonApiError(
                            result.get("error", "Unknown API error"),
                            response.status_code,
                            result
                        )
                    
                    # Cache successful response
                    await self._set_cache(cache_key, result, cache_ttl)
                    logger.debug(f"Successful API call: {endpoint}")
                    return result
                
                elif response.status_code == 429:
                    # Rate limited - wait longer
                    wait_time = 2 ** attempt * 10  # 10, 20, 40 seconds
                    logger.warning(f"Rate limited, waiting {wait_time}s")
                    await asyncio.sleep(wait_time)
                    continue
                
                else:
                    # Other HTTP errors
                    error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
                    raise PolygonApiError(error_msg, response.status_code)
                    
            except httpx.RequestError as e:
                last_exception = e
                wait_time = 2 ** attempt  # 1, 2, 4 seconds
                logger.warning(f"Request failed (attempt {attempt + 1}): {e}. Retrying in {wait_time}s")
                if attempt < max_retries - 1:
                    await asyncio.sleep(wait_time)
        
        # All retries failed
        raise PolygonApiError(f"Request failed after {max_retries} attempts: {last_exception}")
    
    async def _get_fixture_data(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Load fixture data for development mode"""
        # Map endpoints to fixture files
        fixture_map = {
            "/v2/snapshot/locale/us/markets/stocks": "tests/fixtures/polygon/full-market-snapshot.json",
            "/v2/snapshot/locale/us/markets/stocks/tickers": "tests/fixtures/polygon/single-ticker-snapshot.json",
            "/v2/aggs/ticker": "tests/fixtures/polygon/aggregates-daily.json",
        }
        
        fixture_file = None
        for pattern, file_path in fixture_map.items():
            if pattern in endpoint:
                fixture_file = file_path
                break
        
        if not fixture_file:
            logger.warning(f"No fixture found for endpoint: {endpoint}")
            return {"status": "OK", "results": []}
        
        try:
            with open(fixture_file, 'r') as f:
                data = json.load(f)
                logger.debug(f"Loaded fixture data from {fixture_file}")
                return data
        except FileNotFoundError:
            logger.warning(f"Fixture file not found: {fixture_file}")
            return {"status": "OK", "results": []}
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in fixture file {fixture_file}: {e}")
            return {"status": "OK", "results": []}
    
    # Public API methods
    
    async def get_full_market_snapshot(self) -> List[MarketSnapshot]:
        """
        Get full market snapshot for all US stocks
        
        Returns:
            List of MarketSnapshot objects with current market data
        """
        endpoint = "/v2/snapshot/locale/us/markets/stocks"
        
        try:
            result = await self._make_request(endpoint, cache_ttl=300)  # 5-minute cache
            
            snapshots = []
            for item in result.get("results", []):
                try:
                    snapshot = MarketSnapshot(**item)
                    snapshots.append(snapshot)
                except Exception as e:
                    logger.warning(f"Failed to parse snapshot for {item.get('ticker', 'unknown')}: {e}")
            
            logger.info(f"Retrieved {len(snapshots)} market snapshots")
            return snapshots
            
        except Exception as e:
            logger.error(f"Failed to get market snapshot: {e}")
            raise PolygonApiError(f"Market snapshot request failed: {e}")
    
    async def get_single_ticker_snapshot(self, ticker: str) -> Optional[MarketSnapshot]:
        """
        Get snapshot data for a single ticker
        
        Args:
            ticker: Stock symbol (e.g., 'AAPL')
            
        Returns:
            MarketSnapshot object or None if not found
        """
        endpoint = f"/v2/snapshot/locale/us/markets/stocks/tickers/{ticker.upper()}"
        
        try:
            result = await self._make_request(endpoint, cache_ttl=120)  # 2-minute cache
            
            results = result.get("results")
            if not results:
                logger.warning(f"No data found for ticker {ticker}")
                return None
            
            snapshot = MarketSnapshot(**results)
            logger.debug(f"Retrieved snapshot for {ticker}")
            return snapshot
            
        except Exception as e:
            logger.error(f"Failed to get snapshot for {ticker}: {e}")
            raise PolygonApiError(f"Single ticker snapshot failed: {e}")
    
    async def get_aggregates(self, 
                           ticker: str,
                           multiplier: int = 1,
                           timespan: str = "day",
                           from_date: str = None,
                           to_date: str = None,
                           limit: int = 5000) -> List[AggregateBar]:
        """
        Get aggregate OHLCV bars for a ticker
        
        Args:
            ticker: Stock symbol
            multiplier: Size of timespan multiplier (e.g., 1 for 1 day)
            timespan: Size of time window (minute, hour, day, week, month, quarter, year)
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            limit: Maximum number of results
            
        Returns:
            List of AggregateBar objects
        """
        
        # Default to last 100 days if no dates provided
        if not from_date or not to_date:
            to_date = datetime.now().strftime("%Y-%m-%d")
            from_date = (datetime.now() - timedelta(days=100)).strftime("%Y-%m-%d")
        
        endpoint = f"/v2/aggs/ticker/{ticker.upper()}/range/{multiplier}/{timespan}/{from_date}/{to_date}"
        params = {"limit": limit, "sort": "asc"}
        
        try:
            result = await self._make_request(endpoint, params, cache_ttl=3600)  # 1-hour cache
            
            bars = []
            for item in result.get("results", []):
                try:
                    bar = AggregateBar(**item)
                    bars.append(bar)
                except Exception as e:
                    logger.warning(f"Failed to parse bar data: {e}")
            
            logger.debug(f"Retrieved {len(bars)} bars for {ticker}")
            return bars
            
        except Exception as e:
            logger.error(f"Failed to get aggregates for {ticker}: {e}")
            raise PolygonApiError(f"Aggregates request failed: {e}")
    
    async def get_ticker_overview(self, ticker: str) -> Optional[TickerOverview]:
        """
        Get ticker overview/details
        
        Args:
            ticker: Stock symbol
            
        Returns:
            TickerOverview object or None if not found
        """
        endpoint = f"/v3/reference/tickers/{ticker.upper()}"
        
        try:
            result = await self._make_request(endpoint, cache_ttl=86400)  # 24-hour cache
            
            results = result.get("results")
            if not results:
                logger.warning(f"No overview data found for ticker {ticker}")
                return None
            
            overview = TickerOverview(**results)
            logger.debug(f"Retrieved overview for {ticker}")
            return overview
            
        except Exception as e:
            logger.error(f"Failed to get overview for {ticker}: {e}")
            raise PolygonApiError(f"Ticker overview request failed: {e}")


# Global client instance - will be initialized on first use
_polygon_client: Optional[PolygonClient] = None


async def get_polygon_client() -> PolygonClient:
    """Get or create the global Polygon.io client instance"""
    global _polygon_client
    
    if _polygon_client is None:
        _polygon_client = PolygonClient()
        await _polygon_client.__aenter__()
    
    return _polygon_client


# Convenience functions for quick access
async def get_market_snapshot() -> List[MarketSnapshot]:
    """Get full market snapshot - convenience function"""
    client = await get_polygon_client()
    return await client.get_full_market_snapshot()


async def get_ticker_snapshot(ticker: str) -> Optional[MarketSnapshot]:
    """Get single ticker snapshot - convenience function"""
    client = await get_polygon_client()
    return await client.get_single_ticker_snapshot(ticker)


async def get_ticker_bars(ticker: str, days: int = 100) -> List[AggregateBar]:
    """Get daily bars for ticker - convenience function"""
    client = await get_polygon_client()
    to_date = datetime.now().strftime("%Y-%m-%d")
    from_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    return await client.get_aggregates(ticker, from_date=from_date, to_date=to_date)