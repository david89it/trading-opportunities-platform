#!/usr/bin/env python3
"""
Quick test of the scanner functionality
"""

import asyncio
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.scanner import compute_features, score_features
from app.services.polygon_client import get_polygon_client


import pytest


@pytest.mark.asyncio
async def test_scanner():
    """Test scanner with real data"""
    print("Testing scanner functionality...")
    
    try:
        # Test with Apple (AAPL) data
        client = await get_polygon_client()
        
        # Get snapshot
        snapshot = await client.get_single_ticker_snapshot("AAPL")
        assert snapshot is not None, "Failed to get AAPL snapshot"
        
        # Get historical bars
        bars = await client.get_aggregates("AAPL", limit=100)
        assert len(bars) >= 50, "Insufficient historical data"
        
        # Convert to expected format
        bar_dicts = []
        for bar in bars:
            bar_dicts.append({
                "o": bar.o,
                "h": bar.h, 
                "l": bar.l,
                "c": bar.c,
                "v": bar.v
            })
        
        snapshot_dict = {
            "ticker": snapshot.ticker,
            "day": {
                "c": snapshot.day.get("c", bar_dicts[-1]["c"]),
                "v": snapshot.day.get("v", bar_dicts[-1]["v"])
            },
            "lastQuote": {
                "b": 150.0,  # Mock bid
                "a": 150.10  # Mock ask
            }
        }
        
        # Compute features
        print("Computing technical features...")
        features = compute_features(bar_dicts, snapshot_dict)
        
        # Check key features
        required_features = [
            "ema_20", "ema_50", "ema_200", 
            "rvol", "atr", "vwap",
            "pivot_proximity_score"
        ]
        
        for feature in required_features:
            assert feature in features, f"Missing feature: {feature}"
            print(f"✅ {feature}: {features[feature]}")
        
        # Score features
        print("\nScoring features...")
        scores = score_features(features)
        
        print(f"✅ Price Score: {scores.price/10:.2f}/10")
        print(f"✅ Volume Score: {scores.volume/10:.2f}/10") 
        print(f"✅ Volatility Score: {scores.volatility/10:.2f}/10")
        
        # Overall signal score on 0-10 scale (scores.overall is 0-100)
        overall_score = scores.overall / 10
        print(f"✅ Overall Signal Score: {overall_score:.2f}/10")
        
        print("\n🎉 Scanner test completed successfully!")
        assert True
        
    except Exception as e:
        print(f"❌ Scanner test failed: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    result = asyncio.run(test_scanner())
    sys.exit(0)