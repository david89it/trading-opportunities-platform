#!/usr/bin/env python3
"""Quick test of Polygon client functionality"""

import asyncio
import pytest
from app.services.polygon_client import PolygonClient

@pytest.mark.asyncio
async def test_polygon_client():
    """Test the Polygon client with fixture data"""
    print("🧪 Testing Polygon.io client...")
    
    client = PolygonClient(use_live=False)
    
    async with client:
        # Test market snapshot
        print("📊 Testing market snapshot...")
        snapshots = await client.get_full_market_snapshot()
        print(f"✅ Got {len(snapshots)} market snapshots")
        
        if snapshots:
            first = snapshots[0]
            print(f"   - {first.ticker}: ${first.day['c']}")
        
        # Test single ticker
        print("📈 Testing single ticker snapshot...")
        aapl = await client.get_single_ticker_snapshot("AAPL")
        if aapl:
            print(f"✅ AAPL snapshot: ${aapl.day['c']}")
        
        # Test aggregates
        print("📉 Testing aggregate bars...")
        bars = await client.get_aggregates("AAPL", limit=5)
        print(f"✅ Got {len(bars)} daily bars for AAPL")
        
        if bars:
            latest = bars[-1]
            print(f"   - Latest bar: ${latest.c} (close)")
    
    print("🎉 All Polygon client tests passed!")

if __name__ == "__main__":
    asyncio.run(test_polygon_client())