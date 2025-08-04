"""
Mock Data Service

Generates realistic mock trading opportunities for development and testing.
"""

import random
import uuid
from datetime import datetime, timezone, timedelta
from typing import List

from app.models.opportunities import Opportunity, FeatureScores, TradeSetup, RiskMetrics, GuardrailStatus

# Mock symbols with realistic price ranges
MOCK_SYMBOLS = [
    ("AAPL", 175.00, 185.00),
    ("GOOGL", 135.00, 145.00),
    ("MSFT", 375.00, 385.00),
    ("AMZN", 145.00, 155.00),
    ("TSLA", 240.00, 260.00),
    ("NVDA", 470.00, 490.00),
    ("META", 310.00, 330.00),
    ("NFLX", 425.00, 445.00),
    ("AMD", 105.00, 115.00),
    ("CRM", 250.00, 270.00),
    ("PYPL", 58.00, 68.00),
    ("UBER", 58.00, 68.00),
    ("SHOP", 65.00, 75.00),
    ("ZM", 68.00, 78.00),
    ("SQ", 72.00, 82.00),
    ("ROKU", 58.00, 68.00),
    ("SNAP", 11.00, 15.00),
    ("TWTR", 38.00, 48.00),
    ("SPOT", 145.00, 165.00),
    ("ABNB", 125.00, 145.00),
]


def generate_mock_opportunity(symbol: str, price_min: float, price_max: float) -> Opportunity:
    """Generate a single mock opportunity for a given symbol"""
    
    # Generate base price within range
    current_price = round(random.uniform(price_min, price_max), 2)
    
    # Generate scores with some correlation (0-10 scale)
    base_score = random.uniform(6.0, 9.5)  # Focus on higher quality signals
    price_score = max(0, min(10, base_score + random.uniform(-1.5, 1.5)))
    volume_score = max(0, min(10, base_score + random.uniform(-2.0, 2.0)))
    volatility_score = max(0, min(10, base_score + random.uniform(-1.0, 2.5)))
    
    # Overall score is weighted average
    overall_score = (price_score * 0.4 + volume_score * 0.3 + volatility_score * 0.3)
    
    # Generate trade setup (assuming long positions for simplicity)
    entry_offset = random.uniform(0.001, 0.01)  # 0.1% to 1% above current
    entry_price = round(current_price * (1 + entry_offset), 2)
    
    stop_offset = random.uniform(0.02, 0.08)  # 2% to 8% below entry
    stop_price = round(entry_price * (1 - stop_offset), 2)
    
    # Risk/reward ratio between 1.5:1 and 4.5:1 (within 1.0-5.0 validation range)
    rr_ratio = random.uniform(1.5, 4.5)
    risk_per_share = entry_price - stop_price
    reward_per_share = risk_per_share * rr_ratio
    target1_price = round(entry_price + reward_per_share, 2)
    
    # Optional second target
    target2_price = None
    if random.random() > 0.3:  # 70% chance of having a second target
        target2_price = round(target1_price + reward_per_share * 0.5, 2)
    
    # Position sizing (assume $10,000 account, 0.5% risk)
    account_size = 10000
    risk_amount = account_size * 0.005  # 0.5% risk
    position_size_shares = int(risk_amount / risk_per_share)
    position_size_usd = position_size_shares * entry_price
    
    # Risk metrics - ensure p_target is within validation range (0.2-0.8)
    p_target = 0.25 + (overall_score / 10) * 0.50  # 25% to 75% based on score
    slippage_bps = random.uniform(5, 25)  # 5 to 25 basis points
    costs_r = random.uniform(0.05, 0.15)  # 0.05R to 0.15R in costs
    net_expected_r = (p_target * rr_ratio) - ((1 - p_target) * 1) - costs_r
    
    # Generate some mock features - all values within validation ranges
    features = {
        "rvol": round(random.uniform(0.8, 2.8), 2),  # Within 0.5-3.0 range
        "atr_pct": round(random.uniform(1.5, 7.5), 2),  # Within 1.0-8.0 range
        "vwap_distance": round(random.uniform(-2.0, 2.0), 3),
        "ema_20_slope": round(random.uniform(-0.5, 0.5), 3),
        "volume_20d_avg": random.randint(5_000_000, 50_000_000),
        "regime": random.choice(["trending", "ranging", "breakout"]),
        "earnings_days": random.randint(5, 45),
    }
    
    # Guardrail status
    guardrail_status = GuardrailStatus.APPROVED
    guardrail_reason = None
    
    # Occasionally block signals for demonstration
    if random.random() < 0.1:  # 10% chance
        guardrail_status = GuardrailStatus.BLOCKED
        guardrail_reason = random.choice([
            "Max heat exceeded",
            "Daily stop loss reached",
            "Loss streak limit",
            "Low liquidity"
        ])
    elif random.random() < 0.15:  # 15% chance
        guardrail_status = GuardrailStatus.REVIEW
        guardrail_reason = random.choice([
            "High volatility",
            "Earnings within 5 days",
            "Wide spread"
        ])
    
    return Opportunity(
        id=str(uuid.uuid4()),
        symbol=symbol,
        timestamp=datetime.now(timezone.utc) - timedelta(minutes=random.randint(1, 30)),
        signal_score=round(overall_score, 1),
        scores=FeatureScores(
            price=round(price_score, 1),
            volume=round(volume_score, 1),
            volatility=round(volatility_score, 1),
            overall=round(overall_score, 1)
        ),
        setup=TradeSetup(
            entry=entry_price,
            stop=stop_price,
            target1=target1_price,
            target2=target2_price,
            position_size_usd=round(position_size_usd, 2),
            position_size_shares=position_size_shares,
            rr_ratio=round(rr_ratio, 2)
        ),
        risk=RiskMetrics(
            p_target=round(p_target, 3),
            net_expected_r=round(net_expected_r, 3),
            costs_r=round(costs_r, 3),
            slippage_bps=round(slippage_bps, 1)
        ),
        features=features,
        guardrail_status=guardrail_status,
        guardrail_reason=guardrail_reason,
        version="1.0.0"
    )


def get_mock_opportunities() -> List[Opportunity]:
    """Generate a list of mock opportunities"""
    opportunities = []
    
    # Generate 1-3 opportunities per symbol randomly
    for symbol, price_min, price_max in MOCK_SYMBOLS:
        if random.random() > 0.6:  # 40% chance of having an opportunity
            opportunities.append(generate_mock_opportunity(symbol, price_min, price_max))
    
    # Sort by signal score descending
    opportunities.sort(key=lambda x: x.signal_score, reverse=True)
    
    return opportunities