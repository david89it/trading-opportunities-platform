#!/usr/bin/env python3
"""
Simple test of core scanner functions without external dependencies
"""

import sys
import os

# Add the app directory to Python path  
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.scanner import (
    calculate_ema, calculate_rsi, calculate_atr, calculate_vwap,
    compute_features, score_features, _find_pivot_high, _find_pivot_low,
    _calculate_pivot_proximity_score
)


def test_technical_indicators():
    """Test individual technical indicator calculations"""
    print("Testing technical indicators...")
    
    # Test data (10 days of mock OHLCV)
    prices = [100, 102, 101, 103, 105, 104, 106, 105, 107, 109]
    highs = [101, 103, 102, 104, 106, 105, 107, 106, 108, 110]
    lows = [99, 101, 100, 102, 104, 103, 105, 104, 106, 108]
    volumes = [1000, 1200, 800, 1500, 1100, 900, 1300, 1000, 1400, 1600]
    
    # Test EMA calculation
    ema_20 = calculate_ema(prices, 5)  # Use shorter period for test
    if ema_20:
        print(f"✅ EMA-5: {ema_20[-1]:.2f}")
    else:
        print("❌ EMA calculation failed")
        return False
    
    # Test RSI calculation  
    rsi = calculate_rsi(prices, 5)
    if rsi:
        print(f"✅ RSI-5: {rsi[-1]:.2f}")
    else:
        print("❌ RSI calculation failed")
        return False
    
    # Test ATR calculation
    atr = calculate_atr(highs, lows, prices, 5)
    if atr:
        print(f"✅ ATR-5: {atr[-1]:.2f}")
    else:
        print("❌ ATR calculation failed")
        return False
    
    # Test VWAP calculation
    vwap = calculate_vwap(highs, lows, prices, volumes)
    if vwap:
        print(f"✅ VWAP: {vwap[-1]:.2f}")
    else:
        print("❌ VWAP calculation failed")
        return False
    
    return True


def test_pivot_detection():
    """Test pivot point detection"""
    print("\nTesting pivot point detection...")
    
    # Test data with clear pivots
    highs = [100, 102, 105, 103, 101, 104, 108, 106, 104, 107, 105]
    lows = [98, 100, 103, 101, 99, 102, 106, 104, 102, 105, 103]
    closes = [99, 101, 104, 102, 100, 103, 107, 105, 103, 106, 104]
    
    # Test pivot high detection
    pivot_high = _find_pivot_high(highs, closes)
    if pivot_high:
        print(f"✅ Pivot High: {pivot_high:.2f}")
    else:
        print("⚠️ No pivot high found (this is okay)")
    
    # Test pivot low detection
    pivot_low = _find_pivot_low(lows, closes)
    if pivot_low:
        print(f"✅ Pivot Low: {pivot_low:.2f}")
    else:
        print("⚠️ No pivot low found (this is okay)")
    
    # Test proximity score
    current_price = 105.0
    proximity_score = _calculate_pivot_proximity_score(current_price, highs, lows, closes)
    print(f"✅ Pivot Proximity Score: {proximity_score:.2f}/10")
    
    return True


def test_feature_computation():
    """Test complete feature computation with mock data"""
    print("\nTesting feature computation...")
    
    # Create realistic mock data (50+ bars required)
    num_bars = 60
    bars = []
    
    for i in range(num_bars):
        base_price = 100 + i * 0.5 + (i % 10) * 2  # Trending up with noise
        
        bars.append({
            "o": base_price + 0.2,
            "h": base_price + 1.0,
            "l": base_price - 0.8,
            "c": base_price,
            "v": 1000 + (i % 5) * 200
        })
    
    # Mock snapshot
    snapshot = {
        "ticker": "TEST",
        "day": {
            "c": bars[-1]["c"],
            "v": bars[-1]["v"]
        },
        "lastQuote": {
            "b": bars[-1]["c"] - 0.05,
            "a": bars[-1]["c"] + 0.05
        }
    }
    
    try:
        # Compute features
        features = compute_features(bars, snapshot)
        
        # Check required features exist
        required_features = [
            "ema_20", "ema_50", "ema_200", 
            "rvol", "atr", "vwap",
            "pivot_proximity_score", "rsi_14"
        ]
        
        for feature in required_features:
            if feature in features:
                print(f"✅ {feature}: {features[feature]:.3f}")
            else:
                print(f"❌ Missing feature: {feature}")
                return False
        
        # Test feature scoring
        scores = score_features(features)
        print(f"\n✅ Price Score: {scores.price:.2f}/100")
        print(f"✅ Volume Score: {scores.volume:.2f}/100")
        print(f"✅ Volatility Score: {scores.volatility:.2f}/100")
        print(f"✅ Overall Score: {scores.overall:.2f}/100")
        
        return True
        
    except Exception as e:
        print(f"❌ Feature computation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("🔍 Testing Alpha Scanner Core Functions\n")
    
    tests = [
        test_technical_indicators,
        test_pivot_detection, 
        test_feature_computation
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                print("❌ Test failed")
        except Exception as e:
            print(f"❌ Test error: {e}")
        print()
    
    print(f"📊 Test Results: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 All scanner tests passed! Technical analysis engine is working correctly.")
        return True
    else:
        print("⚠️ Some tests failed. Check implementation.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)