"""
Tests for Polygon.io API Client

These tests verify the client works correctly in both fixture and live modes.
"""

import pytest
from unittest.mock import AsyncMock, patch
from typing import List

from app.services.polygon_client import (
    PolygonClient, 
    MarketSnapshot, 
    AggregateBar,
    TickerOverview,
    PolygonApiError,
    get_polygon_client
)


class TestPolygonClient:
    """Test suite for PolygonClient"""

    @pytest.fixture
    def client(self):
        """Create a test client instance"""
        return PolygonClient(
            api_key="test_key",
            use_live=False,  # Use fixture mode for tests
            redis_client=None  # No Redis for tests
        )

    @pytest.mark.asyncio
    async def test_client_context_manager(self):
        """Test client can be used as async context manager"""
        async with PolygonClient(use_live=False) as client:
            assert client is not None
            assert hasattr(client, 'http_client')

    @pytest.mark.asyncio
    async def test_get_full_market_snapshot_fixture_mode(self, client):
        """Test getting full market snapshot in fixture mode"""
        async with client:
            snapshots = await client.get_full_market_snapshot()
            
            assert isinstance(snapshots, list)
            assert len(snapshots) > 0
            
            # Verify first snapshot structure
            snapshot = snapshots[0]
            assert isinstance(snapshot, MarketSnapshot)
            assert snapshot.ticker in ["AAPL", "MSFT", "TSLA"]
            assert snapshot.updated > 0
            assert "c" in snapshot.day  # Close price
            assert snapshot.day["c"] > 0

    @pytest.mark.asyncio
    async def test_get_single_ticker_snapshot_fixture_mode(self, client):
        """Test getting single ticker snapshot in fixture mode"""
        async with client:
            snapshot = await client.get_single_ticker_snapshot("AAPL")
            
            assert snapshot is not None
            assert isinstance(snapshot, MarketSnapshot)
            assert snapshot.ticker == "AAPL"
            assert snapshot.day["c"] > 0
            assert snapshot.updated > 0

    @pytest.mark.asyncio
    async def test_get_aggregates_fixture_mode(self, client):
        """Test getting aggregate bars in fixture mode"""
        async with client:
            bars = await client.get_aggregates(
                ticker="AAPL",
                from_date="2021-01-01",
                to_date="2021-01-10"
            )
            
            assert isinstance(bars, list)
            assert len(bars) > 0
            
            # Verify first bar structure
            bar = bars[0]
            assert isinstance(bar, AggregateBar)
            assert bar.c > 0  # Close price
            assert bar.h >= bar.c  # High >= Close
            assert bar.l <= bar.c  # Low <= Close
            assert bar.v > 0  # Volume > 0
            assert bar.t > 0  # Timestamp > 0

    @pytest.mark.asyncio
    async def test_rate_limiting_in_fixture_mode(self, client):
        """Test that rate limiting doesn't apply in fixture mode"""
        async with client:
            import time
            start_time = time.time()
            
            # Make multiple requests quickly
            await client.get_single_ticker_snapshot("AAPL")
            await client.get_single_ticker_snapshot("MSFT")
            
            end_time = time.time()
            # Should be fast since no rate limiting in fixture mode
            assert end_time - start_time < 1.0

    @pytest.mark.asyncio
    async def test_error_handling_for_invalid_ticker(self, client):
        """Test error handling for non-existent endpoints"""
        async with client:
            # This should not raise an error but return empty results
            # since fixture mode provides graceful fallbacks
            snapshot = await client.get_single_ticker_snapshot("INVALID")
            # In fixture mode, this should return the default fixture data
            assert snapshot is not None

    @pytest.mark.asyncio
    async def test_caching_disabled_without_redis(self, client):
        """Test that client works without Redis caching"""
        # Client initialized without Redis should work fine
        async with client:
            snapshot = await client.get_single_ticker_snapshot("AAPL")
            assert snapshot is not None
            assert snapshot.ticker == "AAPL"

    @pytest.mark.asyncio
    async def test_convenience_functions(self):
        """Test the convenience functions work correctly"""
        # Mock the global client
        with patch('app.services.polygon_client._polygon_client') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get_full_market_snapshot.return_value = []
            mock_instance.get_single_ticker_snapshot.return_value = None
            mock_instance.get_aggregates.return_value = []
            mock_client = mock_instance
            
            # Import after mocking
            from app.services.polygon_client import (
                get_market_snapshot,
                get_ticker_snapshot,
                get_ticker_bars
            )
            
            # These should not raise errors
            snapshots = await get_market_snapshot()
            assert isinstance(snapshots, list)

    def test_polygon_api_error(self):
        """Test PolygonApiError exception"""
        error = PolygonApiError("Test error", status_code=400, response_data={"error": "test"})
        
        assert error.message == "Test error"
        assert error.status_code == 400
        assert error.response_data == {"error": "test"}
        assert str(error) == "Test error"


class TestPolygonDataModels:
    """Test Pydantic models for Polygon.io data"""

    def test_market_snapshot_model(self):
        """Test MarketSnapshot model validation"""
        data = {
            "ticker": "AAPL",
            "updated": 1691760000000,
            "day": {
                "c": 185.50,
                "h": 187.20,
                "l": 184.10,
                "o": 186.00,
                "v": 58423000,
                "vw": 185.80
            }
        }
        
        snapshot = MarketSnapshot(**data)
        assert snapshot.ticker == "AAPL"
        assert snapshot.updated == 1691760000000
        assert snapshot.day["c"] == 185.50

    def test_aggregate_bar_model(self):
        """Test AggregateBar model validation"""
        data = {
            "c": 185.50,
            "h": 187.20,
            "l": 184.10,
            "o": 186.00,
            "v": 58423000,
            "vw": 185.80,
            "t": 1691760000000,
            "n": 12345
        }
        
        bar = AggregateBar(**data)
        assert bar.c == 185.50
        assert bar.h == 187.20
        assert bar.v == 58423000
        assert bar.t == 1691760000000

    def test_ticker_overview_model(self):
        """Test TickerOverview model validation"""
        data = {
            "ticker": "AAPL",
            "name": "Apple Inc.",
            "description": "Technology company",
            "market_cap": 3000000000000,
            "share_class_shares_outstanding": 15000000000
        }
        
        overview = TickerOverview(**data)
        assert overview.ticker == "AAPL"
        assert overview.name == "Apple Inc."
        assert overview.market_cap == 3000000000000


# Integration test that can be run manually
@pytest.mark.integration
@pytest.mark.asyncio
async def test_real_api_integration():
    """
    Integration test with real Polygon.io API
    Only runs if POLYGON_API_KEY is set and USE_POLYGON_LIVE=true
    
    Run with: pytest -m integration tests/test_polygon_client.py
    """
    import os
    
    api_key = os.getenv("POLYGON_API_KEY")
    use_live = os.getenv("USE_POLYGON_LIVE", "false").lower() == "true"
    
    if not api_key or not use_live:
        pytest.skip("Real API integration test requires POLYGON_API_KEY and USE_POLYGON_LIVE=true")
    
    client = PolygonClient(api_key=api_key, use_live=True)
    
    async with client:
        # Test single ticker snapshot
        snapshot = await client.get_single_ticker_snapshot("AAPL")
        assert snapshot is not None
        assert snapshot.ticker == "AAPL"
        
        # Test aggregates
        bars = await client.get_aggregates("AAPL", limit=5)  # Get last 5 days
        assert len(bars) > 0
        assert all(bar.c > 0 for bar in bars)
        
        print(f"✅ Real API integration test passed")
        print(f"   - Got snapshot for AAPL: ${snapshot.day['c']}")
        print(f"   - Got {len(bars)} daily bars")


if __name__ == "__main__":
    # Quick test runner for development
    import asyncio
    
    async def quick_test():
        """Quick test for development"""
        client = PolygonClient(use_live=False)
        
        async with client:
            print("🧪 Testing Polygon.io client...")
            
            # Test market snapshot
            snapshots = await client.get_full_market_snapshot()
            print(f"✅ Market snapshot: {len(snapshots)} tickers")
            
            # Test single ticker
            aapl = await client.get_single_ticker_snapshot("AAPL")
            print(f"✅ AAPL snapshot: ${aapl.day['c'] if aapl else 'N/A'}")
            
            # Test aggregates
            bars = await client.get_aggregates("AAPL")
            print(f"✅ AAPL bars: {len(bars)} days")
            
            print("🎉 All tests passed!")
    
    asyncio.run(quick_test())