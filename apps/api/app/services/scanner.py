"""
Core Alpha Scanner Logic

Pure functions for computing features, scoring signals, and generating
trading opportunities from market data.

Features computed:
- Trend alignment (20/50/200 EMA)
- ATR percentile and volatility measures
- Relative volume (RVOL)
- VWAP distance and z-score
- Momentum and pivot proximity
- Regime flags (bull/bear/sideways)
"""

import math
import uuid
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import logging

from app.models.opportunities import (
    Opportunity, FeatureScores, TradeSetup, GuardrailStatus, RiskMetrics
)
from app.services.polygon_client import get_polygon_client
from app.core.config import settings

logger = logging.getLogger(__name__)

# Feature computation constants
EMA_PERIODS = {"fast": 20, "medium": 50, "slow": 200}
RSI_PERIOD = 14
ATR_PERIOD = 14
VOLUME_SMA_PERIOD = 20
BOLLINGER_PERIOD = 20
BOLLINGER_STD = 2.0

# Scoring weights and thresholds
SCORE_WEIGHTS = {
    "trend_alignment": 0.4,
    "momentum": 0.3,
    "volume": 0.2,
    "volatility": 0.1
}

TREND_THRESHOLDS = {
    "strong_bull": {"ema_alignment": True, "price_above_ema20": 0.02},
    "bull": {"ema_alignment": True, "price_above_ema20": 0.005},
    "sideways": {"ema_alignment": False, "price_range": 0.03},
    "bear": {"ema_alignment": False, "price_below_ema20": -0.005}
}

def calculate_ema(prices: List[float], period: int) -> List[float]:
    """
    Calculate Exponential Moving Average.
    
    Args:
        prices: List of prices (oldest first)
        period: EMA period
        
    Returns:
        List of EMA values
    """
    if len(prices) < period:
        return []
    
    alpha = 2.0 / (period + 1)
    ema_values = []
    
    # Initialize with SMA for first value
    sma = sum(prices[:period]) / period
    ema_values.append(sma)
    
    # Calculate EMA for remaining values
    for i in range(period, len(prices)):
        ema = alpha * prices[i] + (1 - alpha) * ema_values[-1]
        ema_values.append(ema)
    
    return ema_values

def calculate_rsi(prices: List[float], period: int = RSI_PERIOD) -> List[float]:
    """
    Calculate Relative Strength Index.
    
    Args:
        prices: List of prices
        period: RSI period
        
    Returns:
        List of RSI values
    """
    if len(prices) < period + 1:
        return []
    
    # Calculate price changes
    changes = [prices[i] - prices[i-1] for i in range(1, len(prices))]
    
    gains = [max(change, 0) for change in changes]
    losses = [abs(min(change, 0)) for change in changes]
    
    rsi_values = []
    
    # Initial average gain and loss
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    
    for i in range(period, len(changes)):
        # Smoothed averages
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        
        if avg_loss == 0:
            rsi = 100
        else:
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))
        
        rsi_values.append(rsi)
    
    return rsi_values

def calculate_atr(highs: List[float], lows: List[float], closes: List[float], 
                  period: int = ATR_PERIOD) -> List[float]:
    """
    Calculate Average True Range.
    
    Args:
        highs: List of high prices
        lows: List of low prices
        closes: List of close prices
        period: ATR period
        
    Returns:
        List of ATR values
    """
    if len(highs) < period + 1:
        return []
    
    true_ranges = []
    
    for i in range(1, len(highs)):
        tr1 = highs[i] - lows[i]
        tr2 = abs(highs[i] - closes[i-1])
        tr3 = abs(lows[i] - closes[i-1])
        true_ranges.append(max(tr1, tr2, tr3))
    
    atr_values = []
    
    # Initial ATR (simple average)
    initial_atr = sum(true_ranges[:period]) / period
    atr_values.append(initial_atr)
    
    # Smoothed ATR
    for i in range(period, len(true_ranges)):
        atr = (atr_values[-1] * (period - 1) + true_ranges[i]) / period
        atr_values.append(atr)
    
    return atr_values

def calculate_vwap(highs: List[float], lows: List[float], closes: List[float], 
                   volumes: List[float]) -> List[float]:
    """
    Calculate Volume Weighted Average Price.
    
    Args:
        highs: List of high prices
        lows: List of low prices  
        closes: List of close prices
        volumes: List of volumes
        
    Returns:
        List of VWAP values
    """
    if len(closes) != len(volumes):
        return []
    
    vwap_values = []
    cumulative_pv = 0
    cumulative_volume = 0
    
    for i in range(len(closes)):
        typical_price = (highs[i] + lows[i] + closes[i]) / 3
        pv = typical_price * volumes[i]
        
        cumulative_pv += pv
        cumulative_volume += volumes[i]
        
        if cumulative_volume > 0:
            vwap = cumulative_pv / cumulative_volume
            vwap_values.append(vwap)
        else:
            vwap_values.append(closes[i])
    
    return vwap_values

def compute_features(bars: List[Dict[str, Any]], snapshot: Dict[str, Any], 
                    ref_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Compute technical features from market data.
    
    Args:
        bars: Historical OHLCV data (oldest first)
        snapshot: Current market snapshot
        ref_data: Optional reference data (ticker overview)
        
    Returns:
        Dictionary of computed features
    """
    if len(bars) < 50:  # Need at least 50 bars for reliable calculations
        raise ValueError("Insufficient historical data for feature computation")
    
    # Extract OHLCV data
    opens = [bar["o"] for bar in bars]
    highs = [bar["h"] for bar in bars]
    lows = [bar["l"] for bar in bars]
    closes = [bar["c"] for bar in bars]
    volumes = [bar["v"] for bar in bars]
    
    current_price = snapshot.get("day", {}).get("c", closes[-1])
    current_volume = snapshot.get("day", {}).get("v", volumes[-1])
    
    # Calculate technical indicators
    ema_20 = calculate_ema(closes, EMA_PERIODS["fast"])
    ema_50 = calculate_ema(closes, EMA_PERIODS["medium"])
    ema_200 = calculate_ema(closes, EMA_PERIODS["slow"])
    
    rsi = calculate_rsi(closes)
    atr = calculate_atr(highs, lows, closes)
    vwap = calculate_vwap(highs, lows, closes, volumes)
    
    # Volume moving average
    volume_sma = []
    for i in range(VOLUME_SMA_PERIOD - 1, len(volumes)):
        sma = sum(volumes[i-VOLUME_SMA_PERIOD+1:i+1]) / VOLUME_SMA_PERIOD
        volume_sma.append(sma)
    
    # Current values (latest)
    current_ema_20 = ema_20[-1] if ema_20 else current_price
    current_ema_50 = ema_50[-1] if ema_50 else current_price
    current_ema_200 = ema_200[-1] if ema_200 else current_price
    current_rsi = rsi[-1] if rsi else 50.0
    current_atr = atr[-1] if atr else 0.02 * current_price
    current_vwap = vwap[-1] if vwap else current_price
    current_volume_sma = volume_sma[-1] if volume_sma else current_volume
    
    # Feature calculations
    features = {
        # Trend alignment
        "ema_20": current_ema_20,
        "ema_50": current_ema_50,
        "ema_200": current_ema_200,
        "ema_alignment_bull": current_ema_20 > current_ema_50 > current_ema_200,
        "price_vs_ema20_pct": (current_price - current_ema_20) / current_ema_20,
        "price_vs_ema50_pct": (current_price - current_ema_50) / current_ema_50,
        
        # Momentum indicators
        "rsi_14": current_rsi,
        "rsi_oversold": current_rsi < 30,
        "rsi_overbought": current_rsi > 70,
        
        # Volatility measures
        "atr": current_atr,
        "atr_percent": (current_atr / current_price) * 100,
        "atr_percentile": _calculate_percentile(atr[-20:] if len(atr) >= 20 else atr, current_atr),
        
        # Volume analysis
        "volume": current_volume,
        "volume_sma_20": current_volume_sma,
        "rvol": current_volume / current_volume_sma if current_volume_sma > 0 else 1.0,
        "volume_spike": current_volume > 2.0 * current_volume_sma,
        
        # VWAP analysis
        "vwap": current_vwap,
        "vwap_distance_pct": (current_price - current_vwap) / current_vwap,
        "above_vwap": current_price > current_vwap,
        
        # Pivot point analysis
        "pivot_high": _find_pivot_high(highs, closes),
        "pivot_low": _find_pivot_low(lows, closes),
        "pivot_proximity_score": _calculate_pivot_proximity_score(current_price, highs, lows, closes),
        
        # Price action
        "daily_range_pct": ((highs[-1] - lows[-1]) / closes[-1]) * 100,
        "gap_vs_prev": (opens[-1] - closes[-2]) / closes[-2] if len(closes) > 1 else 0,
        
        # Market microstructure (from snapshot)
        "bid_ask_spread_bps": _calculate_spread_bps(snapshot),
        "market_cap": ref_data.get("results", {}).get("market_cap") if ref_data else None,
        
        # Computed at current time
        "timestamp": datetime.utcnow().isoformat(),
        "bars_count": len(bars),
    }
    
    return features

def _calculate_percentile(values: List[float], current_value: float) -> float:
    """Calculate percentile of current value within historical values"""
    if not values:
        return 50.0
    
    sorted_values = sorted(values)
    position = sum(1 for v in sorted_values if v <= current_value)
    return (position / len(sorted_values)) * 100

def _calculate_spread_bps(snapshot: Dict[str, Any]) -> float:
    """Calculate bid-ask spread in basis points"""
    last_quote = snapshot.get("lastQuote", {})
    bid = last_quote.get("b", 0)
    ask = last_quote.get("a", 0)
    
    if bid <= 0 or ask <= 0:
        return 50.0  # Default spread assumption
    
    spread = ask - bid
    mid_price = (ask + bid) / 2
    
    if mid_price <= 0:
        return 50.0
    
    return (spread / mid_price) * 10000  # Convert to basis points

def _find_pivot_high(highs: List[float], closes: List[float], window: int = 10) -> Optional[float]:
    """Find recent pivot high level"""
    if len(highs) < window * 2:
        return None
    
    # Look at recent data for pivot detection
    recent_highs = highs[-window*3:]
    
    # Find local maxima (pivot highs)
    pivot_highs = []
    for i in range(window, len(recent_highs) - window):
        current = recent_highs[i]
        is_pivot = True
        
        # Check if current value is highest in the window
        for j in range(i - window, i + window + 1):
            if j != i and recent_highs[j] >= current:
                is_pivot = False
                break
        
        if is_pivot:
            pivot_highs.append(current)
    
    return max(pivot_highs) if pivot_highs else None

def _find_pivot_low(lows: List[float], closes: List[float], window: int = 10) -> Optional[float]:
    """Find recent pivot low level"""
    if len(lows) < window * 2:
        return None
    
    # Look at recent data for pivot detection
    recent_lows = lows[-window*3:]
    
    # Find local minima (pivot lows)
    pivot_lows = []
    for i in range(window, len(recent_lows) - window):
        current = recent_lows[i]
        is_pivot = True
        
        # Check if current value is lowest in the window
        for j in range(i - window, i + window + 1):
            if j != i and recent_lows[j] <= current:
                is_pivot = False
                break
        
        if is_pivot:
            pivot_lows.append(current)
    
    return min(pivot_lows) if pivot_lows else None

def _calculate_pivot_proximity_score(current_price: float, highs: List[float], 
                                   lows: List[float], closes: List[float]) -> float:
    """
    Calculate proximity score to key pivot levels (0-10 scale).
    Higher score = closer to significant support/resistance levels
    """
    pivot_high = _find_pivot_high(highs, closes)
    pivot_low = _find_pivot_low(lows, closes)
    
    if not pivot_high and not pivot_low:
        return 0.0
    
    scores = []
    
    # Distance to pivot high (resistance)
    if pivot_high:
        high_distance_pct = abs(current_price - pivot_high) / pivot_high
        # Closer to pivot = higher score (within 2% gets max score)
        if high_distance_pct <= 0.005:  # Within 0.5%
            scores.append(10.0)
        elif high_distance_pct <= 0.01:  # Within 1%
            scores.append(8.0)
        elif high_distance_pct <= 0.02:  # Within 2%
            scores.append(6.0)
        elif high_distance_pct <= 0.05:  # Within 5%
            scores.append(3.0)
        else:
            scores.append(0.0)
    
    # Distance to pivot low (support)
    if pivot_low:
        low_distance_pct = abs(current_price - pivot_low) / pivot_low
        # Closer to pivot = higher score
        if low_distance_pct <= 0.005:  # Within 0.5%
            scores.append(10.0)
        elif low_distance_pct <= 0.01:  # Within 1%
            scores.append(8.0)
        elif low_distance_pct <= 0.02:  # Within 2%
            scores.append(6.0)  
        elif low_distance_pct <= 0.05:  # Within 5%
            scores.append(3.0)
        else:
            scores.append(0.0)
    
    return max(scores) if scores else 0.0

def score_features(features: Dict[str, Any]) -> FeatureScores:
    """
    Score features to generate price, volume, and volatility sub-scores.
    
    Args:
        features: Computed features dictionary
        
    Returns:
        FeatureScores with individual scores (0-10 scale)
    """
    
    # Price Score (trend alignment + momentum)
    price_score = 0.0
    
    # Trend alignment (40% of price score)
    if features["ema_alignment_bull"]:
        price_score += 4.0
    
    # Price position vs EMAs (30% of price score)
    price_vs_ema20 = features["price_vs_ema20_pct"]
    if price_vs_ema20 > 0.02:  # > 2% above EMA20
        price_score += 3.0
    elif price_vs_ema20 > 0.005:  # > 0.5% above EMA20
        price_score += 1.5
    elif price_vs_ema20 < -0.02:  # > 2% below EMA20
        price_score += 0.5
    
    # RSI momentum (30% of price score)
    rsi = features["rsi_14"]
    if 45 <= rsi <= 65:  # Sweet spot
        price_score += 3.0
    elif 35 <= rsi < 45 or 65 < rsi <= 75:  # Decent momentum
        price_score += 2.0
    elif rsi < 30:  # Oversold bounce potential
        price_score += 1.0
    
    # Volume Score
    volume_score = 0.0
    
    # Relative volume (60% of volume score)
    rvol = features["rvol"]
    if rvol >= 2.0:  # High volume
        volume_score += 6.0
    elif rvol >= 1.5:  # Above average
        volume_score += 4.0
    elif rvol >= 1.2:  # Slightly above average
        volume_score += 2.0
    elif rvol < 0.5:  # Very low volume
        volume_score += 0.5
    
    # VWAP position (30% of volume score)
    vwap_distance = features["vwap_distance_pct"]
    if features["above_vwap"] and abs(vwap_distance) < 0.01:  # Close to VWAP
        volume_score += 3.0
    elif features["above_vwap"]:  # Above VWAP
        volume_score += 1.5
    elif abs(vwap_distance) < 0.005:  # Very close to VWAP
        volume_score += 2.0
    
    # Pivot proximity (10% of volume score) - adds confluence
    pivot_score = features.get("pivot_proximity_score", 0)
    volume_score += (pivot_score / 10.0) * 1.0  # Scale to 1.0 max contribution
    
    # Volatility Score
    volatility_score = 0.0
    
    # ATR percentile (60% of volatility score)
    atr_percentile = features["atr_percentile"]
    if 60 <= atr_percentile <= 85:  # Elevated but not extreme
        volatility_score += 6.0
    elif 40 <= atr_percentile < 60 or 85 < atr_percentile <= 95:  # Moderate
        volatility_score += 4.0
    elif atr_percentile > 95:  # Too volatile
        volatility_score += 1.0
    elif atr_percentile < 20:  # Too quiet
        volatility_score += 2.0
    
    # Bid-ask spread (40% of volatility score)
    spread_bps = features["bid_ask_spread_bps"]
    if spread_bps <= 10:  # Tight spread
        volatility_score += 4.0
    elif spread_bps <= 25:  # Reasonable spread
        volatility_score += 3.0
    elif spread_bps <= 50:  # Wide spread
        volatility_score += 1.0
    
    # Normalize scores to 0-100 scale (currently 0-10)
    price_final = min(100.0, max(0.0, price_score * 10))
    volume_final = min(100.0, max(0.0, volume_score * 10))
    volatility_final = min(100.0, max(0.0, volatility_score * 10))
    
    # Calculate overall weighted score
    overall_score = (
        price_final * SCORE_WEIGHTS["trend_alignment"] +
        volume_final * SCORE_WEIGHTS["volume"] + 
        volatility_final * SCORE_WEIGHTS["volatility"]
    ) / sum(SCORE_WEIGHTS.values())
    
    return FeatureScores(
        price=price_final,
        volume=volume_final,
        volatility=volatility_final,
        overall=overall_score
    )

def position_sizing(entry_price: float, stop_price: float, 
                   portfolio_value: float, risk_pct: float) -> Tuple[int, float]:
    """
    Calculate position size based on risk management rules.
    
    Args:
        entry_price: Entry price per share
        stop_price: Stop loss price per share
        portfolio_value: Total portfolio value
        risk_pct: Risk percentage (e.g., 0.005 for 0.5%)
        
    Returns:
        Tuple of (position_size_shares, position_size_usd)
    """
    risk_per_share = abs(entry_price - stop_price)
    
    if risk_per_share <= 0:
        return 0, 0.0
    
    max_risk_dollars = portfolio_value * risk_pct
    position_size_shares = int(max_risk_dollars / risk_per_share)
    position_size_usd = position_size_shares * entry_price
    
    return position_size_shares, position_size_usd

def costs_in_r(slippage_bps: float, fees_usd: float, 
               entry_price: float, risk_per_share: float) -> float:
    """
    Calculate total costs in R units (risk multiples).
    
    Args:
        slippage_bps: Slippage in basis points
        fees_usd: Fixed fees in USD
        entry_price: Entry price per share
        risk_per_share: Risk per share in USD
        
    Returns:
        Total costs in R units
    """
    if risk_per_share <= 0:
        return 0.0
    
    # Slippage cost (round trip)
    slippage_per_share = (slippage_bps / 10000) * entry_price * 2  # Round trip
    
    # Convert to R units
    slippage_r = slippage_per_share / risk_per_share
    fees_r = fees_usd / risk_per_share
    
    return slippage_r + fees_r

def net_expected_r(p_target: float, r_ratio: float, costs_r: float) -> float:
    """
    Calculate net expected R after costs.
    
    Args:
        p_target: Probability of hitting target before stop (0-1)
        r_ratio: Risk-reward ratio
        costs_r: Total costs in R units
        
    Returns:
        Net expected R value
    """
    # Expected value calculation
    # E[R] = P(win) * R_win + P(loss) * R_loss - Costs
    # Assuming R_loss = -1.0 (lose 1R when stopped out)
    
    p_loss = 1.0 - p_target
    expected_r = p_target * r_ratio + p_loss * (-1.0)
    
    return expected_r - costs_r

def score_to_probability(signal_score: float) -> float:
    """
    Monotonic score-to-probability mapping for trade outcome prediction.
    
    Uses a calibrated sigmoid mapping that reflects realistic trading probabilities:
    - Score 0-20: 35-45% (Low quality setups)
    - Score 20-40: 45-52% (Below average setups) 
    - Score 40-60: 52-58% (Average setups)
    - Score 60-80: 58-65% (Above average setups)
    - Score 80-100: 65-72% (High quality setups)
    
    This framework prepares for future isotonic calibration using historical
    signal performance data to replace this analytical mapping.
    
    Args:
        signal_score: Overall signal score (0-100 scale)
        
    Returns:
        Probability estimate (0.35-0.72 range for realistic trading outcomes)
    """
    # Clamp input to valid range
    score = max(0.0, min(100.0, signal_score))
    
    # Normalize to 0-1 range
    normalized = score / 100.0
    
    # Calibrated sigmoid mapping with realistic trading probability ranges
    # Base range: 35% (pessimistic baseline) to 72% (exceptional setups)
    min_prob = 0.35  # Even poor setups have some chance of success
    max_prob = 0.72  # Cap at realistic maximum for systematic trading
    prob_range = max_prob - min_prob
    
    # Multi-segment piecewise mapping for better calibration
    if normalized <= 0.2:
        # Low scores (0-20): 35-45% probability
        segment_prob = normalized / 0.2  # 0-1 within this segment
        return min_prob + 0.10 * segment_prob
    elif normalized <= 0.6:
        # Medium scores (20-60): 45-58% probability  
        segment_prob = (normalized - 0.2) / 0.4  # 0-1 within this segment
        return 0.45 + 0.13 * segment_prob
    else:
        # High scores (60-100): 58-72% probability
        segment_prob = (normalized - 0.6) / 0.4  # 0-1 within this segment
        # Use sigmoid curve for diminishing returns at high scores
        sigmoid_factor = 1 / (1 + math.exp(-5 * (segment_prob - 0.5)))
        return 0.58 + 0.14 * sigmoid_factor


def validate_probability_calibration() -> bool:
    """
    Validate that the probability mapping is monotonic and within bounds.
    
    Returns:
        True if calibration is valid, False otherwise
    """
    test_scores = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    probabilities = [score_to_probability(score) for score in test_scores]
    
    # Check monotonicity (probabilities should increase with scores)
    for i in range(1, len(probabilities)):
        if probabilities[i] < probabilities[i-1]:
            return False
    
    # Check bounds (all probabilities should be in [0.35, 0.72])
    if any(p < 0.35 or p > 0.72 for p in probabilities):
        return False
        
    return True


def get_probability_calibration_info() -> Dict[str, Any]:
    """
    Get information about the current probability calibration system.
    
    Returns:
        Dictionary with calibration metadata and sample mappings
    """
    sample_scores = [10, 25, 40, 55, 70, 85, 95]
    sample_probs = [score_to_probability(score) for score in sample_scores]
    
    return {
        "calibration_type": "analytical_piecewise_sigmoid",
        "is_monotonic": validate_probability_calibration(),
        "probability_range": {"min": 0.35, "max": 0.72},
        "score_range": {"min": 0.0, "max": 100.0},
        "sample_mappings": [
            {"score": score, "probability": round(prob, 3)}
            for score, prob in zip(sample_scores, sample_probs)
        ],
        "future_enhancement": "isotonic_calibration_from_historical_signals",
        "calibration_date": None,  # Will be set when using historical data
        "sample_size": None,       # Will be set when using historical data
    }

def generate_trade_setup(features: Dict[str, Any], scores: FeatureScores, 
                        current_price: float) -> TradeSetup:
    """
    Generate trade setup with entry, stop, targets, and position sizing.
    
    Args:
        features: Computed technical features
        scores: Feature scores
        current_price: Current market price
        
    Returns:
        TradeSetup with all trading parameters
    """
    atr = features["atr"]
    atr_percent = features["atr_percent"]
    
    # Entry logic (use current price for simplicity in this version)
    entry_price = current_price
    
    # Stop loss (1.5 * ATR below entry for long trades)
    stop_multiplier = 1.5
    stop_loss = entry_price - (stop_multiplier * atr)
    
    # Targets (2.5x and 4x risk for T1 and T2)
    risk_per_share = entry_price - stop_loss
    target_1 = entry_price + (2.5 * risk_per_share)
    target_2 = entry_price + (4.0 * risk_per_share)
    
    # Position sizing
    portfolio_value = 100000.0  # Default $100K portfolio
    risk_pct = settings.RISK_PCT_PER_TRADE
    
    position_shares, position_usd = position_sizing(
        entry_price, stop_loss, portfolio_value, risk_pct
    )
    
    # Risk-reward ratio
    rr_ratio = (target_1 - entry_price) / (entry_price - stop_loss)
    
    return TradeSetup(
        entry=entry_price,
        stop=stop_loss,
        target1=target_1,
        target2=target_2,
        position_size_usd=position_usd,
        position_size_shares=position_shares,
        rr_ratio=rr_ratio
    )

def check_guardrails(opportunity: Dict[str, Any]) -> GuardrailStatus:
    """
    Apply risk guardrails to determine if opportunity is approved.
    
    Args:
        opportunity: Opportunity data dictionary
        
    Returns:
        GuardrailStatus enum value
    """
    setup = opportunity.get("setup", {})
    
    # Risk per trade check
    risk_pct = setup.get("position_size_usd", 0) / 100000.0  # Assuming $100K portfolio
    if risk_pct > settings.RISK_PCT_PER_TRADE * 2:  # Max 2x normal risk
        return GuardrailStatus.BLOCKED
    
    # Minimum R:R ratio
    rr_ratio = setup.get("rr_ratio", 0)
    if rr_ratio < 2.0:
        return GuardrailStatus.BLOCKED
    
    # Net expected R check
    # Read from nested risk if present
    risk = opportunity.get("risk", {})
    net_r = risk.get("net_expected_r", opportunity.get("net_expected_r", 0))
    if net_r < 0.05:  # Minimum 0.05R expected
        return GuardrailStatus.BLOCKED
    
    # Signal score minimum
    signal_score = opportunity.get("signal_score", 0)
    if signal_score < 5.0:
        return GuardrailStatus.REVIEW
    
    # Volatility check (ATR% too high)
    features = opportunity.get("features", {})
    atr_percent = features.get("atr_percent") or features.get("atr_pct") or 0
    if atr_percent > 5.0:  # More than 5% ATR
        return GuardrailStatus.REVIEW
    
    return GuardrailStatus.APPROVED

async def scan_opportunities(limit: int = 50, min_score: float = 5.0) -> List[Opportunity]:
    """
    Scan market for trading opportunities.
    
    Args:
        limit: Maximum number of opportunities to return
        min_score: Minimum signal score threshold
        
    Returns:
        List of Opportunity objects
    """
    logger.info(f"Scanning for opportunities - limit: {limit}, min_score: {min_score}")
    
    try:
        # Get market snapshots for liquid universe
        client = await get_polygon_client()
        snapshots = await client.get_full_market_snapshot()
        
        # Filter for liquid stocks
        liquid_snapshots = []
        for snapshot in snapshots:
            day_data = snapshot.get("day", {})
            volume = day_data.get("v", 0)
            price = day_data.get("c", 0)
            
            # Basic liquidity filters
            if volume > 1000000 and price > 5.0 and price < 500.0:
                liquid_snapshots.append(snapshot)
        
        logger.info(f"Found {len(liquid_snapshots)} liquid stocks to analyze")
        
        opportunities = []
        
        # Analyze each liquid stock
        for snapshot in liquid_snapshots[:limit * 2]:  # Analyze more than limit to get best
            try:
                # Normalize snapshot to dict
                snapshot_dict = snapshot.model_dump() if hasattr(snapshot, "model_dump") else snapshot
                ticker = snapshot_dict["ticker"]
                
                # Get historical data
                bars_objects = await client.get_aggregates(
                    ticker=ticker,
                    multiplier=1,
                    timespan="day",
                    limit=200  # Need enough history for indicators
                )
                # Convert AggregateBar objects to dicts expected by compute_features
                bars = [
                    {"o": b.o, "h": b.h, "l": b.l, "c": b.c, "v": b.v}
                    for b in bars_objects
                ]
                if len(bars) < 50:
                    continue
                
                # Compute features
                features = compute_features(bars, snapshot_dict)
                # Ensure required keys
                if "atr_pct" not in features:
                    features["atr_pct"] = round(features.get("atr_percent", 0.0), 2)
                
                # Score features
                scores = score_features(features)
                
                # Calculate overall signal score
                signal_score = scores.overall
                
                # Skip if below minimum score
                if signal_score < min_score:
                    continue
                
                # Generate trade setup
                current_price = snapshot_dict.get("day", {}).get("c", 0)
                setup = generate_trade_setup(features, scores, current_price)
                
                # Calculate probabilities and costs
                p_target = score_to_probability(signal_score)
                
                # Cost estimation
                slippage_bps = features["bid_ask_spread_bps"] + 5  # Spread + impact
                fees_usd = 1.0  # Fixed fee assumption
                risk_per_share = abs(setup.entry - setup.stop)
                
                costs_r = costs_in_r(slippage_bps, fees_usd, setup.entry, risk_per_share)
                net_r = net_expected_r(p_target, setup.rr_ratio, costs_r)
                
                # Create opportunity object
                opportunity_data = {
                    "id": str(uuid.uuid4()),
                    "symbol": ticker,
                    "timestamp": datetime.utcnow(),
                    "signal_score": signal_score,
                    "scores": scores,
                    "setup": setup,
                    "risk": RiskMetrics(
                        p_target=p_target,
                        net_expected_r=net_r,
                        costs_r=costs_r,
                        slippage_bps=slippage_bps,
                    ),
                    "features": features,
                    "version": "1.0.0",
                }
                
                # Apply guardrails
                guardrail_status = check_guardrails(opportunity_data)
                opportunity_data["guardrail_status"] = guardrail_status
                
                # Create Opportunity object
                opportunity = Opportunity(**opportunity_data)
                opportunities.append(opportunity)
                
                logger.debug(f"Generated opportunity for {ticker}: score={signal_score:.2f}, net_r={net_r:.3f}")
                
            except Exception as e:
                logger.warning(f"Failed to analyze {snapshot.get('ticker', 'unknown')}: {e}")
                continue
        
        # Sort by signal score and return top opportunities
        opportunities.sort(key=lambda x: x.signal_score, reverse=True)
        final_opportunities = opportunities[:limit]
        
        logger.info(f"Generated {len(final_opportunities)} opportunities")
        return final_opportunities
        
    except Exception as e:
        logger.error(f"Error scanning opportunities: {e}")
        raise

async def get_opportunity_by_symbol(symbol: str) -> Optional[Opportunity]:
    """
    Get detailed opportunity analysis for a specific symbol.
    
    Args:
        symbol: Stock ticker symbol
        
    Returns:
        Opportunity object or None if not found/viable
    """
    try:
        client = await get_polygon_client()
        
        # Get current snapshot
        snapshot = await client.get_single_ticker_snapshot(symbol)
        
        if not snapshot:
            return None
        
        # Get historical data
        bars_objects = await client.get_aggregates(
            ticker=symbol,
            multiplier=1,
            timespan="day",
            limit=200
        )
        # Convert to dicts for feature computation
        bars = [
            {"o": b.o, "h": b.h, "l": b.l, "c": b.c, "v": b.v}
            for b in bars_objects
        ]
        if len(bars) < 50:
            return None
        
        # Compute features and scores
        snapshot_dict = snapshot.model_dump() if hasattr(snapshot, "model_dump") else snapshot
        features = compute_features(bars, snapshot_dict)
        if "atr_pct" not in features:
            features["atr_pct"] = round(features.get("atr_percent", 0.0), 2)
        scores = score_features(features)
        
        # Calculate signal score
        signal_score = scores.overall
        
        # Generate trade setup
        current_price = snapshot.get("day", {}).get("c", 0)
        setup = generate_trade_setup(features, scores, current_price)
        
        # Calculate probabilities and costs
        p_target = score_to_probability(signal_score)
        
        slippage_bps = features["bid_ask_spread_bps"] + 5
        fees_usd = 1.0
        risk_per_share = abs(setup.entry - setup.stop)
        
        costs_r = costs_in_r(slippage_bps, fees_usd, setup.entry, risk_per_share)
        net_r = net_expected_r(p_target, setup.rr_ratio, costs_r)
        
        # Create opportunity
        opportunity_data = {
            "id": str(uuid.uuid4()),
            "symbol": symbol,
            "timestamp": datetime.utcnow(),
            "signal_score": signal_score,
            "scores": scores,
            "setup": setup,
            "risk": RiskMetrics(
                p_target=p_target,
                net_expected_r=net_r,
                costs_r=costs_r,
                slippage_bps=slippage_bps,
            ),
            "features": features,
            "version": "1.0.0",
        }
        
        # Apply guardrails
        guardrail_status = check_guardrails(opportunity_data)
        opportunity_data["guardrail_status"] = guardrail_status
        
        return Opportunity(**opportunity_data)
        
    except Exception as e:
        logger.error(f"Error analyzing {symbol}: {e}")
        return None