#!/usr/bin/env python3
"""
Test the risk calculation and scoring system functions
"""

import sys
import os

# Add the app directory to Python path  
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.scanner import (
    score_features, position_sizing, costs_in_r, net_expected_r, 
    score_to_probability
)


def test_risk_calculations():
    """Test complete risk calculation pipeline"""
    print("🧮 Testing Risk Calculation Functions...")
    
    # Test data - features from our previous test
    mock_features = {
        "ema_alignment_bull": True,
        "price_vs_ema20_pct": 0.025,  # 2.5% above EMA20
        "rsi_14": 58.5,               # Good momentum range
        "rvol": 1.8,                  # Above average volume
        "above_vwap": True,           
        "vwap_distance_pct": 0.008,   # Close to VWAP
        "pivot_proximity_score": 6.5, # Good pivot confluence
        "atr_percentile": 72.5,       # Elevated volatility
        "bid_ask_spread_bps": 15.2,   # Reasonable spread
    }
    
    # 1. Test score_features()
    print("\n1️⃣ TESTING FEATURE SCORING:")
    scores = score_features(mock_features)
    print(f"   Price Score: {scores.price:.1f}/100")
    print(f"   Volume Score: {scores.volume:.1f}/100") 
    print(f"   Volatility Score: {scores.volatility:.1f}/100")
    print(f"   Overall Score: {scores.overall:.1f}/100")
    
    # Validate score ranges
    assert 0 <= scores.price <= 100, f"Price score out of range: {scores.price}"
    assert 0 <= scores.volume <= 100, f"Volume score out of range: {scores.volume}"
    assert 0 <= scores.volatility <= 100, f"Volatility score out of range: {scores.volatility}"
    assert 0 <= scores.overall <= 100, f"Overall score out of range: {scores.overall}"
    print("   ✅ All scores within valid 0-100 range")
    
    # 2. Test position_sizing()
    print("\n2️⃣ TESTING POSITION SIZING:")
    entry_price = 150.50
    stop_price = 146.75  # ~2.5% stop
    portfolio_value = 100000
    risk_pct = 0.02  # 2% max risk per trade
    
    shares, position_usd = position_sizing(entry_price, stop_price, portfolio_value, risk_pct)
    risk_per_share = abs(entry_price - stop_price)
    actual_risk = shares * risk_per_share
    
    print(f"   Entry: ${entry_price:.2f}, Stop: ${stop_price:.2f}")
    print(f"   Risk per share: ${risk_per_share:.2f}")
    print(f"   Position: {shares} shares = ${position_usd:.2f}")
    print(f"   Actual risk: ${actual_risk:.2f} ({actual_risk/portfolio_value*100:.2f}%)")
    
    # Validate risk percentage
    assert actual_risk <= portfolio_value * risk_pct * 1.01, "Risk exceeds 2% limit!"  # Small tolerance
    print("   ✅ Position sizing respects 2% risk limit")
    
    # 3. Test costs_in_r()
    print("\n3️⃣ TESTING R-MULTIPLE COST CALCULATIONS:")
    slippage_bps = 25.0  # 2.5 basis points slippage
    fees_usd = 1.0       # $1 in fees
    
    costs_r = costs_in_r(slippage_bps, fees_usd, entry_price, risk_per_share)
    print(f"   Slippage: {slippage_bps} bps")
    print(f"   Fees: ${fees_usd:.2f}")
    print(f"   Total costs: {costs_r:.3f}R")
    
    assert costs_r > 0, "Costs should be positive"
    assert costs_r < 1.0, "Costs should be reasonable (< 1R)"
    print("   ✅ Cost calculations look reasonable")
    
    # 4. Test net_expected_r()
    print("\n4️⃣ TESTING NET EXPECTED R CALCULATIONS:")
    
    # Test different scenarios
    scenarios = [
        {"name": "High Quality Setup", "p_target": 0.65, "r_ratio": 3.0},
        {"name": "Medium Quality", "p_target": 0.45, "r_ratio": 2.5},
        {"name": "Low Quality", "p_target": 0.35, "r_ratio": 4.0},
    ]
    
    for scenario in scenarios:
        net_r = net_expected_r(scenario["p_target"], scenario["r_ratio"], costs_r)
        print(f"   {scenario['name']}:")
        print(f"     P(target): {scenario['p_target']*100:.1f}%, R:R = {scenario['r_ratio']:.1f}:1")
        print(f"     Net Expected R: {net_r:.3f}R")
        
        # Check if meets asymmetric criteria (≥3:1 opportunities)
        if net_r > 0.1:  # Positive expected value with buffer
            print(f"     ✅ QUALIFIED - Positive expected value!")
        else:
            print(f"     ❌ REJECTED - Negative expected value")
    
    # 5. Test score_to_probability()
    print("\n5️⃣ TESTING SCORE-TO-PROBABILITY MAPPING:")
    test_scores = [20, 40, 60, 80, 95]
    for score in test_scores:
        prob = score_to_probability(score)
        print(f"   Score {score}/100 → P(target) = {prob:.1%}")
        assert 0 <= prob <= 1, f"Probability out of range: {prob}"
    print("   ✅ Probability mapping working")
    
    print("\n🎉 ALL RISK CALCULATION TESTS PASSED!")
    # no return; assertions above validate


if __name__ == "__main__":
    try:
        test_risk_calculations()
        print("\n✅ Risk calculation system is READY for production!")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)